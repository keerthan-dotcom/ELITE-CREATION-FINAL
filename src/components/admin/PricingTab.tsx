import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { SchoolClass, Uniform } from "@/types";
import { sortClasses } from "@/lib/utils";

interface GroupedUniform extends Uniform {
    _rawIds?: string[];
    _rawGrades?: string[];
}

interface Props {
    schoolId: string;
}

// Helper unique key generator
const getKey = (classId: string, uniformId: string) => `${classId}:::${uniformId}`;

export function PricingTab({ schoolId }: Props) {
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [masterUniforms, setMasterUniforms] = useState<GroupedUniform[]>([]); // Consolidated list of unique uniforms
    const [prices, setPrices] = useState<Record<string, number>>({}); // Key: `${classId}-${uniformId}`
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (schoolId) loadData();
    }, [schoolId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch classes
            const { data: classData } = await supabase
                .from("classes")
                .select("*")
                .eq("school_id", schoolId)
                .order("grade_name");

            // 2. Fetch All Uniforms for this school
            const { data: allUniforms } = await supabase
                .from("uniforms")
                .select("*")
                .eq("school_id", schoolId)
                .order("item_name");

            // Group uniforms by identical properties (ignoring ID, grade, created_at) to consolidate the view
            const groupedMap = new Map<string, GroupedUniform>();
            (allUniforms || []).forEach(item => {
                const key = `${item.item_name}-${item.type}-${item.category}`;
                const existing = groupedMap.get(key);
                if (!existing) {
                    groupedMap.set(key, { ...item, _rawIds: [item.id], _rawGrades: [item.grade] });
                } else {
                    existing._rawIds?.push(item.id);
                    existing._rawGrades?.push(item.grade);
                    if (item.grade === 'All') {
                        // Prefer showing 'All' as the master record if it exists
                        groupedMap.set(key, { ...item, _rawIds: existing._rawIds, _rawGrades: existing._rawGrades });
                    }
                }
            });

            const consolidatedList = Array.from(groupedMap.values()).sort((a, b) => 
                a.item_name.localeCompare(b.item_name)
            );

            setClasses(sortClasses(classData || []));
            setMasterUniforms(consolidatedList);

            // 3. Map existing prices to state
            const priceMap: Record<string, number> = {};

            if (allUniforms && classData) {
                allUniforms.forEach(u => {
                    if (u.grade === 'All') return; // Skip master rows in price map (placeholder is used instead)

                    // Find which class this grade belongs to
                    const cls = classData.find(c => c.grade_name === u.grade);

                    // Find which master uniform matches this item
                    const master = consolidatedList.find(m =>
                        m.item_name === u.item_name &&
                        m.type === u.type &&
                        m.category === u.category
                    );

                    if (cls && master) {
                        priceMap[getKey(cls.id, master.id)] = u.price;
                    }
                });
            }
            setPrices(priceMap);

        } catch (e) {
            console.error(e);
            toast.error("Failed to load pricing data");
        } finally {
            setLoading(false);
        }
    };

    const handlePriceChange = (classId: string, uniformId: string, val: string) => {
        setPrices(prev => ({
            ...prev,
            [getKey(classId, uniformId)]: parseFloat(val)
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const upsertData: Partial<Uniform>[] = [];

            // Iterate through prices to find what to save
            for (const key in prices) {
                const [classId, masterUniformId] = key.split(":::");
                const price = prices[key];

                if (isNaN(price) || price < 0) continue;

                const cls = classes.find(c => c.id === classId);
                const master = masterUniforms.find(m => m.id === masterUniformId);

                if (cls && master) {
                    upsertData.push({
                        school_id: schoolId,
                        grade: cls.grade_name, // Map ID back to Name for DB
                        item_name: master.item_name,
                        type: master.type || "Unisex",
                        category: master.category || "Regular",
                        price: price,
                        // No ID provided, letting Supabase handle Upsert on Unique Constraint
                    });
                }
            }

            if (upsertData.length === 0) {
                toast.info("No prices to save");
                setSaving(false);
                return;
            }

            // Upsert into uniforms table
            // Requires UNIQUE Constraint on (school_id, grade, item_name, type, category)
            const { error } = await supabase
                .from("uniforms")
                .upsert(upsertData, { onConflict: 'school_id, grade, item_name, type, category' });

            if (error) throw error;
            toast.success("Pricing updated successfully");

            // Reload data to ensure UI is perfectly synced with DB state
            await loadData();

        } catch (e: any) {
            console.error(e);
            toast.error("Failed to save pricing: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const isClassApplicable = (uniform: GroupedUniform, className: string) => {
        if (!uniform._rawGrades || uniform._rawGrades.includes("All")) {
            return true;
        }
        return uniform._rawGrades.includes(className);
    };

    if (loading) return <Loader2 className="animate-spin" />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Pricing Matrix</h3>
                    <p className="text-sm text-muted-foreground">Sets specific prices for each class. (Default price is used if left blank)</p>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </div>

            <div className="border rounded-md overflow-auto max-h-[calc(100vh-280px)] relative">
                <table className="w-full caption-bottom text-sm">
                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                        <TableRow>
                            <TableHead className="w-[200px] bg-background sticky top-0 z-10 border-b">Uniform Item</TableHead>
                            <TableHead className="w-[100px] bg-background sticky top-0 z-10 border-b">Type</TableHead>
                            <TableHead className="w-[100px] bg-background sticky top-0 z-10 border-b">Category</TableHead>
                            {classes.map(cls => (
                                <TableHead key={cls.id} className="min-w-[100px] bg-background sticky top-0 z-10 border-b">{cls.grade_name}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {masterUniforms.map(uniform => (
                            <TableRow key={uniform.id}>
                                <TableCell className="font-medium">{uniform.item_name}</TableCell>
                                <TableCell className="text-muted-foreground">{uniform.type}</TableCell>
                                <TableCell className="text-muted-foreground">{uniform.category}</TableCell>
                                {classes.map(cls => {
                                    const applicable = isClassApplicable(uniform, cls.grade_name);
                                    return (
                                        <TableCell key={getKey(cls.id, uniform.id)}>
                                            {applicable ? (
                                                <Input
                                                    type="number"
                                                    placeholder={String(uniform.price)} // Show default price as placeholder
                                                    value={prices[getKey(cls.id, uniform.id)] || ""}
                                                    onChange={e => handlePriceChange(cls.id, uniform.id, e.target.value)}
                                                    className="w-24 h-8"
                                                />
                                            ) : (
                                                <div className="w-24 h-8 flex items-center justify-center text-xs text-muted-foreground bg-secondary/30 rounded border border-dashed border-muted font-medium select-none cursor-not-allowed">
                                                    N/A
                                                </div>
                                            )}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </table>
            </div>
        </div>
    );
}
