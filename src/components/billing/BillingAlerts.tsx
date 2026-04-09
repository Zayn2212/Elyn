import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertType = 'upcode' | 'downcode' | 'audit_risk' | 'optimal' | 'info';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface BillingAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  recommendation?: string;
  affectedCodes?: string[];
}

interface BillingAlertsProps {
  emLevel: string;
  mdmComplexity: string;
  cptCodes: Array<{ code: string; description: string }>;
  icd10Codes: Array<{ code: string; description: string }>;
  rvu: number;
  noteType?: string;
  encounterType?: string;
  isTelehealth?: boolean;
  referringProvider?: string;
  className?: string;
}

// E/M code complexity mapping
const EM_LEVELS: Record<string, { complexity: string; minMdm: string; rvu: number }> = {
  '99211': { complexity: 'Minimal', minMdm: 'minimal', rvu: 0.18 },
  '99212': { complexity: 'Low', minMdm: 'straightforward', rvu: 0.70 },
  '99213': { complexity: 'Low', minMdm: 'low', rvu: 1.30 },
  '99214': { complexity: 'Moderate', minMdm: 'moderate', rvu: 1.92 },
  '99215': { complexity: 'High', minMdm: 'high', rvu: 2.80 },
  '99221': { complexity: 'Low', minMdm: 'low', rvu: 1.92 },
  '99222': { complexity: 'Moderate', minMdm: 'moderate', rvu: 2.61 },
  '99223': { complexity: 'High', minMdm: 'high', rvu: 3.86 },
  '99231': { complexity: 'Low', minMdm: 'low', rvu: 0.76 },
  '99232': { complexity: 'Moderate', minMdm: 'moderate', rvu: 1.39 },
  '99233': { complexity: 'High', minMdm: 'high', rvu: 2.00 },
  '99238': { complexity: 'Discharge', minMdm: 'low', rvu: 1.28 },
  '99239': { complexity: 'Discharge', minMdm: 'moderate', rvu: 1.90 },
  '99241': { complexity: 'Minimal', minMdm: 'straightforward', rvu: 0.64 },
  '99242': { complexity: 'Low', minMdm: 'straightforward', rvu: 1.29 },
  '99243': { complexity: 'Moderate', minMdm: 'low', rvu: 1.72 },
  '99244': { complexity: 'Moderate-High', minMdm: 'moderate', rvu: 2.58 },
  '99245': { complexity: 'High', minMdm: 'high', rvu: 3.40 },
};

// MDM complexity hierarchy
const MDM_HIERARCHY = ['minimal', 'straightforward', 'low', 'moderate', 'high'];

// High-audit-risk CPT codes (frequently audited)
const HIGH_AUDIT_RISK_CODES = ['99215', '99223', '99233', '99245', '99291', '99292'];

// Codes that often require modifier review
const MODIFIER_REQUIRED_CODES = ['99291', '99292', '99354', '99355'];

// Common code bundling issues
const BUNDLING_PAIRS: Array<{ codes: string[]; warning: string }> = [
  { codes: ['99213', '99214'], warning: 'Cannot bill multiple E/M levels for same encounter' },
  { codes: ['99291', '99285'], warning: 'Critical care and ED E/M typically cannot be billed together' },
];

function getMdmLevel(complexity: string): number {
  const lower = complexity.toLowerCase();
  if (lower.includes('high')) return 4;
  if (lower.includes('moderate')) return 3;
  if (lower.includes('low') || lower.includes('straight')) return 2;
  return 1;
}

