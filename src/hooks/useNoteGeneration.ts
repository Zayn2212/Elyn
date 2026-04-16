import { supabase } from '@/integrations/supabase/client';
import AI from '@/services/ai';
import { getAutoModifiers } from '@/lib/encounterContext';
import { parseNoteSections } from '@/components/elyn/index';
import type { useElynState } from './useElynState';

type State = ReturnType<typeof useElynState>;

export function useNoteGeneration(s: State) {
  const generateNote = async () => {
    if (!s.editableTranscript.trim()) return;
    if (s.editableTranscript.trim().split(/\s+/).length < 10) {
      s.showToast('Transcript too short — please dictate more before generating', 4000);
      return;
    }
    if (!s.patient.name.trim()) {
      s.showToast('Please add a patient before generating', 3000);
      s.setShowPatientModal(true);
      return;
    }
    if (!s.isPatientClaimsReady) {
      const missing: string[] = [];
      if (!s.patient.mrn.trim()) missing.push('MRN');
      if (!s.patient.dob) missing.push('DOB');
      if (!s.patient.facility_id) missing.push('Facility');
      if (!s.patient.insurance_name.trim()) missing.push('Insurance Name');
      s.showToast(`Missing claims data: ${missing.join(', ')}`, 4000);
      s.setShowPatientModal(true);
      return;
    }

    s.setIsGenerating(true);
    const startTime = Date.now();
    try {
      const isRadiology = s.documentMode === 'radiology';
      const patientCtx = s.patient.name ? {
        name: s.patient.name, mrn: s.patient.mrn, dob: s.patient.dob,
        room: s.patient.room, diagnosis: s.patient.diagnosis,
        allergies: s.patient.allergies?.split(',').map(a => a.trim()) || [],
      } : null;

      const currentNoteType = isRadiology ? s.radiologyModality : s.noteType;
      const radCtx = isRadiology ? s.radiologyContext : null;

      const { note, billing, structured_category } = await AI.generateNoteWithBilling(
        s.editableTranscript, currentNoteType, patientCtx, radCtx, null,
        s.documentMode === 'clinical' ? s.encounterContext : null,
        s.userSpecialty
      );

      // Auto-apply modifiers
      const autoModifiers = getAutoModifiers(s.encounterContext, billing.cpt?.map(c => c.code) || [], isRadiology);
      const mergedModifiers = [...new Set([...(billing.modifiers || []), ...autoModifiers.map(m => m.code)])];
      billing.modifiers = mergedModifiers;

      s.setGeneratedNote(note);
      s.setCodes(billing);

      // Reset review state for new note
      const sections = parseNoteSections(note);
      const reviewMap: Record<string, boolean> = {};
      sections.forEach(sec => { reviewMap[sec.title] = false; });
      s.setReviewedSections(reviewMap);
      s.setIsNoteReviewed(false);

      const noteTypeMap: Record<string, string> = {
        'H&P': 'hp', Consult: 'consult', Progress: 'progress',
        xray: 'xray', ct: 'ct', mri: 'mri', ultrasound: 'ultrasound',
        mammography: 'mammography', fluoroscopy: 'fluoroscopy',
      };
      const elapsedMs = Date.now() - startTime;
      const noteTypeValue = noteTypeMap[currentNoteType] || 'progress';

      // Store pending note data — do NOT save to DB yet (requires physician review)
      const insertPayload: Record<string, unknown> = {
        user_id: s.user?.id as string, patient_id: s.patient.id || null,
        note_type: noteTypeValue, transcript: s.editableTranscript, generated_note: note,
      };
      if (isRadiology) {
        insertPayload.modality = s.radiologyModality;
        insertPayload.body_part = s.radiologyContext.bodyPart || null;
        insertPayload.clinical_indication = s.radiologyContext.indication || null;
        insertPayload.comparison_studies = s.radiologyContext.comparison || null;
        insertPayload.technique = s.radiologyContext.technique || null;
        insertPayload.structured_category = structured_category || null;
      }

      s.setPendingNoteData({
        insertPayload, billing, elapsedMs, currentNoteType, isRadiology, autoModifiers,
      });

      s.showToast(isRadiology ? 'Report ready — please review before saving' : 'Note ready — please review before saving');
    } catch (e) {
      s.setGeneratedNote('Error generating. Please try again.');
      s.showToast('Error generating');
    }
    s.setIsGenerating(false);
  };

  const confirmReview = async () => {
    const pendingData = s.pendingNoteData;
    if (!pendingData) return;

    try {
      // Now save the note to DB with reviewed_at
      const insertPayload = {
        ...pendingData.insertPayload,
        reviewed_at: new Date().toISOString(),
        reviewed_by: s.user?.id,
      };
      const { data: savedNote, error: noteError } = await supabase.from('clinical_notes').insert(insertPayload as any).select().single();
      if (noteError || !savedNote) throw noteError || new Error('Note insert returned no data');
      s.setCurrentNoteId(savedNote.id);
      s.setIsNoteReviewed(true);

      // Now show billing confirmation
      s.setPendingBilling({
        billing: pendingData.billing,
        elapsedMs: pendingData.elapsedMs,
        currentNoteType: pendingData.currentNoteType,
        noteId: savedNote.id,
        isRadiology: pendingData.isRadiology,
        autoModifiers: pendingData.autoModifiers,
      });
      s.setPendingNoteId(savedNote.id);
      s.setShowBillingConfirmation(true);
      s.showToast('Note reviewed & saved — confirm billing');
    } catch (e) {
      console.error('Error saving reviewed note:', e);
      s.showToast('Error saving note');
    }
  };

  const confirmBilling = async (editedBilling?: any) => {
    const pending = s.pendingBilling;
    if (!pending) return;
    const billing = editedBilling || pending.billing;
    const { elapsedMs, currentNoteType, noteId, autoModifiers } = pending;

    try {
      await supabase.from('billing_records').insert({
        user_id: s.user?.id as string, note_id: noteId as string,
        icd10_codes: billing.icd10?.map((c: any) => c.code) || [],
        cpt_codes: billing.cpt?.map((c: any) => c.code) || [],
        em_level: billing.em || billing.emLevel || null,
        rvu: billing.rvu || null, mdm_complexity: billing.mdm || billing.mdmComplexity || null,
        encounter_type: s.encounterContext.encounterType,
        is_telehealth: s.encounterContext.isTelehealth,
        place_of_service: s.encounterContext.placeOfService,
        referring_provider: s.encounterContext.referringProvider || null,
        referring_npi: s.encounterContext.referringNPI || null,
        applied_modifiers: autoModifiers?.length > 0 ? autoModifiers : null,
      } as any);

      // Update analytics
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase.from('analytics').select('*')
        .eq('user_id', s.user?.id as string).eq('date', today).maybeSingle();
      const rvu = billing.rvu || 0;

      if (existing) {
        await supabase.from('analytics').update({
          notes_count: existing.notes_count + 1,
          total_rvu: (existing.total_rvu || 0) + rvu,
          consults_count: currentNoteType === 'Consult' ? existing.consults_count + 1 : existing.consults_count,
          avg_generation_time_ms: Math.round((existing.avg_generation_time_ms * existing.notes_count + elapsedMs) / (existing.notes_count + 1)),
        }).eq('id', existing.id);
      } else {
        await supabase.from('analytics').insert({
          user_id: s.user?.id, date: today, notes_count: 1, total_rvu: rvu,
          consults_count: currentNoteType === 'Consult' ? 1 : 0, avg_generation_time_ms: elapsedMs,
        });
      }

      s.setCodes(billing);
      s.setTodayStats(prev => ({
        notes: prev.notes + 1, rvu: prev.rvu + rvu,
        consults: currentNoteType === 'Consult' ? prev.consults + 1 : prev.consults,
        avgTime: `${Math.round(elapsedMs / 1000 / 60) || 1}m`,
      }));

      // Upsert patient_summaries for prior notes context
      if (s.patient.id && s.user?.id) {
        try {
          const { data: existing } = await supabase.from('patient_summaries')
            .select('id, note_count').eq('patient_id', s.patient.id).eq('user_id', s.user.id).maybeSingle();
          const summaryData = {
            patient_id: s.patient.id,
            user_id: s.user.id,
            summary: s.patient.diagnosis || null,
            key_diagnoses: billing.icd10?.map((c: any) => ({ code: c.code, description: c.description })) || null,
            last_notes_summary: s.generatedNote?.substring(0, 500) || null,
            note_count: (existing?.note_count || 0) + 1,
            last_updated: new Date().toISOString(),
          };
          if (existing) {
            await supabase.from('patient_summaries').update(summaryData).eq('id', existing.id);
          } else {
            await supabase.from('patient_summaries').insert(summaryData);
          }
        } catch (e) { console.error('Error upserting patient summary:', e); }
      }

      s.showToast('Billing confirmed & saved');
    } catch (e) {
      console.error('Error saving billing:', e);
      s.showToast('Error saving billing');
    }
    s.setPendingBilling(null);
    s.setShowBillingConfirmation(false);
  };

  const discardBilling = () => {
    s.setCodes(null);
    s.setPendingBilling(null);
    s.setShowBillingConfirmation(false);
    s.showToast('Billing discarded — note kept');
  };

  const generateHandoff = async () => {
    if (!s.generatedNote && !s.editableTranscript) return;
    s.setIsGenerating(true);
    try {
      const { data: recentNotes } = await supabase.from('clinical_notes').select('*, patients(*)')
        .eq('user_id', s.user?.id).gte('created_at', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false }).limit(10);

      const notes = recentNotes?.length ? recentNotes : [{ chief_complaint: '', assessment: s.generatedNote || s.editableTranscript, plan: '', patient_id: null }];
      const patients = s.savedPatients.length > 0
        ? s.savedPatients.map(p => ({ id: p.id, name: p.name, mrn: p.mrn || undefined, dob: p.dob || undefined, room: p.room || undefined, diagnosis: p.diagnosis || undefined, allergies: p.allergies?.join(', ') || undefined }))
        : s.patient.name ? [{ id: null, ...s.patient }] : [];

      const handoff = await AI.generateHandoff(notes, patients);
      s.setHandoffSummary(handoff);
      s.setShowHandoff(true);
    } catch (e) {
      s.showToast('Error generating handoff');
    }
    s.setIsGenerating(false);
  };

  const savePatient = async () => {
    if (!s.patient.name.trim()) { s.showToast('Patient name is required'); return; }
    if (!s.patient.facility_id) { s.showToast('Please select a facility'); return; }
    if (!s.patient.mrn.trim()) { s.showToast('MRN is required for claims'); return; }
    if (!s.patient.dob) { s.showToast('DOB is required for claims'); return; }
    if (!s.patient.insurance_name.trim()) { s.showToast('Insurance name is required for claims'); return; }
    if (!s.patient.insurance_id.trim()) { s.showToast('Insurance/Member ID is required for claims'); return; }

    try {
      const data = {
        user_id: s.user?.id as string, name: s.patient.name.trim(),
        mrn: s.patient.mrn || null, dob: s.patient.dob || null, room: s.patient.room || null,
        diagnosis: s.patient.diagnosis || null, facility_id: s.patient.facility_id,
        allergies: s.patient.allergies ? s.patient.allergies.split(',').map(a => a.trim()) : null,
        insurance_name: s.patient.insurance_name || null, insurance_id: s.patient.insurance_id || null,
        insurance_group: s.patient.insurance_group || null, insurance_plan_type: s.patient.insurance_plan_type || null,
      };
      if (s.patient.id) {
        await supabase.from('patients').update(data).eq('id', s.patient.id);
        s.showToast('Patient updated');
      } else {
        const { data: saved } = await supabase.from('patients').insert(data).select().single();
        s.setPatient(prev => ({ ...prev, id: saved.id }));
        s.showToast('Patient saved');
      }
      await s.loadData();
      s.setShowPatientModal(false);
    } catch (e) {
      console.error('Error saving patient:', e);
      s.showToast('Error saving patient');
    }
  };

  const startEditingNote = () => {
    const sections = parseNoteSections(s.generatedNote);
    const map: Record<string, string> = {};
    sections.forEach(sec => { map[sec.title] = sec.content.trim(); });
    s.setEditedNoteSections(map);
    s.setIsEditingNote(true);
  };

  const saveNoteEdits = async () => {
    const newNote = Object.entries(s.editedNoteSections).map(([t, c]) => `**${t}:**\n${c}`).join('\n\n');
    s.setGeneratedNote(newNote);
    s.setIsEditingNote(false);
    if (s.currentNoteId) {
      try {
        await supabase.from('clinical_notes').update({ generated_note: newNote, updated_at: new Date().toISOString() }).eq('id', s.currentNoteId);
        s.showToast('Note updated');
      } catch (e) {
        console.error('Error saving note edits:', e);
        s.showToast('Error saving edits');
      }
    }
  };

  return { generateNote, generateHandoff, savePatient, startEditingNote, saveNoteEdits, confirmBilling, discardBilling, confirmReview };
}
