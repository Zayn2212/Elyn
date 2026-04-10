import { supabase } from '@/integrations/supabase/client';
import type { PatientContext, PatientData, BillingCodes, ClinicalNote, RadiologyContext } from '@/types/medical';
import type { NotePreferences } from '@/hooks/useNotePreferences';
import type { EncounterContext } from '@/lib/encounterContext';

/**
 * AI service for generating clinical notes, radiology reports, billing codes, and handoffs.
 * Uses consolidated edge functions for optimal API efficiency.
 */
const AI = {
  /**
   * Generate a clinical note AND extract billing codes in a single API call.
   * Now accepts encounter context for context-aware billing.
   */
  async generateNoteWithBilling(
    transcript: string,
    noteType: string,
    patientContext: PatientContext | null,
    radiologyContext?: RadiologyContext | null,
    notePreferences?: NotePreferences | null,
    encounterContext?: EncounterContext | null,
    providerSpecialty?: string | null
  ): Promise<{ note: string; billing: BillingCodes; structured_category?: string | null }> {
    const noteTypeMap: Record<string, string> = {
      'H&P': 'hp',
      'Consult': 'consult',
      'Progress': 'progress',
      'xray': 'xray',
      'ct': 'ct',
      'mri': 'mri',
      'ultrasound': 'ultrasound',
      'mammography': 'mammography',
      'fluoroscopy': 'fluoroscopy',
    };

    const { data, error } = await supabase.functions.invoke('generate-note-with-billing', {
      body: {
        transcript,
        noteType: noteTypeMap[noteType] || noteType,
        patientInfo: patientContext,
        radiologyContext: radiologyContext || null,
        notePreferences: notePreferences || null,
        encounterContext: encounterContext || null,
        providerSpecialty: providerSpecialty || null,
      },
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Failed to generate note');

    return {
      note: data.note,
      billing: {
        icd10: data.billing.icd10 || [],
        cpt: data.billing.cpt || [],
        mdm: data.billing.mdmComplexity || data.billing.modifiers?.[0] || 'N/A',
        em: data.billing.emLevel || (data.isRadiology ? 'N/A' : '99214'),
        rvu: data.billing.rvu || (data.isRadiology ? 0.75 : 1.92),
        modifiers: data.billing.modifiers || [],
      },
      structured_category: data.structured_category || null,
    };
  },

  /**
   * Stream a clinical note generation directly. Returns the response object whose body is a stream.
   */
  async generateNoteStream(
    transcript: string,
    noteType: string,
    patientContext: PatientContext | null,
    radiologyContext?: RadiologyContext | null,
    notePreferences?: NotePreferences | null,
    encounterContext?: EncounterContext | null,
    providerSpecialty?: string | null
  ): Promise<Response> {
    const noteTypeMap: Record<string, string> = {
      'H&P': 'hp', 'Consult': 'consult', 'Progress': 'progress',
      'xray': 'xray', 'ct': 'ct', 'mri': 'mri', 'ultrasound': 'ultrasound',
      'mammography': 'mammography', 'fluoroscopy': 'fluoroscopy',
    };

    const { data: { session } } = await supabase.auth.getSession();
    // Use raw fetch for streaming support with Supabase Functions
    const supabaseUrl = (supabase as any).supabaseUrl || import.meta.env.VITE_SUPABASE_URL;

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-note-stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript,
        noteType: noteTypeMap[noteType] || noteType,
        patientInfo: patientContext,
        radiologyContext: radiologyContext || null,
        notePreferences: notePreferences || null,
        encounterContext: encounterContext || null,
        providerSpecialty: providerSpecialty || null,
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      throw new Error(errBody?.error || `Failed to start streaming note generation: ${response.status}`);
    }

    return response;
  },

  /**
   * Extract billing codes from an already generated note.
   */
  async extractBilling(
    noteContent: string,
    noteType: string,
    encounterContext?: EncounterContext | null
  ): Promise<{ billing: BillingCodes; structured_category?: string | null }> {
    const noteTypeMap: Record<string, string> = {
      'H&P': 'hp', 'Consult': 'consult', 'Progress': 'progress',
      'xray': 'xray', 'ct': 'ct', 'mri': 'mri', 'ultrasound': 'ultrasound',
      'mammography': 'mammography', 'fluoroscopy': 'fluoroscopy',
    };

    const { data, error } = await supabase.functions.invoke('extract-billing-only', {
      body: {
        note: noteContent,
        noteType: noteTypeMap[noteType] || noteType,
        encounterContext: encounterContext || null,
      },
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Failed to extract billing');

    return {
      billing: {
        icd10: data.billing.icd10 || [],
        cpt: data.billing.cpt || [],
        mdm: data.billing.mdmComplexity || data.billing.modifiers?.[0] || 'N/A',
        em: data.billing.emLevel || (data.isRadiology ? 'N/A' : '99214'),
        rvu: data.billing.rvu || (data.isRadiology ? 0.75 : 1.92),
        modifiers: data.billing.modifiers || [],
      },
      structured_category: data.structured_category || null,
    };
  },

  /**
   * Generate a handoff summary with streaming — calls onChunk for each text chunk,
   * then calls onChunk again with isFinal=true containing the fully re-identified text.
   */
  async generateHandoffStream(
    notes: ClinicalNote[],
    patients: PatientData[],
    onChunk: (chunk: string, isFinal: boolean) => void
  ): Promise<void> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-handoff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token ?? supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({ notes, patients }),
    });

    if (!response.ok) {
      throw new Error(`Handoff generation failed: ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let lineBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const event = JSON.parse(trimmed.slice(6));
          if (event.type === 'chunk') {
            onChunk(event.text, false);
          } else if (event.type === 'complete') {
            onChunk(event.text, true);
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        } catch {
          // Skip unparseable events
        }
      }
    }
  },

  /**
   * @deprecated Use generateNoteWithBilling instead for combined note + billing generation
   */
  async generateNote(
    transcript: string,
    noteType: string,
    patientContext: PatientContext | null
  ): Promise<string> {
    const result = await this.generateNoteWithBilling(transcript, noteType, patientContext);
    return result.note;
  },

  /**
   * @deprecated Use generateNoteWithBilling instead - billing is extracted alongside note generation
   */
  async extractCodes(note: string): Promise<BillingCodes> {
    console.warn('extractCodes is deprecated. Use generateNoteWithBilling for combined generation.');
    return {
      icd10: [],
      cpt: [],
      mdm: 'Moderate',
      em: '99214',
      rvu: 1.92,
    };
  },
};

export default AI;
