import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, ChevronDown, ChevronUp, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// 2024 CMS MDM Guidelines
type MDMLevel = 'minimal' | 'low' | 'moderate' | 'high';

interface MDMElement {
  level: MDMLevel;
  description: string;
}

interface MDMCalculatorProps {
  initialProblems?: MDMLevel;
  initialData?: MDMLevel;
  initialRisk?: MDMLevel;
  onCalculate: (result: MDMResult) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export interface MDMResult {
  emLevel: string;
  mdmComplexity: string;
  rvu: number;
  problems: MDMLevel;
  data: MDMLevel;
  risk: MDMLevel;
}

// E/M level mapping based on 2024 CMS guidelines
const EM_LEVELS: Record<string, { code: string; complexity: string; rvu: number }> = {
  minimal: { code: '99211', complexity: 'Minimal', rvu: 0.18 },
  low: { code: '99212', complexity: 'Straightforward', rvu: 0.70 },
  moderate_low: { code: '99213', complexity: 'Low', rvu: 1.30 },
  moderate: { code: '99214', complexity: 'Moderate', rvu: 1.92 },
  high: { code: '99215', complexity: 'High', rvu: 2.80 },
};

// Problem complexity options per 2024 CMS
const PROBLEM_OPTIONS: Array<{ level: MDMLevel; label: string; examples: string[] }> = [
  {
    level: 'minimal',
    label: 'Minimal',
    examples: ['1 self-limited problem (e.g., cold, insect bite)']
  },
  {
    level: 'low',
    label: 'Low',
    examples: [
      '2+ self-limited problems',
      '1 stable chronic illness',
      '1 acute uncomplicated illness/injury'
    ]
  },
  {
    level: 'moderate',
    label: 'Moderate',
    examples: [
      '1+ chronic illness with mild exacerbation',
      '2+ stable chronic illnesses',
      '1 undiagnosed new problem with uncertain prognosis',
      '1 acute illness with systemic symptoms'
    ]
  },
  {
    level: 'high',
    label: 'High',
    examples: [
      '1+ chronic illness with severe exacerbation',
      '1 acute/chronic illness posing threat to life or bodily function'
    ]
  },
];

// Data complexity options per 2024 CMS
const DATA_OPTIONS: Array<{ level: MDMLevel; label: string; examples: string[] }> = [
  {
    level: 'minimal',
    label: 'Minimal or None',
    examples: ['No data reviewed or ordered']
  },
  {
    level: 'low',
    label: 'Limited',
    examples: [
      'Review of prior external notes/records',
      'Order unique tests',
      'Assessment requiring independent historian'
    ]
  },
  {
    level: 'moderate',
    label: 'Moderate',
    examples: [
      'Independent interpretation of test',
      'Discussion with external physician',
      'Obtain history from 3+ sources',
      'Order 3+ unique tests'
    ]
  },
  {
    level: 'high',
    label: 'Extensive',
    examples: [
      'Independent interpretation + discussion',
      'Review extensive external data',
      'Multi-specialty consultation coordination'
    ]
  },
];

// Risk options per 2024 CMS
const RISK_OPTIONS: Array<{ level: MDMLevel; label: string; examples: string[] }> = [
  {
    level: 'minimal',
    label: 'Minimal',
    examples: ['Minimal risk of morbidity from treatment']
  },
  {
    level: 'low',
    label: 'Low',
    examples: [
      'OTC drugs',
      'Minor surgery (no risk factors)',
      'Physical/occupational therapy'
    ]
  },
  {
    level: 'moderate',
    label: 'Moderate',
    examples: [
      'Prescription drug management',
      'Minor surgery with risk factors',
      'Elective major surgery (no risk factors)',
      'IV fluids with additives'
    ]
  },
  {
    level: 'high',
    label: 'High',
    examples: [
      'Drug therapy requiring intensive monitoring',
      'Decision for emergency major surgery',
      'Decision for hospitalization',
      'DNR decision or escalation of care'
    ]
  },
];

const LEVEL_ORDER: MDMLevel[] = ['minimal', 'low', 'moderate', 'high'];

function getLevelIndex(level: MDMLevel): number {
  return LEVEL_ORDER.indexOf(level);
}

function calculateEMLevel(problems: MDMLevel, data: MDMLevel, risk: MDMLevel): { code: string; complexity: string; rvu: number } {
  const levels = [problems, data, risk].map(getLevelIndex);
  levels.sort((a, b) => b - a);

  // E/M is determined by 2 of 3 elements (take the second highest)
  const effectiveLevel = levels[1];

  switch (effectiveLevel) {
    case 0: return EM_LEVELS.minimal;
    case 1: return EM_LEVELS.low;
    case 2: return EM_LEVELS.moderate;
    case 3: return EM_LEVELS.high;
    default: return EM_LEVELS.moderate_low;
  }
}

export default function MDMCalculator({
  initialProblems = 'moderate',
  initialData = 'moderate',
  initialRisk = 'moderate',
  onCalculate,
  isExpanded = false,
  onToggleExpand,
}: MDMCalculatorProps) {
  const [problems, setProblems] = useState<MDMLevel>(initialProblems);
  const [data, setData] = useState<MDMLevel>(initialData);
  const [risk, setRisk] = useState<MDMLevel>(initialRisk);
  const [showInfo, setShowInfo] = useState<string | null>(null);

  const result = calculateEMLevel(problems, data, risk);

  useEffect(() => {
    onCalculate({
      emLevel: result.code,
      mdmComplexity: result.complexity,
      rvu: result.rvu,
      problems,
      data,
      risk,
    });
  }, [problems, data, risk]);

  const renderSelector = (
    label: string,
    options: Array<{ level: MDMLevel; label: string; examples: string[] }>,
    value: MDMLevel,
    onChange: (level: MDMLevel) => void,
    infoKey: string
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <button
          onClick={() => setShowInfo(showInfo === infoKey ? null : infoKey)}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <Info className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {options.map((option) => (
          <button
            key={option.level}
            onClick={() => onChange(option.level)}
            className={cn(
              'px-2 py-1.5 rounded-lg text-xs font-medium transition-all',
              value === option.level
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface hover:bg-surface-hover text-muted-foreground'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showInfo === infoKey && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-muted/50 rounded-lg p-2 mt-1">
              {options.find(o => o.level === value)?.examples.map((ex, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                  <span>{ex}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="bg-surface rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between p-3 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calculator className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-foreground">MDM Calculator</div>
            <div className="text-xs text-muted-foreground">2024 CMS Guidelines</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-lg font-bold text-primary">{result.code}</div>
            <div className="text-xs text-muted-foreground">{result.complexity}</div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 space-y-4 border-t border-border">
              {/* Problems */}
              {renderSelector(
                '1. Number/Complexity of Problems',
                PROBLEM_OPTIONS,
                problems,
                setProblems,
                'problems'
              )}

              {/* Data */}
              {renderSelector(
                '2. Data Reviewed/Ordered',
                DATA_OPTIONS,
                data,
                setData,
                'data'
              )}

              {/* Risk */}
              {renderSelector(
                '3. Risk of Complications',
                RISK_OPTIONS,
                risk,
                setRisk,
                'risk'
              )}

              {/* Result Summary */}
              <div className="bg-primary/5 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Calculated E/M Level</div>
                  <div className="text-lg font-bold text-foreground">{result.code}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">RVU</div>
                  <div className="text-lg font-bold text-success">{result.rvu.toFixed(2)}</div>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                E/M level is determined by 2 of 3 MDM elements meeting or exceeding the level
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
