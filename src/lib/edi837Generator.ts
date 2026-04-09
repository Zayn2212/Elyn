/**
 * EDI 837P (Professional) Transaction File Generator
 * Generates ANSI X12 837P files for electronic claims submission
 * Compatible with all major clearinghouses (Availity, Change Healthcare, Trizetto)
 */

import { CMS1500Data } from './cms1500Generator';

interface EDI837Config {
  senderID: string;       // ISA06 - Interchange Sender ID
  receiverID: string;     // ISA08 - Interchange Receiver ID
  submitterName: string;  // Submitter organization name
}

const DEFAULT_CONFIG: EDI837Config = {
  senderID: 'ELYNAI',
  receiverID: 'CLEARINGHOUSE',
  submitterName: 'ELYN BILLING',
};

/**
 * Pad/trim string to exact length with trailing spaces
 */
function padRight(str: string, len: number): string {
  return (str || '').substring(0, len).padEnd(len, ' ');
}

/**
 * Format date as CCYYMMDD
 */
function formatEDIDate(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  }
  try {
    // Handle MM/DD/YYYY, MM/DD/YY, YYYY-MM-DD
    const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
    if (parts.length === 3) {
      if (dateStr.includes('-')) {
        // YYYY-MM-DD
        return `${parts[0]}${parts[1].padStart(2, '0')}${parts[2].padStart(2, '0')}`;
      }
      // MM/DD/YYYY or MM/DD/YY
      let year = parts[2];
      if (year.length === 2) year = `20${year}`;
      return `${year}${parts[0].padStart(2, '0')}${parts[1].padStart(2, '0')}`;
    }
  } catch { /* fall through */ }
  return formatEDIDate(); // Default to today
}

/**
 * Format time as HHMM
 */
function formatEDITime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Generate unique control number (9 digits)
 */
function controlNumber(): string {
  return String(Date.now()).slice(-9);
}

/**
 * Build EDI segment with element separator (*) and segment terminator (~)
 */
function seg(...elements: string[]): string {
  return elements.join('*') + '~';
}

/**
 * Generate an EDI 837P transaction from CMS 1500 data
 */
