import { createContext, useContext, useEffect, useCallback, useState, ReactNode } from 'react';
import { useSyncManager, SyncStatus, getDeviceInfo } from '@/hooks/useSyncManager';

interface SyncContextType {
  status: SyncStatus;
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  connectedDevices: number;
  deviceId: string;
  deviceInfo: { name: string; type: 'mobile' | 'desktop' | 'tablet' };
  forceSync: () => Promise<void>;
  subscribeToNotes: (callback: (payload: any) => void) => () => void;
  triggerRefresh: () => void;
  refreshKey: number;
}

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const {
    syncState,
    isConnected,
    isSyncing,
    lastSyncTime,
    pendingChanges,
    forceSync,
    subscribeToNotes,
  } = useSyncManager();

  const [refreshKey, setRefreshKey] = useState(0);

  // Trigger a refresh for components that need to reload data
  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // When realtime changes come in, trigger refresh
  useEffect(() => {
    const unsubscribe = subscribeToNotes((payload) => {
      console.log('Sync: Note change detected, triggering refresh');
      triggerRefresh();
    });

    return unsubscribe;
  }, [subscribeToNotes, triggerRefresh]);

  const value: SyncContextType = {
    status: syncState.status,
    isConnected,
    isSyncing,
    lastSyncTime,
    pendingChanges,
    connectedDevices: syncState.connectedDevices,
    deviceId: syncState.deviceId,
    deviceInfo: getDeviceInfo(),
    forceSync,
    subscribeToNotes,
    triggerRefresh,
    refreshKey,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextType {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}

export default SyncContext;
