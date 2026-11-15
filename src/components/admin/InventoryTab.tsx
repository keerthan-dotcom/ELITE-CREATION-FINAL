import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Uniform } from "@/types";
import { Loader2, Package, AlertTriangle, RefreshCw, Layers, Search, Filter, ChevronDown, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props { schoolId: string; }

export function InventoryTab({ schoolId }: Props) {
    const [uniforms, setUniforms] = useState<Uniform[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // Default to view all items
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (schoolId) {
            fetchInventory();

            // Set up real-time subscription
            const channel = supabase
                .channel(`school-inventory-${schoolId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'uniforms',
                        filter: `school_id=eq.${schoolId}`
                    },
                    () => {
                        // Refetch data when any uniform in this school changes
                        fetchInventory();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [schoolId]);

    const fetchInventory = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("uniforms")
            .select("*")
            .eq("school_id", schoolId);

        if (error) {
            console.error(error);
        } else {
            const rawUniforms = data || [];
            
            // Group uniforms by a unique combination of item_name, type, and category
            const grouped: Record<string, Uniform[]> = {};
            rawUniforms.forEach(item => {
                const key = `${item.item_name}-${item.type}-${item.category}`.toLowerCase().trim();
                if (!grouped[key]) {
                    grouped[key] = [];
                }
                grouped[key].push(item);
            });

            const consolidated: Uniform[] = Object.values(grouped).map(group => {
                // Find a master item: prefer the row with grade === "All",
                // fallback to sorting by created_at/newest, or the first record
                let master = group.find(item => item.grade === "All");
                if (!master) {
                    master = [...group].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                }
                if (!master) {
                    master = group[0];
                }

                // Merge stock records across all class-specific rows of this uniform
                const mergedStock: Record<string, number> = {};
                group.forEach(item => {
                    if (item.stock) {
                        Object.entries(item.stock).forEach(([size, qty]) => {
                            mergedStock[size] = (mergedStock[size] || 0) + (qty || 0);
                        });
                    }
                });

                return {
                    ...master,
                    stock: mergedStock
                };
            });

            // Sort consolidated list by item_name
            consolidated.sort((a, b) => a.item_name.localeCompare(b.item_name));

            setUniforms(consolidated);
        }
        setLoading(false);
    };

    const toggleExpand = (id: string) => {
        setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getStockSummary = (stock: Record<string, number> = {}) => {
        const values = Object.values(stock);
        const outOfStock = values.filter(v => v === 0).length;
        const lowStock = values.filter(v => v > 0 && v < 10).length;
        const total = values.reduce((acc, v) => acc + v, 0);
        return { outOfStock, lowStock, total, variants: values.length };
    };

    const filteredUniforms = useMemo(() => {
        return uniforms.filter(item => {
            const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch && searchTerm) return false;

            const summary = getStockSummary(item.stock || {});

            if (statusFilter === "all") return true;
            if (statusFilter === "attention") return summary.outOfStock > 0 || summary.lowStock > 0;
            if (statusFilter === "out") return summary.outOfStock > 0;
            if (statusFilter === "low") return summary.lowStock > 0;

            return true;
        });
    }, [uniforms, searchTerm, statusFilter]);

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header section with Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border shadow-sm border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Package className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Items</p>
                            <p className="text-2xl font-bold text-gray-900">{uniforms.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm border-l-4 border-l-red-500">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-lg text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Out of Stock</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {uniforms.reduce((acc, item) => acc + getStockSummary(item.stock || {}).outOfStock, 0)}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm border-l-4 border-l-orange-500">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                            <Info className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Low Stock Cases</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {uniforms.reduce((acc, item) => acc + getStockSummary(item.stock || {}).lowStock, 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-xl border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search items..."
                        className="pl-9 h-10 border-gray-200 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] h-10 border-gray-200">
                            <SelectValue placeholder="Display Mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="attention">Needs Attention</SelectItem>
                            <SelectItem value="all">View All Items</SelectItem>
                            <SelectItem value="out">Out of Stock Only</SelectItem>
                            <SelectItem value="low">Low Stock Only</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" className="h-10 w-10 border-gray-200" onClick={fetchInventory}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Inventory List */}
            <div className="space-y-3">
                {filteredUniforms.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <Layers className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h4 className="text-lg font-semibold text-gray-600">No stock alerts found</h4>
                        <p className="text-gray-400 max-w-xs mx-auto">Everything looks healthy based on your current filters!</p>
                        <Button variant="link" className="mt-2 text-blue-600" onClick={() => { setStatusFilter("all"); setSearchTerm(""); }}>Clear Filters</Button>
                    </div>
                ) : (
                    filteredUniforms.map((item) => {
                        const summary = getStockSummary(item.stock || {});
                        const isExpanded = expandedItems[item.id];
                        const stockData = item.stock || {};
                        const sizeValues = item.size_config?.dimensions?.[0]?.values || [];
                        const stockEntries = Object.entries(stockData).sort(([aSize], [bSize]) => {
                            const aIdx = sizeValues.indexOf(aSize);
                            const bIdx = sizeValues.indexOf(bSize);
                            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                            if (aIdx !== -1) return -1;
                            if (bIdx !== -1) return 1;
                            return aSize.localeCompare(bSize, undefined, { numeric: true, sensitivity: 'base' });
                        });

                        return (
                            <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:border-gray-300 transition-all">
                                <div
                                    className="p-4 flex items-center justify-between cursor-pointer select-none active:bg-gray-50"
                                    onClick={() => toggleExpand(item.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 font-bold">
                                            {item.item_name[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                                {item.item_name}
                                                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tighter h-4 bg-gray-50">{item.type}</Badge>
                                            </h4>
                                            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                                {summary.variants} Sizes • Total {summary.total} units
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="hidden md:flex gap-2">
                                            {summary.outOfStock > 0 && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-md border border-red-100 text-[10px] font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                    {summary.outOfStock} OUT
                                                </div>
                                            )}
                                            {summary.lowStock > 0 && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-md border border-orange-100 text-[10px] font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                                    {summary.lowStock} LOW
                                                </div>
                                            )}
                                            {summary.outOfStock === 0 && summary.lowStock === 0 && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-md border border-green-100 text-[10px] font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                    HEALTHY
                                                </div>
                                            )}
                                        </div>
                                        {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-gray-50 bg-gray-50/30">
                                        <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                            {stockEntries.map(([size, qty]) => (
                                                <div
                                                    key={size}
                                                    className={`p-2 rounded-lg border text-center transition-all
                                                        ${qty === 0
                                                            ? 'bg-red-50 border-red-200 text-red-900'
                                                            : qty < 10
                                                                ? 'bg-orange-50 border-orange-200 text-orange-900'
                                                                : 'bg-white border-gray-100 text-gray-700'}
                                                    `}
                                                >
                                                    <p className="text-[10px] font-mono text-muted-foreground uppercase mb-0.5">{size}</p>
                                                    <p className="text-sm font-bold">{qty}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <div className="pt-6 text-center">
                <p className="text-xs text-muted-foreground italic">
                    All stock values are synced with live database orders. Manual overrides can be done in the Uniforms tab.
                </p>
            </div>
        </div>
    );
}
