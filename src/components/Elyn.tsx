import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useElynState } from "@/hooks/useElynState";
import { useNoteGeneration } from "@/hooks/useNoteGeneration";
import AppLayout from "@/components/layout/AppLayout";
import AnalyticsDashboard from "./AnalyticsDashboard";
import {
  Waveform,
  NoteSection,
  Modal,
  Toast,
  copyToClipboard,
  parseNoteSections,
} from "./elyn/index";
import {
  RadiologyContextInput,
  ModalitySelector,
} from "./elyn/RadiologyContext";
import BillingConfirmationModal, {
  ExtractedBilling,
} from "./billing/BillingConfirmationModal";
import elynLogo from "@/assets/elyn-logo.png";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  Mic,
  MicOff,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Scan,
  Video,
  Phone,
  Plus,
  Trash2,
  Clock,
  FileText,
  RotateCcw,
  ClipboardPaste,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

import SyncStatusIndicator from "@/components/sync/SyncStatusIndicator";
import { ENCOUNTER_TYPES, POS_CODES } from "@/lib/encounterContext";
import type { EncounterContext } from "@/lib/encounterContext";
import { supabase } from "@/integrations/supabase/client";

export default function Elyn() {
  const navigate = useNavigate();
  const s = useElynState();
  const {
    generateNote,
    generateHandoff,
    savePatient,
    startEditingNote,
    saveNoteEdits,
    confirmBilling,
    discardBilling,
    confirmReview,
  } = useNoteGeneration(s);

  const handleBillingConfirm = (edited: ExtractedBilling) => {
    confirmBilling({
      icd10: edited.icd10,
      cpt: edited.cpt,
      em: edited.emLevel,
      rvu: edited.rvu,
      mdm: edited.mdmComplexity,
      modifiers: s.codes?.modifiers || [],
    });
  };

  return (
    <AppLayout maxWidth="7xl" className="p-3 md:p-4 min-h-screen">
      <Header s={s} navigate={navigate} />

      <AnimatePresence mode="wait">
        {s.activeTab === "document" && (
          <motion.div
            key="document"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <StatsBar stats={s.todayStats} />

            {/* Mobile Layout */}
            <div className="md:hidden space-y-3">
              <CollapsibleSection
                id="recording"
                title="Voice Recording"
                icon="🎙️"
                expanded={s.expandedSection}
                toggle={s.toggleSection}
                headerAction={
                  s.speech.isRecording && (
                    <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  )
                }
              >
                <VoiceRecorderSection speech={s.speech} />
              </CollapsibleSection>

              <CollapsibleSection
                id="patient"
                title={s.patient.name || "Patient"}
                icon="👤"
                expanded={s.expandedSection}
                toggle={s.toggleSection}
                headerAction={
                  s.savedPatients.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {s.savedPatients.length} saved
                    </span>
                  )
                }
              >
                <PatientSection s={s} />
              </CollapsibleSection>

              <ModeToggle
                documentMode={s.documentMode}
                setDocumentMode={s.setDocumentMode}
              />

              {s.documentMode === "clinical" && (
                <CollapsibleSection
                  id="encounter"
                  title="Encounter"
                  icon="🏥"
                  expanded={s.expandedSection}
                  toggle={s.toggleSection}
                >
                  <EncounterContextSection
                    encounterContext={s.encounterContext}
                    setEncounterContext={s.setEncounterContext}
                  />
                </CollapsibleSection>
              )}

              <CollapsibleSection
                id="noteType"
                title={
                  s.documentMode === "radiology" ? "Modality" : "Note Type"
                }
                icon={s.documentMode === "radiology" ? "🔬" : "📋"}
                expanded={s.expandedSection}
                toggle={s.toggleSection}
              >
                {s.documentMode === "radiology" ? (
                  <ModalitySelector
                    modality={s.radiologyModality}
                    onModalityChange={(m) => {
                      s.setRadiologyModality(m);
                      s.setRadiologyContext((prev) => ({
                        ...prev,
                        modality: m,
                      }));
                    }}
                  />
                ) : (
                  <NoteTypeSelector
                    noteType={s.noteType}
                    setNoteType={s.setNoteType}
                  />
                )}
              </CollapsibleSection>

              {s.documentMode === "radiology" && (
                <CollapsibleSection
                  id="studyContext"
                  title="Study Details"
                  icon="📋"
                  expanded={s.expandedSection}
                  toggle={s.toggleSection}
                >
                  <RadiologyContextInput
                    context={s.radiologyContext}
                    onChange={s.setRadiologyContext}
                    modality={s.radiologyModality}
                    onModalityChange={s.setRadiologyModality}
                  />
                </CollapsibleSection>
              )}

              <TranscriptSection s={s} generateNote={generateNote} />

              {(s.generatedNote || s.isGenerating) && (
                <NoteDisplay
                  s={s}
                  startEditingNote={startEditingNote}
                  saveNoteEdits={saveNoteEdits}
                  generateHandoff={generateHandoff}
                  confirmReview={confirmReview}
                />
              )}
              {s.codes && (
                <CollapsibleSection
                  id="billing"
                  title="Billing"
                  icon="💰"
                  expanded={s.expandedSection}
                  toggle={s.toggleSection}
                  headerAction={
                    <span className="text-sm font-bold text-primary">
                      {s.codes.rvu?.toFixed(2)} RVU
                    </span>
                  }
                >
                  <EditableBillingSection
                    codes={s.codes}
                    setCodes={s.setCodes}
                    noteId={s.currentNoteId}
                    userId={s.user?.id}
                    showToast={s.showToast}
                  />
                </CollapsibleSection>
              )}
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:grid grid-cols-12 gap-5">
              <div className="col-span-3 space-y-5">
                <PanelCard
                  title="👤 Patient"
                  headerAction={
                    s.savedPatients.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => s.setShowPatientList(!s.showPatientList)}
                        className="h-7 px-2 text-xs rounded-lg hover:bg-muted"
                      >
                        {s.showPatientList
                          ? "✕"
                          : `📋 ${s.savedPatients.length}`}
                      </Button>
                    )
                  }
                >
                  <PatientSection s={s} />
                </PanelCard>
                <PanelCard title="🎙️ Voice Recording" variant="secondary">
                  <VoiceRecorderSection speech={s.speech} />
                </PanelCard>
                <ModeToggle
                  documentMode={s.documentMode}
                  setDocumentMode={s.setDocumentMode}
                />
                {s.documentMode === "clinical" && (
                  <PanelCard title="🏥 Encounter">
                    <EncounterContextSection
                      encounterContext={s.encounterContext}
                      setEncounterContext={s.setEncounterContext}
                    />
                  </PanelCard>
                )}
                <PanelCard
                  title={
                    s.documentMode === "radiology"
                      ? "🔬 Modality"
                      : "📋 Note Type"
                  }
                  variant="warning"
                >
                  {s.documentMode === "radiology" ? (
                    <ModalitySelector
                      modality={s.radiologyModality}
                      onModalityChange={(m) => {
                        s.setRadiologyModality(m);
                        s.setRadiologyContext((prev) => ({
                          ...prev,
                          modality: m,
                        }));
                      }}
                    />
                  ) : (
                    <NoteTypeSelector
                      noteType={s.noteType}
                      setNoteType={s.setNoteType}
                    />
                  )}
                </PanelCard>
                {s.documentMode === "radiology" && (
                  <PanelCard title="📋 Study Details" variant="secondary">
                    <RadiologyContextInput
                      context={s.radiologyContext}
                      onChange={s.setRadiologyContext}
                      modality={s.radiologyModality}
                      onModalityChange={s.setRadiologyModality}
                    />
                  </PanelCard>
                )}
              </div>

              <div className="col-span-6 space-y-5">
                <TranscriptSection s={s} generateNote={generateNote} desktop />
                <NoteDisplay
                  s={s}
                  startEditingNote={startEditingNote}
                  saveNoteEdits={saveNoteEdits}
                  generateHandoff={generateHandoff}
                  desktop
                  confirmReview={confirmReview}
                />
              </div>

              <div className="col-span-3 space-y-5">
                <PanelCard
                  title="💰 Billing"
                  variant="warning"
                  headerAction={
                    s.codes && (
                      <span className="text-lg font-bold text-primary">
                        {s.codes.rvu?.toFixed(2)} RVU
                      </span>
                    )
                  }
                >
                  {s.codes ? (
                    <EditableBillingSection
                      codes={s.codes}
                      setCodes={s.setCodes}
                      noteId={s.currentNoteId}
                      userId={s.user?.id}
                      showToast={s.showToast}
                    />
                  ) : (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center mb-4">
                        <span className="text-3xl">💰</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Billing codes will appear
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        after note generation
                      </div>
                    </div>
                  )}
                </PanelCard>
              </div>
            </div>
          </motion.div>
        )}

        {s.activeTab === "analytics" && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AnalyticsDashboard />
          </motion.div>
        )}

        {s.activeTab === "settings" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-card/60 backdrop-blur-xl border border-primary/20 rounded-2xl p-6 max-w-xl mx-auto"
          >
            <h2 className="text-xl font-bold mb-6 text-primary">⚙️ Settings</h2>
            <div className="space-y-4">
              {[
                [
                  "👤",
                  "Profile Settings",
                  "Update your name, specialty, and NPI",
                  "/profile",
                ],
                [
                  "💰",
                  "Billing Agent",
                  "Manage billing records and CPT codes",
                  "/billing-agent",
                ],
                [
                  "🏥",
                  "Practice Manager",
                  "Patient census and multi-specialty view",
                  "/practice-manager",
                ],
              ].map(([icon, title, desc, path]) => (
                <Button
                  key={path}
                  onClick={() => navigate(path)}
                  variant="outline"
                  className="w-full justify-start h-14 px-4 border-primary/20 hover:border-primary/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <div className="text-left">
                      <div className="font-medium">{title}</div>
                      <div className="text-xs text-muted-foreground">
                        {desc}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Patient Modal */}
      <AnimatePresence>
        {s.showPatientModal && (
          <Modal onClose={() => s.setShowPatientModal(false)}>
            <PatientModal s={s} savePatient={savePatient} />
          </Modal>
        )}
      </AnimatePresence>

      {/* Billing Confirmation Modal */}
      {s.showBillingConfirmation && s.pendingBilling && (
        <BillingConfirmationModal
          isOpen={s.showBillingConfirmation}
          onClose={() => s.setShowBillingConfirmation(false)}
          billing={{
            icd10: s.pendingBilling.billing.icd10 || [],
            cpt: s.pendingBilling.billing.cpt || [],
            emLevel: s.pendingBilling.billing.em || "",
            rvu: s.pendingBilling.billing.rvu || 0,
            mdmComplexity: s.pendingBilling.billing.mdm || "",
          }}
          patientName={s.patient.name}
          noteType={s.pendingBilling.currentNoteType}
          onConfirm={handleBillingConfirm}
          onDiscard={discardBilling}
        />
      )}

      {/* Handoff Modal */}
      <AnimatePresence>
        {s.showHandoff && (
          <Modal onClose={() => s.setShowHandoff(false)}>
            <div className="p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-primary">
                  🔄 Handoff Summary
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => s.setShowHandoff(false)}
                >
                  ✕
                </Button>
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {s.handoffSummary}
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => s.setShowHandoff(false)}
                  className="flex-1 border-primary/30"
                >
                  Close
                </Button>
                <Button
                  onClick={() => copyToClipboard(s.handoffSummary, s.showToast)}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  📋 Copy
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {s.toast && <Toast message={s.toast} />}
      </AnimatePresence>
    </AppLayout>
  );
}

// === Sub-components ===

function Header({
  s,
  navigate,
}: {
  s: ReturnType<typeof useElynState>;
  navigate: (path: string) => void;
}) {
  return (
    <header className="bg-card/70 backdrop-blur-xl border border-border rounded-2xl p-3 md:p-5 mb-4 md:mb-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img
            src={elynLogo}
            alt="elyn"
            className="w-10 h-10 md:w-12 md:h-12 object-contain mix-blend-multiply dark:mix-blend-screen"
          />
          <div>
            <h1 className="text-xl md:text-2xl font-medium text-primary">
              elyn™
            </h1>
            <span className="hidden md:inline-block px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded-full">
              Rounds Simplified
            </span>
          </div>
        </div>
        <nav className="hidden md:flex gap-1 bg-muted/50 p-1 rounded-xl">
          {[
            ["document", "📝", "Document"],
            ["analytics", "📊", "Analytics"],
            ["settings", "⚙️", "Settings"],
          ].map(([key, icon, label]) => (
            <Button
              key={key}
              onClick={() => s.setActiveTab(key)}
              variant="ghost"
              size="sm"
              className={cn(
                "px-4 py-2 rounded-lg",
                s.activeTab === key
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <span className="mr-1.5">{icon}</span>
              {label}
            </Button>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <SyncStatusIndicator
            status={s.syncStatus}
            lastSyncTime={s.lastSyncTime}
            connectedDevices={s.connectedDevices}
            onForceSync={s.forceSync}
          />
          <VoiceStatusBadge speech={s.speech} />
          <Button
            onClick={() => navigate("/practice-manager")}
            variant="outline"
            size="sm"
          >
            Practice
          </Button>
          <Button
            variant="ghost"
            onClick={s.signOut}
            size="sm"
            className="text-muted-foreground"
          >
            Sign Out
          </Button>
        </div>
        <div className="flex md:hidden items-center gap-2">
          <SyncStatusIndicator
            status={s.syncStatus}
            lastSyncTime={s.lastSyncTime}
            compact
          />
          <VoiceStatusBadge speech={s.speech} compact />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => s.setMobileMenuOpen(!s.mobileMenuOpen)}
            className="p-2"
          >
            {s.mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
      <AnimatePresence>
        {s.mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden mt-4 pt-4 border-t border-border"
          >
            <nav className="flex flex-col gap-2 mb-4">
              {[
                ["document", "📝", "Document"],
                ["analytics", "📊", "Analytics"],
                ["settings", "⚙️", "Settings"],
              ].map(([key, icon, label]) => (
                <Button
                  key={key}
                  onClick={() => {
                    s.setActiveTab(key);
                    s.setMobileMenuOpen(false);
                  }}
                  variant="ghost"
                  className={cn(
                    "justify-start px-4 py-3 rounded-xl",
                    s.activeTab === key
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  <span className="mr-2 text-lg">{icon}</span>
                  {label}
                </Button>
              ))}
            </nav>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  navigate("/profile");
                  s.setMobileMenuOpen(false);
                }}
                variant="outline"
                className="justify-start"
              >
                👤 Profile Settings
              </Button>
              <Button
                onClick={() => {
                  navigate("/practice-manager");
                  s.setMobileMenuOpen(false);
                }}
                variant="outline"
                className="justify-start"
              >
                Practice Manager
              </Button>
              <Button
                variant="ghost"
                onClick={s.signOut}
                className="justify-start text-destructive"
              >
                Sign Out
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function StatsBar({
  stats,
}: {
  stats: { notes: number; rvu: number; consults: number; avgTime: string };
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6">
      {[
        ["Notes Today", stats.notes, "📝"],
        ["Total wRVU", stats.rvu.toFixed(1), "💰"],
        ["Consults", stats.consults, "🩺"],
        ["Avg Time", stats.avgTime, "⏱️"],
      ].map(([label, value, icon]) => (
        <div
          key={label as string}
          className="bg-card/60 backdrop-blur-xl border border-border rounded-xl p-3 md:p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl md:text-2xl font-bold text-foreground">
                {value}
              </div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
            <div className="text-xl md:text-2xl opacity-60">{icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PanelCard({
  title,
  children,
  variant,
  headerAction,
}: {
  title: string;
  children: React.ReactNode;
  variant?: string;
  headerAction?: React.ReactNode;
}) {
  const bg =
    variant === "secondary"
      ? "bg-secondary/10"
      : variant === "warning"
        ? "bg-warning/10"
        : "bg-primary/10";
  const text =
    variant === "secondary"
      ? "text-secondary"
      : variant === "warning"
        ? "text-warning"
        : "text-primary";
  return (
    <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl overflow-hidden">
      <div className={`${bg} px-5 py-3 border-b border-border`}>
        <div className="flex items-center justify-between">
          <span
            className={`text-sm font-semibold ${text} uppercase tracking-wider`}
          >
            {title}
          </span>
          {headerAction}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function CollapsibleSection({
  id,
  title,
  icon,
  children,
  expanded,
  toggle,
  headerAction,
}: {
  id: string;
  title: string;
  icon: string;
  children: React.ReactNode;
  expanded: string | null;
  toggle: (id: string) => void;
  headerAction?: React.ReactNode;
}) {
  const isExpanded = expanded === id;
  return (
    <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => toggle(id)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-semibold text-primary">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {headerAction}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModeToggle({
  documentMode,
  setDocumentMode,
}: {
  documentMode: string;
  setDocumentMode: (v: any) => void;
}) {
  return (
    <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-3">
      <div className="flex gap-2">
        {[
          ["clinical", Stethoscope, "Clinical"],
          ["radiology", Scan, "Radiology"],
        ].map(([mode, Icon, label]) => (
          <Button
            key={mode as string}
            onClick={() => setDocumentMode(mode)}
            variant="ghost"
            size="sm"
            className={cn(
              "flex-1 h-10 rounded-xl",
              documentMode === mode
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {React.createElement(Icon as any, { className: "w-4 h-4 mr-2" })}
            {label as string}
          </Button>
        ))}
      </div>
    </div>
  );
}

function VoiceStatusBadge({
  speech,
  compact = false,
}: {
  speech: any;
  compact?: boolean;
}) {
  if (speech.error)
    return (
      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border bg-destructive/15 border-destructive/40 text-destructive">
        <AlertCircle className="w-3 h-3" />
        {!compact && "Error"}
      </span>
    );
  if (speech.isRecording)
    return (
      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border animate-pulse bg-destructive/15 border-destructive/40 text-destructive">
        <span className="w-2 h-2 bg-destructive rounded-full" />
        {!compact && "Recording"}
      </span>
    );
  return (
    <span
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
        speech.isSupported
          ? "bg-primary/15 border-primary/40 text-primary"
          : "bg-muted border-border text-muted-foreground",
      )}
    >
      {speech.isSupported ? (
        <>
          <Mic className="w-3 h-3" />
          {!compact && "Voice Ready"}
        </>
      ) : (
        <>
          <MicOff className="w-3 h-3" />
          {!compact && "No Voice"}
        </>
      )}
    </span>
  );
}

function VoiceRecorderSection({ speech }: { speech: any }) {
  return (
    <div className="space-y-4">
      {speech.error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-destructive">{speech.error.message}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={speech.clearError}
              className="mt-2 h-7 text-xs text-destructive hover:bg-destructive/20"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
      <div className="bg-muted/50 rounded-xl p-4">
        <Waveform active={speech.isRecording} />
      </div>
      <Button
        onClick={speech.isRecording ? speech.stop : speech.start}
        disabled={!speech.isSupported && !speech.error}
        className={cn(
          "w-full h-12 text-base font-semibold rounded-xl",
          speech.isRecording
            ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground recording-pulse"
            : "bg-secondary hover:bg-secondary/90 text-secondary-foreground",
        )}
      >
        {speech.isRecording ? (
          <>
            <MicOff className="w-5 h-5 mr-2" />
            Stop Recording
          </>
        ) : (
          <>
            <Mic className="w-5 h-5 mr-2" />
            Start Recording
          </>
        )}
      </Button>
      {speech.interim && (
        <div className="text-sm text-muted-foreground italic bg-muted/50 rounded-lg p-3">
          "{speech.interim}"
        </div>
      )}
      {speech.permissionState === "denied" && (
        <p className="text-xs text-muted-foreground text-center">
          Microphone access is blocked. Enable it in browser settings.
        </p>
      )}
    </div>
  );
}

function PatientSection({ s }: { s: ReturnType<typeof useElynState> }) {
  const [showImport, setShowImport] = React.useState(false);

  return (
    <>
      <AnimatePresence>
        {s.showPatientList && s.savedPatients.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 max-h-48 overflow-auto rounded-xl border border-border bg-muted/50"
          >
            {s.savedPatients.map((p) => (
              <div
                key={p.id}
                onClick={() => s.selectPatient(p)}
                className="p-3 cursor-pointer hover:bg-muted border-b border-border last:border-b-0 flex justify-between items-center"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {p.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.room && `Room ${p.room}`}
                  </div>
                </div>
                {s.patient.id === p.id && (
                  <span className="text-primary text-sm">✓</span>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {s.patient.name ? (
        <div>
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="font-bold text-lg text-foreground">
                {s.patient.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {s.patient.room && `Room ${s.patient.room}`}{" "}
                {s.patient.mrn && `• ${s.patient.mrn}`}
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => s.setShowPatientModal(true)}
                className="h-8 w-8 p-0 rounded-lg hover:bg-muted"
              >
                ✏️
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={s.clearPatient}
                className="h-8 w-8 p-0 rounded-lg hover:bg-destructive/20 text-destructive"
              >
                ✕
              </Button>
            </div>
          </div>
          {s.patient.diagnosis && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-2">
              📋 {s.patient.diagnosis}
            </div>
          )}
          {s.patient.allergies && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-2">
              ⚠️ {s.patient.allergies}
            </div>
          )}
          {s.patient.insurance_name && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              🏥 {s.patient.insurance_name}{" "}
              {s.patient.insurance_id && `• ${s.patient.insurance_id}`}
            </div>
          )}
        </div>
      ) : (
        <Button
          onClick={() => s.setShowPatientModal(true)}
          variant="outline"
          className="w-full h-16 border-dashed border-2 border-border text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 rounded-xl"
        >
          <div className="text-center">
            <div className="text-2xl mb-1">+</div>
            <div className="text-sm">Add Patient Manually</div>
          </div>
        </Button>
      )}
      {s.savedPatients.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => s.setShowPatientList(!s.showPatientList)}
          className="w-full mt-3 text-xs text-muted-foreground"
        >
          {s.showPatientList
            ? "Hide saved patients"
            : `View ${s.savedPatients.length} saved patients`}
        </Button>
      )}
    </>
  );
}

// Enhanced transcript with word count, duration badge, append/replace toggle
function TranscriptSection({
  s,
  generateNote,
  desktop,
}: {
  s: ReturnType<typeof useElynState>;
  generateNote: () => void;
  desktop?: boolean;
}) {
  const wordCount = s.editableTranscript.trim()
    ? s.editableTranscript.trim().split(/\s+/).length
    : 0;
  const charCount = s.editableTranscript.length;

  return (
    <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl overflow-hidden">
      <div className="px-4 md:px-5 py-3 bg-muted/50 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            📝 Transcript
          </span>
          {s.speech.isRecording && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-destructive/15 border border-destructive/30 rounded-full text-xs text-destructive animate-pulse">
              <Clock className="w-3 h-3" /> Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Append/Replace toggle */}
          <button
            onClick={() => s.setAppendMode(!s.appendMode)}
            className={cn(
              "px-2 py-1 rounded-lg text-xs font-medium border transition-colors",
              s.appendMode
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted border-border text-muted-foreground",
            )}
          >
            {s.appendMode ? "➕ Append" : "🔄 Replace"}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(s.editableTranscript, s.showToast)}
            className="h-7 px-2 text-xs"
          >
            📋
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              s.speech.clear();
              s.setEditableTranscript("");
            }}
            className="h-7 px-2 text-xs text-destructive"
          >
            🗑️
          </Button>
        </div>
      </div>
      <div className="p-4 md:p-5">
        <textarea
          value={s.editableTranscript}
          onChange={(e) => s.setEditableTranscript(e.target.value)}
          placeholder="Start recording or type your clinical notes here..."
          className={cn(
            "w-full p-3 md:p-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground resize-y text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
            desktop ? "min-h-[140px] font-mono" : "min-h-[120px]",
          )}
        />

        {/* Word/char count bar */}
        {s.editableTranscript.trim() && (
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {wordCount} words
            </span>
            <span>{charCount} chars</span>
          </div>
        )}

        {!s.isPatientClaimsReady && s.editableTranscript.trim() && (
          <div className="mt-3 p-2.5 md:p-3 rounded-xl bg-warning/10 border border-warning/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
            <p className="text-xs md:text-sm text-warning">
              Complete patient demographics & insurance before generating
            </p>
          </div>
        )}
        <Button
          onClick={generateNote}
          disabled={s.isGenerating || !s.editableTranscript.trim()}
          className="w-full mt-3 md:mt-4 h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl disabled:opacity-50"
        >
          {s.isGenerating
            ? `⏳ Generating ${s.documentMode === "radiology" ? "Report" : "Note"}...`
            : `✨ Generate ${s.documentMode === "radiology" ? s.radiologyModality.toUpperCase() + " Report" : s.noteType + " Note"}`}
        </Button>
      </div>
    </div>
  );
}

// Section color map for note editing
const SECTION_COLORS: Record<string, string> = {
  "Chief Complaint": "border-l-destructive",
  HPI: "border-l-primary",
  "History of Present Illness": "border-l-primary",
  "Review of Systems": "border-l-secondary",
  "Physical Exam": "border-l-warning",
  Assessment: "border-l-accent",
  Plan: "border-l-chart-1",
  Findings: "border-l-primary",
  Impression: "border-l-accent",
};

// Auto-resize textarea hook
function AutoResizeTextarea({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full p-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm resize-none focus:outline-none focus:border-primary/50 overflow-hidden",
        className,
      )}
    />
  );
}

// Improved NoteDisplay with section colors, auto-resize, unsaved indicator
function NoteDisplay({
  s,
  startEditingNote,
  saveNoteEdits,
  generateHandoff,
  desktop,
  confirmReview,
}: {
  s: ReturnType<typeof useElynState>;
  startEditingNote: () => void;
  saveNoteEdits: () => void;
  generateHandoff: () => void;
  desktop?: boolean;
  confirmReview: () => void;
}) {
  const hasUnsavedEdits = s.isEditingNote;
  const allSectionsReviewed =
    Object.keys(s.reviewedSections).length > 0 &&
    Object.values(s.reviewedSections).every((v) => v);
  const hasNote = Boolean(s.generatedNote);
  const needsReview = hasNote && !s.isNoteReviewed && !s.currentNoteId;

  const handleReviewToggle = (title: string) => {
    s.setReviewedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleReviewAll = () => {
    s.setReviewedSections((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        updated[k] = true;
      });
      return updated;
    });
  };

  return (
    <div
      className={cn(
        "backdrop-blur-xl rounded-2xl overflow-hidden",
        needsReview
          ? "bg-amber-500/5 border-2 border-dashed border-amber-500/40"
          : "bg-card/60 border border-border",
      )}
    >
      <div
        className={cn(
          "px-4 md:px-5 py-3 border-b border-border flex justify-between items-center",
          desktop ? "bg-primary/10" : "bg-muted/30",
        )}
      >
        <div className="flex items-center gap-2 md:gap-3">
          <span
            className={cn(
              "text-sm font-semibold uppercase tracking-wider text-primary",
            )}
          >
            📄 Generated Note
          </span>
          {needsReview && (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" />
              AI Draft · Review Required
            </span>
          )}
          {s.isNoteReviewed && s.currentNoteId && !s.isEditingNote && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              Physician Reviewed ✓
            </span>
          )}
          {hasUnsavedEdits && (
            <span className="text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full animate-pulse">
              ● Unsaved changes
            </span>
          )}
        </div>
        {s.generatedNote && (
          <div className="flex gap-1 md:gap-2">
            {s.isNoteReviewed && (
              <>
                <Button
                  size="sm"
                  variant={
                    s.isEditingNote ? "default" : desktop ? "outline" : "ghost"
                  }
                  onClick={s.isEditingNote ? saveNoteEdits : startEditingNote}
                  className="h-7 px-3 text-xs"
                >
                  {s.isEditingNote ? "💾 Save" : "✏️ Edit"}
                </Button>
                {s.isEditingNote && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => s.setIsEditingNote(false)}
                    className="h-7 px-2 text-xs text-muted-foreground"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Discard
                  </Button>
                )}
                {!s.isEditingNote && (
                  <>
                    <Button
                      size="sm"
                      onClick={() =>
                        copyToClipboard(s.generatedNote, s.showToast)
                      }
                      className="h-7 px-3 text-xs bg-primary text-primary-foreground"
                    >
                      Copy All
                    </Button>
                    {desktop && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={generateHandoff}
                        className="h-7 px-3 text-xs text-muted-foreground"
                      >
                        🔄 Handoff
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <div className={cn("p-4 md:p-5", desktop ? "min-h-[350px]" : "")}>
        {s.generatedNote ? (
          <div
            className={cn(
              "space-y-3 md:space-y-4 overflow-auto",
              desktop ? "max-h-[400px] pr-2" : "max-h-[400px]",
            )}
          >
            {s.isEditingNote
              ? Object.entries(s.editedNoteSections).map(([title, content]) => (
                  <div
                    key={title}
                    className={cn(
                      "border-l-4 pl-3 rounded-r-xl",
                      SECTION_COLORS[title] || "border-l-muted-foreground",
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-primary uppercase tracking-wider">
                        {title}
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(`${title}:\n${content}`, s.showToast)
                        }
                        className="h-6 px-2 text-xs text-muted-foreground"
                      >
                        📋
                      </Button>
                    </div>
                    <AutoResizeTextarea
                      value={content}
                      onChange={(v) =>
                        s.setEditedNoteSections((prev) => ({
                          ...prev,
                          [title]: v,
                        }))
                      }
                    />
                  </div>
                ))
              : parseNoteSections(s.generatedNote).map((section, i) => (
                  <NoteSection
                    key={i}
                    title={section.title}
                    content={section.content.trim()}
                    onCopy={(text) =>
                      copyToClipboard(`${section.title}:\n${text}`, s.showToast)
                    }
                    isAiGenerated={!s.isNoteReviewed}
                    isReviewed={s.reviewedSections[section.title] || false}
                    onReviewToggle={
                      needsReview ? handleReviewToggle : undefined
                    }
                  />
                ))}

            {/* Review Actions */}
            {needsReview && (
              <div className="flex flex-col items-center gap-3 pt-4 border-t border-amber-500/20">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Review each section above, then confirm</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReviewAll}
                    className="text-xs h-8 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  >
                    Review All Sections
                  </Button>
                  <Button
                    onClick={confirmReview}
                    disabled={!allSectionsReviewed}
                    className={cn(
                      "h-10 px-6 text-sm font-semibold rounded-xl transition-all",
                      allSectionsReviewed
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-muted text-muted-foreground cursor-not-allowed",
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    I've Reviewed This Note
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {allSectionsReviewed
                    ? "✓ All sections reviewed — ready to confirm"
                    : `${Object.values(s.reviewedSections).filter((v) => v).length}/${Object.keys(s.reviewedSections).length} sections reviewed`}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "flex flex-col items-center justify-center text-muted-foreground",
              desktop ? "h-[280px]" : "h-32",
            )}
          >
            {desktop && (
              <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <span className="text-4xl">📝</span>
              </div>
            )}
            <div className="text-base font-medium">
              {s.isGenerating
                ? "Generating note..."
                : "Your note will appear here"}
            </div>
            {desktop && !s.isGenerating && (
              <div className="text-sm mt-1">Record or type, then generate</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NoteTypeSelector({
  noteType,
  setNoteType,
}: {
  noteType: string;
  setNoteType: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        ["H&P", "🏥"],
        ["Consult", "🩺"],
        ["Progress", "📋"],
      ].map(([type, icon]) => (
        <Button
          key={type}
          onClick={() => setNoteType(type)}
          variant="ghost"
          className={cn(
            "flex flex-col gap-2 h-auto py-3 md:py-4 rounded-xl border-2",
            noteType === type
              ? "bg-primary text-primary-foreground border-transparent"
              : "border-border text-muted-foreground hover:border-primary/50 hover:bg-muted",
          )}
        >
          <span className="text-lg md:text-xl">{icon}</span>
          <span className="text-xs font-semibold">{type}</span>
        </Button>
      ))}
    </div>
  );
}

function EncounterContextSection({
  encounterContext,
  setEncounterContext,
}: {
  encounterContext: EncounterContext;
  setEncounterContext: React.Dispatch<React.SetStateAction<EncounterContext>>;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1.5">
        {ENCOUNTER_TYPES.map((et) => (
          <button
            key={et.id}
            onClick={() =>
              setEncounterContext((prev) => ({
                ...prev,
                encounterType: et.id,
                isTelehealth:
                  et.id === "telehealth_consult" ? true : prev.isTelehealth,
                placeOfService:
                  et.id === "telehealth_consult" ? "02" : prev.placeOfService,
              }))
            }
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all",
              encounterContext.encounterType === et.id
                ? "bg-primary text-primary-foreground border-transparent"
                : "border-border text-muted-foreground hover:border-primary/50 hover:bg-muted",
            )}
          >
            <span className="text-base">{et.icon}</span>
            <span className="font-medium leading-tight text-center">
              {et.label}
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" />
          <span className="text-sm text-foreground">Telehealth</span>
        </div>
        <button
          onClick={() =>
            setEncounterContext((prev) => ({
              ...prev,
              isTelehealth: !prev.isTelehealth,
              placeOfService: !prev.isTelehealth ? "02" : prev.placeOfService,
            }))
          }
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            encounterContext.isTelehealth
              ? "bg-primary"
              : "bg-muted-foreground/30",
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              encounterContext.isTelehealth ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          Place of Service
        </label>
        <select
          value={encounterContext.placeOfService}
          onChange={(e) =>
            setEncounterContext((prev) => ({
              ...prev,
              placeOfService: e.target.value,
            }))
          }
          className="w-full p-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50"
        >
          {POS_CODES.map((pos) => (
            <option key={pos.code} value={pos.code}>
              {pos.label}
            </option>
          ))}
        </select>
      </div>
      {(encounterContext.encounterType === "initial_consult" ||
        encounterContext.encounterType === "telehealth_consult") && (
        <div className="space-y-2 p-3 bg-warning/5 border border-warning/20 rounded-xl">
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-warning" />
            <span className="text-xs font-medium text-warning">
              Referring Provider (Required)
            </span>
          </div>
          <input
            value={encounterContext.referringProvider}
            onChange={(e) =>
              setEncounterContext((prev) => ({
                ...prev,
                referringProvider: e.target.value,
              }))
            }
            placeholder="Provider name"
            className="w-full p-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50"
          />
          <input
            value={encounterContext.referringNPI}
            onChange={(e) =>
              setEncounterContext((prev) => ({
                ...prev,
                referringNPI: e.target.value,
              }))
            }
            placeholder="NPI #"
            className="w-full p-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50"
          />
        </div>
      )}
      {(encounterContext.isTelehealth ||
        encounterContext.encounterType === "telehealth_consult") && (
        <div className="p-2 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-xs text-primary">
            ✓ Modifier -95 will be auto-applied • POS{" "}
            {encounterContext.placeOfService}
          </p>
        </div>
      )}
    </div>
  );
}

// Editable inline billing section with add/remove codes, E/M dropdown, MDM, RVU override
const EM_LEVELS = [
  "99202",
  "99203",
  "99204",
  "99205",
  "99211",
  "99212",
  "99213",
  "99214",
  "99215",
  "99221",
  "99222",
  "99223",
  "99231",
  "99232",
  "99233",
  "99241",
  "99242",
  "99243",
  "99244",
  "99245",
  "99251",
  "99252",
  "99253",
  "99254",
  "99255",
];
const MDM_LEVELS = ["Straightforward", "Low", "Moderate", "High"];

function EditableBillingSection({
  codes,
  setCodes,
  noteId,
  userId,
  showToast,
}: {
  codes: any;
  setCodes: (c: any) => void;
  noteId: string | null;
  userId: string | undefined;
  showToast: (m: string) => void;
}) {
  const [newIcd, setNewIcd] = React.useState("");
  const [newCpt, setNewCpt] = React.useState("");
  const [isDirty, setIsDirty] = React.useState(false);

  const updateCode = (field: string, value: any) => {
    setCodes((prev: any) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const addCode = (
    type: "icd10" | "cpt",
    code: string,
    setter: (v: string) => void,
  ) => {
    if (!code.trim()) return;
    updateCode(type, [
      ...(codes[type] || []),
      { code: code.trim().toUpperCase(), description: "Custom" },
    ]);
    setter("");
  };

  const removeCode = (type: "icd10" | "cpt", idx: number) => {
    updateCode(
      type,
      codes[type].filter((_: any, i: number) => i !== idx),
    );
  };

  const saveBillingChanges = async () => {
    if (!noteId || !userId) return;
    try {
      await supabase
        .from("billing_records")
        .update({
          icd10_codes: codes.icd10?.map((c: any) => c.code) || [],
          cpt_codes: codes.cpt?.map((c: any) => c.code) || [],
          em_level: codes.em || null,
          rvu: codes.rvu || null,
          mdm_complexity: codes.mdm || null,
        })
        .eq("note_id", noteId)
        .eq("user_id", userId);
      setIsDirty(false);
      showToast("Billing updated");
    } catch {
      showToast("Error updating billing");
    }
  };

  return (
    <div className="space-y-4">
      {/* E/M Level */}
      <div className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/20 rounded-xl">
        <span className="text-2xl">🏷️</span>
        <div className="flex-1">
          <select
            value={codes.em}
            onChange={(e) => updateCode("em", e.target.value)}
            className="w-full p-1.5 rounded-lg bg-muted/50 border border-border text-foreground text-sm font-bold focus:outline-none focus:border-primary/50"
          >
            {EM_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <div className="text-xs text-muted-foreground mt-1">E/M Level</div>
        </div>
      </div>

      {/* MDM */}
      <div className="bg-muted/50 rounded-xl p-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">MDM Complexity</span>
          <select
            value={codes.mdm}
            onChange={(e) => updateCode("mdm", e.target.value)}
            className="p-1 rounded-lg bg-card border border-border text-foreground text-sm font-bold focus:outline-none focus:border-primary/50"
          >
            {MDM_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* RVU Override */}
      <div className="bg-muted/50 rounded-xl p-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">RVU</span>
          <input
            type="number"
            step="0.01"
            value={codes.rvu || 0}
            onChange={(e) => updateCode("rvu", parseFloat(e.target.value) || 0)}
            className="w-20 p-1 text-right rounded-lg bg-card border border-border text-foreground text-sm font-bold focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      {/* ICD-10 */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
          ICD-10 Codes
        </div>
        <div className="space-y-1.5">
          {codes.icd10?.map((c: any, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 bg-muted/30 rounded-lg group"
            >
              <span className="px-2 py-0.5 bg-primary/15 border border-primary/30 rounded text-xs text-primary font-mono">
                {c.code}
              </span>
              <button
                onClick={() => removeCode("icd10", i)}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={newIcd}
              onChange={(e) => setNewIcd(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && addCode("icd10", newIcd, setNewIcd)
              }
              placeholder="Add ICD-10..."
              className="flex-1 px-2 py-1.5 bg-muted/50 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => addCode("icd10", newIcd, setNewIcd)}
              disabled={!newIcd.trim()}
              className="h-7 w-7 p-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* CPT */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
          CPT Codes
        </div>
        <div className="space-y-1.5">
          {codes.cpt?.map((c: any, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 bg-muted/30 rounded-lg group"
            >
              <span className="px-2 py-0.5 bg-primary/15 border border-primary/30 rounded text-xs text-primary font-mono">
                {c.code}
              </span>
              <button
                onClick={() => removeCode("cpt", i)}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={newCpt}
              onChange={(e) => setNewCpt(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && addCode("cpt", newCpt, setNewCpt)
              }
              placeholder="Add CPT..."
              className="flex-1 px-2 py-1.5 bg-muted/50 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => addCode("cpt", newCpt, setNewCpt)}
              disabled={!newCpt.trim()}
              className="h-7 w-7 p-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Save / Copy */}
      {isDirty && (
        <Button
          onClick={saveBillingChanges}
          className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
        >
          💾 Save Billing Changes
        </Button>
      )}
      <Button
        onClick={() =>
          copyToClipboard(
            `E/M: ${codes.em}\nMDM: ${codes.mdm}\nRVU: ${codes.rvu}\nICD-10: ${codes.icd10?.map((c: any) => c.code).join(", ")}\nCPT: ${codes.cpt?.map((c: any) => c.code).join(", ")}`,
            showToast,
          )
        }
        variant="outline"
        className="w-full h-10 font-semibold rounded-xl border-warning/30 text-warning hover:bg-warning/10"
      >
        📋 Copy All Codes
      </Button>
    </div>
  );
}

function PatientModal({
  s,
  savePatient,
}: {
  s: ReturnType<typeof useElynState>;
  savePatient: () => void;
}) {
  const inputClass =
    "w-full p-2 rounded-lg bg-muted/50 border border-primary/20 text-foreground text-sm";
  return (
    <div className="p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <h2 className="text-lg font-semibold mb-2 text-primary">
        {s.patient.id ? "Edit Patient" : "Add Patient"}
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Fields marked * are required for claims submission
      </p>
      {!s.isPatientClaimsReady && (
        <div className="mb-4 p-3 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
          <p className="text-xs text-warning">
            Complete all required fields to enable note generation and billing
          </p>
        </div>
      )}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Demographics
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Name *
            </label>
            <input
              value={s.patient.name}
              onChange={(e) =>
                s.setPatient({ ...s.patient, name: e.target.value })
              }
              placeholder="Last, First"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              MRN *
            </label>
            <input
              value={s.patient.mrn}
              onChange={(e) =>
                s.setPatient({ ...s.patient, mrn: e.target.value })
              }
              placeholder="Medical Record #"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              DOB *
            </label>
            <input
              type="date"
              value={s.patient.dob}
              onChange={(e) =>
                s.setPatient({ ...s.patient, dob: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Room
            </label>
            <input
              value={s.patient.room}
              onChange={(e) =>
                s.setPatient({ ...s.patient, room: e.target.value })
              }
              placeholder="Room #"
              className={inputClass}
            />
          </div>
        </div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
          Insurance
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Insurance/Payer *
            </label>
            <input
              value={s.patient.insurance_name}
              onChange={(e) =>
                s.setPatient({ ...s.patient, insurance_name: e.target.value })
              }
              placeholder="e.g., Blue Cross"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Member ID *
            </label>
            <input
              value={s.patient.insurance_id}
              onChange={(e) =>
                s.setPatient({ ...s.patient, insurance_id: e.target.value })
              }
              placeholder="Member/Policy ID"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Group #
            </label>
            <input
              value={s.patient.insurance_group}
              onChange={(e) =>
                s.setPatient({ ...s.patient, insurance_group: e.target.value })
              }
              placeholder="Group number"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Plan Type
            </label>
            <select
              value={s.patient.insurance_plan_type}
              onChange={(e) =>
                s.setPatient({
                  ...s.patient,
                  insurance_plan_type: e.target.value,
                })
              }
              className={inputClass}
            >
              <option value="">Select...</option>
              {[
                "Medicare",
                "Medicaid",
                "Commercial",
                "Tricare",
                "Workers Comp",
                "Self-Pay",
                "Other",
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
          Clinical
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Diagnosis
          </label>
          <input
            value={s.patient.diagnosis}
            onChange={(e) =>
              s.setPatient({ ...s.patient, diagnosis: e.target.value })
            }
            placeholder="Primary diagnosis"
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Allergies
          </label>
          <input
            value={s.patient.allergies}
            onChange={(e) =>
              s.setPatient({ ...s.patient, allergies: e.target.value })
            }
            placeholder="Comma separated"
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <Button
          variant="outline"
          onClick={() => s.setShowPatientModal(false)}
          className="flex-1 border-primary/30"
        >
          Cancel
        </Button>
        <Button
          onClick={savePatient}
          disabled={!s.patient.name.trim() || !s.patient.facility_id}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {s.patient.id ? "Update" : "Save"}
        </Button>
      </div>
    </div>
  );
}
