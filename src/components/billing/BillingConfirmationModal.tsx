import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, Plus, DollarSign, AlertCircle, ChevronDown, ChevronUp, Brain, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CodeConfidenceBadge, AIReasoningPopover, ValidationWarnings, DenialRiskIndicator } from './BillingInsights';
import MDMCalculator, { MDMResult } from './MDMCalculator';
import HCCCodeDisplay from './HCCCodeDisplay';
import BillingAlerts from './BillingAlerts';
import { runAIDenialAnalysis, type AIBillingAnalysis, type AIBillingRequest } from '@/lib/denialPrevention';
import { supabase } from '@/integrations/supabase/client';

// Expandable code row component
interface ExpandableCodeRowProps {
  code: string;
  description: string;
  codeType: 'icd10' | 'cpt';
  confidence?: number;
  onRemove: () => void;
}

function ExpandableCodeRow({ code, description, codeType, confidence, onRemove }: ExpandableCodeRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongText = description.length > 40;

  return (
    <div className="p-2 bg-surface rounded-lg group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <span className={cn(
            "px-2 py-0.5 text-xs font-mono rounded flex-shrink-0 mt-0.5",
            codeType === 'icd10'
              ? "bg-primary/10 text-primary"
              : "bg-accent/10 text-accent"
          )}>
            {code}
          </span>
          {confidence && <CodeConfidenceBadge confidence={confidence} />}
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                "text-sm text-muted-foreground block",
                !isExpanded && isLongText && "line-clamp-1"
              )}
            >
              {description}
            </span>
            {isLongText && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-primary hover:underline mt-1 flex items-center gap-0.5"
              >
                {isExpanded ? (
                  <>Show less <ChevronUp className="w-3 h-3" /></>
                ) : (
                  <>Show more <ChevronDown className="w-3 h-3" /></>
                )}
              </button>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface BillingCode {
  code: string;
  description: string;
  confidence?: number;
  reasoning?: string;
  alternatives?: Array<{ code: string; description: string; confidence: number }>;
}

export interface ExtractedBilling {
  icd10: BillingCode[];
  cpt: BillingCode[];
  emLevel: string;
  rvu: number;
  mdmComplexity: string;
  validation?: {
    valid: boolean;
    icd10: Array<{ code: string; errors: string[]; warnings: string[]; suggestions: string[] }>;
    cpt: Array<{ code: string; errors: string[]; warnings: string[]; suggestions: string[] }>;
    bundlingWarnings: string[];
    consistencyWarnings: string[];
    modifierWarnings: string[];
  };
  denialRisk?: {
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    factors: Array<{ factor: string; weight: number; message: string; recommendation?: string }>;
    recommendations: string[];
  };
}

interface BillingConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  billing: ExtractedBilling;
  patientName?: string;
  noteType: string;
  onConfirm: (billing: ExtractedBilling) => void;
  onDiscard: () => void;
}

