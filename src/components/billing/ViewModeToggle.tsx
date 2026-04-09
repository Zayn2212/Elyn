import React from 'react';
import { User, Users, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ViewMode } from '@/hooks/useBilling';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isAdmin: boolean;
}

export const ViewModeToggle = ({ 
  viewMode, 
  setViewMode, 
  isAdmin 
}: ViewModeToggleProps) => {
  const modes: { mode: ViewMode; label: string; icon: React.ReactNode; show: boolean }[] = [
    { mode: 'my-bills', label: 'My Bills', icon: <User className="w-4 h-4" />, show: true },
    { mode: 'specialty-bills', label: 'Specialty', icon: <Users className="w-4 h-4" />, show: true },
    { mode: 'all-bills', label: 'All Bills', icon: <Globe className="w-4 h-4" />, show: isAdmin },
  ];

  return (
    <div className="flex gap-2 mb-4">
      {modes.filter(m => m.show).map(({ mode, label, icon }) => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all flex-1",
            viewMode === mode
              ? "bg-primary/20 border-primary text-primary"
              : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
          )}
        >
          {icon}
          <span className="truncate">{label}</span>
        </button>
      ))}
    </div>
  );
};

export default ViewModeToggle;
