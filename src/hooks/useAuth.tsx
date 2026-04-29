import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { disableBiometric, syncStoredCredsWithSession } from '@/services/biometric';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminRole = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsAdmin(!!data);
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Check admin role after auth state change
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
        }

        // Keep biometric-stored tokens in sync. Supabase rotates the refresh
        // token on every refresh, so if we don't update our Keychain blob the
        // stored refresh token goes stale within an hour.
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          syncStoredCredsWithSession(session).catch(() => {
            // Non-fatal — biometric unlock will detect stale creds and recover.
          });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        setTimeout(() => {
          checkAdminRole(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAdminRole]);

  const signOut = async () => {
    if (user) {
      await supabase.from('audit_logs').insert({ user_id: user.id, table_name: 'profiles', action: 'SELECT', new_data: { context: 'sign_out' } }).then(({ error: e }) => { if (e) console.error('Audit log write failed:', e); });
    }
    // Wipe biometric creds so the next user on this device isn't silently
    // unlocked into the previous account.
    await disableBiometric().catch(() => {});
    await supabase.auth.signOut({ scope: 'local' });
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