export default function BillingConfirmationModal({
  isOpen,
  onClose,
  billing,
  patientName,
  noteType,
  onConfirm,
  onDiscard,
}: BillingConfirmationModalProps) {
  const [editedBilling, setEditedBilling] = useState<ExtractedBilling>(billing);
  const [newIcd10, setNewIcd10] = useState('');
  const [newCpt, setNewCpt] = useState('');
  const [mdmExpanded, setMdmExpanded] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIBillingAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Run AI analysis when modal opens
  const runAIAnalysis = async () => {
    setAiLoading(true);
    try {
      const request: AIBillingRequest = {
        cptCodes: editedBilling.cpt,
        icd10Codes: editedBilling.icd10,
        emLevel: editedBilling.emLevel,
        mdmComplexity: editedBilling.mdmComplexity,
        encounterType: noteType,
      };
      const result = await runAIDenialAnalysis(request, supabase);
      setAiAnalysis(result);
    } catch (err) {
      console.warn('AI analysis failed:', err);
    } finally {
      setAiLoading(false);
    }
  };

  // Sync edited billing when billing prop changes
  useEffect(() => {
    setEditedBilling(billing);
    setAiAnalysis(null);
  }, [billing]);

  // Auto-run AI analysis when modal opens
  useEffect(() => {
    if (isOpen && editedBilling.cpt.length > 0) {
      runAIAnalysis();
    }
  }, [isOpen]);

  const handleMDMCalculate = (result: MDMResult) => {
    setEditedBilling(prev => ({
      ...prev,
      emLevel: result.emLevel,
      mdmComplexity: result.mdmComplexity,
      rvu: result.rvu,
    }));
  };

  // Map MDM complexity string to level for initial state
  const getMDMLevel = (complexity: string): 'minimal' | 'low' | 'moderate' | 'high' => {
    const lower = complexity.toLowerCase();
    if (lower.includes('high')) return 'high';
    if (lower.includes('moderate')) return 'moderate';
    if (lower.includes('low') || lower.includes('straight')) return 'low';
    return 'minimal';
  };

  const handleRemoveIcd10 = (index: number) => {
    setEditedBilling(prev => ({
      ...prev,
      icd10: prev.icd10.filter((_, i) => i !== index)
    }));
  };

  const handleRemoveCpt = (index: number) => {
    setEditedBilling(prev => ({
      ...prev,
      cpt: prev.cpt.filter((_, i) => i !== index)
    }));
  };

  const handleAddIcd10 = () => {
    if (newIcd10.trim()) {
      setEditedBilling(prev => ({
        ...prev,
        icd10: [...prev.icd10, { code: newIcd10.trim().toUpperCase(), description: 'Custom code' }]
      }));
      setNewIcd10('');
    }
  };

  const handleAddCpt = () => {
    if (newCpt.trim()) {
      setEditedBilling(prev => ({
        ...prev,
        cpt: [...prev.cpt, { code: newCpt.trim(), description: 'Custom code' }]
      }));
      setNewCpt('');
    }
  };

  const handleConfirm = () => {
    onConfirm(editedBilling);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Container */}
          <div className="fixed inset-0 z-50 md:flex md:items-center md:justify-center md:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/50"
            />

            {/* Modal - Bottom sheet on mobile, centered on desktop */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed md:relative bottom-20 left-4 right-4 md:bottom-auto md:left-auto md:right-auto z-50 glass-card rounded-2xl max-h-[calc(100dvh-7rem)] md:max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col overflow-x-hidden md:max-w-lg md:w-full"
            >
              {/* Handle - mobile only */}
              <div className="flex justify-center pt-3 pb-2 md:hidden">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Confirm Billing Codes
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {patientName ? `${patientName} • ` : ''}{noteType} Note
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                {/* MDM Calculator - Interactive */}
                <MDMCalculator
                  initialProblems={getMDMLevel(billing.mdmComplexity)}
                  initialData={getMDMLevel(billing.mdmComplexity)}
                  initialRisk={getMDMLevel(billing.mdmComplexity)}
                  onCalculate={handleMDMCalculate}
                  isExpanded={mdmExpanded}
                  onToggleExpand={() => setMdmExpanded(!mdmExpanded)}
                />

                {/* RVU */}
                <div className="bg-success/10 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-success" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Estimated RVU</span>
                  </div>
                  <span className="text-xl font-bold text-success">{editedBilling.rvu.toFixed(2)}</span>
                </div>

                {/* Billing Alerts - Upcode/Audit Risk/Optimal */}
                <BillingAlerts
                  emLevel={editedBilling.emLevel}
                  mdmComplexity={editedBilling.mdmComplexity}
                  cptCodes={editedBilling.cpt}
                  icd10Codes={editedBilling.icd10}
                  rvu={editedBilling.rvu}
                  noteType={noteType}
                />

                {/* Validation & Denial Risk */}
                <ValidationWarnings validation={editedBilling.validation || null} />
                <DenialRiskIndicator data={editedBilling.denialRisk || null} />

                {/* AI-Powered Billing Intelligence */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Brain className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-foreground">AI Denial Prevention</span>
                        <p className="text-[11px] text-muted-foreground">Powered by clinical billing intelligence</p>
                      </div>
                    </div>
                    <Button
                      onClick={runAIAnalysis}
                      size="sm"
                      variant="ghost"
                      disabled={aiLoading}
                      className="h-7 px-2"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", aiLoading && "animate-spin")} />
                    </Button>
                  </div>

                  {aiLoading && (
                    <div className="px-3 pb-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                        Analyzing codes for denial risk...
                      </div>
                    </div>
                  )}

                  {aiAnalysis && !aiLoading && (
                    <div className="px-3 pb-3 space-y-2">
                      {/* AI Reasoning Summary */}
                      <div className="p-2.5 rounded-lg bg-card/80 border border-border">
                        <p className="text-xs text-foreground leading-relaxed">{aiAnalysis.reasoning}</p>
                      </div>

                      {/* AI Risk Factors */}
                      {aiAnalysis.factors.length > 0 && (
                        <div className="space-y-1.5">
                          {aiAnalysis.factors.map((factor, i) => (
                            <div key={i} className={cn(
                              "p-2 rounded-lg border text-xs",
                              factor.severity === 'block' ? 'bg-destructive/10 border-destructive/20' :
                              factor.severity === 'warning' ? 'bg-warning/10 border-warning/20' :
                              'bg-muted/50 border-border'
                            )}>
                              <div className="font-medium text-foreground">{factor.title}</div>
                              <p className="text-muted-foreground mt-0.5">{factor.message}</p>
                              {factor.recommendation && (
                                <p className="text-primary mt-1 font-medium">→ {factor.recommendation}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Code Alternatives */}
                      {aiAnalysis.codeAlternatives.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium text-foreground flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-primary" /> Suggested Improvements
                          </span>
                          {aiAnalysis.codeAlternatives.map((alt, i) => (
                            <div key={i} className="p-2 rounded-lg bg-success/5 border border-success/20 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-muted-foreground line-through">{alt.currentCode}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-mono text-primary font-medium">{alt.suggestedCode}</span>
                              </div>
                              <p className="text-muted-foreground mt-0.5">{alt.reason}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Payer Notes */}
                      {aiAnalysis.payerNotes && (
                        <div className="p-2 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Payer Note:</span> {aiAnalysis.payerNotes}
                        </div>
                      )}
                    </div>
                  )}

                  {!aiAnalysis && !aiLoading && (
                    <div className="px-3 pb-3">
                      <p className="text-xs text-muted-foreground">AI analysis will run automatically when codes are ready.</p>
                    </div>
                  )}
                </div>

                {/* ICD-10 Codes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">ICD-10 Codes</h3>
                    <span className="text-xs text-muted-foreground">{editedBilling.icd10.length} codes</span>
                  </div>
                  <div className="space-y-2">
                    {editedBilling.icd10.map((code, index) => (
                      <ExpandableCodeRow
                        key={`${code.code}-${index}`}
                        code={code.code}
                        description={code.description}
                        codeType="icd10"
                        confidence={code.confidence}
                        onRemove={() => handleRemoveIcd10(index)}
                      />
                    ))}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newIcd10}
                        onChange={(e) => setNewIcd10(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddIcd10()}
                        placeholder="Add ICD-10 code..."
                        className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <Button
                        onClick={handleAddIcd10}
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        disabled={!newIcd10.trim()}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* HCC Risk Adjustment */}
                <HCCCodeDisplay icd10Codes={editedBilling.icd10} />

                {/* CPT Codes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">CPT Codes</h3>
                    <span className="text-xs text-muted-foreground">{editedBilling.cpt.length} codes</span>
                  </div>
                  <div className="space-y-2">
                    {editedBilling.cpt.map((code, index) => (
                      <ExpandableCodeRow
                        key={`${code.code}-${index}`}
                        code={code.code}
                        description={code.description}
                        codeType="cpt"
                        confidence={code.confidence}
                        onRemove={() => handleRemoveCpt(index)}
                      />
                    ))}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newCpt}
                        onChange={(e) => setNewCpt(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddCpt()}
                        placeholder="Add CPT code..."
                        className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <Button
                        onClick={handleAddCpt}
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        disabled={!newCpt.trim()}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Please review all codes before confirming. Codes are AI-generated and should be verified for accuracy.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-border flex gap-3">
                <Button
                  onClick={onDiscard}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  Discard
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="flex-1 rounded-xl bg-primary hover:bg-primary/90"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Confirm & Save
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
