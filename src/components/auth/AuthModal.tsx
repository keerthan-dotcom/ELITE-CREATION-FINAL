import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface AuthModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reason?: string;
}

export function AuthModal({ open, onOpenChange, reason = 'to continue' }: AuthModalProps) {
    const { signInWithGoogle, signInWithEmail } = useAuth();

    const [googleLoading, setGoogleLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [emailError, setEmailError] = useState('');

    const handleGoogle = async () => {
        setGoogleLoading(true);
        await signInWithGoogle();
        setGoogleLoading(false);
    };

    const handleEmailSignIn = async () => {
        setEmailError('');
        const trimmed = email.trim();
        if (!trimmed) {
            setEmailError('Please enter your email address');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setEmailError('Please enter a valid email address');
            return;
        }
        setEmailLoading(true);
        const { error } = await signInWithEmail(trimmed);
        setEmailLoading(false);
        if (error) {
            setEmailError(error);
        } else {
            setEmailSent(true);
        }
    };

    const handleReset = () => {
        setEmailSent(false);
        setEmail('');
        setEmailError('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
                {/* Header */}
                <div className="bg-black px-6 py-5 text-white">
                    <DialogTitle className="text-xl font-bold text-white">
                        Sign in to Elite Creations
                    </DialogTitle>
                    <p className="text-sm text-gray-300 mt-1">
                        Sign in {reason}
                    </p>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {emailSent ? (
                        /* ── Email sent confirmation ── */
                        <div className="text-center space-y-3 py-4">
                            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                            <h3 className="font-semibold text-lg">Check your inbox!</h3>
                            <p className="text-sm text-muted-foreground">
                                We sent a sign-in link to <strong>{email}</strong>.
                                Open it to log in — no password needed.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Didn't get it? Check spam or{' '}
                                <button
                                    onClick={handleReset}
                                    className="underline hover:text-foreground"
                                >
                                    try again
                                </button>
                                .
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* ── Google Button ── */}
                            <Button
                                onClick={handleGoogle}
                                disabled={googleLoading || emailLoading}
                                variant="outline"
                                className="w-full flex items-center gap-3 h-12 text-sm font-semibold border-2 border-border hover:border-black hover:bg-white text-black hover:text-black transition-all bg-white shadow-soft hover:shadow-md"
                            >
                                {googleLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                )}
                                <span className="text-black">Continue with Google</span>
                            </Button>

                            {/* ── Divider ── */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-xs text-muted-foreground font-medium">OR</span>
                                <div className="flex-1 h-px bg-border" />
                            </div>

                            {/* ── Email Input ── */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Sign in with your email
                                    <span className="text-muted-foreground font-normal ml-1">
                                        (Gmail, Yahoo, Hotmail, any)
                                    </span>
                                </label>
                                <input
                                    type="email"
                                    placeholder="e.g. yourname@gmail.com or @yahoo.com"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                                    onKeyDown={e => e.key === 'Enter' && handleEmailSignIn()}
                                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black transition-all"
                                    disabled={emailLoading}
                                    autoComplete="email"
                                />
                                {emailError && (
                                    <p className="text-xs text-red-500">{emailError}</p>
                                )}
                                <Button
                                    onClick={handleEmailSignIn}
                                    disabled={emailLoading || googleLoading}
                                    className="w-full h-11 bg-black text-white hover:bg-gray-800 flex items-center gap-2"
                                >
                                    {emailLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Mail className="w-4 h-4" />
                                    )}
                                    Send Sign-In Link
                                </Button>
                                <p className="text-xs text-muted-foreground text-center">
                                    We'll send a magic link — no password needed.
                                </p>
                            </div>
                        </>
                    )}

                    <p className="text-xs text-muted-foreground text-center border-t pt-4">
                        By signing in, you agree to our terms. Your order history is saved to your account.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
