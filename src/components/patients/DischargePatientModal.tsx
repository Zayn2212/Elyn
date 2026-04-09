import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  X,
  LogOut,
  Clock,
  DollarSign,
  AlertTriangle,
  FileText,
  Check,
  Loader2,
} from 'lucide-react';

interface DischargePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: {
    id: string;
    name: string;
    mrn?: string | null;
    room?: string | null;
    diagnosis?: string | null;
  };
  onDischarge: (data: DischargeData) => Promise<void>;
}

export interface DischargeData {
  patientId: string;
  dischargeReason: string;
  dischargeCptCode: '99238' | '99239';
  dischargeNotes: string;
  generateSummary: boolean;
}

const DISCHARGE_REASONS = [
  { id: 'improved', label: 'Improved / Ready for discharge' },
  { id: 'transfer', label: 'Transfer to another facility' },
  { id: 'home_health', label: 'Discharge with home health' },
  { id: 'snf', label: 'Discharge to SNF/Rehab' },
  { id: 'ama', label: 'Against Medical Advice (AMA)' },
  { id: 'expired', label: 'Expired' },
  { id: 'other', label: 'Other' },
];

const DISCHARGE_CPT_CODES = [
  {
    code: '99238' as const,
    label: '99238 - Discharge Day (≤30 min)',
    description: 'Hospital discharge day management, 30 minutes or less',
    rvu: 1.28,
    time: '≤30 minutes',
  },
  {
    code: '99239' as const,
    label: '99239 - Discharge Day (>30 min)',
    description: 'Hospital discharge day management, more than 30 minutes',
    rvu: 1.90,
    time: '>30 minutes',
  },
];

