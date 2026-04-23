/**
 * Clinical Attention Score™ Engine
 *
 * Scoring weights:
 *   Diagnosis keywords (30%)
 *   Time since last action (25%)
 *   Patient status (20%)
 *   Revenue potential (15%)
 *   Complexity indicators (10%)
 */

export type AcuityLevel = 'critical' | 'high' | 'moderate' | 'low';

export interface AcuityResult {
  score: number; // 0-100
  level: AcuityLevel;
  signals: string[];
  revenueAtRisk: number;
  suggestedActions: string[];
}

interface PatientInput {
  diagnosis?: string | null;
  status?: string;
  allergies?: string[] | null;
  lastNoteAt?: string | null;
  lastActionAt?: string | null;
  pendingRvu?: number;
  noteCount?: number;
}

const CRITICAL_KEYWORDS: Record<string, number> = {
  'stroke': 95, 'cva': 95, 'stemi': 95, 'code blue': 100, 'cardiac arrest': 100,
  'intubat': 90, 'septic shock': 95, 'hemorrhag': 90, 'bleed': 80,
  'pe': 85, 'pulmonary embolism': 90, 'aortic dissection': 95,
  'status epilepticus': 90, 'tension pneumothorax': 95,
};

const HIGH_KEYWORDS: Record<string, number> = {
  'sepsis': 75, 'mi': 70, 'myocardial infarction': 75, 'dvt': 65,
  'pneumonia': 60, 'aki': 65, 'acute kidney': 65, 'resp fail': 70,
  'respiratory failure': 75, 'ards': 80, 'dic': 80, 'meningitis': 75,
  'encephalitis': 75, 'icu': 70, 'critical': 70, 'unstable': 65,
};

const MODERATE_KEYWORDS: Record<string, number> = {
  'chf': 50, 'heart failure': 55, 'copd exacerbation': 50, 'gi bleed': 55,
  'afib': 45, 'atrial fibrillation': 50, 'cellulitis': 40, 'uti': 35,
  'pancreatitis': 50, 'diabetic ketoacidosis': 60, 'dka': 60,
};

function getDiagnosisScore(diagnosis?: string | null): { score: number; signals: string[] } {
  if (!diagnosis) return { score: 0, signals: [] };
  const lower = diagnosis.toLowerCase();
  const signals: string[] = [];
  let maxScore = 0;

  for (const [keyword, score] of Object.entries(CRITICAL_KEYWORDS)) {
    if (lower.includes(keyword)) { maxScore = Math.max(maxScore, score); signals.push(`Critical: ${keyword}`); }
  }
  for (const [keyword, score] of Object.entries(HIGH_KEYWORDS)) {
    if (lower.includes(keyword)) { maxScore = Math.max(maxScore, score); signals.push(`High acuity: ${keyword}`); }
  }
  for (const [keyword, score] of Object.entries(MODERATE_KEYWORDS)) {
    if (lower.includes(keyword)) { maxScore = Math.max(maxScore, score); signals.push(`Moderate: ${keyword}`); }
  }

  return { score: maxScore, signals };
}

function getTimeSinceScore(lastActionAt?: string | null, lastNoteAt?: string | null): { score: number; signals: string[] } {
  const refTime = lastActionAt || lastNoteAt;
  if (!refTime) return { score: 80, signals: ['No prior clinical action recorded'] };

  const hoursAgo = (Date.now() - new Date(refTime).getTime()) / (1000 * 60 * 60);

  if (hoursAgo > 12) return { score: 100, signals: [`${Math.round(hoursAgo)}h since last action — overdue`] };
  if (hoursAgo > 6) return { score: 75, signals: [`${Math.round(hoursAgo)}h since last action`] };
  if (hoursAgo > 3) return { score: 50, signals: [`${Math.round(hoursAgo)}h since last action`] };
  if (hoursAgo > 1) return { score: 25, signals: [] };
  return { score: 0, signals: [] };
}

function getStatusScore(status?: string): { score: number; signals: string[] } {
  switch (status) {
    case 'not_seen': return { score: 100, signals: ['Patient not yet seen'] };
    case 'in_progress': return { score: 60, signals: ['Encounter in progress'] };
    case 'seen': return { score: 20, signals: [] };
    case 'signed': return { score: 0, signals: [] };
    case 'discharged': return { score: 0, signals: [] };
    default: return { score: 80, signals: ['Status unknown'] };
  }
}

