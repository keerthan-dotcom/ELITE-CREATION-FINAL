import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { ClassesTab } from "@/components/admin/ClassesTab";
import { PricingTab } from "@/components/admin/PricingTab";
import { UniformsTab } from "@/components/admin/UniformsTab";
import { InventoryTab } from "@/components/admin/InventoryTab";

interface School {
    id: string;
    name: string;
    school_code: string;
    area: string;
    status: 'active' | 'inactive';
}

export default function SchoolDetail() {
    const { schoolId } = useParams();
    const navigate = useNavigate();
    const [school, setSchool] = useState<School | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSchool() {
            if (!schoolId) return;
            setLoading(true);
            const { data, error } = await supabase
                .from("schools")
                .select("*")
                .eq("id", schoolId)
                .single();

            if (error) {
                console.error(error);
                toast.error("Failed to load school details");
                navigate("/admin/schools");
            } else {
                setSchool(data);
            }
            setLoading(false);
        }
        fetchSchool();
    }, [schoolId, navigate]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!school) return <div>School not found</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/admin/schools")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{school.name}</h1>
                    <p className="text-muted-foreground">
                        Code: {school.school_code || "N/A"} • Area: {school.area} • Status: {school.status}
                    </p>
                </div>
            </div>

            <Tabs defaultValue="classes" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="classes">Classes</TabsTrigger>
                    <TabsTrigger value="uniforms">Uniforms</TabsTrigger>
                    <TabsTrigger value="inventory">Inventory</TabsTrigger>
                    <TabsTrigger value="pricing">Pricing</TabsTrigger>
                </TabsList>
                <TabsContent value="classes" className="mt-6">
                    <ClassesTab schoolId={school.id} />
                </TabsContent>
                <TabsContent value="uniforms" className="mt-6">
                    <UniformsTab schoolId={school.id} />
                </TabsContent>
                <TabsContent value="inventory" className="mt-6">
                    <InventoryTab schoolId={school.id} />
                </TabsContent>
                <TabsContent value="pricing" className="mt-6">
                    <PricingTab schoolId={school.id} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
