import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_NOTE_LENGTH = 5000;
const MAX_CODES = 30;

// PHI de-identification for note excerpts sent to Cohere
const PHI_PATTERNS = [
  { regex: /\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g, type: 'NAME' },
  { regex: /\b\d{3}-?\d{2}-?\d{4}\b/g, type: 'SSN' },
  { regex: /\b(?:MRN|mrn)[:\s#]*\d+\b/gi, type: 'MRN' },
  { regex: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, type: 'DATE' },
  { regex: /\b\d{3}[.\-]?\d{3}[.\-]?\d{4}\b/g, type: 'PHONE' },
  { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/gi, type: 'EMAIL' },
];

function deidentifyText(text: string): string {
  let cleaned = text;
  for (const pattern of PHI_PATTERNS) {
    cleaned = cleaned.replace(pattern.regex, `[${pattern.type}]`);
  }
  return cleaned;
}

function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('API') || error.message.includes('key')) {
      return 'AI billing analysis temporarily unavailable';
    }
    return error.message.substring(0, 200);
  }
  return 'Unknown error during billing analysis';
}

interface BillingIntelligenceRequest {
  cptCodes: Array<{ code: string; description?: string }>;
  icd10Codes: Array<{ code: string; description?: string }>;
  modifiers?: string[];
  emLevel?: string;
  mdmComplexity?: string;
  noteExcerpt?: string;
  payerType?: string;
  encounterType?: string;
  specialty?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const COHERE_API_KEY = Deno.env.get('COHERE_API_KEY');
    if (!COHERE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI billing service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: BillingIntelligenceRequest = await req.json();

    // Input validation
    if ((body.cptCodes?.length || 0) + (body.icd10Codes?.length || 0) > MAX_CODES) {
      return new Response(JSON.stringify({ error: 'Too many codes submitted' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const noteExcerpt = body.noteExcerpt
      ? deidentifyText(body.noteExcerpt.substring(0, MAX_NOTE_LENGTH))
      : '';

    const cptList = (body.cptCodes || []).map(c => `${c.code}${c.description ? ` (${c.description})` : ''}`).join(', ');
    const icd10List = (body.icd10Codes || []).map(c => `${c.code}${c.description ? ` (${c.description})` : ''}`).join(', ');
    const modifiersList = (body.modifiers || []).join(', ') || 'None';

    const systemPrompt = `You are a senior medical billing compliance specialist with expertise in CMS guidelines, NCCI edits, LCD/NCD coverage determinations, and payer-specific billing rules. Your role is to analyze billing codes in context and provide actionable denial prevention guidance.

You must respond with a JSON object (no markdown, no code fences) with this exact structure:
{
  "riskScore": <number 0-100>,
  "riskLevel": "<low|medium|high|critical>",
  "reasoning": "<2-3 sentence overall assessment>",
  "factors": [
    {
      "category": "<ncci_edit|medical_necessity|documentation|frequency|payer_specific|bundling|modifier>",
      "severity": "<block|warning|info>",
      "title": "<short title>",
      "message": "<detailed explanation>",
      "recommendation": "<specific action to take>"
    }
  ],
  "codeAlternatives": [
    {
      "currentCode": "<code being replaced>",
      "suggestedCode": "<better code>",
      "suggestedDescription": "<description>",
      "reason": "<why this is better>"
    }
  ],
  "payerNotes": "<payer-specific guidance if applicable>"
}

Guidelines:
- Be specific about NCCI edit pairs (Column 1/Column 2)
- Reference LCD/NCD article numbers when relevant
- For E/M codes, validate MDM level matches documentation
- Flag undercoding opportunities (revenue left on table)
- Consider modifier requirements (-25, -59, -76, -26, etc.)
- For radiology, check professional/technical component billing
- Score 0-20 = low, 21-45 = medium, 46-70 = high, 71-100 = critical`;

    const userPrompt = `Analyze this billing submission for denial risk:

CPT Codes: ${cptList || 'None'}
ICD-10 Codes: ${icd10List || 'None'}
Modifiers: ${modifiersList}
E/M Level: ${body.emLevel || 'Not specified'}
MDM Complexity: ${body.mdmComplexity || 'Not specified'}
Payer Type: ${body.payerType || 'Unknown'}
Encounter Type: ${body.encounterType || 'Not specified'}
Provider Specialty: ${body.specialty || 'Not specified'}
${noteExcerpt ? `\nClinical Context (de-identified excerpt):\n${noteExcerpt}` : ''}

Provide a comprehensive denial risk analysis with actionable recommendations.`;

    console.log('Running AI billing intelligence analysis...');

    const cohereResponse = await fetch('https://api.cohere.ai/v2/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command-a-03-2025',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!cohereResponse.ok) {
      const errText = await cohereResponse.text();
      console.error('Cohere API error:', cohereResponse.status, errText);
      return new Response(JSON.stringify({
        error: 'AI billing analysis temporarily unavailable',
        fallback: true,
      }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cohereData = await cohereResponse.json();
    const rawContent = cohereData?.message?.content?.[0]?.text || '';

    // Parse the AI response
    let analysis;
    try {
      // Strip markdown code fences if present
      const jsonStr = rawContent.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse AI response:', rawContent.substring(0, 200));
      analysis = {
        riskScore: 50,
        riskLevel: 'medium',
        reasoning: 'AI analysis returned an unparseable response. Static rules applied as fallback.',
        factors: [],
        codeAlternatives: [],
        payerNotes: '',
      };
    }

    // Log billing outcome for future fine-tuning
    try {
      await supabase.from('billing_outcomes').insert({
        user_id: user.id,
        encounter_date: new Date().toISOString().split('T')[0],
        specialty: body.specialty || null,
        payer_type: body.payerType || null,
        cpt_codes: (body.cptCodes || []).map(c => c.code),
        icd10_codes: (body.icd10Codes || []).map(c => c.code),
        modifiers: body.modifiers || [],
        em_level: body.emLevel || null,
        encounter_type: body.encounterType || null,
        ai_risk_score: analysis.riskScore,
        ai_reasoning: analysis.reasoning,
      });
    } catch (logErr) {
      console.error('Failed to log billing outcome:', logErr);
      // Non-blocking — don't fail the response
    }

    console.log(`AI billing analysis complete: ${analysis.riskLevel} (${analysis.riskScore}%)`);

    return new Response(JSON.stringify({
      success: true,
      ...analysis,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-billing-intelligence:', error);
    return new Response(JSON.stringify({
      success: false,
      error: sanitizeError(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
