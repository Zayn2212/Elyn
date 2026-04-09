import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Risk factors and their weights
const RISK_FACTORS = {
  // Documentation issues
  MISSING_DIAGNOSIS: { weight: 25, message: 'Missing supporting diagnosis for procedure' },
  SYMPTOM_ONLY_CODES: { weight: 15, message: 'Only symptom codes (R-codes) - consider specific diagnosis' },
  UNSPECIFIED_CODES: { weight: 10, message: 'Unspecified diagnosis codes may require more specificity' },
  
  // Procedure issues
  MODIFIER_MISSING: { weight: 20, message: 'Required modifier may be missing' },
  BUNDLING_ISSUE: { weight: 30, message: 'Potential bundling/unbundling issue detected' },
  FREQUENCY_CONCERN: { weight: 15, message: 'Service frequency may exceed typical patterns' },
  
  // Medical necessity
  MEDICAL_NECESSITY: { weight: 35, message: 'Documentation may not support medical necessity' },
  
  // Coding accuracy
  CODE_MISMATCH: { weight: 20, message: 'Diagnosis-procedure mismatch detected' },
  HIGH_EM_SYMPTOM: { weight: 15, message: 'High-level E/M with symptom-only diagnosis' },
  DUPLICATE_SERVICE: { weight: 25, message: 'Duplicate or similar service on same date' },
  
  // Coverage issues
  LCD_NCD_CONCERN: { weight: 20, message: 'May not meet Local/National Coverage Determination' },
  PREAUTH_REQUIRED: { weight: 10, message: 'Prior authorization typically required' },
};

// High-risk procedure categories
const HIGH_RISK_PROCEDURES = {
  // High-cost imaging
  MRI: ['70551', '70552', '70553', '72141', '72142', '72146', '72147', '72148', '72156', '72157', '72158', '73218', '73219', '73220', '73221', '73222', '73223'],
  CT: ['70450', '70460', '70470', '71250', '71260', '71270', '72125', '72126', '72127', '72128', '72129', '72130', '72131', '72132', '72133', '74150', '74160', '74170', '74176', '74177', '74178'],
  PET: ['78811', '78812', '78813', '78814', '78815', '78816'],
  
  // Frequently denied E/M
  HIGH_LEVEL_EM: ['99215', '99223', '99233', '99255', '99285'],
  
  // Injection/Infusion
  INJECTIONS: ['96365', '96366', '96367', '96368', '96372', '96373', '96374', '96375'],
};

// Diagnosis-Procedure consistency rules
const CONSISTENCY_RULES = [
  {
    cptRange: { min: 70010, max: 79999 }, // Radiology
    requiredDxCategories: ['any'],
    message: 'Radiology procedures require clinical indication',
  },
  {
    cptCodes: ['99214', '99215'],
    risky_diagnoses: ['R'],
    message: 'High-level E/M may need more specific diagnosis than symptom codes',
  },
];

interface DenialRiskRequest {
  icd10: Array<{ code: string; description?: string }>;
  cpt: Array<{ code: string; description?: string }>;
  modifiers?: string[];
  noteType?: string;
  emLevel?: string;
  mdmComplexity?: string;
}

interface RiskFactor {
  factor: string;
  weight: number;
  message: string;
  recommendation?: string;
}

