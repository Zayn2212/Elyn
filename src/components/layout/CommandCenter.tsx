import { AnimatePresence, motion } from 'framer-motion';
import { useCommandCenter } from '@/hooks/useCommandCenter';
import { useSessionSecurity } from '@/hooks/useSessionSecurity';
import CommandCenterHeader from './CommandCenterHeader';
import PatientsTab from './tabs/PatientsTab';
import BillingTab from './tabs/BillingTab';
import SettingsTab from './tabs/SettingsTab';
import CommandCenterModals from './CommandCenterModals';
import BottomNav from './BottomNav';
import NotesHistory from '@/components/notes/NotesHistory';
import ComplianceBanner from './ComplianceBanner';
import NextPatientSuggestion from '@/components/patients/NextPatientSuggestion';
import FeedbackWidget from '@/components/feedback/FeedbackWidget';
import { Toast } from '@/components/elyn/index';

export default function CommandCenter() {
  const s = useCommandCenter();
  const { showTimeoutWarning, updateActivity } = useSessionSecurity();

  const handleGoToSuggestedPatient = () => {
    if (!s.nextPatientSuggestion) return;
    const patient = s.filteredPatients.find(p => p.id === s.nextPatientSuggestion!.patientId);
    if (patient) {
      s.handlePatientSelect(patient);
      s.setActiveTab('patients');
    }
    s.setNextPatientSuggestion(null);
  };

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col pb-16 md:pb-0" style={{ paddingTop: 'var(--safe-top, env(safe-area-inset-top, 0px))' }}>
      <ComplianceBanner />
      {showTimeoutWarning && (
        <div className="bg-amber-500 text-white text-sm text-center py-1.5 px-4 flex items-center justify-center gap-3">
          <span>Session expiring in 1 minute due to inactivity.</span>
          <button onClick={updateActivity} className="underline font-semibold">Stay signed in</button>
        </div>
      )}
      <CommandCenterHeader s={s} />

      <main className="flex-1 min-h-0 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {s.activeTab === 'patients' && <PatientsTab s={s} />}
          {s.activeTab === 'notes' && (
            <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col overflow-hidden">
              <NotesHistory onToast={s.showToast} />
            </motion.div>
          )}
          {s.activeTab === 'bills' && <BillingTab s={s} />}
          {s.activeTab === 'settings' && <SettingsTab s={s} />}
        </AnimatePresence>
      </main>

      <BottomNav activeTab={s.activeTab} onTabChange={s.setActiveTab} onRecordPress={s.handleRecordPress} isRecording={s.speech.isRecording} />
      <CommandCenterModals s={s} />
      <FeedbackWidget />

      {s.nextPatientSuggestion && (
        <NextPatientSuggestion
          isVisible={s.nextPatientSuggestion.isVisible}
          patientName={s.nextPatientSuggestion.patientName}
          acuityScore={s.nextPatientSuggestion.acuityScore}
          acuityLevel={s.nextPatientSuggestion.acuityLevel}
          topSignal={s.nextPatientSuggestion.topSignal}
          onGoToPatient={handleGoToSuggestedPatient}
          onDismiss={() => s.setNextPatientSuggestion(null)}
        />
      )}

      <AnimatePresence>
        {s.toast && <Toast message={s.toast} />}
      </AnimatePresence>
    </div>
  );
}
