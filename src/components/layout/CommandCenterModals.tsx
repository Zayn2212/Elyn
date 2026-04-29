import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ScanLine } from "lucide-react";
import RecordingSheet from "@/components/recording/RecordingSheet";
import ManageFacilities from "@/components/facility/ManageFacilities";
import QuickAddPatient from "@/components/patients/QuickAddPatient";
import NoteViewerModal from "@/components/notes/NoteViewerModal";
import BillingConfirmationModal from "@/components/billing/BillingConfirmationModal";
import PatientDetailSheet from "@/components/patients/PatientDetailSheet";
import DischargePatientModal from "@/components/patients/DischargePatientModal";
import HandoffNotesModal from "@/components/handoff/HandoffNotesModal";
import FaceSheetParser from "@/components/facesheet/FaceSheetParser";
import ClaimReportModal from "@/components/billing/ClaimReportModal";
import EMRQuickImport from "@/components/patients/EMRQuickImport";
import UnifiedImportSheet from "@/components/patients/UnifiedImportSheet";
import type { CommandCenterState } from "@/hooks/useCommandCenter";

export default function CommandCenterModals({ s }: { s: CommandCenterState }) {
  return (
    <>
      {/* Recording Sheet */}
      {s.isFeatureEnabled("ambient_capture") ? (
        <RecordingSheet
          isOpen={s.isRecordingSheetOpen}
          onClose={() => s.setIsRecordingSheetOpen(false)}
          isRecording={s.speech.isRecording}
          onToggleRecording={
            s.speech.isRecording ? s.speech.stop : s.speech.start
          }
          transcript={s.editableTranscript}
          onTranscriptChange={s.setEditableTranscript}
          interimText={s.speech.interim}
          noteType={s.noteType}
          onNoteTypeChange={s.setNoteType}
          onGenerate={s.generateNote}
          isGenerating={s.isGenerating}
          patientName={s.selectedPatient?.name}
          patientId={s.selectedPatient?.id}
          patients={s.filteredPatients}
          onPatientSelect={s.setSelectedPatient}
          isSupported={s.speech.isSupported}
          documentMode={s.documentMode}
          onDocumentModeChange={s.setDocumentMode}
          radiologyModality={s.radiologyModality}
          onRadiologyModalityChange={(modality) => {
            s.setRadiologyModality(modality);
            s.setRadiologyContext((prev) => ({ ...prev, modality }));
          }}
          radiologyContext={s.radiologyContext}
          onRadiologyContextChange={s.setRadiologyContext}
          providerSpecialty={s.providerSpecialty}
          hasExistingNotes={s.selectedPatientHasNotes}
          cardiologyStudyType={s.cardiologyStudyType}
          onCardiologyStudyTypeChange={s.setCardiologyStudyType}
        />
      ) : s.isRecordingSheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass-card p-8 max-w-sm text-center rounded-2xl">
            <p className="text-sm text-muted-foreground">
              Voice recording has been disabled by your administrator.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => s.setIsRecordingSheetOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      ) : null}

      <ManageFacilities
        isOpen={s.isManageFacilitiesOpen}
        onClose={() => s.setIsManageFacilitiesOpen(false)}
      />

      <QuickAddPatient
        isOpen={s.isQuickAddOpen}
        onClose={() => s.setIsQuickAddOpen(false)}
        onPatientAdded={() => {
          s.loadData();
          s.showToast("Patient added successfully");
        }}
        onBillCreated={(bill) => {
          s.setBills((prev) => [
            { ...bill, status: bill.status || "pending" },
            ...prev,
          ]);
          s.showToast("Bill created automatically");
        }}
      />

      <NoteViewerModal
        isOpen={s.generatedNoteModal.isOpen}
        onClose={() => {
          if (
            s.billingConfirmation.billing &&
            s.billingConfirmation.pendingNote
          )
            s.handleBillingConfirm(s.billingConfirmation.billing);
          s.setGeneratedNoteModal({ isOpen: false, note: null, noteId: null });
        }}
        note={s.generatedNoteModal.note}
        noteId={s.generatedNoteModal.noteId}
        billing={s.billingConfirmation.billing}
        onToast={s.showToast}
        onNoteUpdated={(updatedNote) => {
          if (s.generatedNoteModal.note)
            s.setGeneratedNoteModal((prev) => ({
              ...prev,
              note: { ...prev.note!, generatedNote: updatedNote },
            }));
        }}
      />

      <BillingConfirmationModal
        isOpen={s.billingConfirmation.isOpen}
        onClose={() =>
          s.setBillingConfirmation({
            isOpen: false,
            billing: null,
            pendingNote: "",
            pendingNoteExport: null,
          })
        }
        billing={
          s.billingConfirmation.billing || {
            icd10: [],
            cpt: [],
            emLevel: "99213",
            rvu: 0,
            mdmComplexity: "Low",
          }
        }
        patientName={s.selectedPatient?.name}
        noteType={s.noteType}
        onConfirm={s.handleBillingConfirm}
        onDiscard={s.handleBillingDiscard}
      />

      {s.selectedPatient && (
        <PatientDetailSheet
          isOpen={s.patientDetailOpen}
          onClose={() => s.setPatientDetailOpen(false)}
          patient={s.selectedPatient}
          onRecordClick={() => s.handleRecordPatient(s.selectedPatient!)}
          onDischargeClick={() =>
            s.handleOpenDischargeModal(s.selectedPatient!)
          }
          onToast={s.showToast}
          onPatientUpdate={(updatedPatient) => {
            s.setPatients((prev) =>
              prev.map((p) =>
                p.id === updatedPatient.id ? { ...p, ...updatedPatient } : p,
              ),
            );
            s.setSelectedPatient(updatedPatient);
          }}
        />
      )}

      {s.patientToDischarge && (
        <DischargePatientModal
          isOpen={s.dischargeModalOpen}
          onClose={() => {
            s.setDischargeModalOpen(false);
            s.setPatientToDischarge(null);
          }}
          patient={s.patientToDischarge}
          onDischarge={s.handleDischarge}
        />
      )}

      {s.isFeatureEnabled("handoff_generation") && (
        <HandoffNotesModal
          isOpen={s.handoffModalOpen}
          onClose={() => s.setHandoffModalOpen(false)}
          patients={s.patients}
          onToast={s.showToast}
        />
      )}

      {/* Face Sheet Modal */}
      <AnimatePresence>
        {s.isFaceSheetOpen && s.isFeatureEnabled("face_sheet_parser") && (
          <div className="fixed inset-0 z-50 md:flex md:items-center md:justify-center md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => s.setIsFaceSheetOpen(false)}
              className="absolute inset-0 bg-black/50"
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="fixed md:relative bottom-20 left-4 right-4 md:bottom-auto md:left-auto md:right-auto z-50 glass-card rounded-2xl max-h-[calc(100dvh-7rem)] md:max-h-[calc(100dvh-2rem)] flex flex-col md:max-w-2xl md:w-full"
            >
              <div className="flex justify-center pt-3 pb-2 md:hidden">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="px-4 pt-4 md:pt-5 pb-4 border-b border-border">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <ScanLine className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        AI Face Sheet Parser
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Extract patient info from face sheets
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => s.setIsFaceSheetOpen(false)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
                <FaceSheetParser
                  onPatientCreated={() => {
                    s.showToast("Patient created successfully");
                    s.setIsFaceSheetOpen(false);
                    s.loadData();
                  }}
                  onToast={s.showToast}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Claim Report */}
      <AnimatePresence>
        {s.claimReportBillId &&
          (() => {
            const fullBill = s.unifiedBills.find(
              (b) => b.id === s.claimReportBillId,
            );
            if (!fullBill) return null;
            return (
              <ClaimReportModal
                bill={fullBill}
                onClose={() => s.setClaimReportBillId(null)}
              />
            );
          })()}
      </AnimatePresence>

      <EMRQuickImport
        isOpen={s.isEMRImportOpen}
        onClose={() => s.setIsEMRImportOpen(false)}
        onPatientCreated={() => s.loadData()}
        onToast={s.showToast}
      />

      <UnifiedImportSheet
        isOpen={s.isUnifiedImportOpen}
        onClose={() => s.setIsUnifiedImportOpen(false)}
        onPatientCreated={() => s.loadData()}
        onBillCreated={(bill) => {
          s.setBills((prev) => [
            { ...bill, status: bill.status || "pending" },
            ...prev,
          ]);
          s.showToast("Bill created automatically");
        }}
        onToast={s.showToast}
      />
    </>
  );
}
