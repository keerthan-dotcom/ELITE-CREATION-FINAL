import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { toast } from "sonner";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";

interface School {
  id: string;
  name: string;
  school_code: string;
  area: string;
  status: 'active' | 'inactive';
  logo_url?: string | null;
}

interface SchoolFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolToEdit?: School | null;
  onSuccess: () => void;
}

export function SchoolForm({ open, onOpenChange, schoolToEdit, onSuccess }: SchoolFormProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [area, setArea] = useState("");
  const [status, setStatus] = useState<'active' | 'inactive'>("active");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (schoolToEdit) {
      setName(schoolToEdit.name);
      setCode(schoolToEdit.school_code || "");
      setArea(schoolToEdit.area);
      setStatus(schoolToEdit.status || "active");
      setLogoUrl(schoolToEdit.logo_url || null);
      setLogoPreview(schoolToEdit.logo_url || null);
    } else {
      setName("");
      setCode("");
      setArea("");
      setStatus("active");
      setLogoUrl(null);
      setLogoPreview(null);
    }
    setLogoFile(null);
  }, [schoolToEdit, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalLogoUrl = logoUrl;

      // Upload new logo to Cloudinary if a file was selected
      if (logoFile) {
        setUploading(true);
        toast.info("Uploading logo...");
        const urls = await uploadToCloudinary([logoFile]);
        finalLogoUrl = urls[0];
        setUploading(false);
        toast.success("Logo uploaded to Cloudinary!");
      }

      const data = {
        name,
        school_code: code,
        area,
        status,
        logo_url: finalLogoUrl,
      };

      if (schoolToEdit) {
        const { error } = await supabase
          .from("schools")
          .update(data)
          .eq("id", schoolToEdit.id);
        if (error) throw error;
        toast.success("School updated successfully");
      } else {
        const { error } = await supabase
          .from("schools")
          .insert([data]);
        if (error) throw error;
        toast.success("School added successfully");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving school:", error);
      toast.error(error.message || "Failed to save school");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const isSubmitting = loading || uploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{schoolToEdit ? "Edit School" : "Add New School"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">

          {/* School Logo Upload */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Logo</Label>
            <div className="col-span-3 space-y-3">
              {/* Preview + Upload Controls */}
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary overflow-hidden flex-shrink-0">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="School logo preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {logoPreview ? "Change Logo" : "Upload Logo"}
                  </Button>
                  {logoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 text-red-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG or SVG · Max 5MB · Stored on Cloudinary · Displayed on landing page
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* School Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              required
            />
          </div>

          {/* School Code */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="code" className="text-right">Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="col-span-3"
              placeholder="Unique School Code"
              required
            />
          </div>

          {/* Area */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="area" className="text-right">Area</Label>
            <Input
              id="area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="col-span-3"
              required
            />
          </div>

          {/* Status */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">Status</Label>
            <Select value={status} onValueChange={(val: 'active' | 'inactive') => setStatus(val)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploading ? "Uploading logo..." : loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
