import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isDistributorEmail } from '@/lib/admin';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isDistributor: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    refreshAdminStatus: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    isDistributor: false,
    signInWithGoogle: async () => { },
    signInWithEmail: async () => ({ error: null }),
    signOut: async () => { },
    refreshAdminStatus: () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDistributor, setIsDistributor] = useState(false);

    useEffect(() => {
        const handleAuth = (session: Session | null) => {
            const currentUser = session?.user ?? null;
            setSession(session);
            setUser(currentUser);

            const isDistEmail = isDistributorEmail(currentUser?.email);
            const isPinAdmin = localStorage.getItem('isAdmin') === 'true';

            const isAnyAdmin = isDistEmail || isPinAdmin;
            setIsDistributor(isAnyAdmin);

            if (isDistEmail) {
                localStorage.setItem('isAdmin', 'true');
            }

            setLoading(false);
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            handleAuth(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            handleAuth(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.href,
            },
        });
    };

    const signInWithEmail = async (email: string): Promise<{ error: string | null }> => {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.href,
            },
        });
        if (error) return { error: error.message };
        return { error: null };
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('Sign out failed:', err);
        }
        localStorage.removeItem('isAdmin');
        setIsDistributor(false);
        setUser(null);
        setSession(null);
    };

    const refreshAdminStatus = () => {
        const isDistEmail = isDistributorEmail(user?.email);
        const isPinAdmin = localStorage.getItem('isAdmin') === 'true';
        setIsDistributor(isDistEmail || isPinAdmin);
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, isDistributor, signInWithGoogle, signInWithEmail, signOut, refreshAdminStatus }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
