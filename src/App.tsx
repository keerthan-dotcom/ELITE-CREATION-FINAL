import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import SchoolPage from "./pages/SchoolPage";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import OrderHistory from "./pages/OrderHistory";
import TermsAndConditions from "./pages/TermsAndConditions";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SchoolManagement from "./pages/admin/SchoolManagement";
import SchoolDetail from "./pages/admin/SchoolDetail";
import ReturnedOrders from "./pages/admin/ReturnedOrders";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { AdminGuard } from "@/components/auth/AdminGuard";

const queryClient = new QueryClient();



// This component handles the distributor auto-redirect
const DistributorRedirect = ({ children }: { children: React.ReactNode }) => {
  const { isDistributor, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect to dashboard if we are explicitly on the root path
    // and identified as a distributor.
    if (!loading && isDistributor && location.pathname === '/') {
      console.log('Distributor detected on home, redirecting to dashboard...');
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isDistributor, loading, navigate, location.pathname]);

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <DistributorRedirect>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/school/:schoolId" element={<SchoolPage />} />
                <Route path="/product/:productId" element={<ProductDetail />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmation />} />
                <Route path="/order-success/:orderNumber" element={<OrderConfirmation />} />
                <Route path="/orders" element={<OrderHistory />} />
                <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                <Route path="/admin/login" element={<AdminLogin />} />

                {/* Protected Admin Routes */}
                <Route path="/admin/dashboard" element={<AdminGuard><ErrorBoundary><AdminDashboard /></ErrorBoundary></AdminGuard>} />
                <Route path="/admin/schools" element={<AdminGuard><ErrorBoundary><SchoolManagement /></ErrorBoundary></AdminGuard>} />
                <Route path="/admin/schools/:schoolId" element={<AdminGuard><ErrorBoundary><SchoolDetail /></ErrorBoundary></AdminGuard>} />
                <Route path="/admin/returned-orders" element={<AdminGuard><ErrorBoundary><ReturnedOrders /></ErrorBoundary></AdminGuard>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </DistributorRedirect>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
