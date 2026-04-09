import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Common ICD-10 code patterns
const ICD10_PATTERN = /^[A-TV-Z]\d{2}(\.\d{1,4})?$/i;

// CPT code patterns (5-digit numeric, some with modifiers)
const CPT_PATTERN = /^\d{5}$/;

// Common modifier patterns
const MODIFIER_PATTERN = /^(-?\d{2}|[A-Z]{2}|\d[A-Z]|[A-Z]\d)$/;

// Known valid code prefixes for quick validation
const ICD10_PREFIXES = {
  'E': 'Endocrine, nutritional and metabolic diseases',
  'I': 'Circulatory system diseases',
  'J': 'Respiratory system diseases',
  'K': 'Digestive system diseases',
  'M': 'Musculoskeletal diseases',
  'N': 'Genitourinary system diseases',
  'R': 'Symptoms and signs',
  'Z': 'Factors influencing health status',
  'S': 'Injuries',
  'T': 'Injuries, poisoning',
  'C': 'Neoplasms',
  'D': 'Blood diseases / Neoplasms',
  'F': 'Mental disorders',
  'G': 'Nervous system diseases',
  'H': 'Eye and ear diseases',
  'L': 'Skin diseases',
  'O': 'Pregnancy complications',
  'P': 'Perinatal conditions',
  'Q': 'Congenital malformations',
};

// CPT code ranges by category
const CPT_RANGES = {
  'E/M': { min: 99201, max: 99499, description: 'Evaluation and Management' },
  'Anesthesia': { min: 100, max: 1999, description: 'Anesthesia' },
  'Surgery': { min: 10004, max: 69990, description: 'Surgery' },
  'Radiology': { min: 70010, max: 79999, description: 'Radiology' },
  'Pathology': { min: 80047, max: 89398, description: 'Pathology and Laboratory' },
  'Medicine': { min: 90281, max: 99199, description: 'Medicine' },
};

// Common bundling issues
const BUNDLING_RULES = [
  { primary: '99214', bundled: ['99211', '99212', '99213'], message: 'Lower E/M codes bundle into higher levels' },
  { primary: '99215', bundled: ['99211', '99212', '99213', '99214'], message: 'Lower E/M codes bundle into higher levels' },
  { primary: '71046', bundled: ['71045'], message: 'Single view chest X-ray bundles into 2-view' },
];

// Common modifier requirements
const MODIFIER_REQUIREMENTS: Record<string, string[]> = {
  '26': ['Professional component - required for radiology reads'],
  'TC': ['Technical component - facility billing only'],
  '59': ['Distinct procedural service - documentation required'],
  '25': ['Significant, separately identifiable E/M service'],
  'LT': ['Left side'],
  'RT': ['Right side'],
};

interface ValidationResult {
  code: string;
  codeType: 'icd10' | 'cpt';
  valid: boolean;
  formatValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  category?: string;
}

interface BillingValidationRequest {
  icd10: Array<{ code: string; description?: string }>;
  cpt: Array<{ code: string; description?: string }>;
  modifiers?: string[];
}

