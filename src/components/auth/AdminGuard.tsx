
import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface AdminGuardProps {
    children: ReactNode;
}

export const AdminGuard = ({ children }: AdminGuardProps) => {
    const { isDistributor, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && !isDistributor) {
            console.log('Access denied correctly. Redirecting to home...');
            navigate('/', { replace: true });
        }
    }, [isDistributor, loading, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isDistributor) {
        return null;
    }

    return <>{children}</>;
};
