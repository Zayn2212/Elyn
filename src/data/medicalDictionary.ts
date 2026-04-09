/**
 * Medical Dictionary for Real-Time Transcription Correction
 * Contains common phonetic misspellings, abbreviations, and medical terminology
 */

// Common phonetic misspellings → correct medical terms
export const PHONETIC_CORRECTIONS: Record<string, string> = {
  // Cardiovascular medications
  'metaprole': 'metoprolol',
  'metoprole': 'metoprolol',
  'metropolol': 'metoprolol',
  'lisinoprill': 'lisinopril',
  'lisinipril': 'lisinopril',
  'amlodipene': 'amlodipine',
  'amlodapine': 'amlodipine',
  'atorvastatin': 'atorvastatin',
  'atorvistatin': 'atorvastatin',
  'clopidagrel': 'clopidogrel',
  'plavicks': 'Plavix',
  'warfarin': 'warfarin',
  'warferin': 'warfarin',
  'eliquis': 'Eliquis',
  'apixiban': 'apixaban',
  'xarelto': 'Xarelto',
  'rivaroxiban': 'rivaroxaban',
  
  // Diabetes medications
  'metforman': 'metformin',
  'metformin': 'metformin',
  'glipazide': 'glipizide',
  'glyburide': 'glyburide',
  'januvia': 'Januvia',
  'sitagliptan': 'sitagliptin',
  'ozempic': 'Ozempic',
  'semaglutide': 'semaglutide',
  'trulicity': 'Trulicity',
  'jardiance': 'Jardiance',
  'empagliflozin': 'empagliflozin',
  
  // Pain/Anti-inflammatory
  'acetaminophen': 'acetaminophen',
  'acetaminophin': 'acetaminophen',
  'tylenol': 'Tylenol',
  'ibuprofen': 'ibuprofen',
  'ibuprofin': 'ibuprofen',
  'naproxin': 'naproxen',
  'naproxen': 'naproxen',
  'tramadol': 'tramadol',
  'tramidol': 'tramadol',
  'gabapentin': 'gabapentin',
  'gabapenten': 'gabapentin',
  'pregabalin': 'pregabalin',
  'lyrica': 'Lyrica',
  
  // Antibiotics
  'amoxicillin': 'amoxicillin',
  'amoxacillin': 'amoxicillin',
  'augmentin': 'Augmentin',
  'azithromycin': 'azithromycin',
  'azithromicin': 'azithromycin',
  'zithromax': 'Zithromax',
  'zpack': 'Z-pack',
  'z pack': 'Z-pack',
  'ciprofloxacin': 'ciprofloxacin',
  'cipro': 'Cipro',
  'levofloxacin': 'levofloxacin',
  'levaquin': 'Levaquin',
  'doxycycline': 'doxycycline',
  'doxicycline': 'doxycycline',
  
  // Psychiatric medications
  'sertraline': 'sertraline',
  'sertralene': 'sertraline',
  'zoloft': 'Zoloft',
  'escitalopram': 'escitalopram',
  'lexapro': 'Lexapro',
  'fluoxetine': 'fluoxetine',
  'prozac': 'Prozac',
  'bupropion': 'bupropion',
  'buproprion': 'bupropion',
  'wellbutrin': 'Wellbutrin',
  'trazodone': 'trazodone',
  'trazadone': 'trazodone',
  'quetiapine': 'quetiapine',
  'seroquel': 'Seroquel',
  'lorazepam': 'lorazepam',
  'ativan': 'Ativan',
  'alprazolam': 'alprazolam',
  'xanax': 'Xanax',
  
  // GI medications
  'omeprazole': 'omeprazole',
  'omeprozole': 'omeprazole',
  'prilosec': 'Prilosec',
  'pantoprazole': 'pantoprazole',
  'protonix': 'Protonix',
  'famotidine': 'famotidine',
  'pepcid': 'Pepcid',
  'ondansetron': 'ondansetron',
  'zofran': 'Zofran',
  
  // Respiratory
  'albuterol': 'albuterol',
  'albutorol': 'albuterol',
  'ventolin': 'Ventolin',
  'fluticasone': 'fluticasone',
  'flovent': 'Flovent',
  'montelukast': 'montelukast',
  'singulair': 'Singulair',
  'prednisone': 'prednisone',
  'prednezone': 'prednisone',
  
  // Common conditions
  'hypertension': 'hypertension',
  'hypertenshun': 'hypertension',
  'high blood pressure': 'hypertension',
  'diabetes mellitus': 'diabetes mellitus',
  'diabeetus': 'diabetes',
  'hyperlipidemia': 'hyperlipidemia',
  'hyperlipademia': 'hyperlipidemia',
  'high cholesterol': 'hyperlipidemia',
  'atrial fibrillation': 'atrial fibrillation',
  'a fib': 'atrial fibrillation',
  'afib': 'atrial fibrillation',
  'CHF': 'congestive heart failure',
  'chf': 'congestive heart failure',
  'COPD': 'chronic obstructive pulmonary disease',
  'copd': 'chronic obstructive pulmonary disease',
  'pneumonia': 'pneumonia',
  'numonia': 'pneumonia',
  'cellulitis': 'cellulitis',
  'cellulites': 'cellulitis',
  
  // Anatomical terms
  'bilateral': 'bilateral',
  'bilaterally': 'bilaterally',
  'unilateral': 'unilateral',
  'proximal': 'proximal',
  'distal': 'distal',
  'anterior': 'anterior',
  'posterior': 'posterior',
  'medial': 'medial',
  'lateral': 'lateral',
  'superior': 'superior',
  'inferior': 'inferior',
  'thoracic': 'thoracic',
  'thorasic': 'thoracic',
  'lumbar': 'lumbar',
  'lumbur': 'lumbar',
  'cervical': 'cervical',
  'cervicle': 'cervical',
  'abdomen': 'abdomen',
  'abdomin': 'abdomen',
  
  // Procedures/Tests
  'echocardiogram': 'echocardiogram',
  'echo cardiogram': 'echocardiogram',
  'electrocardiogram': 'electrocardiogram',
  'EKG': 'EKG',
  'ekg': 'EKG',
  'ECG': 'ECG',
  'ecg': 'ECG',
  'CT scan': 'CT scan',
  'cat scan': 'CT scan',
  'MRI': 'MRI',
  'mri': 'MRI',
  'x-ray': 'X-ray',
  'xray': 'X-ray',
  'ultrasound': 'ultrasound',
  'colonoscopy': 'colonoscopy',
  'colonoscophy': 'colonoscopy',
  'endoscopy': 'endoscopy',
  'endoscophy': 'endoscopy',
  
  // Vitals/Measurements
  'blood pressure': 'blood pressure',
  'BP': 'blood pressure',
  'heart rate': 'heart rate',
  'HR': 'heart rate',
  'respiratory rate': 'respiratory rate',
  'RR': 'respiratory rate',
  'temperature': 'temperature',
  'temp': 'temperature',
  'oxygen saturation': 'oxygen saturation',
  'O2 sat': 'oxygen saturation',
  'pulse ox': 'pulse oximetry',
  'pulse oximetry': 'pulse oximetry',
  
  // Clinical terms
  'chief complaint': 'chief complaint',
  'history of present illness': 'history of present illness',
  'HPI': 'history of present illness',
  'past medical history': 'past medical history',
  'PMH': 'past medical history',
  'review of systems': 'review of systems',
  'ROS': 'review of systems',
  'physical exam': 'physical examination',
  'physical examination': 'physical examination',
  'assessment': 'assessment',
  'plan': 'plan',
  'differential diagnosis': 'differential diagnosis',
  'DDx': 'differential diagnosis',
  'follow up': 'follow-up',
  'followup': 'follow-up',
};

