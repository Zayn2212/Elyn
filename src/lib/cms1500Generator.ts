/**
 * CMS 1500 (HCFA) Claim Form Data Generator
 * Generates structured data matching all 33 boxes of the CMS 1500 form
 * for print or PDF export.
 */

import { formatClaimsName, formatClaimsDOB, formatMRN } from './claimsFormatting';

export interface CMS1500ServiceLine {
  dateFrom: string;       // Box 24A - MM/DD/YY
  dateTo: string;         // Box 24A
  placeOfService: string; // Box 24B - 2-digit POS code
  cptCode: string;        // Box 24D
  modifiers: string[];    // Box 24D (up to 4)
  diagnosisPointers: string[]; // Box 24E - letters A-L
  charges: number;        // Box 24F
  units: number;          // Box 24G
  renderingNPI: string;   // Box 24J
}

export interface CMS1500Data {
  // Box 1: Payer type
  payerType: 'Medicare' | 'Medicaid' | 'Tricare' | 'CHAMPVA' | 'Group' | 'FECA' | 'Other';

  // Box 1a: Insured's ID
  insuredId: string;

  // Box 2: Patient Name (LAST, FIRST, MI)
  patientName: string;

  // Box 3: Patient DOB + Sex
  patientDOB: string;
  patientSex: 'M' | 'F' | '';

  // Box 4: Insured's Name
  insuredName: string;

  // Box 5: Patient Address
  patientAddress: string;
  patientCity: string;
  patientState: string;
  patientZip: string;
  patientPhone: string;

  // Box 6: Patient relationship to insured
  patientRelationship: 'Self' | 'Spouse' | 'Child' | 'Other';

  // Box 9: Other Insured's Name (secondary)
  otherInsuredName: string;

  // Box 11: Insured's Group Number
  insuredGroupNumber: string;

  // Box 11c: Insurance Plan Name
  insurancePlanName: string;

  // Box 17: Referring Provider
  referringProvider: string;
  referringNPI: string;

  // Box 21: Diagnosis codes (ICD-10) A-L
  diagnosisCodes: { pointer: string; code: string }[];

  // Box 24: Service Lines (up to 6)
  serviceLines: CMS1500ServiceLine[];

  // Box 25: Federal Tax ID
  federalTaxId: string;
  taxIdType: 'SSN' | 'EIN';

  // Box 26: Patient Account No
  patientAccountNo: string;

  // Box 27: Accept Assignment
  acceptAssignment: boolean;

  // Box 28: Total Charge
  totalCharge: number;

  // Box 29: Amount Paid
  amountPaid: number;

  // Box 31: Signature of Physician
  physicianSignature: string;
  signatureDate: string;

  // Box 32: Service Facility
  facilityName: string;
  facilityAddress: string;
  facilityNPI: string;

  // Box 33: Billing Provider
  billingProviderName: string;
  billingProviderAddress: string;
  billingProviderNPI: string;
  billingProviderPhone: string;
}

export interface CMS1500Input {
  patient: {
    name: string;
    dob?: string | null;
    mrn?: string | null;
    sex?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    phone?: string | null;
    insuranceId?: string | null;
    insuranceName?: string | null;
    insuranceGroup?: string | null;
    insurancePlanType?: string | null;
    payerId?: string | null;
    subscriberName?: string | null;
    subscriberRelationship?: string | null;
  };
  billing: {
    icd10Codes: string[];
    cptCodes: string[];
    modifiers?: string[];
    rvu?: number;
    dateOfService: string;
    chargeAmounts?: Record<string, number>; // CPT code → charge
  };
  provider: {
    name: string;
    npi: string;
    taxId?: string;
    taxonomyCode?: string;
    billingAddress?: string;
  };
  facility: {
    name: string;
    address?: string;
    npi?: string;
    taxId?: string;
    placeOfServiceCode?: string;
    billingEntityName?: string;
    billingEntityNpi?: string;
    billingEntityTaxId?: string;
  };
}

