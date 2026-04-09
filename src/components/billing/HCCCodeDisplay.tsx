import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getHCCCodesFromICD10,
  getRAFColor,
  getCategoryIcon,
  HCCCategory,
} from '@/lib/hccCodes';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertCircle,
  Info,
  DollarSign,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HCCCodeDisplayProps {
  icd10Codes: Array<{ code: string; description: string }>;
  compact?: boolean;
}

export default function HCCCodeDisplay({ icd10Codes, compact = false }: HCCCodeDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hccData = useMemo(() => {
    const codes = icd10Codes.map(c => c.code);
    return getHCCCodesFromICD10(codes);
  }, [icd10Codes]);

  if (hccData.hccCodes.length === 0) {
    if (compact) return null;
    return (
      <div className="p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="w-4 h-4" />
          <span>No HCC-eligible diagnoses detected</span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full text-xs font-medium cursor-help">
              <TrendingUp className="w-3 h-3" />
              {hccData.hccCodes.length} HCC
              <span className="font-bold">+{hccData.totalRAF.toFixed(3)} RAF</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium mb-1">HCC Codes Captured</p>
            <ul className="text-xs space-y-1">
              {hccData.hccCodes.slice(0, 3).map(({ hcc, category }) => (
                <li key={hcc}>
                  HCC {hcc}: {category.description}
                </li>
              ))}
              {hccData.hccCodes.length > 3 && (
                <li className="text-muted-foreground">
                  +{hccData.hccCodes.length - 3} more
                </li>
              )}
            </ul>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/20 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-purple-500/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              HCC Risk Adjustment
              <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-medium rounded-full">
                {hccData.hccCodes.length} codes
              </span>
            </h3>
            <p className="text-sm text-muted-foreground">
              Medicare Advantage risk adjustment factors
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
              +{hccData.totalRAF.toFixed(3)}
            </p>
            <p className="text-xs text-muted-foreground">Total RAF</p>
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-purple-500/20"
          >
            <div className="p-4 space-y-3">
              {/* HCC Code List */}
              {hccData.hccCodes.map(({ hcc, category, icd10Source }) => (
                <div
                  key={hcc}
                  className="p-3 bg-surface/50 rounded-lg flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-xl flex-shrink-0">
                      {getCategoryIcon(category.category)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-mono font-bold rounded">
                          HCC {hcc}
                        </span>
                        <span className="px-2 py-0.5 bg-muted text-xs text-muted-foreground rounded">
                          {category.category}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-1">
                        {category.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        From ICD-10: {icd10Source}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn("font-bold text-sm", getRAFColor(category.raf))}>
                      +{category.raf.toFixed(3)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">RAF</p>
                  </div>
                </div>
              ))}

              {/* RAF Summary */}
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-foreground">
                      Risk Adjustment Impact
                    </span>
                  </div>
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    +{hccData.totalRAF.toFixed(3)} RAF
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  HCC codes captured from documented diagnoses will be submitted
                  for Medicare Advantage risk adjustment.
                </p>
              </div>

              {/* Info Box */}
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg">
                <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Documentation tip: </span>
                  Ensure all chronic conditions are documented and coded with
                  specificity to maximize HCC capture. Annual wellness visits
                  are ideal for comprehensive condition review.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Summary badge for note cards
export function HCCSummaryBadge({ icd10Codes }: { icd10Codes: string[] }) {
  const hccData = useMemo(() => getHCCCodesFromICD10(icd10Codes), [icd10Codes]);

  if (hccData.hccCodes.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded text-[10px] font-medium">
      <TrendingUp className="w-2.5 h-2.5" />
      {hccData.hccCodes.length} HCC
    </span>
  );
}
