import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";

interface Props {
    open: boolean;
    onClose?: () => void; // Optional: If not provided, dialog is blocking (no close)
    schoolName: string;
    onVerify: (code: string) => Promise<boolean>;
}

export function SchoolVerificationDialog({ open, onClose, schoolName, onVerify }: Props) {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const isBlocking = !onClose;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const success = await onVerify(code);
            if (!success) {
                setError("Invalid school code. Please try again.");
                // Clear loading state if failed, so user can try again
                setLoading(false);
            } else {
                // Success - keep loading state true to prevent flicker before navigation/close
                // Parent handles state update
            }
        } catch (err) {
            setError("An error occurred during verification.");
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose || (() => { })}>
            <DialogContent className="sm:max-w-md" onInteractOutside={e => isBlocking && e.preventDefault()} onEscapeKeyDown={e => isBlocking && e.preventDefault()}>
                <DialogHeader>
                    <div className="mx-auto bg-muted p-3 rounded-full mb-2">
                        <Lock className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <DialogTitle className="text-center">Restricted Access</DialogTitle>
                    <DialogDescription className="text-center">
                        Please enter the valid school code to access<br />
                        <span className="font-semibold text-foreground">{schoolName}</span>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label htmlFor="school-code" className="sr-only">School Code</Label>
                        <Input
                            id="school-code"
                            placeholder="Enter School Code"
                            type="password"
                            autoComplete="off"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            disabled={loading}
                            className="text-center text-lg tracking-widest"
                            autoFocus
                        />
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    </div>
                    <DialogFooter className="sm:justify-center">
                        {onClose && (
                            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                                Cancel
                            </Button>
                        )}
                        <Button type="submit" disabled={loading || !code} className="w-full sm:w-auto min-w-[120px]">
                            {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                            Verify Access
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
