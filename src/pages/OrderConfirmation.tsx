import { useLocation, Link, Navigate, useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { CheckCircle, Printer, Download, Home, MapPin, Clock, Phone, Loader2 } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/errorHandler';

interface OrderItem {
  productId: string;
  productName: string;
  category: string;
  size: string;
  color?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderState {
  orderNumber: string;
  orderId: string;
  studentName: string;
  studentClass: string;
  phoneNumber: string;
  schoolId: string;
  schoolName: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMode: 'PAY_AT_SCHOOL' | 'UPI_PENDING';
  createdAt: string;
}

export default function OrderConfirmation() {
  const location = useLocation();
  const { orderNumber: paramOrderNumber } = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<OrderState | null>((location.state as OrderState) || null);
  const [loading, setLoading] = useState(!location.state);

  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (order) return;
    if (!paramOrderNumber) return;

    async function fetchOrder() {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, schools(name), order_items(*)')
          .eq('order_code', paramOrderNumber)
          .single();

        if (error) throw error;
        setOrder({
          orderNumber: data.order_code,
          orderId: data.id,
          studentName: data.student_name,
          studentClass: data.grade,
          phoneNumber: data.phone,
          schoolId: data.school_id,
          schoolName: data.schools?.name || 'Unknown',
          items: data.order_items?.map((i: any) => ({
            productId: i.uniform_id,
            productName: i.item_name,
            size: i.size,
            color: i.color ?? null,
            quantity: i.quantity,
            unitPrice: i.price,
            totalPrice: i.price * i.quantity
          })) || [],
          totalAmount: data.total_amount,
          paymentMode: data.payment_method,
          createdAt: data.created_at
        });
      } catch (err) {
        console.error(err);
        logError('FetchOrder', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [order, paramOrderNumber]);

  if (loading) {
    return (
      <Layout showCart={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!order) return <Navigate to="/" replace />;

  const {
    orderNumber,
    studentName,
    studentClass,
    schoolName,
    items,
    totalAmount,
    paymentMode,
    createdAt,
  } = order;

  // Format date
  const orderDate = new Date(createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const handlePrint = () => window.print();

  return (
    <Layout showCart={false}>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8 print:hidden">
          <CheckCircle className="w-14 h-14 mx-auto text-green-600" />
          <h1 className="text-2xl font-bold mt-3">Order Placed Successfully</h1>
          <p className="text-muted-foreground">Thank you for your order.</p>
        </div>

        <div ref={receiptRef} className="border p-6 mb-6 bg-white print:border-none">
          <div className="border-b pb-4 mb-4">
            <h2 className="text-xl font-bold mb-2">Receipt</h2>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order #: {orderNumber}</span>
              <span className="text-muted-foreground">{orderDate}</span>
            </div>
          </div>

          <div className="space-y-2 mb-6 text-sm">
            <div className="grid grid-cols-2">
              <span className="font-semibold">Student:</span>
              <span>{studentName}</span>
            </div>
            <div className="grid grid-cols-2">
              <span className="font-semibold">Class:</span>
              <span>{studentClass}</span>
            </div>
            <div className="grid grid-cols-2">
              <span className="font-semibold">School:</span>
              <span>{schoolName}</span>
            </div>
            <div className="grid grid-cols-2">
              <span className="font-semibold">Payment:</span>
              <span className="uppercase">{paymentMode}</span>
            </div>
          </div>

          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Item</th>
                <th className="text-center py-2">Size</th>
                <th className="text-center py-2">Qty</th>
                <th className="text-right py-2">Price</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((item, idx) => (
                <tr key={idx} className="border-b border-dashed last:border-0">
                  <td className="py-2">
                    <div className="font-medium">{item.productName}</div>
                  </td>
                  <td className="text-center py-2">
                    {item.size}
                    {item.color && <span className="block text-xs font-semibold text-gray-700">({item.color})</span>}
                  </td>
                  <td className="text-center py-2">{item.quantity}</td>
                  <td className="text-right py-2">₹{item.totalPrice}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center text-lg font-bold border-t pt-4">
            <span>Total Amount</span>
            <span>₹{totalAmount}</span>
          </div>
        </div>

        <div className="flex gap-4 print:hidden">
          <button onClick={handlePrint} className="flex-1 bg-foreground text-background px-4 py-3 rounded-sm flex items-center justify-center gap-2 font-medium hover:opacity-90 transition-opacity">
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
        </div>

        <Link to="/" className="block text-center mt-6 underline">
          Back to Home
        </Link>
      </div>
    </Layout>
  );
}


