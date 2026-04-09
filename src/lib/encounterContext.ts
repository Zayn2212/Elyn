/**
 * Encounter Context Engine
 * Smart encounter type detection, auto-modifier application, and denial prevention rules.
 */

export type EncounterType = 
  | 'initial_consult' 
  | 'follow_up' 
  | 'discharge' 
  | 'critical_care' 
  | 'procedure' 
  | 'telehealth_consult';

export interface EncounterContext {
  encounterType: EncounterType;
  isTelehealth: boolean;
  placeOfService: string;
  referringProvider: string;
  referringNPI: string;
}

export const DEFAULT_ENCOUNTER_CONTEXT: EncounterContext = {
  encounterType: 'follow_up',
  isTelehealth: false,
  placeOfService: '21',
  referringProvider: '',
  referringNPI: '',
};

export const ENCOUNTER_TYPES: { id: EncounterType; label: string; icon: string; description: string }[] = [
  { id: 'initial_consult', label: 'Initial Consult', icon: '🩺', description: '99221-99223' },
  { id: 'follow_up', label: 'Follow-Up', icon: '📋', description: '99231-99233' },
  { id: 'discharge', label: 'Discharge', icon: '🏠', description: '99238-99239' },
  { id: 'critical_care', label: 'Critical Care', icon: '🚨', description: '99291-99292' },
  { id: 'procedure', label: 'Procedure', icon: '🔧', description: 'Procedure codes' },
  { id: 'telehealth_consult', label: 'Telehealth', icon: '💻', description: 'POS 02 + Mod -95' },
];

export const POS_CODES: { code: string; label: string }[] = [
  { code: '02', label: '02 - Telehealth' },
  { code: '11', label: '11 - Office' },
  { code: '21', label: '21 - Inpatient Hospital' },
  { code: '22', label: '22 - Outpatient Hospital' },
  { code: '23', label: '23 - Emergency Room' },
  { code: '24', label: '24 - Ambulatory Surgical Center' },
  { code: '31', label: '31 - Skilled Nursing' },
  { code: '32', label: '32 - Nursing Facility' },
  { code: '81', label: '81 - Independent Lab' },
];

// ─── Auto-Modifier Engine ────────────────────────────────────────

export interface AppliedModifier {
  code: string;
  reason: string;
  autoApplied: boolean;
}

export function getAutoModifiers(
  encounterContext: EncounterContext,
  cptCodes: string[],
  isRadiology: boolean
): AppliedModifier[] {
  const modifiers: AppliedModifier[] = [];

  // -95 for synchronous telehealth
  if (encounterContext.isTelehealth || encounterContext.encounterType === 'telehealth_consult') {
    modifiers.push({
      code: '95',
      reason: 'Synchronous telehealth encounter',
      autoApplied: true,
    });
  }

  // -26 for professional component on all radiology reads
  if (isRadiology) {
    modifiers.push({
      code: '26',
      reason: 'Professional component — radiology interpretation',
      autoApplied: true,
    });
  }

  // -25 when E/M + procedure on same day
  const hasEM = cptCodes.some(c => /^99[0-9]{3}$/.test(c));
  const hasProcedure = cptCodes.some(c => !(/^99[0-9]{3}$/.test(c)));
  if (hasEM && hasProcedure && cptCodes.length > 1) {
    modifiers.push({
      code: '25',
      reason: 'Significant, separately identifiable E/M with procedure on same day',
      autoApplied: true,
    });
  }

  return modifiers;
}

// ─── Denial Prevention Rules Engine ──────────────────────────────

export type DenialRuleSeverity = 'block' | 'warning';

export interface DenialRule {
  id: string;
  severity: DenialRuleSeverity;
  title: string;
  message: string;
  recommendation: string;
}

