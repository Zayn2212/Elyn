/**
 * Advanced Denial Prevention Rules Engine
 * Extends encounter-level validation with duplicate billing detection,
 * time-based code validation, and payer-specific rules.
 * 
 * Patent-relevant: This engine implements pre-submission claim intelligence
 * that operates at the point of care, not post-submission.
 */

import type { EncounterContext } from './encounterContext';

export type DenialRuleSeverity = 'block' | 'warning';

export interface DenialRule {
  id: string;
  severity: DenialRuleSeverity;
  title: string;
  message: string;
  recommendation: string;
  category: 'duplicate' | 'time_based' | 'payer_specific' | 'coding' | 'encounter';
}

// ─── Duplicate Billing Detection ─────────────────────────────────

export interface PriorClaim {
  dateOfService: string;
  cptCodes: string[];
  patientId?: string;
  patientName?: string;
}

/**
 * Detect duplicate or near-duplicate billing within a configurable lookback window.
 * Flags same CPT on same patient within N days — a leading cause of denials.
 */
export function detectDuplicateBilling(
  currentCptCodes: string[],
  currentDateOfService: string,
  priorClaims: PriorClaim[],
  lookbackDays: number = 1
): DenialRule[] {
  const rules: DenialRule[] = [];
  const currentDate = new Date(currentDateOfService);

  for (const prior of priorClaims) {
    const priorDate = new Date(prior.dateOfService);
    const daysDiff = Math.abs((currentDate.getTime() - priorDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > lookbackDays) continue;

    const duplicateCodes = currentCptCodes.filter(c => prior.cptCodes.includes(c));

    if (duplicateCodes.length > 0 && daysDiff === 0) {
      rules.push({
        id: `duplicate-same-day-${duplicateCodes[0]}`,
        severity: 'block',
        title: 'Same-Day Duplicate Billing',
        message: `CPT ${duplicateCodes.join(', ')} already billed for this patient today.`,
        recommendation: 'Remove duplicate code or add modifier -76 (repeat procedure by same physician) if clinically appropriate.',
        category: 'duplicate',
      });
    } else if (duplicateCodes.length > 0 && daysDiff <= lookbackDays) {
      rules.push({
        id: `duplicate-recent-${duplicateCodes[0]}`,
        severity: 'warning',
        title: 'Recent Duplicate Billing',
        message: `CPT ${duplicateCodes.join(', ')} was billed ${Math.round(daysDiff)} day(s) ago for the same patient.`,
        recommendation: 'Verify clinical justification for repeat service within the lookback window.',
        category: 'duplicate',
      });
    }
  }

  return rules;
}

// ─── Time-Based Code Validation ──────────────────────────────────

interface TimeRule {
  cptCodes: string[];
  minIntervalDays: number;
  description: string;
  payerNote?: string;
}

/**
 * Medicare and commercial payer frequency limits.
 * These intervals are based on CMS and common payer LCD/NCD guidelines.
 */
const TIME_FREQUENCY_RULES: TimeRule[] = [
  {
    cptCodes: ['99232', '99233'],
    minIntervalDays: 1,
    description: 'Subsequent hospital care is limited to once per calendar day per provider',
  },
  {
    cptCodes: ['99291'],
    minIntervalDays: 1,
    description: 'Critical care (first 30-74 min) is limited to once per calendar day',
  },
  {
    cptCodes: ['99238', '99239'],
    minIntervalDays: 0, // Same-day check only — can only bill once per discharge
    description: 'Discharge day management is billed once per patient per discharge episode',
  },
  {
    cptCodes: ['71046', '71047', '71048'],
    minIntervalDays: 1,
    description: 'Repeat chest X-ray within 24 hours requires clinical justification',
  },
  {
    cptCodes: ['70551', '70552', '70553'],
    minIntervalDays: 365,
    description: 'Repeat brain MRI within 12 months may require prior authorization',
  },
  {
    cptCodes: ['72148', '72149', '72158'],
    minIntervalDays: 365,
    description: 'Repeat lumbar spine MRI within 12 months may require prior authorization',
  },
];

/**
 * Validate CPT codes against time-based frequency limits.
 */
export function validateTimeBasedCodes(
  currentCptCodes: string[],
  currentDateOfService: string,
  priorClaims: PriorClaim[]
): DenialRule[] {
  const rules: DenialRule[] = [];
  const currentDate = new Date(currentDateOfService);

  for (const timeRule of TIME_FREQUENCY_RULES) {
    const matchingCodes = currentCptCodes.filter(c => timeRule.cptCodes.includes(c));
    if (matchingCodes.length === 0) continue;

    for (const prior of priorClaims) {
      const priorDate = new Date(prior.dateOfService);
      const daysDiff = Math.abs((currentDate.getTime() - priorDate.getTime()) / (1000 * 60 * 60 * 24));

      const priorMatchingCodes = matchingCodes.filter(c => prior.cptCodes.includes(c));
      if (priorMatchingCodes.length === 0) continue;

      if (daysDiff < timeRule.minIntervalDays || (timeRule.minIntervalDays === 0 && daysDiff === 0)) {
        const isBlock = timeRule.minIntervalDays <= 1;
        rules.push({
          id: `time-freq-${priorMatchingCodes[0]}-${Math.round(daysDiff)}d`,
          severity: isBlock ? 'block' : 'warning',
          title: 'Frequency Limit Exceeded',
          message: `${timeRule.description}. CPT ${priorMatchingCodes.join(', ')} was last billed ${daysDiff === 0 ? 'today' : `${Math.round(daysDiff)} day(s) ago`}.`,
          recommendation: isBlock
            ? 'This will likely be auto-denied. Remove or document exceptional clinical circumstances.'
            : 'Prior authorization or appeal letter may be required. Document medical necessity.',
          category: 'time_based',
        });
      }
    }
  }

  return rules;
}

// ─── Payer-Specific Rules ────────────────────────────────────────

type PayerType = 'medicare' | 'medicaid' | 'commercial' | 'tricare' | 'unknown';

/**
 * Infer payer type from insurance name for rule selection.
 */
export function inferPayerType(insuranceName: string | null | undefined): PayerType {
  if (!insuranceName) return 'unknown';
  const name = insuranceName.toLowerCase();
  if (name.includes('medicare') || name.includes('cms')) return 'medicare';
  if (name.includes('medicaid') || name.includes('medi-cal') || name.includes('chip')) return 'medicaid';
  if (name.includes('tricare') || name.includes('champus')) return 'tricare';
  if (name.includes('aetna') || name.includes('cigna') || name.includes('united') ||
      name.includes('blue cross') || name.includes('bcbs') || name.includes('anthem') ||
      name.includes('humana') || name.includes('kaiser')) return 'commercial';
  return 'commercial'; // Default to commercial for named insurers
}

interface PayerRule {
  payerTypes: PayerType[];
  check: (cptCodes: string[], icd10Codes: string[], encounterContext: EncounterContext) => DenialRule | null;
}

const PAYER_RULES: PayerRule[] = [
  {
    // Medicare: Observation codes require specific status
    payerTypes: ['medicare'],
    check: (cptCodes, icd10Codes, ctx) => {
      const observationCodes = ['99217', '99218', '99219', '99220', '99224', '99225', '99226'];
      const hasObservation = cptCodes.some(c => observationCodes.includes(c));
      if (hasObservation && ctx.placeOfService !== '22') {
        return {
          id: 'medicare-observation-pos',
          severity: 'warning',
          title: 'Medicare Observation POS Mismatch',
          message: 'Medicare observation codes typically require POS 22 (Outpatient Hospital).',
          recommendation: 'Verify Place of Service is set to 22 for observation encounters.',
          category: 'payer_specific',
        };
      }
      return null;
    },
  },
  {
    // Medicare: ABN may be required for non-covered services
    payerTypes: ['medicare'],
    check: (cptCodes) => {
      const nonCoveredScreening = ['99397', '99396', '99395']; // Preventive visits for age groups
      const hasScreening = cptCodes.some(c => nonCoveredScreening.includes(c));
      if (hasScreening) {
        return {
          id: 'medicare-abn-screening',
          severity: 'warning',
          title: 'ABN May Be Required',
          message: 'Medicare may not cover preventive visits at the billed frequency. An Advance Beneficiary Notice (ABN) should be on file.',
          recommendation: 'Ensure ABN is signed before submitting or consider using Welcome-to-Medicare (G0402) codes.',
          category: 'payer_specific',
        };
      }
      return null;
    },
  },
  {
    // Medicaid: Prior auth required for high-cost imaging
    payerTypes: ['medicaid'],
    check: (cptCodes) => {
      const highCostImaging = ['70551', '70552', '70553', '74176', '74177', '74178', '78816'];
      const hasHighCost = cptCodes.some(c => highCostImaging.includes(c));
      if (hasHighCost) {
        return {
          id: 'medicaid-prior-auth-imaging',
          severity: 'warning',
          title: 'Medicaid Prior Auth Required',
          message: 'Most state Medicaid programs require prior authorization for MRI, CT with contrast, and PET scans.',
          recommendation: 'Verify prior authorization is on file before claim submission.',
          category: 'payer_specific',
        };
      }
      return null;
    },
  },
  {
    // TRICARE: Referral required for specialty consults
    payerTypes: ['tricare'],
    check: (_cptCodes, _icd10, ctx) => {
      if (ctx.encounterType === 'initial_consult' && !ctx.referringProvider.trim()) {
        return {
          id: 'tricare-referral-required',
          severity: 'block',
          title: 'TRICARE Referral Required',
          message: 'TRICARE requires a referral from the PCM (Primary Care Manager) for specialty consultations.',
          recommendation: 'Add referring provider with referral authorization number.',
          category: 'payer_specific',
        };
      }
      return null;
    },
  },
  {
    // All payers: Critical care with low-acuity diagnoses
    payerTypes: ['medicare', 'medicaid', 'commercial', 'tricare'],
    check: (cptCodes, icd10Codes) => {
      const isCriticalCare = cptCodes.some(c => ['99291', '99292'].includes(c));
      if (!isCriticalCare) return null;

      const lowAcuityCodes = icd10Codes.filter(c =>
        c.startsWith('R') || c.startsWith('Z') || c.startsWith('M54')
      );
      if (lowAcuityCodes.length === icd10Codes.length && icd10Codes.length > 0) {
        return {
          id: 'critical-care-low-acuity',
          severity: 'warning',
          title: 'Critical Care with Low-Acuity Diagnosis',
          message: 'Critical care codes (99291/99292) paired with symptom-only or routine diagnoses are frequently denied.',
          recommendation: 'Document acute organ dysfunction or life-threatening condition to support critical care billing.',
          category: 'payer_specific',
        };
      }
      return null;
    },
  },
];

/**
 * Run payer-specific denial prevention rules.
 */
export function runPayerSpecificRules(
  payerType: PayerType,
  cptCodes: string[],
  icd10Codes: string[],
  encounterContext: EncounterContext
): DenialRule[] {
  const rules: DenialRule[] = [];

  for (const payerRule of PAYER_RULES) {
    if (!payerRule.payerTypes.includes(payerType)) continue;
    const result = payerRule.check(cptCodes, icd10Codes, encounterContext);
    if (result) rules.push(result);
  }

  return rules;
}

// ─── Composite Runner ────────────────────────────────────────────

export interface AdvancedDenialCheckInput {
  cptCodes: string[];
  icd10Codes: string[];
  dateOfService: string;
  encounterContext: EncounterContext;
  priorClaims?: PriorClaim[];
  insuranceName?: string | null;
}

/**
 * Run all advanced denial prevention checks in one call.
 * Returns a combined list of rules from duplicate detection,
 * time-based validation, and payer-specific rules.
 */
export function runAdvancedDenialPrevention(input: AdvancedDenialCheckInput): DenialRule[] {
  const {
    cptCodes,
    icd10Codes,
    dateOfService,
    encounterContext,
    priorClaims = [],
    insuranceName,
  } = input;

  const allRules: DenialRule[] = [];

  // 1. Duplicate billing detection
  allRules.push(...detectDuplicateBilling(cptCodes, dateOfService, priorClaims));

  // 2. Time-based frequency validation
  allRules.push(...validateTimeBasedCodes(cptCodes, dateOfService, priorClaims));

  // 3. Payer-specific rules
  const payerType = inferPayerType(insuranceName);
  allRules.push(...runPayerSpecificRules(payerType, cptCodes, icd10Codes, encounterContext));

  return allRules;
}

// ─── AI-Powered Denial Analysis (Cohere) ─────────────────────────

export interface AIBillingAnalysis {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
  factors: Array<{
    category: string;
    severity: 'block' | 'warning' | 'info';
    title: string;
    message: string;
    recommendation: string;
  }>;
  codeAlternatives: Array<{
    currentCode: string;
    suggestedCode: string;
    suggestedDescription: string;
    reason: string;
  }>;
  payerNotes: string;
}

export interface AIBillingRequest {
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

/**
 * Run AI-powered denial risk analysis via the ai-billing-intelligence edge function.
 * This is the second-pass analysis after static rules have been applied.
 * Returns null if the AI service is unavailable (graceful degradation).
 */
export async function runAIDenialAnalysis(
  request: AIBillingRequest,
  supabaseClient: { functions: { invoke: (name: string, options: { body: unknown }) => Promise<{ data: unknown; error: unknown }> } }
): Promise<AIBillingAnalysis | null> {
  try {
    const { data, error } = await supabaseClient.functions.invoke('ai-billing-intelligence', {
      body: request,
    });

    if (error) {
      console.warn('AI billing analysis unavailable, using static rules only:', error);
      return null;
    }

    const result = data as AIBillingAnalysis & { success?: boolean; fallback?: boolean };
    if (!result || result.fallback) {
      return null;
    }

    return {
      riskScore: result.riskScore || 0,
      riskLevel: result.riskLevel || 'low',
      reasoning: result.reasoning || '',
      factors: result.factors || [],
      codeAlternatives: result.codeAlternatives || [],
      payerNotes: result.payerNotes || '',
    };
  } catch (err) {
    console.warn('AI denial analysis failed, falling back to static rules:', err);
    return null;
  }
}
