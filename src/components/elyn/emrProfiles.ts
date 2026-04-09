/**
 * EMR-specific detection signatures and DOM selectors for Epic, Cerner, and Meditech.
 * Used by the bookmarklet generator and clipboard pre-parser.
 */

export interface EMRProfile {
  id: string;
  name: string;
  /** DOM elements that identify this EMR */
  detectionSignals: string[];
  /** CSS selectors for patient data regions */
  patientSelectors: string[];
  /** CSS selectors for insurance data regions */
  insuranceSelectors: string[];
  /** Regex patterns for parsing banner text from clipboard */
  bannerPatterns: {
    name: RegExp;
    mrn: RegExp;
    dob: RegExp;
    room: RegExp;
    gender: RegExp;
    insurance: RegExp;
    policyNumber: RegExp;
    groupNumber: RegExp;
  };
}

export const EMR_PROFILES: EMRProfile[] = [
  {
    id: 'epic',
    name: 'Epic Hyperspace Web',
    detectionSignals: [
      '#epicHeaderBar',
      '.header-patient-info',
      '#storyboard-header',
      '.patient-banner',
      '[data-testid="patient-header"]',
    ],
    patientSelectors: [
      '.patient-banner',
      '#storyboard-header',
      '.header-patient-info',
      '[data-testid="patient-header"]',
      '.PatientBanner',
    ],
    insuranceSelectors: [
      '.coverage-section',
      '[data-testid="coverage"]',
      '.insurance-info',
      '.CoverageSummary',
    ],
    bannerPatterns: {
      name: /^([A-Z][A-Za-z'-]+(?:,\s*[A-Z][A-Za-z'-]+)+)/m,
      mrn: /MRN[:\s]*([A-Z0-9-]+)/i,
      dob: /(?:DOB|Date of Birth|Birth Date)[:\s]*([\d]{1,2}[\/\-][\d]{1,2}[\/\-][\d]{2,4})/i,
      room: /(?:Room|Rm|Bed|Location)[:\s]*([A-Z0-9\-]+(?:\s*[-\/]\s*[A-Z0-9]+)?)/i,
      gender: /(?:Sex|Gender)[:\s]*(Male|Female|M|F|Other)/i,
      insurance: /(?:Insurance|Payer|Plan|Coverage)[:\s]*([^\n,]+)/i,
      policyNumber: /(?:Policy|Member\s*ID|Subscriber\s*ID)[:\s#]*([A-Z0-9-]+)/i,
      groupNumber: /(?:Group|Grp)[:\s#]*([A-Z0-9-]+)/i,
    },
  },
  {
    id: 'cerner',
    name: 'Cerner PowerChart',
    detectionSignals: [
      '#PatientBanner',
      '.patient-demographics',
      '.cerner-header',
      '#PatientContext',
      '.dcp-patient-banner',
    ],
    patientSelectors: [
      '#PatientBanner',
      '.patient-demographics',
      '.dcp-patient-banner',
      '#PatientContext',
    ],
    insuranceSelectors: [
      '.coverage-benefits',
      '#CoverageSection',
      '.benefits-panel',
    ],
    bannerPatterns: {
      name: /^([A-Z][A-Za-z'-]+(?:,\s*[A-Z][A-Za-z'-]+)+)/m,
      mrn: /(?:MRN|FIN|Acct)[:\s]*([A-Z0-9-]+)/i,
      dob: /(?:DOB|Date of Birth)[:\s]*([\d]{1,2}[\/\-][\d]{1,2}[\/\-][\d]{2,4})/i,
      room: /(?:Room|Location|Unit|Bed)[:\s]*([A-Z0-9\-]+(?:\s*[-\/]\s*[A-Z0-9]+)?)/i,
      gender: /(?:Sex|Gender)[:\s]*(Male|Female|M|F|Other)/i,
      insurance: /(?:Health Plan|Insurance|Payer|Coverage)[:\s]*([^\n,]+)/i,
      policyNumber: /(?:Member\s*(?:ID|#)|Policy|Subscriber\s*ID)[:\s#]*([A-Z0-9-]+)/i,
      groupNumber: /(?:Group|Grp)[:\s#]*([A-Z0-9-]+)/i,
    },
  },
  {
    id: 'meditech',
    name: 'Meditech Expanse',
    detectionSignals: [
      '.mt-patient-header',
      '#patientContext',
      '.meditech-header',
      '.patient-context-bar',
      '[class*="meditech"]',
    ],
    patientSelectors: [
      '.mt-patient-header',
      '#patientContext',
      '.patient-context-bar',
      '.PatientHeader',
    ],
    insuranceSelectors: [
      '.mt-insurance-panel',
      '.insurance-section',
      '#InsurancePanel',
    ],
    bannerPatterns: {
      name: /^([A-Z][A-Za-z'-]+(?:,\s*[A-Z][A-Za-z'-]+)+)/m,
      mrn: /(?:MRN|Account|Acct|MR#)[:\s]*([A-Z0-9-]+)/i,
      dob: /(?:DOB|Date of Birth|Birth)[:\s]*([\d]{1,2}[\/\-][\d]{1,2}[\/\-][\d]{2,4})/i,
      room: /(?:Room|Rm|Unit|Bed|Location)[:\s]*([A-Z0-9\-]+(?:\s*[-\/]\s*[A-Z0-9]+)?)/i,
      gender: /(?:Sex|Gender)[:\s]*(Male|Female|M|F|Other)/i,
      insurance: /(?:Insurance|Ins|Carrier|Plan)[:\s]*([^\n,]+)/i,
      policyNumber: /(?:Policy|ID|Member)[:\s#]*([A-Z0-9-]+)/i,
      groupNumber: /(?:Group|Grp)[:\s#]*([A-Z0-9-]+)/i,
    },
  },
];

/**
 * Pre-parse clipboard text using EMR banner regex patterns.
 * Returns extracted fields or null if no patterns match.
 */
export function preParseEMRText(text: string): {
  name: string | null;
  mrn: string | null;
  dob: string | null;
  room: string | null;
  gender: string | null;
  insurance: string | null;
  policyNumber: string | null;
  groupNumber: string | null;
  detectedEMR: string | null;
} | null {
  // Try each EMR profile's patterns
  for (const profile of EMR_PROFILES) {
    const nameMatch = text.match(profile.bannerPatterns.name);
    const mrnMatch = text.match(profile.bannerPatterns.mrn);

    // Need at least name + MRN to consider it a valid EMR parse
    if (nameMatch && mrnMatch) {
      return {
        name: nameMatch[1]?.trim() || null,
        mrn: mrnMatch[1]?.trim() || null,
        dob: text.match(profile.bannerPatterns.dob)?.[1]?.trim() || null,
        room: text.match(profile.bannerPatterns.room)?.[1]?.trim() || null,
        gender: text.match(profile.bannerPatterns.gender)?.[1]?.trim() || null,
        insurance: text.match(profile.bannerPatterns.insurance)?.[1]?.trim() || null,
        policyNumber: text.match(profile.bannerPatterns.policyNumber)?.[1]?.trim() || null,
        groupNumber: text.match(profile.bannerPatterns.groupNumber)?.[1]?.trim() || null,
        detectedEMR: profile.name,
      };
    }
  }

  // Generic fallback — try common patterns without EMR-specific match
  const nameMatch = text.match(/^([A-Z][A-Za-z'-]+(?:,\s*[A-Z][A-Za-z'-]+)+)/m);
  const mrnMatch = text.match(/(?:MRN|MR#|Account|FIN)[:\s]*([A-Z0-9-]+)/i);

  if (nameMatch && mrnMatch) {
    return {
      name: nameMatch[1]?.trim() || null,
      mrn: mrnMatch[1]?.trim() || null,
      dob: text.match(/(?:DOB|Date of Birth)[:\s]*([\d]{1,2}[\/\-][\d]{1,2}[\/\-][\d]{2,4})/i)?.[1]?.trim() || null,
      room: text.match(/(?:Room|Rm|Bed|Location)[:\s]*([A-Z0-9\-]+)/i)?.[1]?.trim() || null,
      gender: text.match(/(?:Sex|Gender)[:\s]*(Male|Female|M|F)/i)?.[1]?.trim() || null,
      insurance: text.match(/(?:Insurance|Payer|Plan)[:\s]*([^\n,]+)/i)?.[1]?.trim() || null,
      policyNumber: text.match(/(?:Policy|Member\s*ID)[:\s#]*([A-Z0-9-]+)/i)?.[1]?.trim() || null,
      groupNumber: text.match(/(?:Group|Grp)[:\s#]*([A-Z0-9-]+)/i)?.[1]?.trim() || null,
      detectedEMR: null,
    };
  }

  return null;
}

