// CPT Codes Library - E/M Codes (Hospital)
export const CPT_CODES: Record<string, { code: string; desc: string; rvu: number }> = {
  '99221': { code: '99221', desc: 'Initial Hospital Care - Low', rvu: 1.92 },
  '99222': { code: '99222', desc: 'Initial Hospital Care - Mod', rvu: 2.61 },
  '99223': { code: '99223', desc: 'Initial Hospital Care - High', rvu: 3.86 },
  '99231': { code: '99231', desc: 'Subsequent Hospital - Low', rvu: 0.76 },
  '99232': { code: '99232', desc: 'Subsequent Hospital - Mod', rvu: 1.39 },
  '99233': { code: '99233', desc: 'Subsequent Hospital - High', rvu: 2.00 },
  '99238': { code: '99238', desc: 'Discharge Day ≤30 min', rvu: 1.28 },
  '99239': { code: '99239', desc: 'Discharge Day >30 min', rvu: 1.90 },
  '99291': { code: '99291', desc: 'Critical Care First Hour', rvu: 4.50 },
  '99292': { code: '99292', desc: 'Critical Care +30 min', rvu: 2.25 },
  '99251': { code: '99251', desc: 'Consult L1', rvu: 0.99 },
  '99252': { code: '99252', desc: 'Consult L2', rvu: 1.73 },
  '99253': { code: '99253', desc: 'Consult L3', rvu: 2.42 },
  '99254': { code: '99254', desc: 'Consult L4', rvu: 3.30 },
  '99255': { code: '99255', desc: 'Consult L5', rvu: 4.24 },
};

// Echocardiogram CPT Codes
export const ECHO_CPT_CODES: Record<string, { code: string; desc: string; rvu: number }> = {
  '93306': { code: '93306', desc: 'TTE Complete with Doppler', rvu: 1.50 },
  '93307': { code: '93307', desc: 'TTE Complete w/o Doppler', rvu: 1.30 },
  '93308': { code: '93308', desc: 'TTE Limited/Follow-up', rvu: 0.92 },
  '93320': { code: '93320', desc: 'Doppler Echo Complete', rvu: 0.40 },
  '93321': { code: '93321', desc: 'Doppler Echo Follow-up', rvu: 0.25 },
  '93325': { code: '93325', desc: 'Doppler Color Flow Add-on', rvu: 0.18 },
  '93350': { code: '93350', desc: 'Stress Echo', rvu: 1.75 },
  '93351': { code: '93351', desc: 'Stress Echo with Contrast', rvu: 1.90 },
};

// EKG/ECG CPT Codes
export const EKG_CPT_CODES: Record<string, { code: string; desc: string; rvu: number }> = {
  '93000': { code: '93000', desc: 'EKG 12-Lead Complete', rvu: 0.17 },
  '93005': { code: '93005', desc: 'EKG 12-Lead Tracing Only', rvu: 0.00 },
  '93010': { code: '93010', desc: 'EKG 12-Lead Interpretation', rvu: 0.17 },
  '93015': { code: '93015', desc: 'Stress Test Complete', rvu: 1.18 },
  '93016': { code: '93016', desc: 'Stress Test Supervision', rvu: 0.45 },
  '93017': { code: '93017', desc: 'Stress Test Tracing', rvu: 0.00 },
  '93018': { code: '93018', desc: 'Stress Test Interpretation', rvu: 0.70 },
  '93040': { code: '93040', desc: 'Rhythm EKG 1-3 Leads', rvu: 0.15 },
  '93042': { code: '93042', desc: 'Rhythm EKG Interpretation', rvu: 0.15 },
};

// Combined lookup for all CPT codes
export const ALL_CPT_CODES: Record<string, { code: string; desc: string; rvu: number }> = {
  ...CPT_CODES,
  ...ECHO_CPT_CODES,
  ...EKG_CPT_CODES,
};

// Categories for UI display
export const CPT_CATEGORIES = {
  'E/M': CPT_CODES,
  'Echo': ECHO_CPT_CODES,
  'EKG': EKG_CPT_CODES,
} as const;

export type CptCategoryKey = keyof typeof CPT_CATEGORIES;

export const MODIFIERS = [
  { code: '25', desc: 'Significant E/M' },
  { code: '26', desc: 'Professional Component' },
  { code: 'GT', desc: 'Telehealth' },
  { code: '95', desc: 'Synchronous Telemedicine' },
];

