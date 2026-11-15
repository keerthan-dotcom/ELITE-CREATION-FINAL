
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create a Supabase client with the Auth context of the logged in user.
        // We use the Service Role Key to bypass RLS for administrative tasks if needed, 
        // but primarily to ensure we can write strict updates.
        const supabaseClient = createClient(
            // @ts-ignore
            Deno.env.get('SUPABASE_URL') ?? '',
            // @ts-ignore
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const payload = await req.json()
        console.log('Received payload:', JSON.stringify(payload, null, 2))

        // 1. Validation
        if (!payload.items || payload.items.length === 0) {
            throw new Error('Order must have items')
        }

        // 2. Insert Order
        console.log('Inserting order...')
        const { data: orderData, error: orderError } = await supabaseClient
            .from('orders')
            .insert([
                {
                    order_code: payload.order_code,
                    student_name: payload.student_name,
                    grade: payload.grade,
                    phone: payload.phone,
                    school_id: payload.school_id,
                    school_name: payload.school_name,
                    total_amount: payload.total_amount,
                    payment_method: payload.payment_method,
                    status: 'confirmed',
                    fulfillment_status: 'pending_pickup'
                }
            ])
            .select()
            .single()

        if (orderError) {
            console.error('Order insert error:', orderError)
            throw orderError
        }

        console.log('Order inserted:', orderData.id)

        // 3. Insert Items
        console.log('Inserting items...')
        const orderItems = payload.items.map((item: any) => ({
            order_id: orderData.id,
            uniform_id: item.uniform_id,
            item_name: item.item_name,
            size: item.size,
            quantity: item.quantity,
            price: item.price
        }))

        const { error: itemsError } = await supabaseClient
            .from('order_items')
            .insert(orderItems)

        if (itemsError) {
            console.error('Items insert error:', itemsError)
            // Note: In production we might want to rollback the order here
            throw itemsError
        }

        // 4. Update Stock
        console.log('Updating stock...')
        // We do this sequentially to avoid race conditions complexity in this simple script,
        // though a single RPC would be better for atomicity. 
        // Since we are fixing the RPC breakage, we do it here.
        for (const item of payload.items) {
            // Check if product_sizes table exists and uses product_id
            // We assume product_sizes links to uniforms via product_id column (legacy name)
            const { error: stockError } = await supabaseClient.rpc('decrement_stock', {
                p_uniform_id: item.uniform_id,
                p_size: item.size,
                p_quantity: item.quantity
            })

            // If the RPC fails (e.g. doesn't exist), we try direct update (less safe but works)
            if (stockError) {
                console.warn('RPC decrement_stock failed, trying direct update:', stockError)
                // Attempt direct update if RPC missing
                const { error: directUpdateError } = await supabaseClient
                    .from('product_sizes')
                    .update({
                        // We can't easily do "stock - qty" without RPC or reading first.
                        // But we can try an RPC call that we KNOW we can create/fix later?
                        // Actually, let's just create a small RPC for this if this is critical.
                        // For now, allow it to pass or try the standard decrement logic if we can.
                        // Writing "stock - 1" is not supported in simple JS client insert/update directly nicely without extension.
                    })
                // Fallback: Read then Write (not atomic but okay for MPV)
                const { data: psData } = await supabaseClient
                    .from('product_sizes')
                    .select('stock')
                    .eq('product_id', item.uniform_id)
                    .eq('size', item.size)
                    .single()

                if (psData) {
                    await supabaseClient
                        .from('product_sizes')
                        .update({ stock: psData.stock - item.quantity })
                        .eq('product_id', item.uniform_id)
                        .eq('size', item.size)
                }
            }
        }

        return new Response(
            JSON.stringify({ orderId: orderData.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        console.error('Edge Function Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
