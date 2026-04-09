import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Patient } from '@/components/patients/PatientCard';

interface RoundingProgressProps {
  patients: Patient[];
  className?: string;
}

interface RoundingStats {
  total: number;
  notSeen: number;
  inProgress: number;
  seen: number;
  signed: number;
  discharged: number;
  completedPercent: number;
}

function useRoundingStats(patients: Patient[]): RoundingStats {
  return useMemo(() => {
    const activePatients = patients.filter(p => p.status !== 'discharged');
    const total = activePatients.length;
    const notSeen = activePatients.filter(p => !p.status || p.status === 'not_seen').length;
    const inProgress = activePatients.filter(p => p.status === 'in_progress').length;
    const seen = activePatients.filter(p => p.status === 'seen').length;
    const signed = activePatients.filter(p => p.status === 'signed').length;
    const discharged = patients.filter(p => p.status === 'discharged').length;
    const completed = seen + signed;
    const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, notSeen, inProgress, seen, signed, discharged, completedPercent };
  }, [patients]);
}

function progressColor(p: number) {
  if (p >= 80) return 'bg-success';
  if (p >= 50) return 'bg-warning';
  return 'bg-primary';
}

export default function RoundingProgress({ patients, className }: RoundingProgressProps) {
  const stats = useRoundingStats(patients);
  const active = stats.notSeen + stats.inProgress + stats.seen;

  return (
    <div className={cn('px-3 py-1.5', className)}>
      <div className="text-[13px] font-medium text-foreground/85 leading-none mb-1.5">
        {active} Active
        <span className="mx-1.5 opacity-30">·</span>
        {stats.signed} Signed
        <span className="mx-1.5 opacity-30">·</span>
        <span className={cn(
          stats.completedPercent >= 80 ? 'text-success' : stats.completedPercent >= 50 ? 'text-warning' : 'text-primary'
        )}>{stats.completedPercent}% Done</span>
      </div>
      <div className="h-[2px] bg-muted/60 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${stats.completedPercent}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={cn('h-full rounded-full', progressColor(stats.completedPercent))}
        />
      </div>
    </div>
  );
}

export function RoundingProgressCompact({ patients, className }: RoundingProgressProps) {
  const stats = useRoundingStats(patients);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-1">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Rounding</span>
          <span className="font-medium text-foreground">{stats.seen + stats.signed}/{stats.total}</span>
        </div>
        <div className="h-[2px] bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.completedPercent}%` }}
            transition={{ duration: 0.3 }}
            className={cn('h-full rounded-full', progressColor(stats.completedPercent))}
          />
        </div>
      </div>
      <span className={cn(
        'text-xs font-medium',
        stats.completedPercent >= 80 ? 'text-success' : stats.completedPercent >= 50 ? 'text-warning' : 'text-primary'
      )}>
        {stats.completedPercent}%
      </span>
    </div>
  );
}
