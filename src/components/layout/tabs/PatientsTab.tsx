import { motion, AnimatePresence } from "framer-motion";
import PatientList from "@/components/patients/PatientList";
import PatientDetailPanel from "@/components/patients/PatientDetailPanel";
import RoundingModeToggle from "@/components/rounding/RoundingModeToggle";
import { User, Plus, UserPlus, Stethoscope } from "lucide-react";
import elynLogo from "@/assets/elyn-logo.png";
import { cn } from "@/lib/utils";
import type { CommandCenterState } from "@/hooks/useCommandCenter";
import { PatientListSkeleton } from "./TabSkeletons";

export default function PatientsTab({ s }: { s: CommandCenterState }) {
  if (s.isLoading) return <PatientListSkeleton />;

  return (
    <motion.div
      key="patients"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col relative"
    >
      {/* Split-pane */}
      <div className="flex-1 min-h-0 md:grid md:grid-cols-2">
        <div className="h-full md:border-r md:border-border flex flex-col min-h-0">
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

        <div className="hidden md:block overflow-hidden">
          {s.selectedPatient ? (
            <PatientDetailPanel
              patient={s.selectedPatient}
              onRecordClick={() => s.handleRecordPatient(s.selectedPatient!)}
              onDischargeClick={() =>
                s.handleOpenDischargeModal(s.selectedPatient!)
              }
              onViewFull={() => s.setPatientDetailOpen(true)}
              onToast={s.showToast}
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
          patients={s.filteredPatients}
          onStatusChange={s.handleStatusChange}
          onPatientSelect={s.handlePatientSelect}
        />
      )}

      {/* Mobile FAB */}
      {!s.isRoundingMode && (
        <div className="fixed bottom-24 right-4 md:hidden z-30">
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
                  className="flex items-center justify-center w-14 md:w-auto md:px-4 h-14 rounded-full bg-success text-success-foreground shadow-lg text-sm font-medium"
                >
                  <Stethoscope className="w-6 h-6" />{" "}
                  <span className="hidden md:inline ml-2">Start Rounds</span>
                </button>
                <button
                  onClick={() => {
                    s.setIsUnifiedImportOpen(true);
                    s.setIsFabMenuOpen(false);
                  }}
                  className="flex items-center justify-center w-14 md:w-auto md:px-4 h-14 rounded-full bg-primary text-primary-foreground shadow-lg text-sm font-medium"
                >
                  <UserPlus className="w-6 h-6" />{" "}
                  <span className="hidden md:inline ml-2">Import Patient</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => s.setIsFabMenuOpen(!s.isFabMenuOpen)}
            className={cn(
              "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
              s.isFabMenuOpen
                ? "bg-muted rotate-45"
                : "bg-card border border-border",
            )}
          >
            {s.isFabMenuOpen ? (
              <Plus className="w-7 h-7 text-foreground" />
            ) : (
              <img
                src={elynLogo}
                alt="Menu"
                className="w-10 h-10 object-contain mix-blend-multiply dark:mix-blend-screen"
              />
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
}
