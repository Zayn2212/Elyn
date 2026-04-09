import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, AlertCircle, HelpCircle, AlertTriangle, XCircle, Info,
  Shield, ShieldAlert, ShieldCheck, ShieldX, ChevronDown, ChevronUp, 
  Lightbulb, Sparkles, X, ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Shared confidence level helper
const getConfidenceConfig = (confidence: number) => {
  if (confidence >= 90) return { level: 'high', color: 'success', Icon: CheckCircle2 };
  if (confidence >= 70) return { level: 'medium', color: 'warning', Icon: AlertCircle };
  return { level: 'low', color: 'destructive', Icon: HelpCircle };
};

// ==================== CodeConfidenceBadge ====================
interface CodeConfidenceBadgeProps {
  confidence: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export function CodeConfidenceBadge({ confidence, size = 'sm', showLabel, className }: CodeConfidenceBadgeProps) {
  const { color, Icon } = getConfidenceConfig(confidence);
  const isSmall = size === 'sm';
  
  return (
    <div className={cn(
      'inline-flex items-center rounded-full border font-medium',
      `bg-${color}/10 border-${color}/30 text-${color}`,
      isSmall ? 'px-1.5 py-0.5 gap-1 text-[10px]' : 'px-2 py-1 gap-1.5 text-xs',
      className
    )}>
      <Icon className={cn(isSmall ? 'w-3 h-3' : 'w-4 h-4')} />
      <span>{confidence}%</span>
      {showLabel && <span className="hidden sm:inline">{confidence >= 90 ? 'High' : confidence >= 70 ? 'Review' : 'Verify'}</span>}
    </div>
  );
}

// ==================== AIReasoningPopover ====================
interface AIReasoningPopoverProps {
  code: string;
  codeType: 'icd10' | 'cpt';
  reasoning?: string;
  confidence?: number;
  alternatives?: Array<{ code: string; description: string; confidence: number }>;
  onSelectAlternative?: (code: string, description: string) => void;
  children: React.ReactNode;
}

export function AIReasoningPopover({ code, codeType, reasoning, confidence, alternatives, onSelectAlternative, children }: AIReasoningPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">{children}</div>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="fixed inset-0 z-40" />
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute z-50 left-0 top-full mt-2 w-64 p-3 rounded-xl bg-card border border-border shadow-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">AI Reasoning</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
              </div>
              
              <div className="mb-3 p-2 rounded-lg bg-muted/50 flex items-center justify-between">
                <span className={cn('px-2 py-0.5 rounded text-xs font-mono', codeType === 'icd10' ? 'bg-primary/10 text-primary' : 'bg-secondary/50')}>{code}</span>
                {confidence && <span className={cn('text-xs', confidence >= 90 ? 'text-success' : confidence >= 70 ? 'text-warning' : 'text-destructive')}>{confidence}%</span>}
              </div>
              
              {reasoning && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-1"><Lightbulb className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Why?</span></div>
                  <p className="text-xs text-muted-foreground">{reasoning}</p>
                </div>
              )}
              