export default function DischargePatientModal({
  isOpen,
  onClose,
  patient,
  onDischarge,
}: DischargePatientModalProps) {
  const [reason, setReason] = useState('improved');
  const [cptCode, setCptCode] = useState<'99238' | '99239'>('99238');
  const [notes, setNotes] = useState('');
  const [generateSummary, setGenerateSummary] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'reason' | 'billing' | 'confirm'>('reason');

  const selectedCpt = DISCHARGE_CPT_CODES.find(c => c.code === cptCode);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onDischarge({
        patientId: patient.id,
        dischargeReason: reason,
        dischargeCptCode: cptCode,
        dischargeNotes: notes,
        generateSummary,
      });
      onClose();
    } catch (error) {
      console.error('Discharge error:', error);
    }
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setStep('reason');
      setReason('improved');
      setCptCode('99238');
      setNotes('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Container */}
          <div className="fixed inset-0 z-50 md:flex md:items-center md:justify-center md:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-black/50"
            />

            {/* Modal - Bottom sheet on mobile, centered on desktop */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed md:relative bottom-20 left-4 right-4 md:bottom-auto md:left-auto md:right-auto z-50 flex flex-col bg-card border border-border rounded-2xl shadow-xl overflow-hidden max-h-[calc(100vh-7rem)] md:max-h-[85vh] md:max-w-lg md:w-full"
            >
              {/* Handle - mobile only */}
              <div className="flex justify-center pt-3 pb-2 md:hidden">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              {/* Header */}
              <div className="p-4 border-b border-border bg-destructive/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <LogOut className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Discharge Patient</h2>
                      <p className="text-sm text-muted-foreground">{patient.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Patient Info */}
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  {patient.mrn && <span>MRN: {patient.mrn}</span>}
                  {patient.room && <span>Room: {patient.room}</span>}
                </div>
              </div>

              {/* Step Indicator */}
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  {['reason', 'billing', 'confirm'].map((s, i) => (
                    <div key={s} className="flex items-center">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                          step === s
                            ? "bg-primary text-primary-foreground"
                            : i < ['reason', 'billing', 'confirm'].indexOf(step)
                            ? "bg-green-500 text-white"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {i < ['reason', 'billing', 'confirm'].indexOf(step) ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      {i < 2 && (
                        <div
                          className={cn(
                            "w-8 h-0.5 mx-1",
                            i < ['reason', 'billing', 'confirm'].indexOf(step)
                              ? "bg-green-500"
                              : "bg-muted"
                          )}
                        />
                      )}
                    </div>
                  ))}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {step === 'reason' && 'Discharge Reason'}
                    {step === 'billing' && 'Billing Code'}
                    {step === 'confirm' && 'Confirm'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4">
                {/* Step 1: Reason */}
                {step === 'reason' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Discharge Reason
                      </label>
                      <div className="space-y-2">
                        {DISCHARGE_REASONS.map((r) => (
                          <label
                            key={r.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                              reason === r.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <input
                              type="radio"
                              name="reason"
                              value={r.id}
                              checked={reason === r.id}
                              onChange={() => setReason(r.id)}
                              className="sr-only"
                            />
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                reason === r.id
                                  ? "border-primary"
                                  : "border-muted-foreground"
                              )}
                            >
                              {reason === r.id && (
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <span className="text-sm text-foreground">{r.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Discharge Notes (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional notes about the discharge..."
                        className="w-full h-24 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Billing */}
                {step === 'billing' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Select Discharge CPT Code
                      </label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Choose based on total time spent on discharge day management
                      </p>
                      <div className="space-y-3">
                        {DISCHARGE_CPT_CODES.map((code) => (
                          <label
                            key={code.code}
                            className={cn(
                              "block p-4 rounded-xl border cursor-pointer transition-all",
                              cptCode === code.code
                                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <input
                              type="radio"
                              name="cpt"
                              value={code.code}
                              checked={cptCode === code.code}
                              onChange={() => setCptCode(code.code)}
                              className="sr-only"
                            />
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-foreground">
                                    {code.code}
                                  </span>
                                  <span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                                    {code.time}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {code.description}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-success">
                                  {code.rvu.toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground">RVU</div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg">
                      <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Documentation Tip:</span>{' '}
                        Include total face-to-face time with patient and time spent coordinating
                        care, reviewing discharge instructions, and completing paperwork.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 3: Confirm */}
                {step === 'confirm' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                      <h3 className="font-semibold text-foreground">Discharge Summary</h3>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Patient</p>
                          <p className="font-medium text-foreground">{patient.name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Room</p>
                          <p className="font-medium text-foreground">{patient.room || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Reason</p>
                          <p className="font-medium text-foreground">
                            {DISCHARGE_REASONS.find(r => r.id === reason)?.label}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">CPT Code</p>
                          <p className="font-medium text-foreground font-mono">{cptCode}</p>
                        </div>
                      </div>

                      {notes && (
                        <div>
                          <p className="text-muted-foreground text-sm">Notes</p>
                          <p className="text-sm text-foreground">{notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Billing Summary */}
                    <div className="p-4 bg-success/10 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-success" />
                          <span className="font-medium text-foreground">Billing Capture</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-success">
                            {selectedCpt?.rvu.toFixed(2)} RVU
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ~${(selectedCpt?.rvu || 0 * 40).toFixed(0)} estimated
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Generate Summary Option */}
                    <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={generateSummary}
                        onChange={(e) => setGenerateSummary(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Generate Discharge Summary Note
                        </p>
                        <p className="text-xs text-muted-foreground">
                          AI will create a discharge summary from existing notes
                        </p>
                      </div>
                    </label>

                    {/* Warning */}
                    <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        This action will mark the patient as discharged. They will be moved to
                        the archived patients list.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="shrink-0 p-4 border-t border-border bg-card">
                <div className="flex justify-between gap-3">
                  {step !== 'reason' ? (
                    <Button
                      variant="secondary"
                      onClick={() => setStep(step === 'confirm' ? 'billing' : 'reason')}
                      disabled={isSubmitting}
                      className="min-w-24"
                    >
                      Back
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="min-w-24"
                    >
                      Cancel
                    </Button>
                  )}

                  {step !== 'confirm' ? (
                    <Button
                      onClick={() => setStep(step === 'reason' ? 'billing' : 'confirm')}
                      className="min-w-28"
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      variant="destructive"
                      className="min-w-36"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Discharging...
                        </>
                      ) : (
                        <>
                          <LogOut className="w-4 h-4 mr-2" />
                          Confirm Discharge
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
