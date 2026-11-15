import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { AuthModal } from '@/components/auth/AuthModal'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, Loader2, FileDown, CreditCard, Banknote, ShoppingBag } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Checkout() {
    const { items, totalAmount, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate()
    const { toast } = useToast()

    const FORM_KEY = 'elite_checkout_form'

    const [studentName, setStudentName] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem(FORM_KEY) || '{}').name || '' } catch { return '' }
    })
    const [studentGrade, setStudentGrade] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem(FORM_KEY) || '{}').grade || '' } catch { return '' }
    })
    const [studentSection, setStudentSection] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem(FORM_KEY) || '{}').section || '' } catch { return '' }
    })
    const [phoneNumber, setPhoneNumber] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem(FORM_KEY) || '{}').phone || '' } catch { return '' }
    })
    const [paymentMethod, setPaymentMethod] = useState<'offline' | 'upi'>(() => {
        try { return JSON.parse(sessionStorage.getItem(FORM_KEY) || '{}').payment || 'upi' } catch { return 'upi' }
    })
    const [errors, setErrors] = useState<{ [key: string]: string }>({})
    const [loading, setLoading] = useState(false)
    const [authModalOpen, setAuthModalOpen] = useState(false)

    // Save form to sessionStorage so it survives Google OAuth redirect
    const saveForm = () => {
        sessionStorage.setItem(FORM_KEY, JSON.stringify({
            name: studentName,
            grade: studentGrade,
            section: studentSection,
            phone: phoneNumber,
            payment: paymentMethod,
        }))
    }

    // After successful login redirect back, auto-open confirm if form was filled
    useEffect(() => {
        if (user) {
            sessionStorage.removeItem(FORM_KEY)
        }
    }, [user])

    const school = items.length > 0 ? items[0].school : null;

    const [dbUniforms, setDbUniforms] = useState<any[]>([]);
    const [fetchingPrices, setFetchingPrices] = useState(false);

    useEffect(() => {
        async function fetchSchoolPrices() {
            if (!school?.id) return;
            setFetchingPrices(true);
            try {
                const { data, error } = await supabase
                    .from('uniforms')
                    .select('*')
                    .eq('school_id', school.id);
                if (error) throw error;
                setDbUniforms(data || []);
            } catch (err) {
                console.error('Error fetching school prices:', err);
            } finally {
                setFetchingPrices(false);
            }
        }
        fetchSchoolPrices();
    }, [school?.id]);

    const getResolvedItemDetails = (item: any) => {
        if (dbUniforms.length === 0) {
            return { price: item.uniform.price, id: item.uniform.id };
        }

        const matches = dbUniforms.filter(u => 
            u.item_name.toLowerCase() === item.uniform.item_name.toLowerCase() &&
            (u.type || '').toLowerCase() === (item.uniform.type || '').toLowerCase() &&
            (u.category || '').toLowerCase() === (item.uniform.category || '').toLowerCase()
        );

        if (matches.length === 0) {
            return { price: item.uniform.price, id: item.uniform.id };
        }

        if (studentGrade) {
            const gradeMatch = matches.find(u => u.grade.toLowerCase() === studentGrade.trim().toLowerCase());
            if (gradeMatch) {
                return { price: Number(gradeMatch.price), id: gradeMatch.id };
            }
        }

        if (item.uniform.grade) {
            const originalGradeMatch = matches.find(u => u.grade.toLowerCase() === item.uniform.grade.toLowerCase());
            if (originalGradeMatch) {
                return { price: Number(originalGradeMatch.price), id: originalGradeMatch.id };
            }
        }

        const allMatch = matches.find(u => u.grade.toLowerCase() === 'all');
        if (allMatch) {
            return { price: Number(allMatch.price), id: allMatch.id };
        }

        return { price: Number(matches[0].price), id: matches[0].id };
    };

    const resolvedItems = items.map(item => {
        const { price, id } = getResolvedItemDetails(item);
        return {
            ...item,
            resolvedPrice: price,
            resolvedId: id
        };
    });

    const resolvedTotalAmount = resolvedItems.reduce((sum, item) => sum + item.resolvedPrice * item.quantity, 0);

    const generatePDF = (orderCode: string, method: 'offline' | 'upi') => {
        try {
            const doc = new jsPDF()
            doc.setFontSize(20)
            doc.text('Elite Creations', 14, 20)
            doc.setFontSize(10)
            doc.text(`Order #: ${orderCode}`, 14, 28)
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 28)
            doc.text(`Student: ${studentName}`, 14, 40)
            doc.text(`Grade: ${studentGrade}${studentSection ? ` – Section ${studentSection}` : ''}`, 14, 46)
            doc.text(`Phone: ${phoneNumber}`, 14, 52)
            doc.text(`School: ${school?.name}`, 14, 58)
            doc.text(`Payment Mode: ${method === 'upi' ? 'UPI' : 'Offline (Cash)'}`, 14, 64)

            autoTable(doc, {
                startY: 72,
                head: [['Item', 'Size / Colour', 'Qty', 'Price', 'Total']],
                body: resolvedItems.map(item => [
                    item.uniform.item_name,
                    item.color ? `${item.size} (${item.color})` : item.size,
                    item.quantity,
                    `₹${item.resolvedPrice}`,
                    `₹${item.resolvedPrice * item.quantity}`,
                ]),
                theme: 'grid',
            })

            const finalY = (doc as any).lastAutoTable.finalY || 120
            doc.text(`Total: ₹${resolvedTotalAmount}`, 150, finalY + 10)
            doc.save(`Receipt-${orderCode}.pdf`)
        } catch (error) {
            console.error('PDF generation error:', error);
        }
    }


    const validateForm = () => {
        const newErrors: { [key: string]: string } = {}
        if (!studentName.trim()) newErrors.name = "Student name is required"
        if (!studentGrade.trim()) newErrors.grade = "Grade is required"
        if (!phoneNumber.trim()) newErrors.phone = "Phone number is required"
        else if (!/^\d{10}$/.test(phoneNumber)) newErrors.phone = "Phone must be 10 digits"
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    async function saveOrderToSupabase(orderCode: string, method: 'offline' | 'upi', razorpayPaymentId?: string) {
        try {
            const { data: order, error } = await supabase
                .from('orders')
                .insert({
                    order_code: orderCode,
                    student_name: studentName,
                    grade: studentGrade,
                    section: studentSection || null,
                    phone: phoneNumber,
                    school_id: school!.id,
                    total_amount: resolvedTotalAmount,
                    payment_method: method,
                    status: 'confirmed',
                    fulfillment_status: 'pending_pickup',
                    user_id: user?.id ?? null,
                })
                .select('id')
                .single()

            if (error) throw error;

            const orderItems = resolvedItems.map(item => ({
                order_id: order.id,
                uniform_id: item.resolvedId,
                item_name: item.uniform.item_name,
                size: item.size,
                color: item.color ?? null,
                quantity: item.quantity,
                price: item.resolvedPrice,
            }))

            const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
            if (itemsError) throw itemsError

            for (const item of resolvedItems) {
                await supabase.rpc('decrement_stock', {
                    p_uniform_id: item.resolvedId,
                    p_size: item.size,
                    p_quantity: item.quantity
                });
            }

            generatePDF(orderCode, method)
            clearCart()
            toast({ title: 'Order placed successfully!', description: 'Receipt downloaded and order confirmed.' })

            setTimeout(() => {
                navigate(`/order-confirmation/${orderCode}`, {
                    state: {
                        orderNumber: orderCode,
                        studentName,
                        studentClass: studentGrade,
                        phoneNumber,
                        schoolId: school!.id,
                        schoolName: school!.name,
                        items: resolvedItems.map(item => ({
                            productId: item.resolvedId,
                            productName: item.uniform.item_name,
                            size: item.size,
                            color: item.color ?? null,
                            quantity: item.quantity,
                            unitPrice: item.resolvedPrice,
                            totalPrice: item.resolvedPrice * item.quantity
                        })),
                        totalAmount: resolvedTotalAmount,
                        paymentMode: method,
                        createdAt: new Date().toISOString()
                    },
                })
            }, 1500)

        } catch (e: any) {
            console.error('Order error:', e)
            toast({
                title: 'Order failed',
                description: e?.message || 'Unknown error occurred',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    async function handleConfirmOrder(method: 'offline' | 'upi') {
        setPaymentMethod(method);

        // Require login before confirming
        if (!user) {
            sessionStorage.setItem(FORM_KEY, JSON.stringify({
                name: studentName,
                grade: studentGrade,
                section: studentSection,
                phone: phoneNumber,
                payment: method,
            }));
            setAuthModalOpen(true);
            return;
        }

        if (!validateForm()) {
            toast({ title: 'Validation Error', description: 'Please fix the errors below', variant: 'destructive' })
            return
        }

        setLoading(true)
        const orderCode = `SU-${Date.now()}`

        if (method === 'upi') {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            document.body.appendChild(script);

            script.onload = async () => {
                try {
                    let rpOrder;
                    
                    // Try Supabase Edge Function first (ideal for serverless production)
                    try {
                        const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
                            body: { amount: resolvedTotalAmount, receipt: orderCode }
                        });
                        if (error) throw error;
                        rpOrder = data;
                    } catch (edgeError) {
                        console.warn('Supabase Edge Function failed, trying local server fallback:', edgeError);
                        
                        // Fallback to Express backend (localhost/configured API url)
                        const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                        const response = await fetch(`${apiHost}/api/create-razorpay-order`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ amount: resolvedTotalAmount, receipt: orderCode })
                        });
                        
                        if (!response.ok) {
                            throw new Error('Failed to create Razorpay Order securely via fallback');
                        }
                        
                        rpOrder = await response.json();
                    }

                    const options = {
                        key: import.meta.env.VITE_RAZORPAY_KEY_ID, 
                        amount: rpOrder.amount, 
                        currency: rpOrder.currency,
                        name: "Elite Creations",
                        description: `Order ${orderCode}`,
                        order_id: rpOrder.id, 
                        prefill: {
                            name: studentName,
                            contact: phoneNumber
                        },
                        config: {
                            display: {
                                blocks: {
                                    upi: {
                                        name: "Pay via UPI",
                                        instruments: [{ method: "upi" }]
                                    }
                                },
                                sequence: ["block.upi"],
                                preferences: { show_default_blocks: false }
                            }
                        },
                        handler: async function (response: any) {
                            await saveOrderToSupabase(orderCode, 'upi', response.razorpay_payment_id);
                        }
                    };
                    
                    const rzp1 = new (window as any).Razorpay(options);
                    rzp1.on('payment.failed', function (r: any) {
                         toast({ title: 'Payment cancelled/failed', description: r.error.description, variant: 'destructive' });
                         setLoading(false);
                    });
                    
                    // On modal close if payment not completed
                    rzp1.on('payment.modal.closed', function() {
                        setLoading(false);
                    });

                    rzp1.open();
                    
                } catch (e: any) {
                    console.error("Razorpay Error", e);
                    setLoading(false);
                    toast({ title: 'Payment Setup Error', description: e.message || 'Could not connect to payment gateway', variant: 'destructive' })
                }
            };
            
            script.onerror = () => {
                setLoading(false);
                toast({ title: 'Network Error', description: 'Could not load Razorpay SDK', variant: 'destructive' });
            };
        } else {
            // Cash flow
            await saveOrderToSupabase(orderCode, 'offline');
        }
    }

    if (!school) {
        return (
            <Layout showCart={false}>
                <div className="min-h-screen flex flex-col items-center justify-center p-4">
                    <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Cart is empty</h2>
                    <Link to="/" className="text-blue-600 hover:underline">Return to Home</Link>
                </div>
            </Layout>
        )
    }

    return (
        <Layout showCart={false}>
            <div className="min-h-screen bg-gray-50 py-10 px-4">
                <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
                    {/* Student Details Form */}
                    <div className="bg-white p-6 rounded-xl shadow">
                        <div className="flex items-center gap-2 mb-6">
                            <ChevronLeft className="w-5 h-5" />
                            <Link to="/" className="text-sm font-medium hover:underline">Back to Schools</Link>
                        </div>

                        <h2 className="text-xl font-bold mb-4">Student Details</h2>

                        <div className="space-y-4">
                            <div>
                                <input
                                    className="w-full border p-3 rounded"
                                    placeholder="Student Name"
                                    value={studentName}
                                    onChange={e => setStudentName(e.target.value)}
                                />
                                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <input
                                    className="w-full border p-3 rounded"
                                    placeholder="Grade / Class *"
                                    value={studentGrade}
                                    onChange={e => setStudentGrade(e.target.value)}
                                />
                                {errors.grade && <p className="text-red-500 text-sm mt-1">{errors.grade}</p>}
                            </div>

                            <div>
                                <input
                                    className="w-full border p-3 rounded"
                                    placeholder="Section — e.g. A, B, C"
                                    value={studentSection}
                                    onChange={e => setStudentSection(e.target.value)}
                                />
                            </div>

                            <div>
                                <input
                                    className="w-full border p-3 rounded"
                                    placeholder="Phone Number"
                                    value={phoneNumber}
                                    onChange={e => setPhoneNumber(e.target.value)}
                                />
                                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-white p-6 rounded-xl shadow">
                        <h2 className="text-xl font-bold mb-4">Order Summary</h2>

                        <div className="space-y-3 mb-6">
                            {resolvedItems.map((item) => (
                                <div key={`${item.resolvedId}-${item.size}-${item.color ?? ''}`} className="flex justify-between items-start">
                                    <div>
                                        <p className="font-medium">{item.uniform.item_name}</p>
                                        <p className="text-sm text-gray-600">
                                            Size: {item.size}
                                            {item.color && <span className="ml-1 font-semibold text-gray-800">({item.color})</span>}
                                            {' '}| Qty: {item.quantity}
                                        </p>
                                    </div>
                                    <p className="font-semibold">₹{item.resolvedPrice * item.quantity}</p>
                                </div>
                            ))}
                        </div>

                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>Total</span>
                                <span>₹{resolvedTotalAmount}</span>
                            </div>
                        </div>


                        {!user && (
                            <p className="text-sm text-amber-600 mt-3 bg-amber-50 border border-amber-200 rounded p-2">
                                ⚠️ You must be signed in to confirm your order.
                            </p>
                        )}

                        <div className="flex flex-col gap-3 mt-6">
                            <button
                                onClick={() => handleConfirmOrder('upi')}
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-3 flex justify-center items-center gap-2 disabled:opacity-50 rounded hover:bg-blue-700 font-semibold"
                            >
                                {loading && paymentMethod === 'upi' ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing UPI...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="w-4 h-4" />
                                        {user ? 'Pay with Razorpay (UPI)' : 'Sign In to Pay with UPI'}
                                    </>
                                )}
                            </button>

                        </div>
                    </div>
                </div>
            </div>

            <AuthModal
                open={authModalOpen}
                onOpenChange={setAuthModalOpen}
                reason="to complete your order"
            />
        </Layout>
    )
}