function validateIcd10(code: string): ValidationResult {
  const result: ValidationResult = {
    code: code.toUpperCase(),
    codeType: 'icd10',
    valid: true,
    formatValid: false,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  // Check format
  result.formatValid = ICD10_PATTERN.test(code);
  if (!result.formatValid) {
    result.valid = false;
    result.errors.push(`Invalid ICD-10 format: ${code}. Expected format: A00.0 or A00.00`);
    return result;
  }

  // Check prefix
  const prefix = code.charAt(0).toUpperCase();
  if (ICD10_PREFIXES[prefix as keyof typeof ICD10_PREFIXES]) {
    result.category = ICD10_PREFIXES[prefix as keyof typeof ICD10_PREFIXES];
  } else {
    result.warnings.push(`Uncommon ICD-10 prefix: ${prefix}`);
  }

  // Check for specificity
  const parts = code.split('.');
  if (parts.length === 1 || (parts[1] && parts[1].length < 2)) {
    result.warnings.push('Consider using more specific ICD-10 code for better documentation');
  }

  // Common problematic codes
  if (code.startsWith('R')) {
    result.warnings.push('Symptom codes (R-codes) may require more specific diagnosis if available');
  }

  if (code.startsWith('Z')) {
    result.warnings.push('Z-codes may need supporting diagnosis for medical necessity');
  }

  return result;
}

function validateCpt(code: string): ValidationResult {
  const result: ValidationResult = {
    code,
    codeType: 'cpt',
    valid: true,
    formatValid: false,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  // Check format
  result.formatValid = CPT_PATTERN.test(code);
  if (!result.formatValid) {
    result.valid = false;
    result.errors.push(`Invalid CPT format: ${code}. Expected 5-digit code`);
    return result;
  }

  const numCode = parseInt(code, 10);

  // Determine category
  for (const [category, range] of Object.entries(CPT_RANGES)) {
    if (numCode >= range.min && numCode <= range.max) {
      result.category = range.description;
      break;
    }
  }

  // Check for unlisted procedure codes
  if (code.endsWith('99')) {
    result.warnings.push('Unlisted procedure code - requires detailed documentation');
  }

  // Check E/M level documentation requirements
  if (numCode >= 99213 && numCode <= 99215) {
    result.warnings.push(`${code} requires MDM documentation to support level`);
  }

  // Radiology professional component reminder
  if (numCode >= 70010 && numCode <= 79999) {
    result.suggestions.push('Consider adding modifier -26 for professional component if applicable');
  }

  return result;
}

function checkBundling(cptCodes: string[]): string[] {
  const warnings: string[] = [];
  
  for (const rule of BUNDLING_RULES) {
    if (cptCodes.includes(rule.primary)) {
      const bundledFound = cptCodes.filter(c => rule.bundled.includes(c));
      if (bundledFound.length > 0) {
        warnings.push(`Bundling issue: ${bundledFound.join(', ')} may bundle into ${rule.primary}. ${rule.message}`);
      }
    }
  }

  // Check for duplicate codes
  const duplicates = cptCodes.filter((code, index) => cptCodes.indexOf(code) !== index);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate CPT codes detected: ${[...new Set(duplicates)].join(', ')}`);
  }

  return warnings;
}

function validateDiagnosisProcedureConsistency(
  icd10Codes: string[], 
  cptCodes: string[]
): string[] {
  const warnings: string[] = [];

  // Check if radiology codes have supporting diagnoses
  const hasRadiologyCodes = cptCodes.some(c => {
    const num = parseInt(c, 10);
    return num >= 70010 && num <= 79999;
  });

  if (hasRadiologyCodes && icd10Codes.length === 0) {
    warnings.push('Radiology procedures require supporting diagnosis codes');
  }

  // Check for symptom-only diagnoses with high-level E/M
  const hasHighLevelEM = cptCodes.some(c => ['99214', '99215', '99223', '99233'].includes(c));
  const hasOnlySymptomCodes = icd10Codes.every(c => c.startsWith('R'));

  if (hasHighLevelEM && hasOnlySymptomCodes && icd10Codes.length > 0) {
    warnings.push('High-level E/M with only symptom codes may be questioned - consider specific diagnoses');
  }

  return warnings;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: BillingValidationRequest = await req.json();
    const { icd10 = [], cpt = [], modifiers = [] } = body;

    console.log(`Validating ${icd10.length} ICD-10 codes and ${cpt.length} CPT codes`);

    // Validate ICD-10 codes
    const icd10Results = icd10.map(c => validateIcd10(c.code));
    
    // Validate CPT codes
    const cptResults = cpt.map(c => validateCpt(c.code));

    // Check bundling issues
    const bundlingWarnings = checkBundling(cpt.map(c => c.code));

    // Check diagnosis-procedure consistency
    const consistencyWarnings = validateDiagnosisProcedureConsistency(
      icd10.map(c => c.code),
      cpt.map(c => c.code)
    );

    // Validate modifiers
    const modifierWarnings: string[] = [];
    for (const mod of modifiers) {
      if (!MODIFIER_PATTERN.test(mod.replace('-', ''))) {
        modifierWarnings.push(`Invalid modifier format: ${mod}`);
      }
    }

    // Calculate overall validation status
    const allValid = [...icd10Results, ...cptResults].every(r => r.valid);
    const hasErrors = [...icd10Results, ...cptResults].some(r => r.errors.length > 0);
    const hasWarnings = [...icd10Results, ...cptResults].some(r => r.warnings.length > 0) ||
      bundlingWarnings.length > 0 || consistencyWarnings.length > 0;

    const response = {
      success: true,
      valid: allValid,
      icd10: icd10Results,
      cpt: cptResults,
      bundlingWarnings,
      consistencyWarnings,
      modifierWarnings,
      summary: {
        totalCodes: icd10.length + cpt.length,
        validCodes: [...icd10Results, ...cptResults].filter(r => r.valid).length,
        errors: hasErrors,
        warnings: hasWarnings,
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in validate-billing-codes:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
