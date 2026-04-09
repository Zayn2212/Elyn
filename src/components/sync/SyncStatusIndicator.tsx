import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  AlertCircle,
  Smartphone,
  Monitor,
  Tablet,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SyncStatus, getDeviceInfo } from '@/hooks/useSyncManager';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  lastSyncTime: Date | null;
  connectedDevices?: number;
  onForceSync?: () => void;
  compact?: boolean;
}

const STATUS_CONFIG: Record<SyncStatus, {
  icon: typeof Cloud;
  label: string;
  color: string;
  bg: string;
  animate?: boolean;
}> = {
  connected: {
    icon: Cloud,
    label: 'Connected',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10',
  },
  syncing: {
    icon: RefreshCw,
    label: 'Syncing',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    animate: true,
  },
  synced: {
    icon: Check,
    label: 'Synced',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10',
  },
  offline: {
    icon: CloudOff,
    label: 'Offline',
    color: 'text-muted-foreground',
    bg: 'bg-muted',
  },
  error: {
    icon: AlertCircle,
    label: 'Sync Error',
    color: 'text-destructive',
    bg: 'bg-destructive/10',
  },
};

const DEVICE_ICONS = {
  mobile: Smartphone,
  desktop: Monitor,
  tablet: Tablet,
};

function formatLastSync(date: Date | null): string {
  if (!date) return 'Never';

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

export default function SyncStatusIndicator({
  status,
  lastSyncTime,
  connectedDevices = 1,
  onForceSync,
  compact = false,
}: SyncStatusIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;
  const deviceInfo = getDeviceInfo();
  const DeviceIcon = DEVICE_ICONS[deviceInfo.type];

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
          config.bg,
          config.color
        )}
      >
        <StatusIcon className={cn("w-3 h-3", config.animate && "animate-spin")} />
        <span className="hidden sm:inline">{config.label}</span>
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
            "hover:bg-muted/50 border border-transparent",
            isOpen && "bg-muted/50 border-border"
          )}
        >
          <div className={cn("flex items-center gap-1.5", config.color)}>
            <StatusIcon className={cn("w-4 h-4", config.animate && "animate-spin")} />
            <span className="text-sm font-medium">{config.label}</span>
          </div>
          <ChevronDown className={cn(
            "w-3.5 h-3.5 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-4 space-y-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-lg", config.bg)}>
                <StatusIcon className={cn("w-5 h-5", config.color, config.animate && "animate-spin")} />
              </div>
              <div>
                <p className={cn("font-medium", config.color)}>{config.label}</p>
                <p className="text-xs text-muted-foreground">
                  Last sync: {formatLastSync(lastSyncTime)}
                </p>
              </div>
            </div>
          </div>

          {/* Current Device */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <DeviceIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{deviceInfo.name}</span>
              <span className="ml-auto px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">
                This device
              </span>
            </div>
          </div>

          {/* Connected Devices */}
          {connectedDevices > 1 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex -space-x-1">
                {Array.from({ length: Math.min(connectedDevices, 3) }).map((_, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center"
                  >
                    <Monitor className="w-3 h-3" />
                  </div>
                ))}
              </div>
              <span>{connectedDevices} devices connected</span>
            </div>
          )}

          {/* Sync Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Notes sync automatically across all your devices.</p>
            {status === 'offline' && (
              <p className="text-amber-600 dark:text-amber-400">
                Changes will sync when you're back online.
              </p>
            )}
          </div>

          {/* Force Sync Button */}
          {onForceSync && status !== 'syncing' && (
            <Button
              onClick={() => {
                onForceSync();
                setIsOpen(false);
              }}
              variant="outline"
              size="sm"
              className="w-full rounded-lg"
              disabled={status === 'offline'}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Sync Now
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Minimal inline indicator for note cards
export function NoteSyncBadge({ synced, lastSync }: { synced: boolean; lastSync?: string }) {
  return (
    <AnimatePresence>
      {synced ? (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400"
        >
          <Cloud className="w-3 h-3" />
          Synced
        </motion.span>
      ) : (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1 text-[10px] text-muted-foreground"
        >
          <RefreshCw className="w-3 h-3 animate-spin" />
          Syncing...
        </motion.span>
      )}
    </AnimatePresence>
  );
}
