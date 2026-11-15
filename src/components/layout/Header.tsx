import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Menu, X, User, LogOut, ClipboardList } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { useState } from 'react';

export function Header() {
  const { toggleCart, totalItems } = useCart();
  const { user, signOut, isDistributor } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const isAdminPath = location.pathname.startsWith('/admin');
  const showAdminLinks = isDistributor || isAdminPath;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-foreground rounded-sm flex items-center justify-center">
              <span className="text-background font-bold text-sm">EC</span>
            </div>
            <span className="text-lg font-semibold tracking-tight hidden sm:block">
              Elite Creations
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {showAdminLinks && (
              <>
                <Link
                  to="/admin/dashboard"
                  className="text-sm font-medium animated-underline hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/schools"
                  className="text-sm font-medium animated-underline hover:text-foreground transition-colors"
                >
                  Manage Schools
                </Link>
                <Link
                  to="/admin/returned-orders"
                  className="text-sm font-medium animated-underline hover:text-foreground transition-colors"
                >
                  Returned Orders
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {/* User Login/Orders (desktop) */}
            {!isAdminPath && (
              <div className="hidden md:flex items-center gap-6 mr-4">
                {user ? (
                  <>
                    <Link
                      to="/orders"
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <ClipboardList className="w-4 h-4" />
                      My Orders
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Sign In
                  </button>
                )}
              </div>
            )}

            {/* User Avatar (desktop) */}
            {!isAdminPath && user && (
              <div className="hidden md:flex items-center gap-2">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            )}

            {!isAdminPath && (
              <button
                onClick={toggleCart}
                className="relative p-2 hover:bg-secondary rounded-sm transition-colors"
                aria-label="Open cart"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-medium rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-secondary rounded-sm transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-4">
              <Link to="/" className="text-sm font-bold py-2" onClick={() => setMobileMenuOpen(false)}>
                Home
              </Link>
              {user ? (
                <>
                  <Link to="/orders" className="text-sm font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                    My Orders
                  </Link>
                  <button
                    className="text-sm font-medium text-left text-muted-foreground py-2"
                    onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  className="text-sm font-medium text-left text-muted-foreground py-2"
                  onClick={() => { setAuthModalOpen(true); setMobileMenuOpen(false); }}
                >
                  Sign In
                </button>
              )}
              {showAdminLinks && (
                <>
                  <Link to="/admin/dashboard" className="text-sm font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                    Admin Dashboard
                  </Link>
                  <Link to="/admin/schools" className="text-sm font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                    Manage Schools
                  </Link>
                  <Link to="/admin/returned-orders" className="text-sm font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                    Returned Orders
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </div>

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        reason="to view your order history"
      />
    </header >
  );
}
