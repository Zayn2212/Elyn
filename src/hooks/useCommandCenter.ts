import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFacility } from '@/contexts/FacilityContext';
import useSpeech from '@/hooks/useSpeech';
import useNotePreferences from '@/hooks/useNotePreferences';
import useBilling from '@/hooks/useBilling';
import useFeatureFlags from '@/hooks/useFeatureFlags';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import AI from '@/services/ai';
import type { DocumentMode, RadiologyModality, RadiologyContext, CardiologyStudyType } from '@/types/medical';
import type { Patient, PatientStatus } from '@/components/patients/PatientCard';
import type { Bill } from '@/components/billing/BillCard';
import type { ExtractedBilling } from '@/components/billing/BillingConfirmationModal';
import type { NoteExport } from '@/lib/exportNotes';
import { useTheme } from 'next-themes';

export interface TodayStats {
  notes: number;
  rvu: number;
  consults: number;
  avgTime: string;
}

export interface PatientWithFacility extends Patient {
  facility_id?: string | null;
  status?: PatientStatus;
}

export interface BillWithFacility extends Bill {
  facility?: string | null;
  _componentIds?: { id: string; source: string }[];
}

export function useCommandCenter() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { facilities, selectedFacilityId, selectedFacility } = useFacility();
  const speech = useSpeech();
  const { bills: unifiedBills, groupedBills, loading: billsLoading, updateBillStatus, recordOutcome, refetch: refetchBills } = useBilling();
  const { preferences: notePreferences } = useNotePreferences();
  const isMobile = useIsMobile();
  const { isFeatureEnabled } = useFeatureFlags();
  const { theme, setTheme } = useTheme();

  // Tab state managed via URL search params
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'patients';

  const setActiveTab = useCallback((tab: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Data state
  const [patients, setPatients] = useState<PatientWithFacility[]>([]);
  const [bills, setBills] = useState<BillWithFacility[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<TodayStats>({ notes: 0, rvu: 0, consults: 0, avgTime: '0m' });

  // Recording state
  const [isRecordingSheetOpen, setIsRecordingSheetOpen] = useState(false);
  const [editableTranscript, setEditableTranscript] = useState('');
  const [noteType, setNoteType] = useState('H&P');
  const [isGenerating, setIsGenerating] = useState(false);

  // Document mode state
  const [documentMode, setDocumentMode] = useState<DocumentMode>('clinical');
  const [radiologyModality, setRadiologyModality] = useState<RadiologyModality>('ct');
  const [radiologyContext, setRadiologyContext] = useState<RadiologyContext>({
    modality: 'ct', bodyPart: '', indication: '', comparison: '', technique: '', contrast: false,
  });
  const [cardiologyStudyType, setCardiologyStudyType] = useState<CardiologyStudyType>('echo');

  // Modal state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isManageFacilitiesOpen, setIsManageFacilitiesOpen] = useState(false);
  const [generatedNoteModal, setGeneratedNoteModal] = useState<{ isOpen: boolean; note: NoteExport | null; noteId?: string | null }>({ isOpen: false, note: null, noteId: null });
  const [copiedNote, setCopiedNote] = useState(false);
  const [billingConfirmation, setBillingConfirmation] = useState<{ isOpen: boolean; billing: ExtractedBilling | null; pendingNote: string; pendingNoteExport: NoteExport | null }>({ isOpen: false, billing: null, pendingNote: '', pendingNoteExport: null });
  const [patientDetailOpen, setPatientDetailOpen] = useState(false);
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
  const [patientToDischarge, setPatientToDischarge] = useState<Patient | null>(null);
  const [handoffModalOpen, setHandoffModalOpen] = useState(false);
  const [isRoundingMode, setIsRoundingMode] = useState(false);
  const [isFaceSheetOpen, setIsFaceSheetOpen] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [billingViewMode, setBillingViewMode] = useState<'list' | 'analytics'>('list');
  const [billingStatusFilter, setBillingStatusFilter] = useState<'all' | 'pending' | 'submitted' | 'approved'>('all');
  const [claimReportBillId, setClaimReportBillId] = useState<string | null>(null);
  const [isEMRImportOpen, setIsEMRImportOpen] = useState(false);
  const [isUnifiedImportOpen, setIsUnifiedImportOpen] = useState(false);
  const [mobileStatsExpanded, setMobileStatsExpanded] = useState(false);
  const [providerSpecialty, setProviderSpecialty] = useState<string | null>(null);
  const [selectedPatientHasNotes, setSelectedPatientHasNotes] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2000);
  }, []);

  // Load data
  useEffect(() => {
    if (user) {
      loadData();
      supabase.from('profiles').select('specialty').eq('user_id', user.id).single()
        .then(({ data }) => { if (data?.specialty) setProviderSpecialty(data.specialty); });
    }
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('billing-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'billing_records' }, () => { loadData(); refetchBills(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => { loadData(); refetchBills(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clinical_notes' }, () => { loadData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Sync transcript
  useEffect(() => {
    if (speech.transcript) setEditableTranscript(speech.transcript);
  }, [speech.transcript]);

  const logPhiAccess = useCallback(async (tableName: string, recordCount: number) => {
    if (!user) return;
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      table_name: tableName,
      action: 'SELECT',
      new_data: { record_count: recordCount, context: 'command_center_load' },
    }).then(({ error }) => {
      if (error) console.error('Audit log write failed:', error);
    });
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: patientsData } = await supabase.from('patients').select('*').order('updated_at', { ascending: false });
      if (patientsData) logPhiAccess('patients', patientsData.length);
      const transformedPatients: PatientWithFacility[] = (patientsData || []).map((p, i) => ({
        id: p.id, name: p.name, mrn: p.mrn, dob: p.dob, room: p.room,
        diagnosis: p.diagnosis, allergies: p.allergies, facility_id: p.facility_id,
        hospital: (p as any).hospital, status: (p.status as PatientStatus) || 'not_seen',
        acuity: (['critical', 'high', 'moderate', 'low'] as const)[i % 4], lastSeen: 'Today',
        insurance_name: p.insurance_name, insurance_id: p.insurance_id,
        insurance_group: p.insurance_group, insurance_plan_type: p.insurance_plan_type,
      }));
      setPatients(transformedPatients);

      const today = new Date().toISOString().split('T')[0];
      const { data: notes } = await supabase.from('clinical_notes').select('*, billing_records(*)').gte('created_at', today);
      if (notes?.length) {
        logPhiAccess('clinical_notes', notes.length);
        const totalRvu = notes.reduce((sum: number, n: any) => sum + (n.billing_records?.[0]?.rvu ? parseFloat(n.billing_records[0].rvu) : 0), 0);
        setTodayStats({ notes: notes.length, rvu: totalRvu, consults: notes.filter((n) => n.note_type === 'consult').length, avgTime: '~3m' });
      }

      const { data: billsData } = await supabase.from('bills').select('*').order('date_of_service', { ascending: false }).limit(20);
      if (billsData) logPhiAccess('bills', billsData.length);
      setBills((billsData || []).map((b) => ({
        id: b.id, patientName: b.patient_name, dateOfService: b.date_of_service,
        cptCodes: [b.cpt_code], icd10Codes: [], cptDescription: b.cpt_description,
        rvu: b.rvu, status: (b.status || 'pending') as Bill['status'],
        diagnosis: b.diagnosis, facility: b.facility,
      })));
    } catch (e) { console.error('Error loading data:', e); }
    setIsLoading(false);
  };

  // Filtered data
  const filteredPatients = useMemo(() => {
    if (selectedFacilityId === 'all') return patients;
    return patients.filter(p => p.facility_id === selectedFacilityId);
  }, [patients, selectedFacilityId]);

  const allBills = useMemo(() => groupedBills.map(b => ({
    id: b.id, patientName: b.patient_name, dateOfService: b.date_of_service,
    cptCodes: b.cpt_codes || [], icd10Codes: b.icd10_codes || [],
    cptDescription: b.cpt_description || undefined, rvu: b.rvu,
    status: (b.status || 'pending') as 'pending' | 'submitted' | 'approved' | 'rejected',
    diagnosis: b.diagnosis || undefined, facility: b.facility, source: b.source,
    outcome: b.outcome,
    denial_reason: b.denial_reason,
    _componentIds: b._componentIds,
  })), [groupedBills]);

  const facilityFilteredBills = useMemo(() => {
    if (selectedFacilityId === 'all') return allBills;
    const selectedName = selectedFacility?.name;
    const selectedNickname = selectedFacility?.nickname;
    return allBills.filter(b => b.facility === selectedName || b.facility === selectedNickname || !b.facility);
  }, [allBills, selectedFacilityId, selectedFacility]);

  const filteredBills = useMemo(() => {
    let filtered = facilityFilteredBills;
    if (billingStatusFilter === 'approved') {
      filtered = filtered.filter(b => b.outcome === 'approved');
    } else if (billingStatusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === billingStatusFilter);
    }
    return filtered;
  }, [facilityFilteredBills, billingStatusFilter]);

  // Handlers
  const handleRecordPress = useCallback(() => setIsRecordingSheetOpen(true), []);

  const handlePatientSelect = useCallback((patient: Patient) => {
    setSelectedPatient(patient);
    if (isMobile) setPatientDetailOpen(true);
  }, [isMobile]);

  const handleRecordPatient = useCallback(async (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientDetailOpen(false);
    logPhiAccess('clinical_notes', 1);
    const { count } = await supabase.from('clinical_notes').select('id', { count: 'exact', head: true }).eq('patient_id', patient.id);
    setSelectedPatientHasNotes((count || 0) > 0);
    setIsRecordingSheetOpen(true);
  }, []);

  const handleStatusChange = useCallback(async (patientId: string, newStatus: PatientStatus) => {
    try {
      const { error } = await supabase.from('patients').update({ status: newStatus }).eq('id', patientId);
      if (error) throw error;
      if (user) supabase.from('audit_logs').insert({ user_id: user.id, table_name: 'patients', action: 'UPDATE', record_id: patientId, new_data: { context: 'status_change', new_status: newStatus } }).then(({ error: e }) => { if (e) console.error('Audit log write failed:', e); });
      setPatients(prev => prev.map(p => p.id === patientId ? { ...p, status: newStatus } : p));
      const statusLabels: Record<PatientStatus, string> = { not_seen: 'Not Seen', in_progress: 'In Progress', seen: 'Seen', signed: 'Signed', discharged: 'Discharged' };
      showToast(`Status updated to ${statusLabels[newStatus]}`);
    } catch (e) {
      console.error('Error updating status:', e);
      showToast('Error updating status');
    }
  }, [user, showToast]);

  const handleOpenDischargeModal = useCallback((patient: Patient) => {
    setPatientToDischarge(patient);
    setDischargeModalOpen(true);
  }, []);

  const handleDischarge = useCallback(async (data: { patientId: string; dischargeCptCode: string }) => {
    try {
      await supabase.from('patients').update({ status: 'discharged', updated_at: new Date().toISOString() }).eq('id', data.patientId);
      if (user) supabase.from('audit_logs').insert({ user_id: user.id, table_name: 'patients', action: 'UPDATE', record_id: data.patientId, new_data: { context: 'discharge', cpt_code: data.dischargeCptCode } }).then(({ error: e }) => { if (e) console.error('Audit log write failed:', e); });
      const dischargeRvu = data.dischargeCptCode === '99239' ? 1.90 : 1.28;
      await supabase.from('bills').insert({
        user_id: user?.id as string, patient_name: patientToDischarge?.name || 'Unknown',
        patient_mrn: patientToDischarge?.mrn || null, date_of_service: new Date().toISOString().split('T')[0],
        cpt_code: data.dischargeCptCode,
        cpt_description: data.dischargeCptCode === '99239' ? 'Hospital discharge day management, >30 min' : 'Hospital discharge day management, ≤30 min',
        diagnosis: patientToDischarge?.diagnosis || null, rvu: dischargeRvu,
        facility: selectedFacility?.name || null, status: 'pending',
      });
      if (user) supabase.from('audit_logs').insert({ user_id: user.id, table_name: 'bills', action: 'INSERT', new_data: { context: 'discharge_bill', cpt_code: data.dischargeCptCode, rvu: dischargeRvu } }).then(({ error: e }) => { if (e) console.error('Audit log write failed:', e); });
      setPatients(prev => prev.map(p => p.id === data.patientId ? { ...p, status: 'discharged' as PatientStatus } : p));
      setTodayStats(prev => ({ ...prev, rvu: prev.rvu + dischargeRvu }));
      showToast(`${patientToDischarge?.name} discharged successfully`);
      loadData();
    } catch (e) {
      console.error('Error discharging patient:', e);
      showToast('Error discharging patient');
    }
  }, [user, patientToDischarge, selectedFacility, showToast]);

  const generateNote = useCallback(async () => {
    if (!editableTranscript.trim()) return;
    if (editableTranscript.trim().split(/\s+/).length < 10) {
      showToast('Transcript too short — please dictate more before generating');
      return;
    }
    if (documentMode === 'radiology' && !selectedPatient) { showToast('Please select a patient for radiology reports'); return; }

    setIsGenerating(true);
    try {
      const patientCtx = selectedPatient ? {
        name: selectedPatient.name, mrn: selectedPatient.mrn || '', dob: selectedPatient.dob || '',
        room: selectedPatient.room || '', diagnosis: selectedPatient.diagnosis || '', allergies: selectedPatient.allergies || [],
      } : null;

      const effectiveNoteType = documentMode === 'radiology' ? radiologyModality : documentMode === 'cardiology' ? cardiologyStudyType : noteType;

      const streamResponse = await AI.generateNoteStream(
        editableTranscript, effectiveNoteType, patientCtx,
        documentMode === 'radiology' ? radiologyContext : null,
        documentMode === 'clinical' ? notePreferences : null
      );

      const noteExport: NoteExport = {
        patientName: selectedPatient?.name, mrn: selectedPatient?.mrn || undefined,
        noteType: effectiveNoteType, dateGenerated: new Date().toLocaleString(),
        transcript: editableTranscript, generatedNote: '',
      };

      // Open the modal immediately with empty text
      setGeneratedNoteModal({ isOpen: true, note: noteExport, noteId: null });
      setBillingConfirmation({ isOpen: false, billing: null, pendingNote: '', pendingNoteExport: noteExport });
      setIsRecordingSheetOpen(false);
      setIsGenerating(false);

      const reader = streamResponse.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          
          setGeneratedNoteModal(prev => prev.note ? ({
            ...prev,
            note: { ...prev.note, generatedNote: fullText }
          }) : prev);
        }
      }

      // Update pending note once fully generated
      const finalNoteExport = { ...noteExport, generatedNote: fullText };
      setBillingConfirmation(prev => ({ ...prev, pendingNote: fullText, pendingNoteExport: finalNoteExport }));

      // Extract billing in the background
      try {
        const result = await AI.extractBilling(
          fullText, effectiveNoteType, null
        );
        
        const billingData: ExtractedBilling = {
          icd10: (result.billing.icd10 || []).map(c => ({ code: c.code, description: c.description || '' })),
          cpt: (result.billing.cpt || []).map(c => ({ code: c.code, description: c.description || '' })),
          emLevel: result.billing.em || (documentMode === 'radiology' ? 'N/A' : '99213'),
          rvu: result.billing.rvu || 0,
          mdmComplexity: result.billing.mdm || (documentMode === 'radiology' ? 'N/A' : 'Low'),
        };

        setBillingConfirmation(prev => ({ ...prev, billing: billingData }));
      } catch (billingErr) {
        console.error('Error extracting billing:', billingErr);
        // Fallback or empty billing
        const emptyBilling: ExtractedBilling = { icd10: [], cpt: [], emLevel: 'N/A', rvu: 0, mdmComplexity: 'N/A' };
        setBillingConfirmation(prev => ({ ...prev, billing: emptyBilling }));
      }

    } catch (e) {
      console.error('Error generating note stream:', e);
      const msg = e instanceof Error ? e.message : 'Error generating note';
      showToast(msg);
      setIsGenerating(false);
    }
  }, [editableTranscript, documentMode, selectedPatient, radiologyModality, cardiologyStudyType, noteType, radiologyContext, notePreferences, showToast]);

  const handleBillingConfirm = useCallback(async (confirmedBilling: ExtractedBilling) => {
    if (!billingConfirmation.pendingNote || !billingConfirmation.pendingNoteExport) return;

    try {
      let noteTypeValue: string;
      if (documentMode === 'radiology') noteTypeValue = radiologyModality;
      else if (documentMode === 'cardiology') noteTypeValue = 'progress';
      else {
        const noteTypeMap: Record<string, string> = { 'H&P': 'hp', Consult: 'consult', Progress: 'progress' };
        noteTypeValue = noteTypeMap[noteType] || 'progress';
      }

      const { data: savedNote } = await supabase.from('clinical_notes').insert({
        user_id: user?.id as string, patient_id: selectedPatient?.id || null,
        note_type: noteTypeValue as any, transcript: editableTranscript,
        generated_note: generatedNoteModal.note?.generatedNote || billingConfirmation.pendingNote,
        modality: documentMode === 'radiology' ? radiologyModality : null,
        body_part: documentMode === 'radiology' ? (radiologyContext.bodyPart || null) : null,
        clinical_indication: documentMode === 'radiology' ? (radiologyContext.indication || null) : null,
        comparison_studies: documentMode === 'radiology' ? (radiologyContext.comparison || null) : null,
        technique: documentMode === 'radiology' ? (radiologyContext.contrast ? 'With contrast' : 'Without contrast') : null,
        structured_category: documentMode === 'cardiology' ? cardiologyStudyType : null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
      }).select().single();
      if (user) supabase.from('audit_logs').insert({ user_id: user.id, table_name: 'clinical_notes', action: 'INSERT', record_id: savedNote?.id ?? null, new_data: { note_type: noteTypeValue, patient_id: selectedPatient?.id ?? null } }).then(({ error: e }) => { if (e) console.error('Audit log write failed:', e); });

      await supabase.from('billing_records').insert({
        user_id: user?.id as string, note_id: savedNote?.id as string,
        icd10_codes: confirmedBilling.icd10.map(c => c.code), cpt_codes: confirmedBilling.cpt.map(c => c.code),
        em_level: confirmedBilling.emLevel, rvu: confirmedBilling.rvu, mdm_complexity: confirmedBilling.mdmComplexity,
      });
      if (user) supabase.from('audit_logs').insert({ user_id: user.id, table_name: 'billing_records', action: 'INSERT', record_id: savedNote?.id ?? null, new_data: { em_level: confirmedBilling.emLevel, rvu: confirmedBilling.rvu, cpt_codes: confirmedBilling.cpt.map(c => c.code) } }).then(({ error: e }) => { if (e) console.error('Audit log write failed:', e); });

      if (confirmedBilling.cpt.length > 0) {
        await supabase.from('bills').insert({
          user_id: user?.id as string, patient_name: selectedPatient?.name || 'Unknown',
          patient_mrn: selectedPatient?.mrn || null, date_of_service: new Date().toISOString().split('T')[0],
          cpt_code: confirmedBilling.cpt[0].code, cpt_description: confirmedBilling.cpt[0].description,
          diagnosis: selectedPatient?.diagnosis || confirmedBilling.icd10[0]?.description || null,
          rvu: confirmedBilling.rvu, facility: selectedFacility?.name || null, status: 'pending',
        });
        if (user) supabase.from('audit_logs').insert({ user_id: user.id, table_name: 'bills', action: 'INSERT', new_data: { cpt_code: confirmedBilling.cpt[0].code, rvu: confirmedBilling.rvu, patient_id: selectedPatient?.id ?? null } }).then(({ error: e }) => { if (e) console.error('Audit log write failed:', e); });
      }

      setTodayStats(prev => ({ notes: prev.notes + 1, rvu: prev.rvu + confirmedBilling.rvu, consults: noteType === 'Consult' ? prev.consults + 1 : prev.consults, avgTime: '~3m' }));
      
      if (billingConfirmation.isOpen) {
        setGeneratedNoteModal({ isOpen: true, note: billingConfirmation.pendingNoteExport, noteId: savedNote?.id || null });
      }
      
      setEditableTranscript('');
      speech.clear();
      loadData();
      showToast('Note and billing saved');
    } catch (e) {
      console.error('Error saving note and billing:', e);
      showToast('Error saving note');
    }
    setBillingConfirmation({ isOpen: false, billing: null, pendingNote: '', pendingNoteExport: null });
  }, [billingConfirmation, documentMode, radiologyModality, cardiologyStudyType, noteType, editableTranscript, user, selectedPatient, selectedFacility, radiologyContext, speech, showToast, generatedNoteModal]);

  const handleBillingDiscard = useCallback(() => {
    setBillingConfirmation({ isOpen: false, billing: null, pendingNote: '', pendingNoteExport: null });
    showToast('Billing discarded');
  }, [showToast]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewNote: useCallback(() => setIsRecordingSheetOpen(true), []),
    onSwitchTab: setActiveTab,
    onEscape: useCallback(() => {
      if (isRecordingSheetOpen) setIsRecordingSheetOpen(false);
      else if (patientDetailOpen) setPatientDetailOpen(false);
      else if (generatedNoteModal.isOpen) setGeneratedNoteModal({ isOpen: false, note: null, noteId: null });
    }, [isRecordingSheetOpen, patientDetailOpen, generatedNoteModal.isOpen]),
  });

  const statsCards = [
    { label: 'Notes', value: todayStats.notes, icon: 'FileText' as const, color: 'text-primary' },
    { label: 'RVU', value: todayStats.rvu.toFixed(1), icon: 'TrendingUp' as const, color: 'text-success' },
    { label: 'Consults', value: todayStats.consults, icon: 'Activity' as const, color: 'text-secondary' },
    { label: 'Avg Time', value: todayStats.avgTime, icon: 'Clock' as const, color: 'text-warning' },
  ];

  return {
    // Auth & nav
    navigate, user, signOut, theme, setTheme,
    // Facility
    facilities, selectedFacilityId, selectedFacility,
    // Core hooks
    speech, isMobile, isFeatureEnabled,
    // Tab
    activeTab, setActiveTab,
    // Data
    patients, setPatients, bills, setBills, selectedPatient, setSelectedPatient,
    isLoading, todayStats, setTodayStats, statsCards,
    // Billing
    unifiedBills, groupedBills, billsLoading, updateBillStatus, recordOutcome, refetchBills,
    allBills, facilityFilteredBills, filteredBills, filteredPatients,
    billingViewMode, setBillingViewMode, billingStatusFilter, setBillingStatusFilter,
    // Recording
    isRecordingSheetOpen, setIsRecordingSheetOpen, editableTranscript, setEditableTranscript,
    noteType, setNoteType, isGenerating, documentMode, setDocumentMode,
    radiologyModality, setRadiologyModality, radiologyContext, setRadiologyContext,
    cardiologyStudyType, setCardiologyStudyType,
    // Modals
    isQuickAddOpen, setIsQuickAddOpen, isManageFacilitiesOpen, setIsManageFacilitiesOpen,
    generatedNoteModal, setGeneratedNoteModal, copiedNote, setCopiedNote,
    billingConfirmation, setBillingConfirmation,
    patientDetailOpen, setPatientDetailOpen,
    dischargeModalOpen, setDischargeModalOpen, patientToDischarge, setPatientToDischarge,
    handoffModalOpen, setHandoffModalOpen,
    isRoundingMode, setIsRoundingMode,
    isFaceSheetOpen, setIsFaceSheetOpen, isFabMenuOpen, setIsFabMenuOpen,
    claimReportBillId, setClaimReportBillId,
    isEMRImportOpen, setIsEMRImportOpen,
    isUnifiedImportOpen, setIsUnifiedImportOpen,
    mobileStatsExpanded, setMobileStatsExpanded,
    providerSpecialty, selectedPatientHasNotes,
    toast, showToast,
    // Handlers
    loadData, handleRecordPress, handlePatientSelect, handleRecordPatient,
    handleStatusChange, handleOpenDischargeModal, handleDischarge,
    generateNote, handleBillingConfirm, handleBillingDiscard,
    notePreferences,
  };
}

export type CommandCenterState = ReturnType<typeof useCommandCenter>;
