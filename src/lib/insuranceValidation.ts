/**
 * Smart Insurance ID Format Validation
 * Validates insurance member IDs against known payer-specific patterns
 * to catch errors before they become claim denials.
 */

export interface InsuranceValidationResult {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
  detectedFormat?: string;
}

/**
 * Validate Medicare Beneficiary Identifier (MBI) format
 * MBI: 11 characters, specific pattern:
 * Position: C A AN N A AN N A A N N
 * C = 1-9, A = A-Z (no S,L,O,I,B,Z), AN = A-Z or 0-9, N = 0-9
 */
function validateMBI(id: string): InsuranceValidationResult {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const clean = id.replace(/[\s-]/g, '').toUpperCase();

  if (clean.length !== 11) {
    return {
      isValid: false,
      warnings: [`Medicare MBI must be 11 characters (got ${clean.length})`],
      suggestions: ['Format: 1AN0A0N0AA00 (e.g., 1EG4-TE5-MK72)'],
      detectedFormat: 'Medicare MBI',
    };
  }

  const invalidChars = /[SLOIBZ]/;
  const pattern = [
    /[1-9]/,           // C: 1-9
    /[A-Z]/,           // A: letter (excluding SLOIBZ checked separately)
    /[A-Z0-9]/,        // AN
    /[0-9]/,           // N
    /[A-Z]/,           // A
    /[A-Z0-9]/,        // AN
    /[0-9]/,           // N
    /[A-Z]/,           // A
    /[A-Z]/,           // A
    /[0-9]/,           // N
    /[0-9]/,           // N
  ];

  let valid = true;
  for (let i = 0; i < 11; i++) {
    if (!pattern[i].test(clean[i])) {
      valid = false;
      break;
    }
  }

  // Check for excluded letters in alpha positions
  const alphaPositions = [1, 4, 7, 8];
  for (const pos of alphaPositions) {
    if (invalidChars.test(clean[pos])) {
      warnings.push(`Position ${pos + 1} cannot contain S, L, O, I, B, or Z`);
      valid = false;
    }
  }

  if (!valid) {
    warnings.push('Medicare MBI format appears invalid');
    suggestions.push('MBI pattern: [1-9][A-Z][AN][0-9][A-Z][AN][0-9][A-Z][A-Z][0-9][0-9]');
  }

  return { isValid: valid, warnings, suggestions, detectedFormat: 'Medicare MBI' };
}

/**
 * Validate Medicaid ID (basic format check - varies by state)
 * Most states: 9-13 alphanumeric characters
 */
function validateMedicaidId(id: string): InsuranceValidationResult {
  const clean = id.replace(/[\s-]/g, '').toUpperCase();
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (clean.length < 7 || clean.length > 15) {
    warnings.push(`Medicaid ID typically 7-15 characters (got ${clean.length})`);
  }

  if (!/^[A-Z0-9]+$/.test(clean)) {
    warnings.push('Medicaid ID should only contain letters and numbers');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions,
    detectedFormat: 'Medicaid',
  };
}

/**
 * Validate generic commercial insurance ID
 */
function validateCommercialId(id: string): InsuranceValidationResult {
  const clean = id.replace(/[\s]/g, '');
  const warnings: string[] = [];

  if (clean.length < 3) {
    warnings.push('Insurance ID seems too short');
  }

  if (clean.length > 30) {
    warnings.push('Insurance ID seems unusually long');
  }

  if (/[^A-Za-z0-9\-]/.test(clean)) {
    warnings.push('Insurance ID contains unusual characters');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions: [],
    detectedFormat: 'Commercial',
  };
}

/**
 * Validate insurance ID based on plan type
 */
export function validateInsuranceId(
  insuranceId: string | null | undefined,
  planType?: string | null
): InsuranceValidationResult {
  if (!insuranceId?.trim()) {
    return {
      isValid: false,
      warnings: ['Insurance/Member ID is required'],
      suggestions: [],
    };
  }

  const type = (planType || '').toLowerCase();

  if (type.includes('medicare')) {
    return validateMBI(insuranceId);
  }

  if (type.includes('medicaid')) {
    return validateMedicaidId(insuranceId);
  }

  return validateCommercialId(insuranceId);
}

/**
 * Auto-detect insurance type from ID format
 */
export function detectInsuranceType(insuranceId: string): string | null {
  const clean = insuranceId.replace(/[\s-]/g, '').toUpperCase();

  // MBI pattern detection
  if (clean.length === 11 && /^[1-9][A-Z][A-Z0-9]\d[A-Z]/.test(clean)) {
    return 'Medicare';
  }

  return null;
}
