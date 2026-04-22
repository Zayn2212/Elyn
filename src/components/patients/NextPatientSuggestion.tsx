import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AcuityLevel } from '@/lib/acuityEngine';

interface NextPatientSuggestionProps {
  isVisible: boolean;
  patientName: string;
  acuityScore: number;
  acuityLevel: AcuityLevel;
  topSignal: string;
  onGoToPatient: () => void;
  onDismiss: () => void;
}

const levelColors: Record<AcuityLevel, string> = {
  critical: 'border-destructive/50 bg-destructive/10',
  high: 'border-orange-500/50 bg-orange-500/10',
  moderate: 'border-yellow-500/50 bg-yellow-500/10',
  low: 'border-emerald-500/50 bg-emerald-500/10',
};

const levelTextColors: Record<AcuityLevel, string> = {
  critical: 'text-destructive',
  high: 'text-orange-500',
  moderate: 'text-yellow-600',
  low: 'text-emerald-600',
};

export default function NextPatientSuggestion({
  isVisible, patientName, acuityScore, acuityLevel, topSignal, onGoToPatient, onDismiss,
}: NextPatientSuggestionProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50',
            'rounded-2xl border-2 p-4 shadow-2xl backdrop-blur-xl',
            levelColors[acuityLevel]
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className={cn('w-4 h-4 flex-shrink-0', levelTextColors[acuityLevel])} />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Next Priority Patient
                </span>
              </div>
              <h3 className="font-bold text-foreground text-lg truncate">{patientName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('text-sm font-bold', levelTextColors[acuityLevel])}>
                  Score: {acuityScore}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {topSignal}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onDismiss} className="p-1 h-auto -mt-1 -mr-1">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={onGoToPatient} className="w-full mt-3 gap-2 rounded-xl" size="sm">
            Go to Patient <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
