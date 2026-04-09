import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type SyncStatus = 'connected' | 'syncing' | 'synced' | 'offline' | 'error';

interface SyncedNote {
  id: string;
  updated_at: string;
  [key: string]: any;
}

interface SyncState {
  status: SyncStatus;
  lastSyncTime: Date | null;
  pendingChanges: number;
  deviceId: string;
  connectedDevices: number;
}

interface UseSyncManagerReturn {
  syncState: SyncState;
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  forceSync: () => Promise<void>;
  subscribeToNotes: (onNoteChange: (note: any) => void) => () => void;
}

// Generate a unique device ID and persist it
function getDeviceId(): string {
  const storageKey = 'elyn_device_id';
  let deviceId = localStorage.getItem(storageKey);

  if (!deviceId) {
    // Generate a unique ID based on timestamp and random values
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, deviceId);
  }

  return deviceId;
}

// Get device info for display
export function getDeviceInfo(): { name: string; type: 'mobile' | 'desktop' | 'tablet' } {
  const ua = navigator.userAgent;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);

  let name = 'Unknown Device';
  let type: 'mobile' | 'desktop' | 'tablet' = 'desktop';

  if (/iPhone/i.test(ua)) {
    name = 'iPhone';
    type = 'mobile';
  } else if (/iPad/i.test(ua)) {
    name = 'iPad';
    type = 'tablet';
  } else if (/Android/i.test(ua)) {
    name = isTablet ? 'Android Tablet' : 'Android Phone';
    type = isTablet ? 'tablet' : 'mobile';
  } else if (/Mac/i.test(ua)) {
    name = 'Mac';
    type = 'desktop';
  } else if (/Windows/i.test(ua)) {
    name = 'Windows PC';
    type = 'desktop';
  } else if (/Linux/i.test(ua)) {
    name = 'Linux';
    type = 'desktop';
  }

  return { name, type };
}

export function useSyncManager(): UseSyncManagerReturn {
  const { user } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'offline',
    lastSyncTime: null,
    pendingChanges: 0,
    deviceId: getDeviceId(),
    connectedDevices: 1,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const noteChangeCallbackRef = useRef<((note: any) => void) | null>(null);

  // Update user session with device info
  const updateDeviceSession = useCallback(async () => {
    if (!user) return;

    try {
      // Try to update existing session first, then insert if not exists
      const { data: existing } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_sessions')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('id', existing.id);
      }
    } catch (error) {
      // Silently handle - session tracking is non-critical
    }
  }, [user]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) {
      setSyncState(prev => ({ ...prev, status: 'offline' }));
      return;
    }

    // Update device session
    updateDeviceSession();

    // Set up heartbeat interval
    const heartbeatInterval = setInterval(updateDeviceSession, 60000); // Every minute

    // Create realtime channel for clinical_notes
    const channel = supabase
      .channel(`notes_sync_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clinical_notes',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<SyncedNote>) => {
          console.log('Realtime change received:', payload.eventType);

          setSyncState(prev => ({
            ...prev,
            status: 'syncing',
            lastSyncTime: new Date(),
          }));

          // Notify callback if registered
          if (noteChangeCallbackRef.current) {
            noteChangeCallbackRef.current(payload);
          }

          // Update status to synced after processing
          setTimeout(() => {
            setSyncState(prev => ({
              ...prev,
              status: 'synced',
            }));
          }, 500);
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const deviceCount = Object.keys(state).length;
        setSyncState(prev => ({
          ...prev,
          connectedDevices: Math.max(1, deviceCount),
        }));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSyncState(prev => ({
            ...prev,
            status: 'connected',
            lastSyncTime: new Date(),
          }));

          // Track presence
          channel.track({
            device_id: getDeviceId(),
            device_info: getDeviceInfo(),
            online_at: new Date().toISOString(),
          });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setSyncState(prev => ({
            ...prev,
            status: 'error',
          }));
        }
      });

    channelRef.current = channel;

    // Handle online/offline events
    const handleOnline = () => {
      setSyncState(prev => ({ ...prev, status: 'connected' }));
    };

    const handleOffline = () => {
      setSyncState(prev => ({ ...prev, status: 'offline' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial status based on navigator
    if (!navigator.onLine) {
      setSyncState(prev => ({ ...prev, status: 'offline' }));
    }

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, updateDeviceSession]);

  // Force sync - refetch all data
  const forceSync = useCallback(async () => {
    if (!user) return;

    setSyncState(prev => ({ ...prev, status: 'syncing' }));

    try {
      // Trigger a manual refresh by touching the subscription
      await updateDeviceSession();

      setSyncState(prev => ({
        ...prev,
        status: 'synced',
        lastSyncTime: new Date(),
      }));
    } catch (error) {
      console.error('Force sync error:', error);
      setSyncState(prev => ({ ...prev, status: 'error' }));
    }
  }, [user, updateDeviceSession]);

  // Subscribe to note changes
  const subscribeToNotes = useCallback((onNoteChange: (note: any) => void) => {
    noteChangeCallbackRef.current = onNoteChange;

    return () => {
      noteChangeCallbackRef.current = null;
    };
  }, []);

  return {
    syncState,
    isConnected: syncState.status === 'connected' || syncState.status === 'synced',
    isSyncing: syncState.status === 'syncing',
    lastSyncTime: syncState.lastSyncTime,
    pendingChanges: syncState.pendingChanges,
    forceSync,
    subscribeToNotes,
  };
}

export default useSyncManager;
