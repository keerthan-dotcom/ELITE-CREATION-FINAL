import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { uploadToCloudinary } from "@/lib/cloudinary";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Uniform, ColorVariant, SchoolClass } from "@/types";

interface GroupedUniform extends Uniform {
    _rawIds?: string[];
    _rawGrades?: string[];
}

interface Props { schoolId: string; }

const GENDERS = ["Boys", "Girls", "Unisex"];
const CATEGORIES = ["Regular", "Summer", "Winter", "Sports"];

const PRESET_COLORS: Omit<ColorVariant, "image_url">[] = [
    { name: "Red", hex: "#EF4444" },
    { name: "Blue", hex: "#3B82F6" },
    { name: "Green", hex: "#22C55E" },
    { name: "Yellow", hex: "#EAB308" },
    { name: "White", hex: "#F3F4F6" },
    { name: "Black", hex: "#111827" },
    { name: "Navy", hex: "#1E3A5F" },
    { name: "Grey", hex: "#6B7280" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function UniformsTab({ schoolId }: Props) {
    const [uniforms, setUniforms] = useState<GroupedUniform[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Partial<GroupedUniform>>({});
    const [uploading, setUploading] = useState(false);
    const [bulkStockValue, setBulkStockValue] = useState("");
    const [descriptionImageFile, setDescriptionImageFile] = useState<File | null>(null);

    // Classes selection
    const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [isAllClasses, setIsAllClasses] = useState(true);

    // ── Image mode ─────────────────────────────────────────────────────────────
    // "single" = one image upload, "multi" = per-colour image uploads
    const [imageMode, setImageMode] = useState<"single" | "multi">("single");

    // Single colour image state
    const [singleFiles, setSingleFiles] = useState<File[]>([]);

    // Multi colour state
    const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
    const [colorFiles, setColorFiles] = useState<Record<string, File | null>>({});

    // ── Lifecycle ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (schoolId) {
            fetchUniforms();
            fetchClasses();
        }
    }, [schoolId]);

    // ── Open dialog ─────────────────────────────────────────────────────────────
    const openDialog = (item?: Partial<GroupedUniform>) => {
        const base = item ?? { type: "Unisex", category: "Regular", image_urls: [] };
        setCurrentItem(base);
        // Determine mode from existing data
        const hasColors = base.colors && base.colors.length > 0;
        setImageMode(hasColors ? "multi" : "single");
        setColorVariants(hasColors ? [...base.colors!] : []);
        setColorFiles({});
        setSingleFiles([]);
        setDescriptionImageFile(null);
        setBulkStockValue("");

        if (item?.id) {
            setIsAllClasses(item.grade === 'All');
            if (item.grade !== 'All') {
                if (item._rawGrades && item._rawGrades.length > 0) {
                    setSelectedClasses([...new Set(item._rawGrades)]);
                } else {
                    setSelectedClasses([item.grade!]);
                }
            } else {
                setSelectedClasses([]);
            }
        } else {
            setIsAllClasses(true);
            setSelectedClasses([]);
        }

        setIsDialogOpen(true);
    };

    // ── Multi colour helpers ────────────────────────────────────────────────────
    const toggleColor = (preset: Omit<ColorVariant, "image_url">) => {
        setColorVariants(prev => {
            const exists = prev.find(c => c.name === preset.name);
            if (exists) {
                setColorFiles(f => { const nf = { ...f }; delete nf[preset.name]; return nf; });
                return prev.filter(c => c.name !== preset.name);
            }
            return [...prev, { ...preset, image_url: null }];
        });
    };

    const handleColorFileChange = (colorName: string, file: File | null) => {
        setColorFiles(prev => ({ ...prev, [colorName]: file }));
    };

    const removeColorImage = (colorName: string) => {
        setColorVariants(prev => prev.map(c => c.name === colorName ? { ...c, image_url: null } : c));
        setColorFiles(prev => { const nf = { ...prev }; delete nf[colorName]; return nf; });
    };

    // ── Fetch ───────────────────────────────────────────────────────────────────
    const fetchUniforms = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("uniforms")
            .select("*")
            .eq("school_id", schoolId)
            // .eq("grade", "All") // Modified to view all uniforms and group them
            .order("item_name");
        if (error) { console.error(error); toast.error("Failed to fetch uniforms"); }
        else {
            // Group uniforms by identical properties (ignoring ID, grade, created_at) to consolidate the view
            const grouped = new Map<string, GroupedUniform>();
            (data || []).forEach(item => {
                const key = `${item.item_name}-${item.type}-${item.category}`;
                const existing = grouped.get(key);
                if (!existing) {
                    grouped.set(key, { ...item, _rawIds: [item.id], _rawGrades: [item.grade] }); // Keep the first match
                } else {
                    existing._rawIds?.push(item.id);
                    existing._rawGrades?.push(item.grade);
                    if (item.grade === 'All') {
                        // Prefer showing 'All' as the master record if it exists
                        grouped.set(key, { ...item, _rawIds: existing._rawIds, _rawGrades: existing._rawGrades });
                    }
                }
            });
            setUniforms(Array.from(grouped.values()));
        }
        setLoading(false);
    };

    const fetchClasses = async () => {
        const { data, error } = await supabase
            .from("classes")
            .select("*")
            .eq("school_id", schoolId)
            .order("grade_name");

        if (error) {
            console.error(error);
            toast.error("Failed to fetch classes");
        } else {
            setSchoolClasses(data || []);
        }
    };

    // ── Save ────────────────────────────────────────────────────────────────────
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setUploading(true);

            let finalImageUrls: string[] = currentItem.image_urls || [];
            let finalColors: ColorVariant[] | null = null;
            let finalDescImgUrl: string | null = currentItem.description_image_url || null;

            if (descriptionImageFile) {
                const [url] = await uploadToCloudinary([descriptionImageFile]);
                finalDescImgUrl = url;
            }

            if (imageMode === "single") {
                // Upload new single-mode images to Cloudinary
                if (singleFiles.length > 0) {
                    const uploaded = await uploadToCloudinary(singleFiles);
                    finalImageUrls = [...uploaded, ...finalImageUrls];
                }
                finalColors = null; // clear any previous colour data
            } else {
                // Multi-colour: upload each colour's file to Cloudinary
                finalColors = await Promise.all(
                    colorVariants.map(async (cv) => {
                        const file = colorFiles[cv.name];
                        if (file) {
                            const [url] = await uploadToCloudinary([file]);
                            return { ...cv, image_url: url };
                        }
                        return cv; // keep existing url if already saved
                    })
                );
                // Use first colour's image as the main image_url too
                const firstImg = finalColors.find(c => c.image_url)?.image_url ?? null;
                if (firstImg) finalImageUrls = [firstImg, ...finalColors.filter(c => c.image_url && c.image_url !== firstImg).map(c => c.image_url!)];
            }

            const payload: any = {
                school_id: schoolId,
                item_name: currentItem.item_name,
                description: (currentItem as any).description || null,
                description_image_url: finalDescImgUrl,
                type: currentItem.type || "Unisex",
                category: currentItem.category || "Regular",
                price: currentItem.price || 0,
                // grade is handled below
                image_urls: finalImageUrls,
                image_url: finalImageUrls[0] ?? currentItem.image_url ?? null,
                colors: finalColors && finalColors.length > 0 ? finalColors : null,
                size_config: currentItem.size_config
                    ? {
                        ...currentItem.size_config,
                        dimensions: currentItem.size_config.dimensions.map(d => ({
                            ...d,
                            values: Array.isArray(d.values)
                                ? d.values.map(v => v.trim()).filter(Boolean)
                                : (d.values as string).split(",").map(v => v.trim()).filter(Boolean),
                        })),
                    }
                    : null,
                stock: currentItem.stock || {},
            };

            if (currentItem.id) {
                // Fetch the latest set of existing rows for this uniform identity from the DB to prevent concurrency issues
                const { data: existingRows, error: fetchErr } = await supabase
                    .from("uniforms")
                    .select("*")
                    .eq("school_id", schoolId)
                    .eq("item_name", currentItem.item_name)
                    .eq("type", currentItem.type || "Unisex")
                    .eq("category", currentItem.category || "Regular");

                if (fetchErr) throw fetchErr;

                const rows = existingRows || [];
                const oldDefaultPrice = currentItem.price || 0;

                // Shared metadata to update on any price-override sibling rows without overwriting their custom price/grade
                const metadataPayload = {
                    item_name: payload.item_name,
                    type: payload.type,
                    category: payload.category,
                    description: payload.description,
                    description_image_url: payload.description_image_url,
                    image_urls: payload.image_urls,
                    image_url: payload.image_url,
                    colors: payload.colors,
                    size_config: payload.size_config,
                    stock: payload.stock,
                };

                if (isAllClasses) {
                    // Update/Insert the 'All' grade master row
                    const allRow = rows.find(r => r.grade === "All");
                    if (allRow) {
                        const { error } = await supabase.from("uniforms").update({ ...payload, grade: "All" }).eq("id", allRow.id);
                        if (error) throw error;
                    } else {
                        // Repurpose one redundant row if available, otherwise insert
                        const redundantRow = rows.find(r => r.price === oldDefaultPrice);
                        if (redundantRow) {
                            const { error } = await supabase.from("uniforms").update({ ...payload, grade: "All" }).eq("id", redundantRow.id);
                            if (error) throw error;
                        } else {
                            const { error } = await supabase.from("uniforms").insert([{ ...payload, grade: "All" }]);
                            if (error) throw error;
                        }
                    }

                    // Update metadata for all price override rows, and delete redundant same-price rows
                    for (const r of rows) {
                        if (r.grade === "All") continue;

                        const isOverride = r.price !== oldDefaultPrice;
                        if (isOverride) {
                            // Keep it but update metadata
                            const { error } = await supabase.from("uniforms").update(metadataPayload).eq("id", r.id);
                            if (error) throw error;
                        } else {
                            // Delete because it is redundant (covered by the new 'All' master row)
                            await supabase.from("uniforms").delete().eq("id", r.id);
                        }
                    }
                } else {
                    // Specific classes mode
                    const targetGrades = [...selectedClasses];

                    // 1. Process existing rows
                    for (const r of rows) {
                        if (r.grade === "All") {
                            // Delete 'All' row because it is no longer valid in specific classes mode
                            await supabase.from("uniforms").delete().eq("id", r.id);
                            continue;
                        }

                        if (targetGrades.includes(r.grade)) {
                            // This class is still selected, update it
                            const isOverride = r.price !== oldDefaultPrice;
                            if (isOverride) {
                                // Sibling is a price override: only update metadata, preserve custom price
                                const { error } = await supabase.from("uniforms").update(metadataPayload).eq("id", r.id);
                                if (error) throw error;
                            } else {
                                // Not a price override: update everything including the new default price
                                const { error } = await supabase.from("uniforms").update({ ...payload, grade: r.grade }).eq("id", r.id);
                                if (error) throw error;
                            }
                            // Remove from grades we still need to add
                            const idx = targetGrades.indexOf(r.grade);
                            if (idx !== -1) targetGrades.splice(idx, 1);
                        } else {
                            // This grade is no longer selected as visible, delete the row
                            await supabase.from("uniforms").delete().eq("id", r.id);
                        }
                    }

                    // 2. Insert rows for any newly added grades
                    if (targetGrades.length > 0) {
                        const newPayloads = targetGrades.map(grade => ({
                            ...payload,
                            grade
                        }));
                        const { error } = await supabase.from("uniforms").insert(newPayloads);
                        if (error) throw error;
                    }
                }
                toast.success("Uniform updated successfully");
            } else {
                // Adding new uniform
                if (isAllClasses || selectedClasses.length === 0) {
                    const { error } = await supabase.from("uniforms").insert([{ ...payload, grade: "All" }]);
                    if (error) throw error;
                    toast.success("Uniform added");
                } else {
                    // Insert multiple rows, one for each selected class
                    const payloads = selectedClasses.map(grade => ({
                        ...payload,
                        grade
                    }));
                    const { error } = await supabase.from("uniforms").insert(payloads);
                    if (error) throw error;
                    toast.success(`Uniform added for ${selectedClasses.length} classes`);
                }
            }

            setIsDialogOpen(false);
            setSingleFiles([]);
            setDescriptionImageFile(null);
            setColorVariants([]);
            setColorFiles({});
            fetchUniforms();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to save uniform");
        } finally {
            setUploading(false);
        }
    };

    // ── Delete ──────────────────────────────────────────────────────────────────
    const handleDelete = async (item: Uniform) => {
        if (!confirm("Delete this uniform item? This will remove it for ALL classes in this school.")) return;
        const { error } = await supabase
            .from("uniforms").delete()
            .eq("school_id", schoolId)
            .eq("item_name", item.item_name)
            .eq("type", item.type)
            .eq("category", item.category);
        if (error) { console.error(error); toast.error("Failed to delete"); }
        else { toast.success("Deleted successfully"); fetchUniforms(); }
    };

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Uniform List (Default / All Grades)</h3>
                    <p className="text-sm text-muted-foreground">Manage uniform items that apply generally to this school.</p>
                </div>
                <Button onClick={() => openDialog()}>
                    <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
            </div>

            {/* ── Table ── */}
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Colours</TableHead>
                            <TableHead>Gender</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Grade Visibility</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                            </TableRow>
                        ) : uniforms.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No items yet. Click "Add Item" to get started.</TableCell>
                            </TableRow>
                        ) : (
                            uniforms.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.item_name}</TableCell>
                                    <TableCell className="max-w-[160px] truncate text-muted-foreground text-sm" title={(item as any).description || ""}>
                                        {(item as any).description || <span className="italic text-gray-300">—</span>}
                                    </TableCell>
                                    <TableCell>
                                        {item.colors && item.colors.length > 0 ? (
                                            <div className="flex gap-1 flex-wrap">
                                                {item.colors.map(c => (
                                                    <span
                                                        key={c.name}
                                                        title={c.name}
                                                        className="w-4 h-4 rounded-full border border-gray-300 inline-block"
                                                        style={{ backgroundColor: c.hex }}
                                                    />
                                                ))}
                                            </div>
                                        ) : <span className="text-xs text-muted-foreground">Single</span>}
                                    </TableCell>
                                    <TableCell>{item.type}</TableCell>
                                    <TableCell>{item.category}</TableCell>
                                    <TableCell>
                                        <span className={`text-xs px-2 py-1 rounded-md ${item.grade === 'All' ? 'bg-primary/10 text-primary font-medium' : 'bg-secondary text-muted-foreground'}`}>
                                            {item.grade === 'All' ? 'All Grades' : (item._rawGrades && item._rawGrades.length > 0 ? Array.from(new Set(item._rawGrades)).join(', ') : item.grade)}
                                        </span>
                                    </TableCell>
                                    <TableCell>₹{item.price}</TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="ghost" size="icon" onClick={() => {
                                            const i = { ...item };
                                            if (!i.image_urls?.length && i.image_url) i.image_urls = [i.image_url];
                                            openDialog(i);
                                        }}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(item)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ── Dialog ── */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{currentItem.id ? "Edit Uniform" : "Add Uniform"}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="space-y-5">

                        {/* Item Name */}
                        <div>
                            <Label>Item Name</Label>
                            <Input
                                value={currentItem.item_name || ""}
                                onChange={e => setCurrentItem({ ...currentItem, item_name: e.target.value })}
                                required
                                placeholder="e.g. School Shirt"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <Label>
                                Description
                                <span className="text-muted-foreground font-normal ml-1">(optional, max 100 characters)</span>
                            </Label>
                            <textarea
                                className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring mt-1"
                                rows={2}
                                maxLength={100}
                                placeholder="e.g. Premium cotton blend, comfortable for all-day wear..."
                                value={(currentItem as any).description || ""}
                                onChange={e => setCurrentItem({ ...currentItem, description: e.target.value } as any)}
                            />
                            <p className="text-xs text-muted-foreground text-right">
                                {((currentItem as any).description || "").length}/100
                            </p>
                        </div>

                        {/* Description Image (Size Chart etc) */}
                        <div className="border rounded-lg p-4 bg-secondary/20">
                            <Label className="text-base font-semibold mb-1 block">Additional Image (Size Chart etc)</Label>
                            <p className="text-xs text-muted-foreground mb-3">Upload an image like a size chart to show below the product detail section.</p>
                            <div className="flex items-center gap-4">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => setDescriptionImageFile(e.target.files?.[0] || null)}
                                    className="flex-1 h-9 text-xs"
                                />
                                {descriptionImageFile && (
                                    <div className="relative">
                                        <img
                                            src={URL.createObjectURL(descriptionImageFile)}
                                            className="w-12 h-12 object-cover rounded border border-green-500"
                                            alt="desc preview"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setDescriptionImageFile(null)}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                )}
                                {!descriptionImageFile && currentItem.description_image_url && (
                                    <div className="relative group">
                                        <img
                                            src={currentItem.description_image_url}
                                            className="w-12 h-12 object-cover rounded border"
                                            alt="saved desc"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setCurrentItem({ ...currentItem, description_image_url: null })}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Gender + Category */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Gender (Type)</Label>
                                <Select value={currentItem.type} onValueChange={val => setCurrentItem({ ...currentItem, type: val })}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Category</Label>
                                <Select value={currentItem.category} onValueChange={val => setCurrentItem({ ...currentItem, category: val })}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Visibility (Classes) */}
                        <div className="border rounded-lg p-4 bg-secondary/10">
                            <Label className="text-base font-semibold mb-2 block">Visible Grades (Classes)</Label>
                            <p className="text-xs text-muted-foreground mb-4">Select which classes this uniform will be visible to on the store front.</p>

                            <div className="space-y-4">
                                <label className="flex items-center gap-2 font-medium cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 w-4 h-4 accent-black"
                                        checked={isAllClasses}
                                        onChange={(e) => {
                                            setIsAllClasses(e.target.checked);
                                            if (e.target.checked) setSelectedClasses([]);
                                        }}
                                    />
                                    All Classes
                                </label>

                                {!isAllClasses && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-white p-4 rounded border border-border mt-2">
                                        {schoolClasses.length === 0 ? (
                                            <p className="text-xs text-muted-foreground col-span-full">Get started by adding Classes from the "Classes" tab.</p>
                                        ) : (
                                            schoolClasses.map(cls => (
                                                <label key={cls.id} className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 w-4 h-4 accent-black"
                                                        checked={selectedClasses.includes(cls.grade_name)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedClasses(prev => [...prev, cls.grade_name]);
                                                            } else {
                                                                setSelectedClasses(prev => prev.filter(c => c !== cls.grade_name));
                                                            }
                                                        }}
                                                    />
                                                    <span className="truncate">{cls.grade_name}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                )}
                                {!isAllClasses && selectedClasses.length === 0 && (
                                    <p className="text-xs text-red-500 font-medium">Please select at least one class, or choose 'All Classes'.</p>
                                )}
                            </div>
                        </div>

                        {/* Price */}
                        <div>
                            <Label>Default Price (₹)</Label>
                            <Input
                                type="number"
                                value={currentItem.price || ""}
                                onChange={e => setCurrentItem({ ...currentItem, price: parseFloat(e.target.value) })}
                                placeholder="e.g. 450"
                            />
                        </div>

                        {/* ── Image Mode Toggle ───────────────────────────────── */}
                        <div className="border rounded-lg p-4 space-y-4">
                            <div>
                                <Label className="text-base font-semibold">Image Mode</Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Choose whether this item has one image or separate images per colour.
                                </p>
                            </div>

                            {/* Toggle buttons */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setImageMode("single"); setColorVariants([]); setColorFiles({}); }}
                                    className={`flex-1 py-2 px-4 rounded-md border-2 text-sm font-medium transition-all ${imageMode === "single"
                                        ? "border-black bg-black text-white"
                                        : "border-border bg-secondary text-foreground hover:border-gray-400"
                                        }`}
                                >
                                    🖼 Single Colour
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setImageMode("multi"); setSingleFiles([]); }}
                                    className={`flex-1 py-2 px-4 rounded-md border-2 text-sm font-medium transition-all ${imageMode === "multi"
                                        ? "border-black bg-black text-white"
                                        : "border-border bg-secondary text-foreground hover:border-gray-400"
                                        }`}
                                >
                                    🎨 Multi Colour
                                </button>
                            </div>

                            {/* ── Single Colour UI ── */}
                            {imageMode === "single" && (
                                <div className="space-y-2">
                                    <Label className="text-sm">Upload Image(s)</Label>
                                    <Input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={e => setSingleFiles(e.target.files ? Array.from(e.target.files) : [])}
                                    />
                                    {singleFiles.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {singleFiles.map((f, i) => (
                                                <div key={i} className="relative group">
                                                    <img
                                                        src={URL.createObjectURL(f)}
                                                        className="w-14 h-14 object-cover rounded border"
                                                        alt={f.name}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setSingleFiles(prev => prev.filter((_, idx) => idx !== i))}
                                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
                                                    >
                                                        <X className="w-2.5 h-2.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {/* Existing saved images */}
                                    {currentItem.image_urls && currentItem.image_urls.length > 0 && (
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Saved images:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {currentItem.image_urls.map((url, idx) => (
                                                    <div key={idx} className="relative group">
                                                        <img src={url} className="w-14 h-14 object-cover rounded border" alt="" />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newUrls = currentItem.image_urls?.filter((_, i) => i !== idx);
                                                                setCurrentItem({ ...currentItem, image_urls: newUrls, image_url: newUrls?.[0] || null });
                                                            }}
                                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground">Images are uploaded to Cloudinary. First image = main display.</p>
                                </div>
                            )}

                            {/* ── Multi Colour UI ── */}
                            {imageMode === "multi" && (
                                <div className="space-y-4">
                                    {/* Colour palette */}
                                    <div>
                                        <Label className="text-sm mb-2 block">Select Colours</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {PRESET_COLORS.map(preset => {
                                                const active = colorVariants.some(c => c.name === preset.name);
                                                return (
                                                    <button
                                                        key={preset.name}
                                                        type="button"
                                                        onClick={() => toggleColor(preset)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-medium transition-all ${active
                                                            ? "border-black bg-black text-white shadow-sm"
                                                            : "border-transparent bg-secondary text-foreground hover:border-gray-400"
                                                            }`}
                                                    >
                                                        <span
                                                            className="w-3 h-3 rounded-full border border-white/50 flex-shrink-0"
                                                            style={{ backgroundColor: preset.hex }}
                                                        />
                                                        {preset.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Per-colour image upload rows */}
                                    {colorVariants.length > 0 ? (
                                        <div className="space-y-2">
                                            <Label className="text-sm">Upload Image Per Colour</Label>
                                            {colorVariants.map(cv => (
                                                <div
                                                    key={cv.name}
                                                    className="flex items-center gap-3 bg-secondary/40 border rounded-md px-3 py-2"
                                                >
                                                    {/* Dot + name */}
                                                    <span
                                                        className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0"
                                                        style={{ backgroundColor: cv.hex }}
                                                    />
                                                    <span className="text-sm font-medium w-14 flex-shrink-0">{cv.name}</span>

                                                    {/* Saved image preview */}
                                                    {cv.image_url ? (
                                                        <div className="relative flex-shrink-0">
                                                            <img src={cv.image_url} alt={cv.name} className="w-10 h-10 object-cover rounded border" />
                                                            <button
                                                                type="button"
                                                                onClick={() => removeColorImage(cv.name)}
                                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
                                                            >
                                                                <X className="w-2.5 h-2.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground w-10 text-center flex-shrink-0">No img</span>
                                                    )}

                                                    {/* Pending preview */}
                                                    {colorFiles[cv.name] && (
                                                        <div className="relative flex-shrink-0">
                                                            <img
                                                                src={URL.createObjectURL(colorFiles[cv.name]!)}
                                                                alt="preview"
                                                                className="w-10 h-10 object-cover rounded border border-green-400"
                                                            />
                                                            <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✓</span>
                                                        </div>
                                                    )}

                                                    {/* File picker */}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="text-xs flex-1 min-w-0"
                                                        onChange={e => handleColorFileChange(cv.name, e.target.files?.[0] ?? null)}
                                                    />
                                                </div>
                                            ))}
                                            <p className="text-xs text-muted-foreground">Each image is uploaded to Cloudinary and stored with its colour.</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Select at least one colour above to upload images.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Size Configuration ── */}
                        <div className="border-t pt-4">
                            <Label className="text-base font-semibold mb-1 block">Size Configuration</Label>
                            <p className="text-sm text-muted-foreground mb-4">Define how sizes work for this item (e.g. S/M/L or Waist/Length).</p>

                            <div className="space-y-4">
                                <div>
                                    <Label>Configuration Type</Label>
                                    <Select
                                        value={currentItem.size_config?.type || "single"}
                                        onValueChange={(val: "single" | "dual") => {
                                            const dims = val === "single"
                                                ? [{ name: "Size", values: [] }]
                                                : [{ name: "Waist", values: [] }, { name: "Length", values: [] }];
                                            setCurrentItem({ ...currentItem, size_config: { type: val, dimensions: dims } });
                                        }}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="single">Single Dimension (e.g. Size)</SelectItem>
                                            <SelectItem value="dual">Dual Dimension (e.g. Waist + Length)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {(!currentItem.size_config || currentItem.size_config.type === "single") && (
                                    <div className="p-4 bg-secondary/50 rounded-md space-y-3">
                                        <div>
                                            <Label>Dimension Name</Label>
                                            <Input
                                                value={currentItem.size_config?.dimensions?.[0]?.name || "Size"}
                                                placeholder="e.g. Size, Age..."
                                                onChange={e => {
                                                    const dims = [...(currentItem.size_config?.dimensions || [{ name: "Size", values: [] }])];
                                                    if (!dims[0]) dims[0] = { name: "Size", values: [] };
                                                    dims[0].name = e.target.value;
                                                    setCurrentItem({ ...currentItem, size_config: { type: "single", dimensions: dims } });
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <Label>Values (comma separated)</Label>
                                            <Input
                                                value={currentItem.size_config?.dimensions?.[0]?.values?.join(",") || ""}
                                                placeholder='e.g. "20,22,24" or "S,M,L"'
                                                onChange={e => {
                                                    const dims = [...(currentItem.size_config?.dimensions || [{ name: "Size", values: [] }])];
                                                    if (!dims[0]) dims[0] = { name: "Size", values: [] };
                                                    dims[0].values = e.target.value.split(",");
                                                    setCurrentItem({ ...currentItem, size_config: { type: "single", dimensions: dims } });
                                                }}
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">Enter values separated by commas (e.g. "20,22,24" or "S,M,L")</p>
                                        </div>
                                    </div>
                                )}

                                {currentItem.size_config?.type === "dual" && (
                                    <div className="space-y-4">
                                        {[0, 1].map(idx => (
                                            <div key={idx} className="p-4 bg-secondary/50 rounded-md space-y-3">
                                                <h4 className="font-medium text-sm">Dimension {idx + 1}</h4>
                                                <div>
                                                    <Label>Name</Label>
                                                    <Input
                                                        value={currentItem.size_config?.dimensions?.[idx]?.name || (idx === 0 ? "Waist" : "Length")}
                                                        onChange={e => {
                                                            const dims = [...(currentItem.size_config?.dimensions || [])];
                                                            if (!dims[idx]) dims[idx] = { name: "", values: [] };
                                                            dims[idx].name = e.target.value;
                                                            setCurrentItem({ ...currentItem, size_config: { ...currentItem.size_config!, dimensions: dims } });
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Values</Label>
                                                    <Input
                                                        value={currentItem.size_config?.dimensions?.[idx]?.values?.join(",") || ""}
                                                        placeholder="e.g. 28,30,32,34"
                                                        onChange={e => {
                                                            const dims = [...(currentItem.size_config?.dimensions || [])];
                                                            if (!dims[idx]) dims[idx] = { name: "", values: [] };
                                                            dims[idx].values = e.target.value.split(",");
                                                            setCurrentItem({ ...currentItem, size_config: { ...currentItem.size_config!, dimensions: dims } });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Stock Inventory ── */}
                        <div className="border-t pt-4">
                            <Label className="text-base font-semibold mb-1 block">Stock Inventory</Label>
                            <p className="text-sm text-muted-foreground mb-2">Set stock levels per size. Leave empty or 0 = out of stock.</p>

                            {/* Bulk Update UI */}
                            {currentItem.size_config && currentItem.size_config.dimensions.length > 0 && (
                                <div className="mb-6 p-4 bg-secondary/40 rounded-lg border border-border space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-bold">Bulk Stock Update</Label>
                                            <p className="text-xs text-muted-foreground">Set the same quantity for all sizes below.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-end gap-3">
                                        <div className="flex-1">
                                            <Input
                                                type="number"
                                                placeholder="Quantity (e.g. 50)"
                                                value={bulkStockValue}
                                                onChange={(e) => setBulkStockValue(e.target.value)}
                                                className="h-9 bg-background"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            className="h-9 px-4 font-semibold border-2 border-primary/20 hover:border-primary/50"
                                            onClick={() => {
                                                const qty = parseInt(bulkStockValue);
                                                if (isNaN(qty)) {
                                                    toast.error("Please enter a valid number");
                                                    return;
                                                }

                                                const { type, dimensions } = currentItem.size_config!;
                                                const getValues = (i: number) => {
                                                    const raw = dimensions[i]?.values || [];
                                                    return Array.isArray(raw) ? raw : (raw as string).split(",").map(s => s.trim()).filter(Boolean);
                                                };

                                                let combos: string[] = [];
                                                if (type === "single") {
                                                    combos = getValues(0);
                                                } else {
                                                    const [v1s, v2s] = [getValues(0), getValues(1)];
                                                    const [n1, n2] = [dimensions[0]?.name || "V1", dimensions[1]?.name || "V2"];
                                                    const isWL = n1.toLowerCase().includes("waist") && n2.toLowerCase().includes("length");
                                                    v1s.forEach(v1 => v2s.forEach(v2 => combos.push(isWL ? `W${v1} L${v2}` : `${v1} ${v2}`)));
                                                }

                                                if (combos.length === 0) {
                                                    toast.error("No size combinations found. Please add size values above first.");
                                                    return;
                                                }

                                                const newStock = { ...(currentItem.stock || {}) };
                                                combos.forEach(key => { newStock[key] = qty; });
                                                setCurrentItem({ ...currentItem, stock: newStock });
                                                toast.success(`Updated stock to ${qty} for ${combos.length} size variants.`);
                                            }}
                                        >
                                            Apply to All
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-yellow-600 mb-4 font-medium">⚠️ Note: Save size configuration above first if you just changed it before using bulk update.</p>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {(() => {
                                    if (!currentItem.size_config || !currentItem.size_config.dimensions.length)
                                        return <p className="text-sm text-muted-foreground col-span-full">Configure sizes above to manage stock.</p>;

                                    const { type, dimensions } = currentItem.size_config;
                                    const getValues = (i: number) => {
                                        const raw = dimensions[i]?.values || [];
                                        return Array.isArray(raw) ? raw : (raw as string).split(",").map(s => s.trim()).filter(Boolean);
                                    };

                                    let combos: string[] = [];
                                    if (type === "single") {
                                        combos = getValues(0);
                                    } else {
                                        const [v1s, v2s] = [getValues(0), getValues(1)];
                                        const [n1, n2] = [dimensions[0]?.name || "V1", dimensions[1]?.name || "V2"];
                                        const isWL = n1.toLowerCase().includes("waist") && n2.toLowerCase().includes("length");
                                        v1s.forEach(v1 => v2s.forEach(v2 => combos.push(isWL ? `W${v1} L${v2}` : `${v1} ${v2}`)));
                                    }

                                    if (!combos.length)
                                        return <p className="text-sm text-muted-foreground col-span-full">Add size values above to see stock inputs.</p>;

                                    return combos.map(key => (
                                        <div key={key}>
                                            <Label className="text-xs truncate block mb-1" title={key}>{key}</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                placeholder="Qty"
                                                value={currentItem.stock?.[key] ?? ""}
                                                onChange={e => setCurrentItem({
                                                    ...currentItem,
                                                    stock: { ...(currentItem.stock || {}), [key]: parseInt(e.target.value) || 0 },
                                                })}
                                            />
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={uploading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={uploading}>
                                {uploading ? "Uploading to Cloudinary…" : "Save Item"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