              {alternatives?.slice(0, 3).map((alt) => (
                <button
                  key={alt.code}
                  onClick={() => { onSelectAlternative?.(alt.code, alt.description); setIsOpen(false); }}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted mb-1 text-left"
                >
                  <span className="text-xs font-mono text-primary">{alt.code}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== ValidationWarnings ====================
interface ValidationResult {
  code: string;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

interface ValidationData {
  valid: boolean;
  icd10: ValidationResult[];
  cpt: ValidationResult[];
  bundlingWarnings: string[];
  consistencyWarnings: string[];
  modifierWarnings: string[];
}

interface ValidationWarningsProps {
  validation: ValidationData | null;
  isLoading?: boolean;
  className?: string;
}

export function ValidationWarnings({ validation, isLoading, className }: ValidationWarningsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) return <div className={cn('p-3 rounded-xl bg-muted/50 border', className)}><span className="text-sm text-muted-foreground">Validating...</span></div>;
  if (!validation) return null;

  const allResults = [...validation.icd10, ...validation.cpt];
  const errors = [...allResults.flatMap(r => r.errors.map(e => `${r.code}: ${e}`)), ...validation.modifierWarnings];
  const warnings = [...allResults.flatMap(r => r.warnings.map(w => `${r.code}: ${w}`)), ...validation.bundlingWarnings, ...validation.consistencyWarnings];
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const allValid = validation.valid && !hasWarnings;

  const StatusIcon = allValid ? CheckCircle2 : hasErrors ? XCircle : AlertTriangle;
  const color = allValid ? 'success' : hasErrors ? 'destructive' : 'warning';

  return (
    <div className={cn('rounded-xl border', `bg-${color}/10 border-${color}/20`, className)}>
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn('w-4 h-4', `text-${color}`)} />
          <span className={cn('text-sm font-medium', `text-${color}`)}>
            {allValid ? 'All codes valid' : hasErrors ? `${errors.length} error(s)` : `${warnings.length} warning(s)`}
          </span>
        </div>
        {(errors.length > 0 || warnings.length > 0) && (isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
      </button>
      {isExpanded && (
        <div className="px-3 pb-3 space-y-1">
          {errors.map((e, i) => <div key={i} className="flex gap-2 text-xs text-destructive"><XCircle className="w-3.5 h-3.5 mt-0.5" />{e}</div>)}
          {warnings.map((w, i) => <div key={i} className="flex gap-2 text-xs text-warning"><AlertTriangle className="w-3.5 h-3.5 mt-0.5" />{w}</div>)}
        </div>
      )}
    </div>
  );
}

// ==================== DenialRiskIndicator ====================
interface RiskFactor { factor: string; weight: number; message: string; recommendation?: string; }
interface DenialRiskData { riskScore: number; riskLevel: 'low' | 'medium' | 'high' | 'critical'; factors: RiskFactor[]; recommendations: string[]; }

interface DenialRiskIndicatorProps {
  data: DenialRiskData | null;
  isLoading?: boolean;
  className?: string;
}

export function DenialRiskIndicator({ data, isLoading, className }: DenialRiskIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) return <div className={cn('p-3 rounded-xl bg-muted/50 border', className)}><span className="text-sm text-muted-foreground">Assessing risk...</span></div>;
  if (!data) return null;

  const config: Record<string, { Icon: typeof Shield; label: string; color: string }> = {
    low: { Icon: ShieldCheck, label: 'Low Risk', color: 'success' },
    medium: { Icon: Shield, label: 'Moderate Risk', color: 'warning' },
    high: { Icon: ShieldAlert, label: 'High Risk', color: 'destructive' },
    critical: { Icon: ShieldX, label: 'Critical Risk', color: 'destructive' },
  };
  const { Icon, label, color } = config[data.riskLevel];

  return (
    <div className={cn('rounded-xl border', `bg-${color}/10 border-${color}/20`, className)}>
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', `bg-${color}/20`)}>
            <Icon className={cn('w-5 h-5', `text-${color}`)} />
          </div>
          <div className="text-left">
            <span className={cn('font-semibold', `text-${color}`)}>{label}</span>
            <span className={cn('ml-2 px-2 py-0.5 rounded-full text-xs font-bold', `bg-${color}/20 text-${color}`)}>{data.riskScore}%</span>
          </div>
        </div>
        {data.factors.length > 0 && (isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
      </button>
      {isExpanded && data.factors.length > 0 && (
        <div className="px-3 pb-3 space-y-2">
          {data.factors.map((f, i) => (
            <div key={i} className="p-2 rounded-lg bg-card/50 border">
              <div className="flex justify-between text-xs"><span>{f.message}</span><span className="text-muted-foreground">+{f.weight}</span></div>
              {f.recommendation && <p className="text-[11px] text-muted-foreground mt-1">{f.recommendation}</p>}
            </div>
          ))}
          {data.recommendations.length > 0 && (
            <div className="mt-2">
              <span className="text-xs font-medium flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5 text-primary" />Tips:</span>
              <ul className="mt-1 space-y-1">
                {data.recommendations.map((r, i) => <li key={i} className="text-xs text-muted-foreground">• {r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