function analyzeForAlerts(
  emLevel: string,
  mdmComplexity: string,
  cptCodes: Array<{ code: string }>,
  icd10Codes: Array<{ code: string }>,
  rvu: number,
  noteType?: string,
  encounterType?: string,
  isTelehealth?: boolean,
  referringProvider?: string,
): BillingAlert[] {
  const alerts: BillingAlert[] = [];
  const cptCodeStrings = cptCodes.map(c => c.code);

  // 1. Check for upcode risk
  const emInfo = EM_LEVELS[emLevel];
  if (emInfo) {
    const requiredMdmLevel = MDM_HIERARCHY.indexOf(emInfo.minMdm);
    const actualMdmLevel = getMdmLevel(mdmComplexity);

    if (actualMdmLevel < requiredMdmLevel) {
      alerts.push({
        id: 'upcode-mdm-mismatch',
        type: 'upcode',
        severity: 'high',
        title: 'Potential Upcode Risk',
        message: `E/M level ${emLevel} requires ${emInfo.minMdm} MDM, but documentation shows ${mdmComplexity.toLowerCase()}.`,
        recommendation: `Consider using a lower E/M code or ensure documentation supports ${emInfo.minMdm} complexity.`,
        affectedCodes: [emLevel],
      });
    }
  }

  // 2. Check for high audit risk codes
  const highRiskCodes = cptCodeStrings.filter(c => HIGH_AUDIT_RISK_CODES.includes(c));
  if (highRiskCodes.length > 0) {
    alerts.push({
      id: 'high-audit-codes',
      type: 'audit_risk',
      severity: 'medium',
      title: 'High-Audit Frequency Codes',
      message: `Code(s) ${highRiskCodes.join(', ')} are frequently audited by payers.`,
      recommendation: 'Ensure thorough documentation of medical necessity and all required elements.',
      affectedCodes: highRiskCodes,
    });
  }

  // 3. Check for bundling issues
  for (const bundle of BUNDLING_PAIRS) {
    const matchingCodes = bundle.codes.filter(c => cptCodeStrings.includes(c));
    if (matchingCodes.length > 1) {
      alerts.push({
        id: `bundling-${matchingCodes.join('-')}`,
        type: 'audit_risk',
        severity: 'high',
        title: 'Potential Bundling Issue',
        message: bundle.warning,
        recommendation: 'Review codes and consider using modifier -25 or removing one code.',
        affectedCodes: matchingCodes,
      });
    }
  }

  // 4. Check for modifier requirements
  const needsModifier = cptCodeStrings.filter(c => MODIFIER_REQUIRED_CODES.includes(c));
  if (needsModifier.length > 0 && cptCodes.length > 1) {
    alerts.push({
      id: 'modifier-review',
      type: 'info',
      severity: 'low',
      title: 'Modifier Review Suggested',
      message: `Code(s) ${needsModifier.join(', ')} may require modifiers when billed with other services.`,
      recommendation: 'Review modifier usage for bundled services.',
      affectedCodes: needsModifier,
    });
  }

  // 5. Check for optimal coding opportunity (downcode suggestion for safety)
  if (emInfo && rvu > 2.0) {
    const currentMdm = getMdmLevel(mdmComplexity);
    if (currentMdm <= 2 && emLevel !== '99213' && emLevel !== '99231') {
      alerts.push({
        id: 'consider-lower-code',
        type: 'optimal',
        severity: 'low',
        title: 'Consider Conservative Coding',
        message: `With ${mdmComplexity} complexity, a lower E/M code may be safer for audit compliance.`,
        recommendation: 'Review documentation to ensure it fully supports the selected level.',
        affectedCodes: [emLevel],
      });
    }
  }

  // 6. Check for missing diagnosis codes
  if (icd10Codes.length === 0) {
    alerts.push({
      id: 'missing-diagnosis',
      type: 'audit_risk',
      severity: 'critical',
      title: 'Missing Diagnosis Codes',
      message: 'No ICD-10 diagnosis codes are attached to this encounter.',
      recommendation: 'Add at least one diagnosis code to support medical necessity.',
      affectedCodes: [],
    });
  }

  // 7. Check for high RVU without supporting diagnoses
  if (rvu > 2.5 && icd10Codes.length < 2) {
    alerts.push({
      id: 'low-diagnosis-count',
      type: 'info',
      severity: 'low',
      title: 'Consider Additional Diagnoses',
      message: 'High-level E/M codes are better supported with multiple diagnosis codes.',
      recommendation: 'Add any relevant secondary diagnoses to strengthen claim.',
      affectedCodes: [],
    });
  }

  // 8. Consult without referring provider → BLOCK
  const isConsult = encounterType === 'initial_consult' || noteType === 'Consult';
  if (isConsult && !referringProvider?.trim()) {
    alerts.push({
      id: 'missing-referring-consult',
      type: 'audit_risk',
      severity: 'critical',
      title: 'Consult Missing Referring Provider',
      message: 'Consult encounters require a referring provider for claim submission. This will result in a denial.',
      recommendation: 'Add referring provider name and NPI in the Encounter section.',
      affectedCodes: [],
    });
  }

  // 9. Telehealth without -95 check (informational)
  if (isTelehealth) {
    alerts.push({
      id: 'telehealth-reminder',
      type: 'info',
      severity: 'low',
      title: 'Telehealth Encounter',
      message: 'Modifier -95 and POS 02 will be auto-applied for this telehealth encounter.',
      affectedCodes: [],
    });
  }

  return alerts;
}

