import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLogin() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshAdminStatus } = useAuth();

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin');
    if (isAdmin === 'true') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate network delay
    setTimeout(() => {
      // Simple PIN check as requested
      if (pin === '1234') {
        localStorage.setItem('isAdmin', 'true');
        refreshAdminStatus();
        toast({
          title: 'Welcome Distributor',
          description: 'Login successful.',
        });
        navigate('/admin/dashboard', { replace: true });
      } else {
        toast({
          title: 'Access Denied',
          description: 'Invalid PIN code.',
          variant: 'destructive',
        });
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-md">
        <div className="bg-background border border-border p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-foreground rounded-sm flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-background" />
            </div>
            <h1 className="text-2xl font-bold">Distributor Login</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Enter PIN to access dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">PIN Code</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter PIN (1234)"
                className="w-full px-4 py-3 bg-background border border-border focus:outline-none focus:ring-2 focus:ring-foreground tracking-widest text-center text-lg"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-foreground text-background py-4 font-semibold uppercase tracking-wider text-sm hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Access Dashboard'
              )}
            </button>
          </form>

          <Link
            to="/"
            className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