export function generate837P(
  claims: CMS1500Data[],
  config: Partial<EDI837Config> = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const lines: string[] = [];
  const today = formatEDIDate();
  const time = formatEDITime();
  const ctrlNum = controlNumber();
  let segmentCount = 0;

  const addSeg = (...elements: string[]) => {
    lines.push(seg(...elements));
    segmentCount++;
  };

  // ISA - Interchange Control Header
  addSeg(
    'ISA', '00', padRight('', 10), '00', padRight('', 10),
    'ZZ', padRight(cfg.senderID, 15),
    'ZZ', padRight(cfg.receiverID, 15),
    today.slice(2), // YYMMDD
    time,
    '^', // Repetition separator
    '00501', // Version
    ctrlNum.padStart(9, '0'),
    '0', // Acknowledgment
    'P', // Production
    ':'  // Component element separator
  );

  // GS - Functional Group Header
  addSeg(
    'GS', 'HC', // Health Care
    cfg.senderID, cfg.receiverID,
    today, time,
    ctrlNum,
    'X', // Responsible Agency
    '005010X222A1' // Version
  );

  // ST - Transaction Set Header
  addSeg('ST', '837', ctrlNum.padStart(4, '0'), '005010X222A1');

  // BHT - Beginning of Hierarchical Transaction
  addSeg('BHT', '0019', '00', ctrlNum, today, time, 'CH');

  // 1000A - Submitter
  addSeg('NM1', '41', '2', cfg.submitterName, '', '', '', '', '46', cfg.senderID);
  addSeg('PER', 'IC', cfg.submitterName, 'TE', '0000000000');

  // 1000B - Receiver
  addSeg('NM1', '40', '2', 'CLEARINGHOUSE', '', '', '', '', '46', cfg.receiverID);

  let hlCounter = 0;

  claims.forEach((claim) => {
    // 2000A - Billing Provider Hierarchical Level
    hlCounter++;
    const billingHL = hlCounter;
    addSeg('HL', String(billingHL), '', '20', '1');

    // 2010AA - Billing Provider Name
    addSeg('NM1', '85', '1',
      claim.billingProviderName.split(',')[0] || '',
      claim.billingProviderName.split(',')[1]?.trim() || '',
      '', '', '',
      'XX', claim.billingProviderNPI
    );
    if (claim.billingProviderAddress) {
      addSeg('N3', claim.billingProviderAddress);
      addSeg('N4', '', '', '');
    }
    if (claim.federalTaxId) {
      addSeg('REF', claim.taxIdType === 'SSN' ? 'SY' : 'EI', claim.federalTaxId);
    }

    // 2000B - Subscriber Hierarchical Level
    hlCounter++;
    const subscriberHL = hlCounter;
    addSeg('HL', String(subscriberHL), String(billingHL), '22', '0');
    addSeg('SBR', 'P', // Primary
      claim.patientRelationship === 'Self' ? '18' : '01',
      claim.insuredGroupNumber, claim.insurancePlanName,
      '', '', '', '', 'CI'
    );

    // 2010BA - Subscriber Name
    const subParts = claim.insuredName.split(',');
    addSeg('NM1', 'IL', '1',
      subParts[0]?.trim() || '',
      subParts[1]?.trim() || '',
      '', '', '',
      'MI', claim.insuredId
    );

    // 2010BB - Payer Name
    addSeg('NM1', 'PR', '2', claim.insurancePlanName, '', '', '', '', 'PI', claim.insuredId);

    // 2300 - Claim Information
    const totalCharge = claim.totalCharge > 0
      ? claim.totalCharge.toFixed(2)
      : claim.serviceLines.length > 0 ? '0.00' : '0.00';

    addSeg('CLM', claim.patientAccountNo || ctrlNum,
      totalCharge,
      '', '',
      `${claim.serviceLines[0]?.placeOfService || '21'}:B:1`,
      'Y', 'A', 'Y', 'Y'
    );

    // Diagnosis codes
    if (claim.diagnosisCodes.length > 0) {
      const dxElements = ['HI'];
      claim.diagnosisCodes.forEach((dx, i) => {
        const qualifier = i === 0 ? 'ABK' : 'ABF';
        dxElements.push(`${qualifier}:${dx.code.replace('.', '')}`);
      });
      addSeg(...dxElements);
    }

    // 2400 - Service Lines
    claim.serviceLines.forEach((line, idx) => {
      addSeg('LX', String(idx + 1));

      // SV1 - Professional Service
      const modStr = [line.cptCode, ...line.modifiers.slice(0, 4)].join(':');
      const dxPointers = line.diagnosisPointers
        .map(p => String(p.charCodeAt(0) - 64)) // A=1, B=2, etc.
        .join(':');

      addSeg('SV1', `HC:${modStr}`,
        line.charges.toFixed(2),
        'UN', String(line.units),
        '', '',
        dxPointers || '1'
      );

      // DTP - Date of Service
      addSeg('DTP', '472', 'D8', formatEDIDate(line.dateFrom));
    });
  });

  // SE - Transaction Set Trailer (count segments from ST to SE inclusive)
  const stToSeCount = segmentCount - 3 + 1; // Exclude ISA, GS; include SE
  addSeg('SE', String(stToSeCount), ctrlNum.padStart(4, '0'));

  // GE - Functional Group Trailer
  addSeg('GE', '1', ctrlNum);

  // IEA - Interchange Control Trailer
  addSeg('IEA', '1', ctrlNum.padStart(9, '0'));

  return lines.join('\n');
}

/**
 * Download EDI 837P file
 */
export function download837P(claims: CMS1500Data[], filename?: string): void {
  const content = generate837P(claims);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `837P_${new Date().toISOString().split('T')[0]}.edi`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
