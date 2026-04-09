import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFacility } from '@/contexts/FacilityContext';
import useSpeech from '@/hooks/useSpeech';
import { useSync } from '@/contexts/SyncContext';
import type { BillingCodes, DocumentMode, RadiologyModality, RadiologyContext } from '@/types/medical';
import { EncounterContext, DEFAULT_ENCOUNTER_CONTEXT } from '@/lib/encounterContext';

export interface ElynPatientData {
  id: string | null;
  name: string;
  mrn: string;
  dob: string;
  room: string;
  diagnosis: string;
  allergies: string;
  facility_id: string;
  insurance_name: string;
  insurance_id: string;
  insurance_group: string;
  insurance_plan_type: string;
}

export interface ElynSavedPatient {
  id: string;
  name: string;
  mrn: string | null;
  dob: string | null;
  room: string | null;
  diagnosis: string | null;
  allergies: string[] | null;
  facility_id: string;
  insurance_name: string | null;
  insurance_id: string | null;
  insurance_group: string | null;
  insurance_plan_type: string | null;
}

export interface TodayStats {
  notes: number;
  rvu: number;
  consults: number;
  avgTime: string;
}

const emptyPatient = (facilityId: string): ElynPatientData => ({
  id: null, name: '', mrn: '', dob: '', room: '', diagnosis: '', allergies: '',
  facility_id: facilityId, insurance_name: '', insurance_id: '', insurance_group: '', insurance_plan_type: '',
});

