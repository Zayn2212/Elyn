import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PatientList from "@/components/patients/PatientList";
import PatientDetailPanel from "@/components/patients/PatientDetailPanel";
import RoundingModeToggle from "@/components/rounding/RoundingModeToggle";
import { User, Plus, UserPlus, Stethoscope } from "lucide-react";
import elynLogo from "@/assets/elyn-logo.png";
import { cn } from "@/lib/utils";
import type { CommandCenterState } from "@/hooks/useCommandCenter";
import { PatientListSkeleton } from "./TabSkeletons";
import OnboardingChecklist from "@/components/onboarding/OnboardingChecklist";
import {
  FeedbackFabButton,
  FeedbackWidgetControlled,
  useFeedbackState,
} from "@/components/feedback/FeedbackWidget";

export default function PatientsTab({ s, onFeedbackOpenChange }: { s: CommandCenterState; onFeedbackOpenChange: (open: boolean) => void }) {
  const feedback = useFeedbackState();
  useEffect(() => { onFeedbackOpenChange(feedback.open); }, [feedback.open]);
  if (s.isLoading) return <PatientListSkeleton />;

  return (
    <motion.div
      key="patients"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col overflow-hidden"
    >
      {/* Split-pane */}
      <div className="flex-1 min-h-0 overflow-hidden md:grid md:grid-cols-2">
        <div className="h-full md:border-r md:border-border flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-3 sm:px-4 pt-3">
              <OnboardingChecklist />
            </div>
            <PatientList
              patients={s.filteredPatients}
              onPatientSelect={s.handlePatientSelect}
              onRecordPatient={s.handleRecordPatient}
              onStatusChange={s.handleStatusChange}
              selectedPatientId={s.selectedPatient?.id}
              facilities={s.facilities}
              onEMRImport={() => s.setIsEMRImportOpen(true)}
            />
          </div>
        </div>

        <div className="hidden md:flex md:flex-col min-h-0 overflow-hidden">
          {s.selectedPatient ? (
            <PatientDetailPanel
              patient={s.selectedPatient}
              onRecordClick={() => s.handleRecordPatient(s.selectedPatient!)}
              onDischargeClick={() =>
                s.handleOpenDischargeModal(s.selectedPatient!)
              }
              onViewFull={() => s.setPatientDetailOpen(true)}
              onToast={s.showToast}
              onPatientUpdate={(updated) => {
                const merged = { ...s.selectedPatient!, ...updated };
                s.setSelectedPatient(merged);
                s.setPatients((prev) =>
                  prev.map((p) => (p.id === merged.id ? merged : p)),
                );
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <User className="w-10 h-10 opacity-30" />
              <p className="text-sm">Select a patient to view details</p>
              <p className="text-xs opacity-60">
                Click any patient card on the left
              </p>
            </div>
          )}
        </div>
      </div>

      {s.isRoundingMode && (
        <RoundingModeToggle
          isActive={s.isRoundingMode}
          onToggle={() => s.setIsRoundingMode(false)}
          onClose={() => s.setIsRoundingMode(false)}
          patients={s.filteredPatients}
          onStatusChange={s.handleStatusChange}
          onPatientSelect={s.handlePatientSelect}
        />
      )}

      {/* Mobile FAB */}
      {!s.isRoundingMode && (
        <div className="fixed bottom-20 right-4 md:hidden z-30">
          <AnimatePresence>
            {s.isFabMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-3 mb-3 items-end"
              >
                <button
                  onClick={() => {
                    s.setIsRoundingMode(true);
                    s.setIsFabMenuOpen(false);
                  }}
                  className="w-12 h-12 rounded-full bg-success text-success-foreground shadow-lg flex items-center justify-center"
                  aria-label="Start Rounds"
                >
                  <Stethoscope className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    s.setIsUnifiedImportOpen(true);
                    s.setIsFabMenuOpen(false);
                  }}
                  className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
                  aria-label="Import Patient"
                >
                  <UserPlus className="w-5 h-5" />
                </button>
                <FeedbackFabButton
                  onOpen={() => {
                    feedback.setOpen(true);
                    s.setIsFabMenuOpen(false);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <FeedbackWidgetControlled {...feedback} />
          <button
            onClick={() => s.setIsFabMenuOpen(!s.isFabMenuOpen)}
            className={cn(
              "w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
              s.isFabMenuOpen
                ? "bg-muted rotate-45"
                : "bg-card border border-border",
            )}
          >
            {s.isFabMenuOpen ? (
              <Plus className="w-6 h-6 text-foreground" />
            ) : (
              <img
                src={elynLogo}
                alt="Menu"
                className="w-8 h-8 object-contain mix-blend-multiply dark:mix-blend-screen"
              />
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
}
