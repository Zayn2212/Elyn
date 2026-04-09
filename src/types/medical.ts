/**
 * Shared medical types used across the application
 */

export interface PatientContext {
  name?: string;
  mrn?: string;
  dob?: string;
  room?: string;
  diagnosis?: string;
  allergies?: string[];
}

export interface PatientData {
  id: string | null;
  name: string;
  mrn?: string;
  dob?: string;
  room?: string;
  diagnosis?: string;
  allergies?: string;
  hospital?: string;
}

export interface SavedPatient {
  id: string;
  name: string;
  mrn?: string | null;
  dob?: string | null;
  room?: string | null;
  diagnosis?: string | null;
  allergies?: string[] | null;
  hospital?: string | null;
}

export interface BillingCodes {
  icd10: Array<{ code: string; description?: string }>;
  cpt: Array<{ code: string; description?: string }>;
  mdm: string;
  em: string;
  rvu: number;
  modifiers?: string[];
}

export interface ClinicalNote {
  id?: string;
  chief_complaint?: string;
  assessment?: string;
  plan?: string;
  patient_id?: string | null;
  generated_note?: string | null;
  transcript?: string | null;
  note_type?: string;
  // Radiology-specific fields
  modality?: string | null;
  body_part?: string | null;
  clinical_indication?: string | null;
  comparison_studies?: string | null;
  technique?: string | null;
  structured_category?: string | null;
}

export interface TodayStats {
  notesCount: number;
  totalRvu: number;
  avgTime: number;
}

// Clinical note types
export type ClinicalNoteType = 'H&P' | 'Consult' | 'Progress';

// Radiology modalities
export type RadiologyModality = 'xray' | 'ct' | 'mri' | 'ultrasound' | 'mammography' | 'fluoroscopy';

// Cardiology study types
export type CardiologyStudyType = 'echo' | 'ekg' | 'stress_test' | 'cath' | 'tee';

// All note types (clinical + radiology + cardiology)
export type NoteType = ClinicalNoteType | RadiologyModality | CardiologyStudyType;

// Document mode
export type DocumentMode = 'clinical' | 'radiology' | 'cardiology';

// Radiology context for study information
export interface RadiologyContext {
  modality: RadiologyModality;
  bodyPart: string;
  indication: string;
  comparison?: string;
  technique?: string;
  contrast?: boolean;
}