export function runDenialPreventionRules(
  encounterContext: EncounterContext,
  cptCodes: string[],
  icd10Codes: string[],
  modifiers: string[],
  noteType: string
): DenialRule[] {
  const rules: DenialRule[] = [];

  // 1. Consult without referring provider → BLOCK
  const isConsult = encounterContext.encounterType === 'initial_consult' || noteType === 'Consult';
  if (isConsult && !encounterContext.referringProvider.trim()) {
    rules.push({
      id: 'missing-referring-provider',
      severity: 'block',
      title: 'Missing Referring Provider',
      message: 'Consult encounters require a referring provider name and NPI for claim submission.',
      recommendation: 'Add referring provider details in the Encounter section before confirming.',
    });
  }

  // 2. Telehealth without -95 modifier → BLOCK
  if (encounterContext.isTelehealth || encounterContext.encounterType === 'telehealth_consult') {
    if (!modifiers.includes('95')) {
      rules.push({
        id: 'telehealth-no-95',
        severity: 'block',
        title: 'Telehealth Missing Modifier -95',
        message: 'Telehealth encounters must include modifier -95 (synchronous telehealth).',
        recommendation: 'Modifier -95 will be auto-applied. If this is not telehealth, change the encounter type.',
      });
    }
    if (encounterContext.placeOfService !== '02') {
      rules.push({
        id: 'telehealth-wrong-pos',
        severity: 'warning',
        title: 'Telehealth POS Should Be 02',
        message: `Current Place of Service is ${encounterContext.placeOfService}. Telehealth encounters typically use POS 02.`,
        recommendation: 'Verify the Place of Service is set to 02 for telehealth.',
      });
    }
  }

  // 3. Missing diagnosis for procedure → BLOCK
  if (icd10Codes.length === 0) {
    rules.push({
      id: 'missing-dx-procedure',
      severity: 'block',
      title: 'No Diagnosis Codes',
      message: 'At least one ICD-10 diagnosis code is required to support medical necessity.',
      recommendation: 'Add diagnosis codes before confirming billing.',
    });
  }

  // 4. Initial hospital care codes on follow-up → WARNING
  const initialCodes = ['99221', '99222', '99223'];
  const hasInitialCode = cptCodes.some(c => initialCodes.includes(c));
  if (hasInitialCode && encounterContext.encounterType === 'follow_up') {
    rules.push({
      id: 'initial-code-on-followup',
      severity: 'warning',
      title: 'Initial Code on Follow-Up Encounter',
      message: 'E/M codes 99221-99223 are for initial hospital care but encounter is marked as follow-up.',
      recommendation: 'Use subsequent care codes (99231-99233) or change encounter type to Initial Consult.',
    });
  }

  // 5. Subsequent codes on initial encounter → WARNING
  const subsequentCodes = ['99231', '99232', '99233'];
  const hasSubsequentCode = cptCodes.some(c => subsequentCodes.includes(c));
  if (hasSubsequentCode && encounterContext.encounterType === 'initial_consult') {
    rules.push({
      id: 'subsequent-code-on-initial',
      severity: 'warning',
      title: 'Subsequent Code on Initial Encounter',
      message: 'E/M codes 99231-99233 are for subsequent care but encounter is marked as Initial Consult.',
      recommendation: 'Use initial hospital care codes (99221-99223) or change encounter type to Follow-Up.',
    });
  }

  return rules;
}

/**
 * Get the E/M code range guidance based on encounter type
 */
export function getEMCodeRange(encounterType: EncounterType): string {
  switch (encounterType) {
    case 'initial_consult':
      return 'Use initial hospital care codes: 99221 (Low), 99222 (Moderate), 99223 (High)';
    case 'follow_up':
      return 'Use subsequent care codes: 99231 (Low), 99232 (Moderate), 99233 (High)';
    case 'discharge':
      return 'Use discharge day codes: 99238 (≤30 min), 99239 (>30 min)';
    case 'critical_care':
      return 'Use critical care codes: 99291 (first 30-74 min), 99292 (each additional 30 min)';
    case 'telehealth_consult':
      return 'Use office/outpatient codes with -95 modifier: 99211-99215. Set POS to 02.';
    case 'procedure':
      return 'Use procedure-specific CPT codes with appropriate E/M if separately identifiable service';
    default:
      return '';
  }
}
