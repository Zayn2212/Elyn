import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COHERE_API_URL = 'https://api.cohere.ai/v1/chat';

const RADIOLOGY_CPT_GUIDANCE: Record<string, string> = {
  xray: 'Use CPT codes 71045-71048 for chest, 73000-73140 for upper extremity, 73500-73660 for lower extremity, 72020-72120 for spine',
  ct: 'Use CPT codes 70450-70498 for head, 71250-71275 for chest, 72125-72133 for spine, 74150-74178 for abdomen/pelvis. Add +26 modifier for professional component',
  mri: 'Use CPT codes 70551-70559 for brain, 70540-70543 for orbit/face/neck, 72141-72158 for spine, 73218-73223 for extremities. Add +26 modifier for professional component',
  ultrasound: 'Use CPT codes 76700-76705 for abdomen, 76770-76775 for retroperitoneum, 76801-76828 for OB, 76830-76857 for pelvic',
  mammography: 'Use CPT codes 77065-77067 for mammography. Include BI-RADS category (0-6) in structured_category field',
  fluoroscopy: 'Use CPT codes 76000-76001 for fluoroscopy guidance, 74230 for swallowing function, 74240-74250 for upper GI',
};
const RADIOLOGY_MODALITIES = ['xray', 'ct', 'mri', 'ultrasound', 'mammography', 'fluoroscopy'];

const CARDIOLOGY_CPT_GUIDANCE: Record<string, string> = {
  echo: 'Use CPT 93306 (TTE complete with Doppler), 93307 (TTE without Doppler), 93308 (TTE limited). Add 93320 (Doppler echo), 93321 (Doppler echo add-on), 93325 (color flow Doppler)',
  ekg: 'Use CPT 93000 (ECG with interpretation), 93010 (ECG interpretation only), 93005 (ECG tracing only)',
  stress_test: 'Use CPT 93015 (stress test with interpretation), 93016 (supervision only), 93017 (tracing only), 93018 (interpretation only). For nuclear: 78451-78454. For stress echo: 93350-93351',
  cath: 'Use CPT 93452 (left heart cath), 93453 (combined left/right), 93454-93461 (coronary angiography), 93458 (cath + angiography). PCI: 92920-92944',
  tee: 'Use CPT 93312 (TEE with interpretation), 93313 (TEE placement only), 93314 (TEE image only), 93315-93317 (intraoperative TEE)',
};
const CARDIOLOGY_STUDY_TYPES = ['echo', 'ekg', 'stress_test', 'cath', 'tee'];

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
    const noteContent = body.note || '';
    const noteType = body.noteType || 'progress';
    const encounterContext = body.encounterContext || null;

    if (!noteContent || noteContent.length < 20) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Note content too short' 
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const isRadiology = RADIOLOGY_MODALITIES.includes(noteType);
    const isCardiology = CARDIOLOGY_STUDY_TYPES.includes(noteType);

    const cptGuidance = isCardiology
      ? `\n\nCPT Code Guidance: ${CARDIOLOGY_CPT_GUIDANCE[noteType] || ''}`
      : isRadiology ? `\n\nCPT Code Guidance: ${RADIOLOGY_CPT_GUIDANCE[noteType] || ''}` : '';

    const emGuidance = (!isRadiology && encounterContext?.encounterType)
      ? `\n\nE/M CODE SELECTION (CRITICAL): ${ENCOUNTER_EM_GUIDANCE[encounterContext.encounterType] || ''}`
      : '';

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
      ? `You are an expert medical biller. Extract highly accurate billing codes purely from the given cardiology report text.
${cptGuidance}

OUTPUT FORMAT (respond with valid JSON only):
{
  "billing": {
    "icd10": [{"code": "I25.10", "description": "Finding"}],
    "cpt": [{"code": "93306", "description": "TTE complete with Doppler"}],
    "modifiers": [],
    "rvu": 1.5
  },
  "structured_category": null
}`
      : isRadiology
      ? `You are an expert medical biller. Extract highly accurate billing codes purely from the given radiology report text.
${cptGuidance}

OUTPUT FORMAT (respond with valid JSON only):
{
  "billing": {
    "icd10": [{"code": "X00.0", "description": "Finding"}],
    "cpt": [{"code": "71046", "description": "Chest X-ray 2 views"}],
    "modifiers": ["-26"],
    "rvu": 0.75
  },
  "structured_category": "BI-RADS 2" // if applicable
}`
      : `You are an expert medical coder. Extract highly accurate billing codes from the given clinical note.
Determine the correct ICD-10 codes, CPT codes, MDM complexity, and E/M level based purely on the note provided.
${emGuidance}
${modifierGuidance}

OUTPUT FORMAT (respond with valid JSON only):
{
  "billing": {
    "icd10": [{"code": "X00.0", "description": "Condition"}],
    "cpt": [{"code": "99214", "description": "Office visit"}],
    "mdmComplexity": "Low|Moderate|High",
    "emLevel": "99211|99212|99213|99214|99215",
    "modifiers": [],
    "rvu": 1.92
  }
}`;

    const userPrompt = `Extract billing codes for this ${isCardiology ? 'cardiology report' : isRadiology ? 'radiology report' : 'clinical note'}:
${noteContent}`;

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
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
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
      throw new Error('Failed to parse AI response');
    }
    
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

    return new Response(JSON.stringify({
      success: true,
      billing,
      structured_category: parsed.structured_category || null,
      isRadiology: isRadiology || isCardiology,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in extract-billing-only:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
