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
import { toast } from "sonner";
import { Plus, Trash2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { sortClasses } from "@/lib/utils";

interface Props {
    schoolId: string;
}

interface SchoolClass {
    id: string;
    grade_name: string;
    status: 'active' | 'inactive';
}

export function ClassesTab({ schoolId }: Props) {
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [newClassName, setNewClassName] = useState("");
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchClasses();
    }, [schoolId]);

    const fetchClasses = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("classes")
            .select("*")
            .eq("school_id", schoolId)
            .order("grade_name");

        if (error) {
            console.error(error);
            toast.error("Failed to fetch classes");
        } else {
            setClasses(sortClasses(data || []));
        }
        setLoading(false);
    };

    const handleAddClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClassName.trim()) return;

        setAdding(true);
        try {
            const { error } = await supabase
                .from("classes")
                .insert([{ school_id: schoolId, grade_name: newClassName.trim(), status: 'active' }]);

            if (error) throw error;

            toast.success("Class added successfully");
            setNewClassName("");
            fetchClasses();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to add class");
        } finally {
            setAdding(false);
        }
    };

    const toggleStatus = async (cls: SchoolClass) => {
        const newStatus = cls.status === 'active' ? 'inactive' : 'active';
        const { error } = await supabase
            .from("classes")
            .update({ status: newStatus })
            .eq("id", cls.id);

        if (error) {
            toast.error("Failed to update status");
        } else {
            fetchClasses();
        }
    };

    const deleteClass = async (id: string) => {
        if (!confirm("Are you sure? This will delete all pricing and data associated with this class.")) return;

        const { error } = await supabase
            .from("classes")
            .delete()
            .eq("id", id);

        if (error) {
            toast.error("Failed to delete class");
        } else {
            toast.success("Class deleted");
            fetchClasses();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-end gap-4 p-4 border rounded-md bg-muted/50">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Input
                        type="text"
                        placeholder="Enter class Name (e.g. Class 1, Nursery)"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                    />
                </div>
                <Button onClick={handleAddClass} disabled={adding || !newClassName.trim()}>
                    {adding ? "Adding..." : <><Plus className="mr-2 h-4 w-4" /> Add Class</>}
                </Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Class Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {classes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                    No classes added yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            classes.map((cls) => (
                                <TableRow key={cls.id}>
                                    <TableCell className="font-medium">{cls.grade_name}</TableCell>
                                    <TableCell>
                                        <Badge variant={cls.status === 'active' ? "default" : "secondary"}>
                                            {cls.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="sm" onClick={() => toggleStatus(cls)}>
                                            {cls.status === 'active' ? "Deactivate" : "Activate"}
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => deleteClass(cls.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
