import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
        const { amount, receipt } = await req.json()

        if (!amount || !receipt) {
            throw new Error('Amount and receipt are required')
        }

        // Get credentials from environment
        const keyId = Deno.env.get('VITE_RAZORPAY_KEY_ID') || Deno.env.get('RAZORPAY_KEY_ID')
        const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

        if (!keyId || !keySecret) {
            throw new Error('Razorpay credentials (RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET) are missing in the server environment')
        }

        // Call Razorpay API directly using fetch
        const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${keyId}:${keySecret}`),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: Math.round(amount * 100), // amount in paise
                currency: 'INR',
                receipt: receipt
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Razorpay API error response:', errorText)
            throw new Error(`Razorpay API returned status ${response.status}: ${errorText}`)
        }

        const order = await response.json()

        return new Response(
            JSON.stringify(order),
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
