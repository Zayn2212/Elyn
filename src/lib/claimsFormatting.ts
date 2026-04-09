/**
 * Claims-compliant patient name and identifier formatting utilities
 * Follows CMS 1500 and UB-04 claim form standards
 */

/**
 * Formats a patient name to claims-compliant "LAST, FIRST" uppercase format
 * - Converts to uppercase
 * - Removes special characters (hyphens, apostrophes, accents)
 * - Ensures "Last, First" format
 */
export function formatClaimsName(name: string | null | undefined): string {
  if (!name) return '';
  
  // Trim and normalize
  let formatted = name.trim();
  
  // Remove accents/diacritics
  formatted = formatted.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Remove special characters except comma and space
  formatted = formatted.replace(/[''`]/g, ''); // Remove apostrophes
  formatted = formatted.replace(/[-–—]/g, ' '); // Replace hyphens with space
  formatted = formatted.replace(/[^a-zA-Z,\s]/g, ''); // Remove other special chars
  
  // Clean up multiple spaces
  formatted = formatted.replace(/\s+/g, ' ').trim();
  
  // Convert to uppercase
  formatted = formatted.toUpperCase();
  
  // Check if already in "Last, First" format
  if (formatted.includes(',')) {
    // Already has comma, just ensure proper spacing
    const parts = formatted.split(',').map(p => p.trim());
    return parts.filter(p => p).join(', ');
  }
  
  // Try to parse "First Last" format and convert to "LAST, FIRST"
  const nameParts = formatted.split(' ').filter(p => p);
  
  if (nameParts.length === 1) {
    // Single name, return as-is
    return nameParts[0];
  }
  
  if (nameParts.length === 2) {
    // "First Last" → "LAST, FIRST"
    return `${nameParts[1]}, ${nameParts[0]}`;
  }
  
  if (nameParts.length >= 3) {
    // "First Middle Last" → "LAST, FIRST MIDDLE"
    const lastName = nameParts[nameParts.length - 1];
    const firstMiddle = nameParts.slice(0, -1).join(' ');
    return `${lastName}, ${firstMiddle}`;
  }
  
  return formatted;
}

/**
 * Parses a claims-formatted name back into first/last components
 */
export function parseClaimsName(claimsName: string): { firstName: string; lastName: string; middleName?: string } {
  if (!claimsName) {
    return { firstName: '', lastName: '' };
  }
  
  const parts = claimsName.split(',').map(p => p.trim());
  
  if (parts.length < 2) {
    return { firstName: '', lastName: parts[0] || '' };
  }
  
  const lastName = parts[0];
  const firstMiddle = parts[1].split(' ').filter(p => p);
  
  return {
    lastName,
    firstName: firstMiddle[0] || '',
    middleName: firstMiddle.slice(1).join(' ') || undefined,
  };
}

/**
 * Validates required patient identifiers for claims
 */
export interface ClaimsValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PatientClaimsData {
  name?: string | null;
  dob?: string | null;
  mrn?: string | null;
  insuranceId?: string | null;
  insuranceName?: string | null;
  insuranceGroup?: string | null;
  insurancePlanType?: string | null;
  subscriberName?: string | null;
  subscriberRelationship?: string | null;
}

export type PlanType = 'Medicare' | 'Medicaid' | 'Commercial' | 'Tricare' | 'Workers Comp' | 'Self-Pay' | 'Other';
export type SubscriberRelationship = 'Self' | 'Spouse' | 'Child' | 'Other';

export const PLAN_TYPES: PlanType[] = ['Medicare', 'Medicaid', 'Commercial', 'Tricare', 'Workers Comp', 'Self-Pay', 'Other'];
export const SUBSCRIBER_RELATIONSHIPS: SubscriberRelationship[] = ['Self', 'Spouse', 'Child', 'Other'];

export function validateClaimsData(data: PatientClaimsData): ClaimsValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Name validation
  if (!data.name?.trim()) {
    errors.push('Patient name is required for claims');
  } else {
    const formattedName = formatClaimsName(data.name);
    if (!formattedName.includes(',')) {
      warnings.push('Name should be in "Last, First" format');
    }
  }
  
  // DOB validation
  if (!data.dob) {
    errors.push('Date of birth is required for claims');
  } else {
    // Validate DOB format and reasonableness
    const dobDate = new Date(data.dob);
    const now = new Date();
    const age = (now.getTime() - dobDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    
    if (isNaN(dobDate.getTime())) {
      errors.push('Invalid date of birth format');
    } else if (age < 0) {
      errors.push('Date of birth cannot be in the future');
    } else if (age > 130) {
      warnings.push('Date of birth indicates patient is over 130 years old');
    }
  }
  
  // MRN validation
  if (!data.mrn?.trim()) {
    errors.push('MRN is required for claims');
  }
  
  // Insurance ID validation
  if (!data.insuranceId?.trim()) {
    errors.push('Insurance/Member ID is required for claims');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format DOB for claims (MM/DD/YYYY format commonly used)
 */
export function formatClaimsDOB(dob: string | null | undefined): string {
  if (!dob) return '';
  
  try {
    const date = new Date(dob);
    if (isNaN(date.getTime())) return dob;
    
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${month}/${day}/${year}`;
  } catch {
    return dob;
  }
}

/**
 * Clean and format MRN (remove spaces, special chars)
 */
export function formatMRN(mrn: string | null | undefined): string {
  if (!mrn) return '';
  return mrn.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Format insurance display string for claims report
 */
export function formatInsuranceDisplay(data: PatientClaimsData): string {
  const parts: string[] = [];
  
  if (data.insuranceName) {
    parts.push(data.insuranceName);
  }
  
  if (data.insuranceId) {
    parts.push(`ID: ${data.insuranceId}`);
  }
  
  if (data.insuranceGroup) {
    parts.push(`Grp: ${data.insuranceGroup}`);
  }
  
  if (data.insurancePlanType) {
    parts.push(`(${data.insurancePlanType})`);
  }
  
  return parts.join(' | ') || 'No insurance on file';
}

/**
 * Get subscriber display string
 */
export function formatSubscriberDisplay(data: PatientClaimsData): string | null {
  if (!data.subscriberName || data.subscriberRelationship === 'Self') {
    return null;
  }
  
  return `Subscriber: ${data.subscriberName} (${data.subscriberRelationship || 'Relationship unknown'})`;
}
