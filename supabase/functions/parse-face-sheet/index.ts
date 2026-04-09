import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COHERE_API_URL = 'https://api.cohere.ai/v2/chat';

// PHI de-identification patterns (same as generate-note-with-billing)
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
  const counter: Record<string, number> = {};

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

const systemPrompt = `You are an expert medical document parser specializing in hospital face sheets and patient intake forms.

Your task is to extract structured data from the provided face sheet text. Be thorough and extract all available information.

IMPORTANT RULES:
1. Extract data exactly as written - don't infer or guess missing information
2. For dates, standardize to YYYY-MM-DD format when possible
3. For phone numbers, use format: (XXX) XXX-XXXX
4. If a field is not found or unclear, use null
5. Allergies and medications should be arrays even if only one item
6. Assign confidence scores (0.0 to 1.0) based on how clearly the data was extracted
7. Some fields may contain placeholders like [NAME_0], [MRN_0], [DOB_0] - preserve these exactly as-is

OUTPUT FORMAT (respond with valid JSON only):
{
  "patient": {
    "name": "Full Name or null",
    "dob": "YYYY-MM-DD or null",
    "mrn": "MRN number or null",
    "gender": "M/F/Other or null",
    "phone": "(XXX) XXX-XXXX or null",
    "address": "Full address or null",
    "emergencyContact": "Name and phone or null"
  },
  "insurance": {
    "provider": "Insurance company name or null",
    "policyNumber": "Policy/Member ID or null",
    "groupNumber": "Group number or null",
    "subscriberName": "Subscriber name or null",
    "subscriberDob": "YYYY-MM-DD or null",
    "relationship": "Self/Spouse/Child/Other or null",
    "authorizationNumber": "Prior auth number or null"
  },
  "medical": {
    "allergies": ["allergy1", "allergy2"],
    "medications": ["medication1 dosage", "medication2 dosage"],
    "pastMedicalHistory": ["condition1", "condition2"],
    "chiefComplaint": "Main reason for visit or null",
    "primaryDiagnosis": "Diagnosis or null",
    "roomNumber": "Room/Bed number or null",
    "attendingPhysician": "Doctor name or null",
    "admissionDate": "YYYY-MM-DD or null"
  },
  "confidence": {
    "overall": 0.85,
    "patient": 0.9,
    "insurance": 0.8,
    "medical": 0.85
  }
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const COHERE_API_KEY = Deno.env.get('COHERE_API_KEY');
    if (!COHERE_API_KEY) throw new Error('COHERE_API_KEY not configured');

    const { text, imageBase64 } = await req.json();

    let inputText: string;

    if (imageBase64) {
      // Image mode: client should have already extracted text via OCR
      // If raw base64 image is sent, ask user to use text mode
      if (imageBase64.startsWith('data:image/') || imageBase64.length > 1000) {
        // Check if it's actually extracted text from client-side OCR
        if (imageBase64.length < 100) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Please use the text paste mode, or ensure client-side text extraction is enabled.',
          }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        // Treat as extracted OCR text from the client
        inputText = imageBase64;
      } else {
        inputText = imageBase64;
      }
    } else if (text && text.length >= 20) {
      inputText = text;
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Please provide face sheet content (text or image with extracted text).',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Sanitize input length
    inputText = inputText.slice(0, 50000);

    // De-identify PHI before sending to Cohere
    const { cleanedText, tokens } = deidentifyPhi(inputText);

    console.log('Calling Cohere for face sheet parsing (PHI de-identified)...');

    const response = await fetch(COHERE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command-a-03-2025',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse this hospital face sheet and extract all patient, insurance, and medical information:\n\n${cleanedText}` }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cohere API error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again.', success: false }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    // Cohere v2 chat response format
    const messageContent = data.message?.content?.[0]?.text || '';

    // Re-identify PHI in the response
    const reidentifiedContent = reidentifyPhi(messageContent, tokens);

    // Parse JSON response
    let parsed;
    try {
      const jsonMatch = reidentifiedContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse AI response:', reidentifiedContent.slice(0, 200));
      throw new Error('Failed to parse face sheet data from AI response');
    }

    // Ensure arrays are arrays
    if (parsed.medical) {
      parsed.medical.allergies = Array.isArray(parsed.medical.allergies) ? parsed.medical.allergies : [];
      parsed.medical.medications = Array.isArray(parsed.medical.medications) ? parsed.medical.medications : [];
      parsed.medical.pastMedicalHistory = Array.isArray(parsed.medical.pastMedicalHistory) ? parsed.medical.pastMedicalHistory : [];
    }

    console.log('Face sheet parsed successfully');

    return new Response(JSON.stringify({
      success: true,
      data: parsed,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in parse-face-sheet:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
