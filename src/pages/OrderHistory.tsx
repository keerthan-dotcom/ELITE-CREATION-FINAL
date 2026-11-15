import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Package, RotateCcw, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderItem {
    id: string;
    item_name: string;
    size: string;
    color?: string | null;
    quantity: number;
    price: number;
}

interface Order {
    id: string;
    order_code: string;
    student_name: string;
    grade: string;
    phone: string;
    school_name: string;
    total_amount: number;
    payment_method: string;
    status: string;
    created_at: string;
    order_items: OrderItem[];
    return_request?: {
        id: string;
        reason: string;
        status: string;
        created_at: string;
        returned_items?: Array<{ order_item_id: string; quantity: number }> | null;
    } | null;
}

export default function OrderHistory() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [returningOrderId, setReturningOrderId] = useState<string | null>(null);
    const [returnReason, setReturnReason] = useState('');
    const [selectedItems, setSelectedItems] = useState<Record<string, { selected: boolean; quantity: number }>>({});
    const [submittingReturn, setSubmittingReturn] = useState(false);

    const fetchOrders = async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select(`
        id, order_code, student_name, grade, phone, school_name,
        total_amount, payment_method, status, created_at,
        order_items(id, item_name, size, color, quantity, price),
        return_requests(id, reason, status, created_at, returned_items)
      `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch orders error:', error);
            toast.error('Failed to load orders');
        } else {
            const mapped = (data || []).map((o: any) => ({
                ...o,
                return_request: o.return_requests?.[0] ?? null,
            }));
            setOrders(mapped);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                setAuthModalOpen(true);
                setLoading(false);
            } else {
                fetchOrders();
            }
        }
    }, [user, authLoading]);

    const handleReturnSubmit = async (orderId: string) => {
        if (!returnReason.trim()) {
            toast.error('Please enter a reason for return');
            return;
        }
        if (returnReason.trim().length > 100) {
            toast.error('Reason must be 100 characters or less');
            return;
        }

        const itemsToReturn = Object.entries(selectedItems)
            .filter(([_, data]) => data.selected)
            .map(([id, data]) => ({ order_item_id: id, quantity: data.quantity }));

        if (itemsToReturn.length === 0) {
            toast.error('Please select at least one item to return');
            return;
        }

        setSubmittingReturn(true);
        const { error } = await supabase.from('return_requests').insert({
            order_id: orderId,
            user_id: user!.id,
            reason: returnReason.trim(),
            status: 'pending',
            returned_items: itemsToReturn,
        });

        if (error) {
            toast.error(error.message || 'Failed to submit return request');
        } else {
            toast.success('Return request submitted! Admin will contact you shortly.');
            setReturningOrderId(null);
            setReturnReason('');
            setSelectedItems({});
            fetchOrders();
        }
        setSubmittingReturn(false);
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'confirmed': return 'bg-green-100 text-green-800';
            case 'delivered': return 'bg-blue-100 text-blue-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getReturnBadgeStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-yellow-100 text-yellow-800'; // pending
        }
    };

    const getReturnBoxStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'approved': return { box: 'bg-green-50 border-green-200', title: 'text-green-800', body: 'text-green-700', meta: 'text-green-600' };
            case 'rejected': return { box: 'bg-red-50 border-red-200', title: 'text-red-800', body: 'text-red-700', meta: 'text-red-600' };
            default: return { box: 'bg-yellow-50 border-yellow-200', title: 'text-yellow-800', body: 'text-yellow-700', meta: 'text-yellow-600' };
        }
    };

    if (authLoading) {
        return (
            <Layout>
                <div className="flex justify-center items-center min-h-[50vh]">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container mx-auto px-4 py-10 max-w-3xl">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">My Orders</h1>
                <p className="text-muted-foreground mb-8">View your order history and request returns.</p>

                {!user ? (
                    <div className="text-center py-16">
                        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium mb-4">Please sign in to view your orders</p>
                        <Button onClick={() => setAuthModalOpen(true)}>Sign In with Google</Button>
                    </div>
                ) : loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-16">
                        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium">No orders yet</p>
                        <p className="text-muted-foreground mt-1">Your orders will appear here after checkout.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div key={order.id} className="border border-border rounded-lg overflow-hidden">
                                {/* Order Header */}
                                <div
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/40 transition-colors"
                                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                >
                                    <div className="flex items-start gap-4">
                                        <Package className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold text-base">{order.order_code}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {order.school_name} · {order.grade} · {new Date(order.created_at).toLocaleDateString('en-IN')}
                                            </p>
                                            {order.return_request && (
                                                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${getReturnBadgeStyle(order.return_request.status)}`}>
                                                    Return {order.return_request.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                        <span className="font-bold">₹{order.total_amount}</span>
                                        {expandedOrder === order.id
                                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedOrder === order.id && (
                                    <div className="border-t border-border p-4 space-y-4 bg-secondary/20">
                                        {/* Order Items */}
                                        <div>
                                            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Items Ordered</h3>
                                            <div className="space-y-2">
                                                {order.order_items.map((item) => {
                                                    const isReturningMode = returningOrderId === order.id;
                                                    const isThisOrderBeingReturned = order.return_request;
                                                    const returnedData = order.return_request?.returned_items?.find(ri => ri.order_item_id === item.id);
                                                    const isItemInReturnList = !!returnedData;

                                                    return (
                                                        <div key={item.id} className={`flex items-start justify-between text-sm bg-background rounded-md p-3 border transition-all ${isReturningMode && selectedItems[item.id]?.selected ? 'border-red-400 ring-1 ring-red-400' : 'border-border'}`}>
                                                            <div className="flex gap-3">
                                                                {isReturningMode && !order.return_request && (
                                                                    <input
                                                                        type="checkbox"
                                                                        className="mt-1 w-4 h-4 rounded border-border text-red-600 focus:ring-red-500"
                                                                        checked={selectedItems[item.id]?.selected || false}
                                                                        onChange={(e) => {
                                                                            setSelectedItems(prev => ({
                                                                                ...prev,
                                                                                [item.id]: {
                                                                                    selected: e.target.checked,
                                                                                    quantity: prev[item.id]?.quantity || item.quantity
                                                                                }
                                                                            }));
                                                                        }}
                                                                    />
                                                                )}
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium">{item.item_name}</span>
                                                                        {isThisOrderBeingReturned && isItemInReturnList && (
                                                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                                                <RotateCcw className="w-2.5 h-2.5" /> Return Item
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-muted-foreground mt-0.5">
                                                                        Size: {item.size}
                                                                        {item.color && <span className="ml-1 font-semibold text-foreground">({item.color})</span>}
                                                                        {' '}· Qty: {item.quantity}
                                                                    </div>

                                                                    {isReturningMode && selectedItems[item.id]?.selected && item.quantity > 1 && (
                                                                        <div className="mt-2 flex items-center gap-2">
                                                                            <label className="text-xs font-medium">Qty to return:</label>
                                                                            <select
                                                                                className="text-xs border border-border rounded px-1.5 py-0.5 outline-none"
                                                                                value={selectedItems[item.id]?.quantity || item.quantity}
                                                                                onChange={(e) => {
                                                                                    const q = parseInt(e.target.value);
                                                                                    setSelectedItems(prev => ({
                                                                                        ...prev,
                                                                                        [item.id]: { ...prev[item.id], quantity: q }
                                                                                    }));
                                                                                }}
                                                                            >
                                                                                {Array.from({ length: item.quantity }, (_, i) => i + 1).map(n => (
                                                                                    <option key={n} value={n}>{n}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="font-medium block">₹{item.price * item.quantity}</span>
                                                                {isThisOrderBeingReturned && isItemInReturnList && (
                                                                    <span className="text-[10px] text-red-600 font-medium italic">Returning {returnedData.quantity}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Student Info */}
                                        <div className="text-sm text-muted-foreground space-y-1">
                                            <p><strong className="text-foreground">Student:</strong> {order.student_name}</p>
                                            <p><strong className="text-foreground">Phone:</strong> {order.phone}</p>
                                            <p><strong className="text-foreground">Payment:</strong> {order.payment_method}</p>
                                        </div>

                                        {/* Return Section */}
                                        {order.return_request ? (
                                            (() => {
                                                const s = getReturnBoxStyle(order.return_request.status);
                                                return (
                                                    <div className={`border rounded-md p-3 text-sm ${s.box}`}>
                                                        <p className={`font-semibold ${s.title}`}>
                                                            Return {order.return_request.status === 'approved' ? 'Approved ✅' : order.return_request.status === 'rejected' ? 'Rejected ❌' : 'Requested — Pending Approval ⏳'}
                                                        </p>
                                                        <p className={`mt-1 ${s.body}`}>Reason: "{order.return_request.reason}"</p>
                                                        <p className={`text-xs mt-1 ${s.meta}`}>Status: {order.return_request.status} · {new Date(order.return_request.created_at).toLocaleDateString('en-IN')}</p>
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            <div>
                                                {returningOrderId === order.id ? (
                                                    <div className="space-y-3 bg-red-50/50 p-3 rounded-md border border-red-100/50">
                                                        <p className="text-sm font-semibold">Initiating Return Request</p>
                                                        <p className="text-xs text-muted-foreground -mt-2">Select the items and quantity you'd like to return above.</p>
                                                        
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium">Reason for return <span className="text-muted-foreground">(max 100 characters)</span></p>
                                                            <input
                                                                type="text"
                                                                maxLength={100}
                                                                value={returnReason}
                                                                onChange={(e) => setReturnReason(e.target.value)}
                                                                placeholder="e.g. Wrong size received, item damaged"
                                                                className="w-full border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                                                            />
                                                            <p className="text-[10px] text-muted-foreground text-right">{returnReason.length}/100</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleReturnSubmit(order.id)}
                                                                disabled={submittingReturn}
                                                                className="flex-1 sm:flex-none flex items-center justify-center gap-1"
                                                            >
                                                                {submittingReturn && <Loader2 className="w-3 h-3 animate-spin" />}
                                                                Submit Return Request
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => { setReturningOrderId(null); setReturnReason(''); setSelectedItems({}); }}
                                                                className="flex-1 sm:flex-none"
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setReturningOrderId(order.id)}
                                                        className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 transition-colors"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                        Return Order
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AuthModal
                open={authModalOpen}
                onOpenChange={(open) => {
                    setAuthModalOpen(open);
                    if (!open && !user) navigate('/');
                }}
                reason="to view your order history"
            />
        </Layout>
    );
}
