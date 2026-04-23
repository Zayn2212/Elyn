import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, X, Building2, FileText, ShieldCheck, Mic, ArrowRight } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { cn } from '@/lib/utils';

export default function OnboardingChecklist() {
  const navigate = useNavigate();
  const { state, loading, dismiss, completed, total } = useOnboarding();

  if (loading || state.dismissed || completed === total) return null;

  const steps = [
    {
      id: 'facility', icon: Building2, label: 'Add your first facility',
      hint: 'NPI + tax ID required for billing',
      done: state.facility_added,
      action: () => navigate('/profile?tab=facilities'),
    },
    {
      id: 'template', icon: FileText, label: 'Set your default note template',
      hint: 'SOAP, APSO, or Narrative',
      done: state.template_set,
      action: () => navigate('/profile?tab=preferences'),
    },
    {
      id: 'mfa', icon: ShieldCheck, label: 'Enable two-factor authentication',
      hint: 'Required for HIPAA compliance',
      done: state.mfa_enabled,
      action: () => navigate('/profile?tab=security'),
    },
    {
      id: 'note', icon: Mic, label: 'Record your first note',
      hint: '3 taps from dictation to bill',
      done: state.first_note_recorded,
      action: () => navigate('/'),
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="glass-card p-4 sm:p-5 mb-4 border-l-4 border-l-primary"
      >
        <div className="flex items-start justify-between mb-3 gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Get started — {completed} of {total} complete
            </h3>
            <p className="text-xs text-muted-foreground">3 minutes to your first AI note</p>
          </div>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition p-1 -m-1"
            aria-label="Dismiss checklist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(completed / total) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="space-y-2">
          {steps.map(step => {
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                onClick={step.action}
                disabled={step.done}
                className={cn(
                  'w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition group',
                  step.done ? 'bg-success/5 cursor-default' : 'hover:bg-muted/50'
                )}
              >
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition',
                  step.done
                    ? 'bg-success/20 text-success'
                    : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                )}>
                  {step.done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', step.done ? 'text-muted-foreground line-through' : 'text-foreground')}>
                    {step.label}
                  </p>
                  {!step.done && <p className="text-xs text-muted-foreground">{step.hint}</p>}
                </div>
                {!step.done && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
