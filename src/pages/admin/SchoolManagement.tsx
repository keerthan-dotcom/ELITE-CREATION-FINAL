import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SchoolForm } from "@/components/admin/SchoolForm";
import { toast } from "sonner";
import { MoreHorizontal, Plus, Search, Loader2, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface School {
    id: string;
    name: string;
    school_code: string;
    area: string;
    status: 'active' | 'inactive';
    created_at: string;
    logo_url?: string | null;
}

export default function SchoolManagement() {
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSchoolFormOpen, setIsSchoolFormOpen] = useState(false);
    const [schoolToEdit, setSchoolToEdit] = useState<School | null>(null);
    const navigate = useNavigate();

    const fetchSchools = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("schools")
            .select("*")
            .order("name");

        if (error) {
            toast.error("Failed to fetch schools");
            console.error(error);
        } else {
            setSchools(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSchools();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this school? This will permanently delete all related uniforms, orders, and data.")) return;

        try {
            // Step 1: Get all order IDs for this school
            const { data: schoolOrders, error: ordersQueryErr } = await supabase
                .from("orders")
                .select("id")
                .eq("school_id", id);

            if (ordersQueryErr) throw ordersQueryErr;

            // Step 2: Delete order_items for those orders (FK: order_items.order_id → orders.id)
            if (schoolOrders && schoolOrders.length > 0) {
                const orderIds = schoolOrders.map((o: { id: string }) => o.id);
                const { error: orderItemsErr } = await supabase
                    .from("order_items")
                    .delete()
                    .in("order_id", orderIds);
                if (orderItemsErr) throw orderItemsErr;
            }

            // Step 3: Delete orders for this school (FK: orders.school_id → schools.id — no cascade)
            const { error: ordersErr } = await supabase
                .from("orders")
                .delete()
                .eq("school_id", id);
            if (ordersErr) throw ordersErr;

            // Step 4: Delete the school — uniforms & classes cascade automatically (ON DELETE CASCADE)
            const { error: schoolErr } = await supabase
                .from("schools")
                .delete()
                .eq("id", id);
            if (schoolErr) throw schoolErr;

            toast.success("School and all related data deleted successfully");
            fetchSchools();
        } catch (err: any) {
            console.error("Delete failed:", err);
            toast.error(err.message || "Failed to delete school. Check Supabase console for FK constraint details.");
        }
    };

    const handleToggleStatus = async (school: School) => {
        const newStatus = school.status === 'active' ? 'inactive' : 'active';
        const { error } = await supabase
            .from("schools")
            .update({ status: newStatus })
            .eq("id", school.id);

        if (error) {
            toast.error("Failed to update status");
        } else {
            toast.success(`School marked as ${newStatus}`);
            fetchSchools();
        }
    };

    const filteredSchools = schools.filter(school =>
        school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (school.school_code && school.school_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        school.area.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/admin/dashboard")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Schools</h1>
                        <p className="text-muted-foreground mt-1">Manage your schools and their configurations.</p>
                    </div>
                    <Button onClick={() => { setSchoolToEdit(null); setIsSchoolFormOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Add School
                    </Button>
                </div>
            </div>

            <div className="flex items-center mb-6 space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search schools..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Logo</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Area</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <div className="flex justify-center items-center">
                                        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredSchools.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No schools found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSchools.map((school) => (
                                <TableRow key={school.id}>
                                    <TableCell>
                                        <div className="w-10 h-10 rounded-md border border-border overflow-hidden bg-secondary flex items-center justify-center flex-shrink-0">
                                            {school.logo_url ? (
                                                <img
                                                    src={school.logo_url}
                                                    alt={`${school.name} logo`}
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <span className="text-xs font-bold text-muted-foreground">
                                                    {school.name.charAt(0)}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <Link to={`/admin/schools/${school.id}`} className="hover:underline text-primary">
                                            {school.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{school.school_code || "-"}</TableCell>
                                    <TableCell>{school.area}</TableCell>
                                    <TableCell>
                                        <Badge variant={school.status === 'active' ? 'default' : 'secondary'}>
                                            {school.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => navigate(`/admin/schools/${school.id}`)}>
                                                    View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => { setSchoolToEdit(school); setIsSchoolFormOpen(true); }}>
                                                    Edit Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleToggleStatus(school)}>
                                                    {school.status === 'active' ? 'Deactivate' : 'Activate'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(school.id)}>
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <SchoolForm
                open={isSchoolFormOpen}
                onOpenChange={setIsSchoolFormOpen}
                schoolToEdit={schoolToEdit}
                onSuccess={fetchSchools}
            />
        </div>
    );
}
