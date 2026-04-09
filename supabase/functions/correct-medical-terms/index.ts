import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COHERE_API_URL = 'https://api.cohere.ai/v1/chat';

// PHI patterns to detect and replace
const PHI_PATTERNS = [
  // Names - common patterns like "patient John Smith" or "Mr. Smith"
  { regex: /\b(Mr\.|Mrs\.|Ms\.|Dr\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi, type: 'NAME' },
  // MRN patterns
  { regex: /\b(MRN|mrn|medical record number)[:\s#]*([A-Z0-9-]+)/gi, type: 'MRN' },
  // DOB patterns
  { regex: /\b(DOB|dob|date of birth|born)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/gi, type: 'DOB' },
  { regex: /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s*(years?\s*old|y\.?o\.?)/gi, type: 'DOB' },
  // SSN patterns
  { regex: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, type: 'SSN' },
  // Phone numbers
  { regex: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, type: 'PHONE' },
  // Email addresses
  { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, type: 'EMAIL' },
  // Addresses - street patterns
  { regex: /\b\d+\s+[A-Za-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)\b/gi, type: 'ADDRESS' },
  // Room numbers in hospitals
  { regex: /\b(room|rm|bed)\s*#?\s*([A-Z]?\d+[A-Z]?)/gi, type: 'ROOM' },
];

interface PhiToken {
  placeholder: string;
  original: string;
  type: string;
}

// De-identify PHI from transcript
function deidentifyPhi(text: string): { cleanedText: string; tokens: PhiToken[] } {
  const tokens: PhiToken[] = [];
  let cleanedText = text;
  let tokenIndex = 0;

  for (const pattern of PHI_PATTERNS) {
    cleanedText = cleanedText.replace(pattern.regex, (match) => {
      const placeholder = `[${pattern.type}_${tokenIndex}]`;
      tokens.push({
        placeholder,
        original: match,
        type: pattern.type,
      });
      tokenIndex++;
      return placeholder;
    });
  }

  return { cleanedText, tokens };
}

// Re-identify PHI back into text
function reidentifyPhi(text: string, tokens: PhiToken[]): string {
  let result = text;
  
  for (const token of tokens) {
    // Use exact string replacement to avoid regex issues
    result = result.split(token.placeholder).join(token.original);
  }
  
  return result;
}

// System prompts for different modes
const streamingPrompt = `You are a fast medical transcription corrector. Fix ONLY obvious medical term errors.

RULES (for speed):
1. Fix drug name misspellings: metaprole→metoprolol, lipator→atorvastatin
2. Fix condition names: new monya→pneumonia, a fib→atrial fibrillation
3. Fix dosage formats: twenty five mig→25 mg
4. PRESERVE everything else exactly - don't reorganize or expand
5. Keep bracketed placeholders like [NAME_0] unchanged

Return ONLY the corrected text, nothing else.`;

const fullPrompt = `You are a medical transcription specialist. Your task is to correct medical terminology in transcribed clinical notes.

INSTRUCTIONS:
1. Fix misspelled drug names (e.g., "metaprole" → "metoprolol", "lipator" → "atorvastatin")
2. Correct medical conditions (e.g., "new monya" → "pneumonia", "my card ee all" → "myocardial")
3. Fix anatomical terms (e.g., "fee mur" → "femur")
4. Correct procedure names and abbreviations
5. Fix dosage formats (e.g., "twenty five mig" → "25 mg")
6. Preserve the natural speech structure - don't reorganize the content
7. Keep non-medical words unchanged
8. Maintain punctuation and sentence structure
9. IMPORTANT: Preserve any bracketed placeholders like [NAME_0], [DOB_1], etc. exactly as they appear

Common corrections:
- Metoprolol, Lisinopril, Atorvastatin, Omeprazole, Amlodipine
- Pneumonia, Hypertension, Diabetes mellitus, Hyperlipidemia
- Myocardial infarction, Cerebrovascular accident, COPD
- BID (twice daily), TID (three times daily), QD (once daily)
- mg, mcg, mL, units

Return ONLY the corrected transcript without any explanations or preamble.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, streaming = false } = await req.json();

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: 'No transcript provided', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Use appropriate prompt based on mode
    const systemPrompt = streaming ? streamingPrompt : fullPrompt;

    const COHERE_API_KEY = Deno.env.get('COHERE_API_KEY');
    if (!COHERE_API_KEY) {
      console.error('COHERE_API_KEY not configured');
      return new Response(
        JSON.stringify({ correctedTranscript: transcript, success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('De-identifying PHI from transcript...');

    // Step 1: De-identify PHI
    const { cleanedText, tokens } = deidentifyPhi(transcript);
    console.log(`Removed ${tokens.length} PHI tokens before AI processing`);

    console.log('Correcting medical terms with Cohere API...');

    // Step 2: Send de-identified text to AI
    const response = await fetch(COHERE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command-a-03-2025',
        message: `Correct the medical terminology in this transcript:\n\n${cleanedText}`,
        preamble: systemPrompt,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cohere API error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.', success: false }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key.', success: false }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return original on other errors
      return new Response(
        JSON.stringify({ correctedTranscript: transcript, success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    let correctedText = data.text || cleanedText;

    // Step 3: Re-identify PHI back into the corrected text
    console.log('Re-identifying PHI into corrected transcript...');
    const finalTranscript = reidentifyPhi(correctedText.trim(), tokens);

    console.log('Medical term correction completed with PHI protection');

    return new Response(
      JSON.stringify({ 
        correctedTranscript: finalTranscript,
        success: true,
        phiProtected: true,
        phiTokensCount: tokens.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in correct-medical-terms:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to correct medical terms', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