function getRevenueScore(pendingRvu?: number): { score: number; signals: string[]; revenueAtRisk: number } {
  if (!pendingRvu || pendingRvu <= 0) return { score: 60, signals: ['No billing captured — potential revenue loss'], revenueAtRisk: 0 };
  if (pendingRvu < 1) return { score: 30, signals: [], revenueAtRisk: 0 };
  if (pendingRvu < 3) return { score: 15, signals: [], revenueAtRisk: 0 };
  return { score: 0, signals: [`${pendingRvu.toFixed(1)} RVU captured`], revenueAtRisk: 0 };
}

function getComplexityScore(allergies?: string[] | null, noteCount?: number): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  if (allergies && allergies.length > 0) {
    score += Math.min(allergies.length * 15, 60);
    signals.push(`${allergies.length} known allergies`);
  }
  if (noteCount && noteCount > 3) {
    score += 20;
    signals.push(`${noteCount} encounters — complex case`);
  }

  return { score: Math.min(score, 100), signals };
}

function getSuggestedActions(signals: string[], status?: string, pendingRvu?: number): string[] {
  const actions: string[] = [];
  if (status === 'not_seen') actions.push('Patient needs initial evaluation');
  if (signals.some(s => s.includes('overdue'))) actions.push('Clinical follow-up overdue');
  if (!pendingRvu || pendingRvu <= 0) actions.push('Capture billing for encounter');
  if (signals.some(s => s.startsWith('Critical'))) actions.push('Immediate clinical attention required');
  return actions.slice(0, 3);
}

export function computeAcuity(patient: PatientInput): AcuityResult {
  if (patient.status === 'discharged') {
    return { score: 0, level: 'low', signals: ['Discharged'], revenueAtRisk: 0, suggestedActions: [] };
  }

  const diagnosis = getDiagnosisScore(patient.diagnosis);
  const timeSince = getTimeSinceScore(patient.lastActionAt, patient.lastNoteAt);
  const statusScore = getStatusScore(patient.status);
  const revenue = getRevenueScore(patient.pendingRvu);
  const complexity = getComplexityScore(patient.allergies, patient.noteCount);

  const score = Math.round(
    diagnosis.score * 0.30 +
    timeSince.score * 0.25 +
    statusScore.score * 0.20 +
    revenue.score * 0.15 +
    complexity.score * 0.10
  );

  const clampedScore = Math.min(Math.max(score, 0), 100);

  let level: AcuityLevel;
  if (clampedScore >= 75) level = 'critical';
  else if (clampedScore >= 50) level = 'high';
  else if (clampedScore >= 25) level = 'moderate';
  else level = 'low';

  const allSignals = [
    ...diagnosis.signals, ...timeSince.signals,
    ...statusScore.signals, ...revenue.signals, ...complexity.signals,
  ].filter(Boolean);

  return {
    score: clampedScore,
    level,
    signals: allSignals,
    revenueAtRisk: revenue.revenueAtRisk,
    suggestedActions: getSuggestedActions(allSignals, patient.status, patient.pendingRvu),
  };
}

export function getAcuityColor(level: AcuityLevel): string {
  switch (level) {
    case 'critical': return 'text-destructive';
    case 'high': return 'text-warning';
    case 'moderate': return 'text-primary';
    case 'low': return 'text-success';
  }
}

export function getAcuityBgColor(level: AcuityLevel): string {
  switch (level) {
    case 'critical': return 'bg-destructive/15 border-destructive/30';
    case 'high': return 'bg-warning/15 border-warning/30';
    case 'moderate': return 'bg-primary/15 border-primary/30';
    case 'low': return 'bg-success/15 border-success/30';
  }
}

export function getAcuityRingColor(level: AcuityLevel): string {
  switch (level) {
    case 'critical': return 'ring-destructive shadow-destructive/20';
    case 'high': return 'ring-warning shadow-warning/20';
    case 'moderate': return 'ring-primary shadow-primary/20';
    case 'low': return 'ring-success shadow-success/20';
  }
}
