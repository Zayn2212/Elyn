import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COHERE_API_URL = 'https://api.cohere.ai/v1/chat';

const PHI_PATTERNS = [
  { type: 'NAME', pattern: /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g },
  { type: 'MRN', pattern: /\b(?:MRN|Medical Record|Patient ID)[:\s#]*([A-Z0-9-]+)/gi },
  { type: 'DOB', pattern: /\b(?:DOB|Date of Birth|Born)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi },
  { type: 'SSN', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: 'PHONE', pattern: /\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { type: 'EMAIL', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
  { type: 'ROOM', pattern: /\b(?:Room|Rm|Bed)[:\s#]*([A-Z0-9-]+)/gi },
];

interface PhiToken { placeholder: string; original: string; type: string; }

function deidentifyPhi(text: string): { cleanedText: string; tokens: PhiToken[] } {
  const tokens: PhiToken[] = [];
  let cleanedText = text;
  let counter: Record<string, number> = {};

  for (const { type, pattern } of PHI_PATTERNS) {
    cleanedText = cleanedText.replace(pattern, (match) => {
      counter[type] = (counter[type] || 0);
      const placeholder = `[${type}_${counter[type]++}]`;
      tokens.push({ placeholder, original: match, type });
      return placeholder;
    });
  }
  return { cleanedText, tokens };
}

function reidentifyPhi(text: string, tokens: PhiToken[]): string {
  let result = text;
  for (const { placeholder, original } of tokens) {
    result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), original);
  }
  return result;
}

function sanitizeInput(input: string | undefined | null, maxLength = 50000): string {
  if (!input) return '';
  return String(input).trim().slice(0, maxLength);
}

const CLINICAL_TEMPLATES: Record<string, string> = {
  hp: `H&P Note in SOAP Format`,
  consult: `Consultation Note in SOAP Format`,
  progress: `Progress Note in SOAP Format`,
};

const SECTION_TEMPLATES: Record<string, string> = {
  subjective: `## SUBJECTIVE
- Chief Complaint (CC)
- History of Present Illness (HPI)
- Review of Systems (ROS)
- Past Medical History (PMH)
- Medications
- Allergies
- Social/Family History (if relevant)`,
  objective: `## OBJECTIVE
- Vital Signs
- Physical Examination findings
- Laboratory/Imaging results (if available)`,
  assessment: `## ASSESSMENT
- Primary diagnosis with ICD-10 codes
- Differential diagnoses
- Problem list`,
  plan: `## PLAN
- Treatment plan
- Medications (with dosage)
- Follow-up instructions
- Patient education
- Referrals (if any)`,
  patientEducation: `## PATIENT EDUCATION
- Instructions given to patient
- Warning signs to watch for
- Lifestyle modifications`,
  followUp: `## FOLLOW-UP
- Next appointment
- When to return for evaluation
- Pending tests/results`,
};

const DEFAULT_SECTION_ORDER = ['subjective', 'objective', 'assessment', 'plan'];

interface NotePreferencesInput {
  noteFormat?: string;
  sections?: Record<string, boolean>;
  sectionOrder?: string[];
}

function buildDynamicSOAPStructure(prefs: NotePreferencesInput | null): string {
  if (!prefs || !prefs.sections || !prefs.sectionOrder) {
    return `
Generate the note in SOAP format with these exact section headers:

${SECTION_TEMPLATES.subjective}

${SECTION_TEMPLATES.objective}

${SECTION_TEMPLATES.assessment}

${SECTION_TEMPLATES.plan}

Use "##" for section headers exactly as shown above.`;
  }

  const enabledSections: string[] = [];
  for (const sectionKey of prefs.sectionOrder) {
    if (prefs.sections[sectionKey] && SECTION_TEMPLATES[sectionKey]) {
      enabledSections.push(SECTION_TEMPLATES[sectionKey]);
    }
  }

  if (enabledSections.length === 0) {
    enabledSections.push(SECTION_TEMPLATES.assessment, SECTION_TEMPLATES.plan);
  }

  return `
Generate the note with these exact section headers (in this order):

${enabledSections.join('\n\n')}

Use "##" for section headers exactly as shown above.`;
}

const RADIOLOGY_TEMPLATES: Record<string, string> = {
  xray: `X-Ray Report with: Clinical Indication, Comparison, Technique, Findings, Impression`,
  ct: `CT Report with: Clinical Indication, Comparison, Technique, Findings by Region/Organ System, Impression`,
  mri: `MRI Report with: Clinical Indication, Comparison, Technique/Sequences, Findings by Region, Impression`,
  ultrasound: `Ultrasound Report with: Clinical Indication, Comparison, Technique, Findings, Impression`,
  mammography: `Mammography Report with: Clinical Indication, Comparison, Breast Composition, Findings, BI-RADS Category, Management Recommendation`,
  fluoroscopy: `Fluoroscopy Report with: Clinical Indication, Comparison, Technique, Findings, Impression`,
};

const RADIOLOGY_CPT_GUIDANCE: Record<string, string> = {
  xray: 'Use CPT codes 71045-71048 for chest, 73000-73140 for upper extremity, 73500-73660 for lower extremity, 72020-72120 for spine',
  ct: 'Use CPT codes 70450-70498 for head, 71250-71275 for chest, 72125-72133 for spine, 74150-74178 for abdomen/pelvis. Add +26 modifier for professional component',
  mri: 'Use CPT codes 70551-70559 for brain, 70540-70543 for orbit/face/neck, 72141-72158 for spine, 73218-73223 for extremities. Add +26 modifier for professional component',
  ultrasound: 'Use CPT codes 76700-76705 for abdomen, 76770-76775 for retroperitoneum, 76801-76828 for OB, 76830-76857 for pelvic',
  mammography: 'Use CPT codes 77065-77067 for mammography. Include BI-RADS category (0-6) in structured_category field',
  fluoroscopy: 'Use CPT codes 76000-76001 for fluoroscopy guidance, 74230 for swallowing function, 74240-74250 for upper GI',
};

const RADIOLOGY_MODALITIES = ['xray', 'ct', 'mri', 'ultrasound', 'mammography', 'fluoroscopy'];

// Cardiology study type templates & CPT guidance
const CARDIOLOGY_TEMPLATES: Record<string, string> = {
  echo: `Echocardiogram Report with: Clinical Indication, Technique, 2D Measurements, Doppler Findings, Valvular Assessment, Wall Motion, Ejection Fraction, Impression`,
  ekg: `EKG/ECG Interpretation with: Clinical Indication, Rate, Rhythm, Axis, Intervals (PR, QRS, QTc), ST/T Wave Changes, Interpretation, Comparison, Impression`,
  stress_test: `Stress Test Report with: Clinical Indication, Protocol Used, Baseline Findings, Exercise/Pharmacologic Data, Peak HR and BP, Symptoms, ECG Changes, Imaging Findings (if applicable), Duke Treadmill Score, Impression`,
  cath: `Cardiac Catheterization Report with: Clinical Indication, Access Site, Hemodynamics, Coronary Angiography Findings, Left Ventriculography, Intervention (if performed), Complications, Impression/Recommendations`,
  tee: `Transesophageal Echocardiogram Report with: Clinical Indication, Sedation, Technique, Valve Assessment, Chamber Assessment, Aortic Assessment, Findings, Impression`,
};

const CARDIOLOGY_CPT_GUIDANCE: Record<string, string> = {
  echo: 'Use CPT 93306 (TTE complete with Doppler), 93307 (TTE without Doppler), 93308 (TTE limited). Add 93320 (Doppler echo), 93321 (Doppler echo add-on), 93325 (color flow Doppler)',
  ekg: 'Use CPT 93000 (ECG with interpretation), 93010 (ECG interpretation only), 93005 (ECG tracing only)',
  stress_test: 'Use CPT 93015 (stress test with interpretation), 93016 (supervision only), 93017 (tracing only), 93018 (interpretation only). For nuclear: 78451-78454. For stress echo: 93350-93351',
  cath: 'Use CPT 93452 (left heart cath), 93453 (combined left/right), 93454-93461 (coronary angiography), 93458 (cath + angiography). PCI: 92920-92944',
  tee: 'Use CPT 93312 (TEE with interpretation), 93313 (TEE placement only), 93314 (TEE image only), 93315-93317 (intraoperative TEE)',
};

const CARDIOLOGY_STUDY_TYPES = ['echo', 'ekg', 'stress_test', 'cath', 'tee'];

// Specialty-specific prompt context
const SPECIALTY_CONTEXT: Record<string, string> = {
  cardiology: `You are documenting for a CARDIOLOGIST. Use cardiology-specific terminology (ejection fraction, wall motion, stenosis grading, NYHA class, ACC/AHA guidelines). For billing, prefer cardiology-specific CPT codes (93000-series for EKG, 93303-93352 for echo, 93015-93018 for stress tests, 92920-92944 for PCI).`,
  pulmonology: `You are documenting for a PULMONOLOGIST. Use pulmonology-specific terminology (FEV1/FVC, DLCO, oxygen requirements, GOLD staging for COPD, ATS guidelines). For billing, include PFT codes (94010-94799) when applicable.`,
  neurology: `You are documenting for a NEUROLOGIST. Use neurology-specific terminology (GCS, NIH Stroke Scale, cranial nerve exam, motor/sensory exam, reflexes). Include neuro-specific CPT codes (95816-95827 for EEG, 95907-95913 for EMG/NCV) when applicable.`,
  gastroenterology: `You are documenting for a GASTROENTEROLOGIST. Use GI-specific terminology (endoscopic findings, MELD score, Child-Pugh, Bristol stool scale). Include GI procedure codes (43235-43259 for EGD, 45378-45398 for colonoscopy) when applicable.`,
  nephrology: `You are documenting for a NEPHROLOGIST. Use nephrology-specific terminology (GFR, CKD staging, electrolyte management, dialysis adequacy Kt/V). Include nephrology-specific codes (90935-90999 for dialysis) when applicable.`,
  emergency_medicine: `You are documenting for an EMERGENCY MEDICINE physician. Use ED-specific documentation (triage level, disposition, medical decision-making complexity). Use ED E/M codes (99281-99285) instead of office/inpatient codes.`,
  critical_care: `You are documenting for a CRITICAL CARE physician. Emphasize severity of illness, organ failure assessment (SOFA), ventilator settings, vasopressor requirements. Use critical care CPT codes (99291-99292) when applicable.`,
  hospitalist: `You are documenting for a HOSPITALIST. Follow standard inpatient documentation with focus on admission/discharge criteria, care coordination, and transitions of care.`,
  radiology: `You are documenting for a RADIOLOGIST. Use structured reporting format with standard radiology terminology, comparison studies, and standardized impression/recommendations.`,
  orthopedics: `You are documenting for an ORTHOPEDIC SURGEON. Use orthopedic terminology (ROM measurements, neurovascular status, fracture classification systems). Include MSK procedure codes when applicable.`,
  general_surgery: `You are documenting for a GENERAL SURGEON. Include operative details, wound classification, estimated blood loss when relevant. Use appropriate surgical CPT codes.`,
  psychiatry: `You are documenting for a PSYCHIATRIST. Include mental status exam (MSE), risk assessment, psychiatric review of systems, medication management. Use psychiatric E/M codes (90791-90899) when applicable.`,
  pediatrics: `You are documenting for a PEDIATRICIAN. Include developmental milestones, growth parameters (percentiles), immunization status, age-appropriate screening.`,
  dermatology: `You are documenting for a DERMATOLOGIST. Use dermatologic terminology (lesion morphology, distribution, ABCDE criteria). Include dermatology procedure codes (11100-11646 for biopsy/excision) when applicable.`,
  endocrinology: `You are documenting for an ENDOCRINOLOGIST. Use endocrine-specific terminology (HbA1c targets, thyroid function, adrenal testing). Include endocrine-specific management guidelines.`,
  rheumatology: `You are documenting for a RHEUMATOLOGIST. Use rheumatology-specific terminology (DAS28, CDAI, joint counts, autoantibody panels). Include rheumatology-specific assessment tools.`,
  infectious_disease: `You are documenting for an INFECTIOUS DISEASE specialist. Include culture data, antibiotic susceptibility, duration of therapy, and antimicrobial stewardship considerations.`,
};

// Encounter-type-specific E/M code guidance
const ENCOUNTER_EM_GUIDANCE: Record<string, string> = {
  initial_consult: `This is an INITIAL HOSPITAL CARE encounter. Use E/M codes: 99221 (Low MDM), 99222 (Moderate MDM), 99223 (High MDM). These are for the first day of inpatient care.`,
  follow_up: `This is a SUBSEQUENT HOSPITAL CARE encounter. Use E/M codes: 99231 (Low MDM), 99232 (Moderate MDM), 99233 (High MDM). These are for follow-up visits after admission.`,
  discharge: `This is a HOSPITAL DISCHARGE encounter. Use E/M codes: 99238 (≤30 min discharge), 99239 (>30 min discharge).`,
  critical_care: `This is a CRITICAL CARE encounter. Use CPT codes: 99291 (first 30-74 minutes), 99292 (each additional 30 minutes).`,
  telehealth_consult: `This is a TELEHEALTH encounter. Use office/outpatient E/M codes 99211-99215 with modifier -95. Set POS to 02.`,
  procedure: `This is a PROCEDURE encounter. Use the appropriate procedure CPT code. If a separately identifiable E/M service was performed, add modifier -25 to the E/M code.`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const COHERE_API_KEY = Deno.env.get('COHERE_API_KEY');
    if (!COHERE_API_KEY) throw new Error('COHERE_API_KEY not configured');

    const body = await req.json();
    const transcript = sanitizeInput(body.transcript);
    const noteType = body.noteType || 'progress';
    const patientInfo = body.patientInfo || {};
    const radiologyContext = body.radiologyContext || null;
    const notePreferences: NotePreferencesInput | null = body.notePreferences || null;
    const encounterContext = body.encounterContext || null;
    const providerSpecialty: string | null = body.providerSpecialty || null;

    if (!transcript || transcript.length < 20) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Transcript too short' 
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const isRadiology = RADIOLOGY_MODALITIES.includes(noteType);
    const isCardiology = CARDIOLOGY_STUDY_TYPES.includes(noteType);

    const { cleanedText: cleanedTranscript, tokens: transcriptTokens } = deidentifyPhi(transcript);
    
    const allTokens = [...transcriptTokens];
    let contextStr = '';

    if (isRadiology && radiologyContext) {
      const radCtx = [];
      if (radiologyContext.bodyPart) radCtx.push(`Body Part: ${radiologyContext.bodyPart}`);
      if (radiologyContext.indication) radCtx.push(`Clinical Indication: ${radiologyContext.indication}`);
      if (radiologyContext.comparison) radCtx.push(`Comparison: ${radiologyContext.comparison}`);
      if (radiologyContext.technique) radCtx.push(`Technique: ${radiologyContext.technique}`);
      if (radiologyContext.contrast !== undefined) radCtx.push(`Contrast: ${radiologyContext.contrast ? 'Yes' : 'No'}`);
      contextStr = radCtx.length ? `\nStudy Context:\n${radCtx.join('\n')}` : '';
    } else if (patientInfo) {
      const patientContext = [];
      if (patientInfo.name) {
        const placeholder = `[PATIENT_NAME]`;
        patientContext.push(`Patient: ${placeholder}`);
        allTokens.push({ placeholder, original: patientInfo.name, type: 'NAME' });
      }
      if (patientInfo.mrn) {
        const placeholder = `[PATIENT_MRN]`;
        patientContext.push(`MRN: ${placeholder}`);
        allTokens.push({ placeholder, original: patientInfo.mrn, type: 'MRN' });
      }
      if (patientInfo.dob) {
        const placeholder = `[PATIENT_DOB]`;
        patientContext.push(`DOB: ${placeholder}`);
        allTokens.push({ placeholder, original: patientInfo.dob, type: 'DOB' });
      }
      if (patientInfo.room) {
        const placeholder = `[PATIENT_ROOM]`;
        patientContext.push(`Room: ${placeholder}`);
        allTokens.push({ placeholder, original: patientInfo.room, type: 'ROOM' });
      }
      if (patientInfo.diagnosis) patientContext.push(`Diagnosis: ${patientInfo.diagnosis}`);
      if (patientInfo.allergies?.length) patientContext.push(`Allergies: ${patientInfo.allergies.join(', ')}`);
      contextStr = patientContext.length ? `\nPatient Context:\n${patientContext.join('\n')}` : '';
    }

    // Build encounter context string for the AI prompt
    let encounterStr = '';
    if (encounterContext && !isRadiology) {
      const parts = [];
      if (encounterContext.encounterType) {
        parts.push(`Encounter Type: ${encounterContext.encounterType.replace(/_/g, ' ')}`);
      }
      if (encounterContext.isTelehealth) {
        parts.push('This is a TELEHEALTH encounter - include modifier -95 and use POS 02');
      }
      if (encounterContext.placeOfService) {
        parts.push(`Place of Service: ${encounterContext.placeOfService}`);
      }
      if (encounterContext.referringProvider) {
        parts.push(`Referring Provider: ${encounterContext.referringProvider}`);
      }
      encounterStr = parts.length ? `\nEncounter Context:\n${parts.join('\n')}` : '';
    }

    const template = isCardiology
      ? CARDIOLOGY_TEMPLATES[noteType] || CARDIOLOGY_TEMPLATES.echo
      : isRadiology 
        ? RADIOLOGY_TEMPLATES[noteType] || RADIOLOGY_TEMPLATES.xray
        : CLINICAL_TEMPLATES[noteType] || CLINICAL_TEMPLATES.progress;

    const cptGuidance = isCardiology
      ? `\n\nCPT Code Guidance: ${CARDIOLOGY_CPT_GUIDANCE[noteType] || ''}`
      : isRadiology ? `\n\nCPT Code Guidance: ${RADIOLOGY_CPT_GUIDANCE[noteType] || ''}` : '';
    
    const soapStructure = (isRadiology || isCardiology) ? '' : buildDynamicSOAPStructure(notePreferences);

    // Specialty context injection
    const specialtyPrompt = providerSpecialty && SPECIALTY_CONTEXT[providerSpecialty]
      ? `\n\nSPECIALTY CONTEXT: ${SPECIALTY_CONTEXT[providerSpecialty]}`
      : '';

    // Get encounter-specific E/M guidance
    const emGuidance = (!isRadiology && encounterContext?.encounterType)
      ? `\n\nE/M CODE SELECTION (CRITICAL): ${ENCOUNTER_EM_GUIDANCE[encounterContext.encounterType] || ''}`
      : '';

    // Build modifier guidance for encounter context
    let modifierGuidance = '';
    if (!isRadiology && encounterContext) {
      const modParts = [];
      if (encounterContext.isTelehealth || encounterContext.encounterType === 'telehealth_consult') {
        modParts.push('Include modifier "-95" in the modifiers array for telehealth');
      }
      if (modParts.length) {
        modifierGuidance = `\n\nMODIFIER REQUIREMENTS:\n${modParts.join('\n')}`;
      }
    }

    const systemPrompt = isCardiology
      ? `You are an expert cardiologist generating a structured cardiology study report AND extracting billing codes from the dictation.
${specialtyPrompt}

CRITICAL RULES:
1. Preserve all placeholder tokens exactly as written (e.g., [NAME_0], [MRN_0])
2. Use standard cardiology terminology and structured reporting format
3. Extract accurate CPT codes for the cardiology study
4. Include ICD-10 codes based on findings and clinical indication
5. Include relevant measurements and normal value comparisons
${cptGuidance}

OUTPUT FORMAT (respond with valid JSON only):
{
  "note": "The complete cardiology report text",
  "billing": {
    "icd10": [{"code": "I25.10", "description": "Finding"}],
    "cpt": [{"code": "93306", "description": "TTE complete with Doppler"}],
    "modifiers": [],
    "rvu": 1.5
  },
  "structured_category": null
}`
      : isRadiology
      ? `You are an expert radiologist generating a structured radiology report AND extracting billing codes from the dictation.
${specialtyPrompt}

CRITICAL RULES:
1. Preserve all placeholder tokens exactly as written (e.g., [NAME_0], [MRN_0])
2. Use standard radiology terminology and structured reporting format
3. Extract accurate CPT codes for the imaging study
4. Include ICD-10 codes based on findings and clinical indication
5. For mammography, ALWAYS include BI-RADS category (0-6) in the structured_category field
6. For other modalities, include relevant structured categories if applicable (LI-RADS for liver, TI-RADS for thyroid, etc.)
${cptGuidance}

OUTPUT FORMAT (respond with valid JSON only):
{
  "note": "The complete radiology report text",
  "billing": {
    "icd10": [{"code": "X00.0", "description": "Finding"}],
    "cpt": [{"code": "71046", "description": "Chest X-ray 2 views"}],
    "modifiers": ["-26"],
    "rvu": 0.75
  },
  "structured_category": "BI-RADS 2" // if applicable
}`
      : `You are an expert medical documentation specialist. Generate a clinical note AND extract billing codes from the transcript.
${specialtyPrompt}

CRITICAL RULES:
1. Preserve all placeholder tokens exactly as written (e.g., [PATIENT_NAME], [PATIENT_MRN])
2. Use standard medical terminology and proper documentation format
3. Extract accurate ICD-10 and CPT codes based on documented conditions/procedures
4. Determine MDM complexity and E/M level based on documentation
5. Follow the section structure provided below
6. Select the CORRECT E/M code range based on the encounter type provided
${soapStructure}
${emGuidance}
${modifierGuidance}

OUTPUT FORMAT (respond with valid JSON only):
{
  "note": "## SECTION_NAME\\n...\\n\\n## NEXT_SECTION\\n...",
  "billing": {
    "icd10": [{"code": "X00.0", "description": "Condition"}],
    "cpt": [{"code": "99214", "description": "Office visit"}],
    "mdmComplexity": "Low|Moderate|High",
    "emLevel": "99211|99212|99213|99214|99215",
    "modifiers": [],
    "rvu": 1.92
  }
}`;

    const dictationType = isCardiology ? 'dictation' : isRadiology ? 'dictation' : 'transcript';
    const userPrompt = `Generate a ${template} from this ${dictationType}.${contextStr}${encounterStr}

${dictationType.charAt(0).toUpperCase() + dictationType.slice(1)}:
${cleanedTranscript}`;

    const noteLabel = isCardiology ? 'cardiology report' : isRadiology ? 'radiology report' : 'clinical note';
    console.log(`Calling Cohere API for ${noteLabel} generation...`);

    const response = await fetch(COHERE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command-a-03-2025',
        message: userPrompt,
        preamble: systemPrompt,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cohere API error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded', success: false }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: 'Invalid API key', success: false }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`Cohere API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.text || '';
    
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response');
    }

    const finalNote = reidentifyPhi(parsed.note || '', allTokens);
    
    const billing = (isRadiology || isCardiology) ? {
      icd10: Array.isArray(parsed.billing?.icd10) ? parsed.billing.icd10 : [],
      cpt: Array.isArray(parsed.billing?.cpt) ? parsed.billing.cpt : [],
      modifiers: Array.isArray(parsed.billing?.modifiers) ? parsed.billing.modifiers : (isRadiology ? ['-26'] : []),
      rvu: typeof parsed.billing?.rvu === 'number' ? parsed.billing.rvu : (isRadiology ? 0.75 : 1.5),
    } : {
      icd10: Array.isArray(parsed.billing?.icd10) ? parsed.billing.icd10 : [],
      cpt: Array.isArray(parsed.billing?.cpt) ? parsed.billing.cpt : [],
      mdmComplexity: parsed.billing?.mdmComplexity || 'Moderate',
      emLevel: parsed.billing?.emLevel || '99214',
      modifiers: Array.isArray(parsed.billing?.modifiers) ? parsed.billing.modifiers : [],
      rvu: typeof parsed.billing?.rvu === 'number' ? parsed.billing.rvu : 1.92,
    };

    console.log(`Successfully generated ${noteLabel} with billing via Cohere`);

    return new Response(JSON.stringify({
      success: true,
      note: finalNote.trim(),
      billing,
      structured_category: parsed.structured_category || null,
      isRadiology: isRadiology || isCardiology,
      phiProtected: true,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in generate-note-with-billing:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