/**
 * Map insurance plan type to CMS 1500 Box 1 payer type
 */
function mapPayerType(planType?: string | null): CMS1500Data['payerType'] {
  if (!planType) return 'Other';
  const lower = planType.toLowerCase();
  if (lower.includes('medicare')) return 'Medicare';
  if (lower.includes('medicaid')) return 'Medicaid';
  if (lower.includes('tricare')) return 'Tricare';
  if (lower.includes('commercial') || lower.includes('group')) return 'Group';
  if (lower.includes('workers')) return 'FECA';
  return 'Other';
}

/**
 * Format date as MM/DD/YY for service lines
 */
function formatServiceDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  } catch {
    return '';
  }
}

/**
 * Generate CMS 1500 form data from input
 */
export function generateCMS1500(input: CMS1500Input): CMS1500Data {
  const { patient, billing, provider, facility } = input;

  // Map diagnosis codes to pointers (A-L)
  const pointerLetters = 'ABCDEFGHIJKL';
  const diagnosisCodes = billing.icd10Codes.slice(0, 12).map((code, i) => ({
    pointer: pointerLetters[i],
    code,
  }));

  // Build service lines - one per CPT code
  const serviceDate = formatServiceDate(billing.dateOfService);
  const serviceLines: CMS1500ServiceLine[] = billing.cptCodes.map((cpt) => ({
    dateFrom: serviceDate,
    dateTo: serviceDate,
    placeOfService: facility.placeOfServiceCode || '21',
    cptCode: cpt,
    modifiers: billing.modifiers || [],
    diagnosisPointers: diagnosisCodes.length > 0 ? [diagnosisCodes[0].pointer] : [],
    charges: billing.chargeAmounts?.[cpt] || 0,
    units: 1,
    renderingNPI: provider.npi,
  }));

  const relationship = (patient.subscriberRelationship || 'Self') as CMS1500Data['patientRelationship'];

  const billingEntity = facility.billingEntityName ? {
    name: facility.billingEntityName,
    npi: facility.billingEntityNpi || provider.npi,
    taxId: facility.billingEntityTaxId || provider.taxId || facility.taxId || '',
  } : null;

  return {
    payerType: mapPayerType(patient.insurancePlanType),
    insuredId: patient.insuranceId || '',
    patientName: formatClaimsName(patient.name),
    patientDOB: formatClaimsDOB(patient.dob),
    patientSex: (patient.sex === 'M' || patient.sex === 'F') ? patient.sex : '',
    insuredName: patient.subscriberName
      ? formatClaimsName(patient.subscriberName)
      : formatClaimsName(patient.name),
    patientAddress: patient.address || '',
    patientCity: patient.city || '',
    patientState: patient.state || '',
    patientZip: patient.zip || '',
    patientPhone: patient.phone || '',
    patientRelationship: relationship,
    otherInsuredName: '',
    insuredGroupNumber: patient.insuranceGroup || '',
    insurancePlanName: patient.insuranceName || '',
    referringProvider: '',
    referringNPI: '',
    diagnosisCodes,
    serviceLines,
    federalTaxId: billingEntity?.taxId || provider.taxId || facility.taxId || '',
    taxIdType: 'EIN',
    patientAccountNo: formatMRN(patient.mrn),
    acceptAssignment: true,
    totalCharge: serviceLines.reduce((s, l) => s + l.charges, 0),
    amountPaid: 0,
    physicianSignature: provider.name,
    signatureDate: new Date().toLocaleDateString('en-US'),
    facilityName: facility.name,
    facilityAddress: facility.address || '',
    facilityNPI: facility.npi || '',
    billingProviderName: billingEntity?.name || provider.name,
    billingProviderAddress: provider.billingAddress || '',
    billingProviderNPI: billingEntity?.npi || provider.npi,
    billingProviderPhone: '',
  };
}
