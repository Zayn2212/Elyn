import { useState, useEffect } from 'react';
import { Shield, Lock, Clock, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';

const SESSION_TIMEOUT_MINUTES = 30;

export default function ComplianceBanner({ className }: { className?: string }) {
  const [minutesRemaining, setMinutesRemaining] = useState(SESSION_TIMEOUT_MINUTES);

  useEffect(() => {
    let lastActivity = Date.now();

    const onActivity = () => { lastActivity = Date.now(); };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivity) / 60000);
      setMinutesRemaining(Math.max(0, SESSION_TIMEOUT_MINUTES - elapsed));
    }, 30000);

    return () => {
      events.forEach(e => window.removeEventListener(e, onActivity));
      clearInterval(interval);
    };
  }, []);

  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border bg-background overflow-x-auto",
      className
    )}>
      <span className="flex items-center gap-1 whitespace-nowrap font-medium text-green-600 dark:text-green-400">
        <Shield className="w-3 h-3" />
        HIPAA
      </span>
      <span className="flex items-center gap-1 whitespace-nowrap">
        <Lock className="w-3 h-3" />
        SOC 2 Type II
      </span>
      <span className="flex items-center gap-1 whitespace-nowrap">
        <Fingerprint className="w-3 h-3" />
        PHI Protected
      </span>
      <span className="hidden sm:flex items-center gap-1 whitespace-nowrap">
        <Lock className="w-3 h-3" />
        TLS 1.3
      </span>
      <span className="ml-auto flex items-center gap-1 whitespace-nowrap">
        <Clock className="w-3 h-3" />
        Session: {minutesRemaining}m
      </span>
    </div>
  );
}
