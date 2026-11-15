
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load env vars
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️  WARNING: Supabase credentials missing!');
    console.warn('   Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env.local');
}

const supabaseAdmin = createClient(
    SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY || ''
);

app.post('/api/create-order', async (req, res) => {
    try {
        const {
            order_number,
            student_name,
            class: student_class,
            phone_number,
            school_id,
            items,
            payment_mode,
            total_amount
        } = req.body;

        console.log(`📝 Creating order ${order_number} for ${student_name}`);

        // 1. Insert Order
        const { data: orderData, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert({
                order_number,
                student_name,
                class: student_class,
                phone_number,
                school_id,
                total_amount,
                payment_mode,
                status: 'CONFIRMED',
                fulfillment_status: 'PENDING_PICKUP'
            })
            .select()
            .single();

        if (orderError) {
            console.error('Insert Order Error:', orderError);
            throw orderError;
        }

        const orderId = orderData.id;

        // 2. Insert Order Items
        if (items && items.length > 0) {
            const orderItems = items.map((item) => ({
                order_id: orderId,
                product_id: item.productId,
                size: item.size,
                quantity: item.quantity,
                unit_price: item.unitPrice
            }));

            const { error: itemsError } = await supabaseAdmin
                .from('order_items')
                .insert(orderItems);

            if (itemsError) {
                console.error('Insert Items Error:', itemsError);
                throw itemsError;
            }
        }

        // 3. Update Inventory (Deduct Stock)
        if (items && items.length > 0) {
            for (const item of items) {
                const { data: sizeData, error: sizeFetchError } = await supabaseAdmin
                    .from('product_sizes')
                    .select('stock, id')
                    .eq('product_id', item.productId)
                    .eq('size', item.size)
                    .single();

                if (!sizeFetchError && sizeData) {
                    const newStock = Math.max(0, sizeData.stock - item.quantity);
                    await supabaseAdmin
                        .from('product_sizes')
                        .update({ stock: newStock })
                        .eq('id', sizeData.id);
                }
            }
        }

        console.log(`✅ Order ${order_number} created successfully!`);
        res.json({ orderId, orderNumber: orderData.order_number });

    } catch (error) {
        console.error('❌ Server Error:', error);
        res.status(400).json({ error: error.message || 'Internal Server Error' });
    }
});

import Razorpay from 'razorpay';

// Create a Razorpay Order
app.post('/api/create-razorpay-order', async (req, res) => {
    try {
        const { amount, receipt } = req.body;

        const razorpay = new Razorpay({
            key_id: process.env.VITE_RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const options = {
            amount: amount * 100, // amount in smallest currency unit (paise)
            currency: 'INR',
            receipt: receipt
        };

        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error('❌ Razorpay Order Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`🚀 API Server running at http://localhost:${port}`);
});