// Medical abbreviations that should be expanded or recognized
export const ABBREVIATIONS: Record<string, string> = {
  'BID': 'twice daily',
  'TID': 'three times daily',
  'QID': 'four times daily',
  'QD': 'once daily',
  'PRN': 'as needed',
  'PO': 'by mouth',
  'IV': 'intravenous',
  'IM': 'intramuscular',
  'SQ': 'subcutaneous',
  'subQ': 'subcutaneous',
  'NPO': 'nothing by mouth',
  'SOB': 'shortness of breath',
  'DOE': 'dyspnea on exertion',
  'CP': 'chest pain',
  'HA': 'headache',
  'N/V': 'nausea/vomiting',
  'Abd': 'abdominal',
  'Pt': 'patient',
  'Hx': 'history',
  'Dx': 'diagnosis',
  'Tx': 'treatment',
  'Rx': 'prescription',
  'Sx': 'symptoms',
  'WNL': 'within normal limits',
  'NAD': 'no acute distress',
  'A&O': 'alert and oriented',
  'AAOx3': 'alert and oriented x3',
  'HEENT': 'head, eyes, ears, nose, throat',
  'CV': 'cardiovascular',
  'Resp': 'respiratory',
  'GI': 'gastrointestinal',
  'GU': 'genitourinary',
  'MSK': 'musculoskeletal',
  'Neuro': 'neurological',
  'Psych': 'psychiatric',
  'Ext': 'extremities',
  'BLE': 'bilateral lower extremities',
  'BUE': 'bilateral upper extremities',
  'RLE': 'right lower extremity',
  'LLE': 'left lower extremity',
  'RUE': 'right upper extremity',
  'LUE': 'left upper extremity',
};

// Build a regex pattern for efficient matching
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sortedPhoneticKeys = Object.keys(PHONETIC_CORRECTIONS).sort((a, b) => b.length - a.length);
const phoneticPattern = new RegExp(
  `\\b(${sortedPhoneticKeys.map(escapeRegex).join('|')})\\b`,
  'gi'
);

/**
 * Apply instant client-side corrections to transcript text
 */
export function applyInstantCorrections(text: string): { 
  correctedText: string; 
  corrections: Array<{ original: string; corrected: string }>;
} {
  const corrections: Array<{ original: string; corrected: string }> = [];
  
  const correctedText = text.replace(phoneticPattern, (match) => {
    const lowerMatch = match.toLowerCase();
    const correction = PHONETIC_CORRECTIONS[lowerMatch];
    
    if (correction && correction.toLowerCase() !== lowerMatch) {
      corrections.push({ original: match, corrected: correction });
      return correction;
    }
    return match;
  });
  
  return { correctedText, corrections };
}

/**
 * Check if a term exists in the medical dictionary
 */
export function isKnownMedicalTerm(term: string): boolean {
  const lowerTerm = term.toLowerCase();
  return (
    lowerTerm in PHONETIC_CORRECTIONS ||
    Object.values(PHONETIC_CORRECTIONS).some(v => v.toLowerCase() === lowerTerm) ||
    lowerTerm in ABBREVIATIONS
  );
}

/**
 * Get all known medical terms (for autocomplete or validation)
 */
export function getAllMedicalTerms(): string[] {
  const terms = new Set<string>();
  
  Object.values(PHONETIC_CORRECTIONS).forEach(term => terms.add(term));
  Object.keys(ABBREVIATIONS).forEach(abbr => terms.add(abbr));
  
  return Array.from(terms).sort();
}