function assessDenialRisk(data: DenialRiskRequest): {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  recommendations: string[];
} {
  const factors: RiskFactor[] = [];
  const recommendations: string[] = [];
  let totalWeight = 0;

  const { icd10 = [], cpt = [], modifiers = [], emLevel, mdmComplexity } = data;
  const icd10Codes = icd10.map(c => c.code.toUpperCase());
  const cptCodes = cpt.map(c => c.code);

  // Check for missing diagnosis
  if (cptCodes.length > 0 && icd10Codes.length === 0) {
    factors.push({
      factor: 'MISSING_DIAGNOSIS',
      ...RISK_FACTORS.MISSING_DIAGNOSIS,
      recommendation: 'Add supporting diagnosis codes',
    });
    totalWeight += RISK_FACTORS.MISSING_DIAGNOSIS.weight;
    recommendations.push('Add at least one diagnosis code to support the procedure');
  }

  // Check for symptom-only codes
  const symptomOnlyCodes = icd10Codes.filter(c => c.startsWith('R'));
  if (symptomOnlyCodes.length === icd10Codes.length && icd10Codes.length > 0) {
    factors.push({
      factor: 'SYMPTOM_ONLY_CODES',
      ...RISK_FACTORS.SYMPTOM_ONLY_CODES,
      recommendation: 'Consider adding definitive diagnosis if available',
    });
    totalWeight += RISK_FACTORS.SYMPTOM_ONLY_CODES.weight;
    recommendations.push('Symptom codes alone may not support medical necessity - add specific diagnosis if known');
  }

  // Check for unspecified codes
  const unspecifiedCodes = icd10Codes.filter(c => {
    const parts = c.split('.');
    return parts.length === 1 || (parts[1] && parts[1].length < 2);
  });
  if (unspecifiedCodes.length > 0) {
    factors.push({
      factor: 'UNSPECIFIED_CODES',
      ...RISK_FACTORS.UNSPECIFIED_CODES,
      recommendation: `Review codes: ${unspecifiedCodes.join(', ')}`,
    });
    totalWeight += RISK_FACTORS.UNSPECIFIED_CODES.weight;
    recommendations.push('Use more specific ICD-10 codes when possible');
  }

  // Check high-level E/M with symptom codes
  const highLevelEM = cptCodes.filter(c => HIGH_RISK_PROCEDURES.HIGH_LEVEL_EM.includes(c));
  if (highLevelEM.length > 0 && symptomOnlyCodes.length === icd10Codes.length && icd10Codes.length > 0) {
    factors.push({
      factor: 'HIGH_EM_SYMPTOM',
      ...RISK_FACTORS.HIGH_EM_SYMPTOM,
      recommendation: 'Document specific diagnosis or explain medical decision making',
    });
    totalWeight += RISK_FACTORS.HIGH_EM_SYMPTOM.weight;
    recommendations.push('High-level E/M codes typically need definitive diagnoses for approval');
  }

  // Check for radiology modifier
  const radiologyCodes = cptCodes.filter(c => {
    const num = parseInt(c, 10);
    return num >= 70010 && num <= 79999;
  });
  
  if (radiologyCodes.length > 0) {
    const hasModifier26 = modifiers?.some(m => m === '26' || m === '-26');
    const hasModifierTC = modifiers?.some(m => m === 'TC' || m === '-TC');
    
    if (!hasModifier26 && !hasModifierTC) {
      factors.push({
        factor: 'MODIFIER_MISSING',
        weight: 10, // Lower weight - might be global billing
        message: 'Professional/Technical component modifier may be needed',
        recommendation: 'Add -26 modifier for professional component',
      });
      totalWeight += 10;
      recommendations.push('Consider adding -26 modifier for radiology professional component');
    }
  }

  // Check for high-cost imaging
  const highCostImaging = cptCodes.some(c => 
    [...HIGH_RISK_PROCEDURES.MRI, ...HIGH_RISK_PROCEDURES.CT, ...HIGH_RISK_PROCEDURES.PET].includes(c)
  );
  
  if (highCostImaging) {
    // Check if there's adequate clinical justification
    const hasStrongIndication = icd10Codes.some(c => 
      c.startsWith('C') || c.startsWith('M') || c.startsWith('S') || c.startsWith('G')
    );
    
    if (!hasStrongIndication) {
      factors.push({
        factor: 'LCD_NCD_CONCERN',
        ...RISK_FACTORS.LCD_NCD_CONCERN,
        recommendation: 'Ensure clinical indication meets coverage criteria',
      });
      totalWeight += RISK_FACTORS.LCD_NCD_CONCERN.weight;
      recommendations.push('High-cost imaging requires strong clinical justification - document indication clearly');
    }
  }

  // Check for duplicate CPT codes
  const duplicateCpt = cptCodes.filter((c, i) => cptCodes.indexOf(c) !== i);
  if (duplicateCpt.length > 0) {
    factors.push({
      factor: 'DUPLICATE_SERVICE',
      ...RISK_FACTORS.DUPLICATE_SERVICE,
      recommendation: `Review duplicates: ${[...new Set(duplicateCpt)].join(', ')}`,
    });
    totalWeight += RISK_FACTORS.DUPLICATE_SERVICE.weight;
    recommendations.push('Remove duplicate procedure codes or add appropriate modifiers');
  }

  // Check E/M level vs MDM complexity
  if (emLevel && mdmComplexity) {
    const emLevelNum = parseInt(emLevel.replace(/\D/g, ''), 10);
    const mdmLevels: Record<string, number> = {
      'Straightforward': 1,
      'Low': 2,
      'Moderate': 3,
      'High': 4,
    };
    
    const mdmNum = mdmLevels[mdmComplexity] || 2;
    
    // Check if E/M seems too high for MDM
    if (emLevelNum >= 99214 && mdmNum < 3) {
      factors.push({
        factor: 'CODE_MISMATCH',
        weight: 15,
        message: 'E/M level may not match documented MDM complexity',
        recommendation: 'Verify documentation supports E/M level',
      });
      totalWeight += 15;
      recommendations.push('Ensure MDM complexity documentation supports the selected E/M level');
    }
  }

  // Calculate final risk score (cap at 100)
  const riskScore = Math.min(100, Math.round(totalWeight * 1.5)); // Scale factor

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (riskScore < 20) {
    riskLevel = 'low';
  } else if (riskScore < 45) {
    riskLevel = 'medium';
  } else if (riskScore < 70) {
    riskLevel = 'high';
  } else {
    riskLevel = 'critical';
  }

  return {
    riskScore,
    riskLevel,
    factors,
    recommendations: [...new Set(recommendations)], // Deduplicate
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: DenialRiskRequest = await req.json();
    
    console.log('Assessing denial risk for billing codes...');

    const result = assessDenialRisk(body);

    console.log(`Denial risk assessment: ${result.riskLevel} (${result.riskScore}%)`);

    return new Response(JSON.stringify({
      success: true,
      ...result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in assess-denial-risk:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