// Alert type configuration
const alertConfig: Record<AlertType, { icon: typeof TrendingUp; label: string; color: string }> = {
  upcode: { icon: TrendingUp, label: 'Upcode Risk', color: 'destructive' },
  downcode: { icon: TrendingDown, label: 'Downcode', color: 'warning' },
  audit_risk: { icon: Shield, label: 'Audit Risk', color: 'warning' },
  optimal: { icon: Lightbulb, label: 'Optimization', color: 'primary' },
  info: { icon: Info, label: 'Info', color: 'muted-foreground' },
};

const severityConfig: Record<AlertSeverity, { bg: string; border: string }> = {
  low: { bg: 'bg-muted/50', border: 'border-muted' },
  medium: { bg: 'bg-warning/10', border: 'border-warning/30' },
  high: { bg: 'bg-destructive/10', border: 'border-destructive/30' },
  critical: { bg: 'bg-destructive/20', border: 'border-destructive/50' },
};

interface AlertCardProps {
  alert: BillingAlert;
}

function AlertCard({ alert }: AlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const typeConf = alertConfig[alert.type];
  const sevConf = severityConfig[alert.severity];
  const Icon = typeConf.icon;

  return (
    <div className={cn('rounded-xl border', sevConf.bg, sevConf.border)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-start gap-3 text-left"
      >
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          alert.severity === 'critical' || alert.severity === 'high'
            ? 'bg-destructive/20'
            : alert.severity === 'medium'
            ? 'bg-warning/20'
            : 'bg-muted'
        )}>
          <Icon className={cn(
            'w-4 h-4',
            alert.severity === 'critical' || alert.severity === 'high'
              ? 'text-destructive'
              : alert.severity === 'medium'
              ? 'text-warning'
              : 'text-muted-foreground'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground">{alert.title}</span>
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase',
              alert.severity === 'critical' ? 'bg-destructive text-destructive-foreground' :
              alert.severity === 'high' ? 'bg-destructive/20 text-destructive' :
              alert.severity === 'medium' ? 'bg-warning/20 text-warning' :
              'bg-muted text-muted-foreground'
            )}>
              {alert.severity}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
        </div>
        {alert.recommendation && (
          isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                     : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && alert.recommendation && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0">
              <div className="p-2 bg-card/50 rounded-lg border border-border">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground">{alert.recommendation}</p>
                </div>
                {alert.affectedCodes && alert.affectedCodes.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-muted-foreground">Affected:</span>
                    {alert.affectedCodes.map(code => (
                      <span key={code} className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                        {code}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BillingAlerts({
  emLevel,
  mdmComplexity,
  cptCodes,
  icd10Codes,
  rvu,
  noteType,
  encounterType,
  isTelehealth,
  referringProvider,
  className,
}: BillingAlertsProps) {
  const alerts = useMemo(() =>
    analyzeForAlerts(emLevel, mdmComplexity, cptCodes, icd10Codes, rvu, noteType, encounterType, isTelehealth, referringProvider),
    [emLevel, mdmComplexity, cptCodes, icd10Codes, rvu, noteType, encounterType, isTelehealth, referringProvider]
  );

  const [isExpanded, setIsExpanded] = useState(true);

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const highCount = alerts.filter(a => a.severity === 'high').length;
  const hasIssues = criticalCount > 0 || highCount > 0;

  if (alerts.length === 0) {
    return (
      <div className={cn('p-3 rounded-xl bg-success/10 border border-success/20', className)}>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span className="text-sm font-medium text-success">No billing alerts</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          Codes appear appropriately documented
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border', hasIssues ? 'border-destructive/30' : 'border-warning/30', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full p-3 flex items-center justify-between rounded-t-xl',
          hasIssues ? 'bg-destructive/10' : 'bg-warning/10'
        )}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className={cn('w-4 h-4', hasIssues ? 'text-destructive' : 'text-warning')} />
          <span className={cn('font-medium text-sm', hasIssues ? 'text-destructive' : 'text-warning')}>
            {alerts.length} Billing Alert{alerts.length !== 1 ? 's' : ''}
          </span>
          {criticalCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground text-[10px] font-medium">
              {criticalCount} Critical
            </span>
          )}
          {highCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-destructive/20 text-destructive text-[10px] font-medium">
              {highCount} High
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-2">
              {alerts
                .sort((a, b) => {
                  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                  return severityOrder[a.severity] - severityOrder[b.severity];
                })
                .map(alert => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export for use in other components
export { analyzeForAlerts };