export function useElynState() {
  const { user, signOut } = useAuth();
  const { facilities, selectedFacilityId, selectedFacility } = useFacility();
  const speech = useSpeech();
  const { status: syncStatus, lastSyncTime, connectedDevices, forceSync } = useSync();

  const [userSpecialty, setUserSpecialty] = useState<string | null>(null);

  const defaultFacilityId = selectedFacilityId !== 'all' 
    ? selectedFacilityId 
    : (facilities.find(f => f.is_default)?.id || facilities[0]?.id || '');

  const [activeTab, setActiveTab] = useState('document');
  const [documentMode, setDocumentMode] = useState<DocumentMode>('clinical');
  const [noteType, setNoteType] = useState('H&P');
  const [radiologyModality, setRadiologyModality] = useState<RadiologyModality>('xray');
  const [radiologyContext, setRadiologyContext] = useState<RadiologyContext>({
    modality: 'xray', bodyPart: '', indication: '', comparison: '', technique: '', contrast: false,
  });
  const [encounterContext, setEncounterContext] = useState<EncounterContext>({ ...DEFAULT_ENCOUNTER_CONTEXT });
  const [generatedNote, setGeneratedNote] = useState('');
  const [codes, setCodes] = useState<BillingCodes | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState('');
  const [patient, setPatient] = useState<ElynPatientData>(emptyPatient(defaultFacilityId));
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [handoffSummary, setHandoffSummary] = useState('');
  const [showHandoff, setShowHandoff] = useState(false);
  const [todayStats, setTodayStats] = useState<TodayStats>({ notes: 0, rvu: 0, consults: 0, avgTime: '0m' });
  const [savedPatients, setSavedPatients] = useState<ElynSavedPatient[]>([]);
  const [savedNotes, setSavedNotes] = useState<any[]>([]);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPatientList, setShowPatientList] = useState(false);
  const [editableTranscript, setEditableTranscript] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editedNoteSections, setEditedNoteSections] = useState<Record<string, string>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('recording');
  const [pendingBilling, setPendingBilling] = useState<any | null>(null);
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null);
  const [showBillingConfirmation, setShowBillingConfirmation] = useState(false);
  const [appendMode, setAppendMode] = useState(true);
  const [reviewedSections, setReviewedSections] = useState<Record<string, boolean>>({});
  const [isNoteReviewed, setIsNoteReviewed] = useState(false);
  const [pendingNoteData, setPendingNoteData] = useState<any | null>(null);

  const isPatientClaimsReady = Boolean(
    patient.name.trim() && patient.mrn.trim() && patient.dob && patient.facility_id && patient.insurance_name.trim()
  );

  useEffect(() => {
    if (user) {
      loadData();
      // Load specialty from profile
      supabase.from('profiles').select('specialty').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => { if (data?.specialty) setUserSpecialty(data.specialty); });
    }
  }, [user]);
  useEffect(() => { if (speech.transcript) setEditableTranscript(speech.transcript); }, [speech.transcript]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: patients } = await supabase
        .from('patients').select('*').order('updated_at', { ascending: false });
      setSavedPatients(patients || []);

      const today = new Date().toISOString().split('T')[0];
      const { data: notes } = await supabase
        .from('clinical_notes').select('*, billing_records(*)').gte('created_at', today);
      setSavedNotes(notes || []);

      if (notes?.length) {
        const totalRvu = notes.reduce((sum: number, n: any) => sum + (n.billing_records?.[0]?.rvu ? parseFloat(n.billing_records[0].rvu) : 0), 0);
        setTodayStats({
          notes: notes.length,
          rvu: totalRvu,
          consults: notes.filter((n) => n.note_type === 'consult').length,
          avgTime: '~3m',
        });
      }
    } catch (e) { console.error('Error loading data:', e); }
    setIsLoading(false);
  };

  const showToast = (msg: string, duration = 2000) => {
    setToast(msg);
    setTimeout(() => setToast(''), duration);
  };

  const clearPatient = () => {
    setPatient(emptyPatient(defaultFacilityId));
    setGeneratedNote(''); setCodes(null); setCurrentNoteId(null);
    setEditableTranscript(''); speech.clear();
  };

  const importFromFaceSheet = (parsed: any) => {
    const p = parsed.patient || {};
    const ins = parsed.insurance || {};
    const med = parsed.medical || {};
    setPatient(prev => ({
      ...prev,
      name: p.name || prev.name,
      mrn: p.mrn || prev.mrn,
      dob: p.dob || prev.dob,
      room: med.roomNumber || prev.room,
      diagnosis: med.primaryDiagnosis || med.chiefComplaint || prev.diagnosis,
      allergies: med.allergies?.length ? med.allergies.join(', ') : prev.allergies,
      insurance_name: ins.provider || prev.insurance_name,
      insurance_id: ins.policyNumber || prev.insurance_id,
      insurance_group: ins.groupNumber || prev.insurance_group,
      insurance_plan_type: prev.insurance_plan_type,
    }));
    setGeneratedNote(''); setCodes(null); setCurrentNoteId(null);
  };

  const selectPatient = (p: ElynSavedPatient) => {
    setPatient({
      id: p.id, name: p.name, mrn: p.mrn || '', dob: p.dob || '', room: p.room || '',
      diagnosis: p.diagnosis || '', allergies: p.allergies ? p.allergies.join(', ') : '',
      facility_id: p.facility_id, insurance_name: p.insurance_name || '',
      insurance_id: p.insurance_id || '', insurance_group: p.insurance_group || '',
      insurance_plan_type: p.insurance_plan_type || '',
    });
    setShowPatientList(false); setGeneratedNote(''); setCodes(null);
    setCurrentNoteId(null); setEditableTranscript(''); speech.clear();
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return {
    user, signOut, facilities, selectedFacilityId, selectedFacility, speech,
    syncStatus, lastSyncTime, connectedDevices, forceSync, defaultFacilityId,
    userSpecialty, setUserSpecialty,
    activeTab, setActiveTab, documentMode, setDocumentMode,
    noteType, setNoteType, radiologyModality, setRadiologyModality,
    radiologyContext, setRadiologyContext, encounterContext, setEncounterContext,
    generatedNote, setGeneratedNote, codes, setCodes, isGenerating, setIsGenerating,
    toast, setToast, showToast, patient, setPatient,
    showPatientModal, setShowPatientModal, handoffSummary, setHandoffSummary,
    showHandoff, setShowHandoff, todayStats, setTodayStats,
    savedPatients, setSavedPatients, savedNotes, setSavedNotes,
    currentNoteId, setCurrentNoteId, isLoading, setIsLoading,
    showPatientList, setShowPatientList, editableTranscript, setEditableTranscript,
    isEditingNote, setIsEditingNote, editedNoteSections, setEditedNoteSections,
    mobileMenuOpen, setMobileMenuOpen, expandedSection, setExpandedSection,
    isPatientClaimsReady, loadData, clearPatient, selectPatient, toggleSection, importFromFaceSheet,
    pendingBilling, setPendingBilling, pendingNoteId, setPendingNoteId,
    showBillingConfirmation, setShowBillingConfirmation, appendMode, setAppendMode,
    reviewedSections, setReviewedSections, isNoteReviewed, setIsNoteReviewed,
    pendingNoteData, setPendingNoteData,
  };
}
