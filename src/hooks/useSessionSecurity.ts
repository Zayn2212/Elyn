import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 60 * 1000; // Warn 1 minute before timeout
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute

export const useSessionSecurity = () => {
  const { user, session, signOut } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<string | null>(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  // Track user activity
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowTimeoutWarning(false);
  }, []);

  // Register session in database
  const registerSession = useCallback(async () => {
    if (!user || !session) return;

    try {
      // Create session record
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          session_token: session.access_token.substring(0, 50), // Store partial token for identification
          last_activity_at: new Date().toISOString(),
          is_active: true,
          user_agent: navigator.userAgent,
        })
        .select('id')
        .single();

      if (!error && data) {
        sessionIdRef.current = data.id;
      }
    } catch (err) {
      // Silently fail - table may not exist
    }
  }, [user, session]);

  // Update session activity
  const updateSessionActivity = useCallback(async () => {
    if (!sessionIdRef.current) return;

    try {
      await supabase
        .from('user_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', sessionIdRef.current);
    } catch (err) {
      // Silently fail - not critical
    }
  }, []);

  // Deactivate current session
  const deactivateSession = useCallback(async () => {
    if (!sessionIdRef.current) return;

    try {
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionIdRef.current);
    } catch (err) {
      // Silently fail - not critical
    }
  }, []);

  // Sign out all other devices
  const signOutAllDevices = useCallback(async () => {
    if (!user) return;

    try {
      // Deactivate all sessions except current
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .neq('id', sessionIdRef.current || '');

      // Log the action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'LOGOUT',
          table_name: 'user_sessions',
          new_data: { action: 'sign_out_all_devices' },
        });

      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }, [user]);

  // Get active sessions
  const getActiveSessions = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_activity_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      return [];
    }
  }, [user]);

  // Setup activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [updateActivity]);

  // Register session on login
  useEffect(() => {
    if (user && session) {
      registerSession();
    }

    return () => {
      if (sessionIdRef.current) {
        deactivateSession();
      }
    };
  }, [user, session, registerSession, deactivateSession]);

  // Check for session timeout
  useEffect(() => {
    if (!user) return;

    const checkTimeout = () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;

      if (timeSinceLastActivity >= SESSION_TIMEOUT_MS) {
        setShowTimeoutWarning(false);
        deactivateSession();
        signOut();
      } else if (timeSinceLastActivity >= SESSION_TIMEOUT_MS - WARNING_BEFORE_MS) {
        setShowTimeoutWarning(true);
        updateSessionActivity();
      } else {
        setShowTimeoutWarning(false);
        updateSessionActivity();
      }
    };

    const interval = setInterval(checkTimeout, ACTIVITY_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [user, signOut, deactivateSession, updateSessionActivity]);

  return {
    signOutAllDevices,
    getActiveSessions,
    updateActivity,
    showTimeoutWarning,
  };
};
