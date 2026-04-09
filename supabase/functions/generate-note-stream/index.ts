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
};

interface NotePreferencesInput {
  noteFormat?: string;
  sections?: Record<string, boolean>;
  sectionOrder?: string[];
}

function buildDynamicSOAPStructure(prefs: NotePreferencesInput | null): string {
  if (!prefs || !prefs.sections || !prefs.sectionOrder) {
    return `Generate the note in SOAP format with these exact section headers:

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

  return `Generate the note with these exact section headers (in this order):

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

const RADIOLOGY_MODALITIES = ['xray', 'ct', 'mri', 'ultrasound', 'mammography', 'fluoroscopy'];

const CARDIOLOGY_TEMPLATES: Record<string, string> = {
  echo: `Echocardiogram Report with: Clinical Indication, Technique, 2D Measurements, Doppler Findings, Valvular Assessment, Wall Motion, Ejection Fraction, Impression`,
  ekg: `EKG/ECG Interpretation with: Clinical Indication, Rate, Rhythm, Axis, Intervals (PR, QRS, QTc), ST/T Wave Changes, Interpretation, Comparison, Impression`,
  stress_test: `Stress Test Report with: Clinical Indication, Protocol Used, Baseline Findings, Exercise/Pharmacologic Data, Peak HR and BP, Symptoms, ECG Changes, Imaging Findings (if applicable), Duke Treadmill Score, Impression`,
  cath: `Cardiac Catheterization Report with: Clinical Indication, Access Site, Hemodynamics, Coronary Angiography Findings, Left Ventriculography, Intervention (if performed), Complications, Impression/Recommendations`,
  tee: `Transesophageal Echocardiogram Report with: Clinical Indication, Sedation, Technique, Valve Assessment, Chamber Assessment, Aortic Assessment, Findings, Impression`,
};

const CARDIOLOGY_STUDY_TYPES = ['echo', 'ekg', 'stress_test', 'cath', 'tee'];

const SPECIALTY_CONTEXT: Record<string, string> = {
  cardiology: `You are documenting for a CARDIOLOGIST. Use cardiology-specific terminology (ejection fraction, wall motion, stenosis grading, NYHA class, ACC/AHA guidelines).`,
  pulmonology: `You are documenting for a PULMONOLOGIST. Use pulmonology-specific terminology.`,
  radiology: `You are documenting for a RADIOLOGIST. Use structured reporting format with standard radiology terminology.`,
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
      contextStr = patientContext.length ? `\nPatient Context:\n${patientContext.join('\n')}` : '';
    }

    const template = isCardiology
      ? CARDIOLOGY_TEMPLATES[noteType] || CARDIOLOGY_TEMPLATES.echo
      : isRadiology 
        ? RADIOLOGY_TEMPLATES[noteType] || RADIOLOGY_TEMPLATES.xray
        : CLINICAL_TEMPLATES[noteType] || CLINICAL_TEMPLATES.progress;

    const soapStructure = (isRadiology || isCardiology) ? '' : buildDynamicSOAPStructure(notePreferences);
    const specialtyPrompt = providerSpecialty && SPECIALTY_CONTEXT[providerSpecialty]
      ? `\n\nSPECIALTY CONTEXT: ${SPECIALTY_CONTEXT[providerSpecialty]}`
      : '';

    const systemPrompt = isCardiology
      ? `You are an expert cardiologist generating a structured cardiology study report.
${specialtyPrompt}
CRITICAL RULES:
1. Preserve all placeholder tokens exactly as written (e.g., [NAME_0], [MRN_0])
2. Use standard terminology and structured reporting format
3. Output ONLY the note text. Do NOT wrap in JSON.`
      : isRadiology
      ? `You are an expert radiologist generating a structured radiology report.
${specialtyPrompt}
CRITICAL RULES:
1. Preserve all placeholder tokens exactly as written (e.g., [NAME_0], [MRN_0])
2. Use standard radiology terminology and structured reporting format
3. Output ONLY the note text. Do NOT wrap in JSON.`
      : `You are an expert medical documentation specialist generating a clinical note.
${specialtyPrompt}
CRITICAL RULES:
1. Preserve all placeholder tokens exactly as written (e.g., [PATIENT_NAME], [PATIENT_MRN])
2. Use standard medical terminology and proper documentation format
3. Follow the section structure provided below
4. Output ONLY the note text. Do NOT wrap in JSON.
${soapStructure}`;

    const dictationType = isCardiology ? 'dictation' : isRadiology ? 'dictation' : 'transcript';
    const userPrompt = `Generate a ${template} from this ${dictationType}.${contextStr}
${dictationType.charAt(0).toUpperCase() + dictationType.slice(1)}:
${cleanedTranscript}`;

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
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.status}`);
    }

    // Process stream and perform reidentification
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        const encoder = new TextEncoder();
        let buffer = "";

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const events = chunk.split('\n');

          for (const ev of events) {
            if (!ev.trim()) continue;
            try {
              const data = JSON.parse(ev);
              if (data.event_type === "text-generation" && data.text) {
                buffer += data.text;
                // Only flush buffer if no partial bracket patterns exist like "[NAM..." or "[MRN_0" without closing "]"
                // A safe heuristic: buffer ends in `[` followed by max 20 chars without `]`
                const matchPartial = buffer.match(/\[[^\]]{0,30}$/);
                if (!matchPartial) {
                  // Fully re-identify the buffer chunk
                  const reidentified = reidentifyPhi(buffer, allTokens);
                  controller.enqueue(encoder.encode(reidentified));
                  buffer = ""; // clear buffer
                }
              }
            } catch (e) {
              // Ignore parse errors from non-json SSE lines
            }
          }
        }
        // Flush any remaining
        if (buffer) {
          controller.enqueue(encoder.encode(reidentifyPhi(buffer, allTokens)));
        }
        controller.close();
      }
    });

    return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' } });

  } catch (error) {
    console.error('Error in generate-note-stream:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
