import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, RotateCcw, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface ReturnRequest {
    id: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    returned_items?: Array<{ order_item_id: string; quantity: number }> | null;
    order: {
        id: string;
        order_code: string;
        student_name: string;
        grade: string;
        phone: string;
        school_name: string;
        total_amount: number;
        payment_method: string;
        order_items: Array<{
            id: string;
            item_name: string;
            size: string;
            color?: string | null;
            quantity: number;
            price: number;
        }>;
    };
}

export default function ReturnedOrders() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<ReturnRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchReturnRequests = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('return_requests')
            .select(`
        id, reason, status, created_at, returned_items,
        orders(
          id, order_code, student_name, grade, phone, school_name,
          total_amount, payment_method,
          order_items(id, item_name, size, color, quantity, price)
        )
      `)
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('Failed to load return requests');
            console.error(error);
        } else {
            const mapped = (data || []).map((r: any) => ({
                ...r,
                order: r.orders,
            }));
            setRequests(mapped);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchReturnRequests();
    }, []);

    const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
        setUpdatingId(id);
        const { error } = await supabase
            .from('return_requests')
            .update({ status })
            .eq('id', id);

        if (error) {
            toast.error('Failed to update return status');
        } else {
            toast.success(`Return request ${status}`);
            fetchReturnRequests();
        }
        setUpdatingId(null);
    };

    const statusBadge = (status: string) => {
        if (status === 'approved') return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
        if (status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/admin/dashboard")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            <RotateCcw className="w-7 h-7" />
                            Returned Orders
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Review and manage return requests from students.
                        </p>
                    </div>
                    {pendingCount > 0 && (
                        <div className="flex items-center gap-2 text-sm font-medium bg-orange-100 text-orange-800 px-4 py-2 rounded-lg">
                            <Clock className="w-4 h-4" />
                            {pendingCount} pending review
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-24 text-muted-foreground">
                    <RotateCcw className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">No return requests yet</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((req) => (
                        <div key={req.id} className="border border-border rounded-lg overflow-hidden bg-card">
                            {/* Summary Row */}
                            <div
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors gap-4"
                                onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="flex-shrink-0">{statusBadge(req.status)}</div>
                                    <div className="min-w-0">
                                        <p className="font-semibold truncate">{req.order?.order_code}</p>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {req.order?.student_name} · {req.order?.grade} · {req.order?.school_name}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 flex-shrink-0">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-medium italic text-muted-foreground">"{req.reason}"</p>
                                        <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    <div className="font-bold">₹{req.order?.total_amount}</div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedId === req.id && (
                                <div className="border-t border-border p-5 space-y-5 bg-secondary/10">
                                    {/* Student Info */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Student</p>
                                            <p className="font-medium">{req.order?.student_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Grade</p>
                                            <p className="font-medium">{req.order?.grade}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Phone</p>
                                            <p className="font-medium">{req.order?.phone}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Payment</p>
                                            <p className="font-medium">{req.order?.payment_method}</p>
                                        </div>
                                    </div>

                                    {/* Return Reason */}
                                    <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                                        <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">Return Reason</p>
                                        <p className="text-orange-900 font-medium">"{req.reason}"</p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Order Items {req.returned_items ? '(Highlighted items are requested for return)' : ''}</p>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead>Size</TableHead>
                                                    <TableHead>Original Qty</TableHead>
                                                    <TableHead>Return Qty</TableHead>
                                                    <TableHead className="text-right">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {req.order?.order_items?.map((item, i) => {
                                                    const returnData = req.returned_items?.find(ri => ri.order_item_id === item.id);
                                                    const isReturning = !!returnData;

                                                    return (
                                                        <TableRow key={i} className={isReturning ? "bg-red-50/50" : "opacity-60"}>
                                                            <TableCell className="font-medium">
                                                                <div className="flex items-center gap-2">
                                                                    {item.item_name}
                                                                    {isReturning && <Badge variant="outline" className="text-[10px] h-5 bg-red-100 border-red-200 text-red-700">Returning</Badge>}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                {item.size}
                                                                {item.color && <span className="ml-1 font-semibold">({item.color})</span>}
                                                            </TableCell>
                                                            <TableCell>{item.quantity}</TableCell>
                                                            <TableCell className="font-bold text-red-700">
                                                                {isReturning ? returnData.quantity : '-'}
                                                            </TableCell>
                                                            <TableCell className="text-right">₹{item.price * (isReturning ? returnData.quantity : item.quantity)}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                        <div className="flex flex-col items-end mt-4 gap-1">
                                            <div className="text-sm text-muted-foreground">Original Total: ₹{req.order?.total_amount}</div>
                                            <div className="font-bold text-lg text-red-700">
                                                Estimated Refund: ₹{
                                                    req.returned_items
                                                        ? req.returned_items.reduce((acc, ri) => {
                                                            const item = req.order.order_items.find(oi => oi.id === ri.order_item_id);
                                                            return acc + (item ? item.price * ri.quantity : 0);
                                                        }, 0)
                                                        : req.order?.total_amount
                                                }
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    {req.status === 'pending' && (
                                        <div className="flex gap-3">
                                            <Button
                                                onClick={() => updateStatus(req.id, 'approved')}
                                                disabled={updatingId === req.id}
                                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                                            >
                                                {updatingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                Approve Return
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={() => updateStatus(req.id, 'rejected')}
                                                disabled={updatingId === req.id}
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
