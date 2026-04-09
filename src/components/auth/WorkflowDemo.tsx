import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  FileText, 
  DollarSign, 
  ChevronDown, 
  ChevronUp,
  Check,
  X,
  Sparkles,
  ClipboardList,
  TrendingUp,
  Building2,
  Scan,
  ShieldCheck,
  FileOutput,
  Stethoscope
} from 'lucide-react';
import AnimatedDemo from './AnimatedDemo';
import RadiologyAnimatedDemo from './RadiologyAnimatedDemo';

const workflowSteps = [
  {
    icon: Stethoscope,
    title: 'See the Patient',
    description: 'Capture the encounter naturally — no extra clicks',
    color: 'hsl(199, 89%, 48%)',
  },
  {
    icon: FileText,
    title: 'Note Generated',
    description: 'Structured, specialty-aware clinical note',
    color: 'hsl(210, 100%, 55%)',
  },
  {
    icon: ClipboardList,
    title: 'Coded Automatically',
    description: 'CPT, ICD-10, E/M leveling with MDM logic',
    color: 'hsl(152, 69%, 45%)',
  },
  {
    icon: DollarSign,
    title: 'Claim Ready',
    description: 'Submission-ready billing output',
    color: 'hsl(210, 90%, 65%)',
  },
];

const comparisonData = [
  { feature: 'AI-structured notes', elyn: true, dictation: false, scribes: true },
  { feature: 'Automatic billing codes', elyn: true, dictation: false, scribes: false },
  { feature: 'E/M level calculation', elyn: true, dictation: false, scribes: false },
  { feature: 'Claim-ready billing output', elyn: true, dictation: false, scribes: false },
  { feature: 'RVU tracking', elyn: true, dictation: false, scribes: false },
  { feature: 'Practice management', elyn: true, dictation: false, scribes: false },
  { feature: 'Shift handoff generation', elyn: true, dictation: false, scribes: false },
];

const keyFeatures = [
  { icon: Mic, label: 'Ambient Capture', desc: 'Invisible AI documentation' },
  { icon: ShieldCheck, label: 'Revenue Integrity', desc: 'E/M leveling & denial prevention' },
  { icon: DollarSign, label: 'Billing Built-In', desc: 'CPT, ICD-10, MDM captured' },
  { icon: FileOutput, label: 'Claim-Ready Output', desc: '837P/CMS 1500 ready' },
  { icon: Scan, label: 'Radiology Reports', desc: 'CT, MRI, X-ray, US, Mammo' },
  { icon: TrendingUp, label: 'Handoff Ready', desc: 'Generate shift reports instantly' },
  { icon: Building2, label: 'Multi-Facility', desc: 'Manage multiple locations' },
];

const WorkflowDemo = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showRadiologyDemo, setShowRadiologyDemo] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % workflowSteps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isExpanded]);

  return (
    <motion.div
      className="w-full mt-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 py-3 text-foreground/60 hover:text-foreground/80 transition-colors group"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">See How It Works</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 group-hover:translate-y-[-2px] transition-transform" />
        ) : (
          <ChevronDown className="h-4 w-4 group-hover:translate-y-[2px] transition-transform" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="backdrop-blur-xl bg-[hsl(222,47%,10%)]/90 border border-[hsl(222,40%,20%)] rounded-2xl p-6 mt-2 space-y-6">
              {/* Tagline Header */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-primary mb-1">
                  Dictate. Document. Bill. Done.
                </h3>
                <p className="text-sm text-foreground/60">
                  ELYN captures the encounter, generates the note, codes the visit, and produces claim-ready billing.
                </p>
              </div>

              {/* Animated Demo */}
              <AnimatePresence mode="wait">
                {showRadiologyDemo ? (
                  <motion.div
                    key="radiology"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <RadiologyAnimatedDemo />
                  </motion.div>
                ) : (
                  <motion.div
                    key="clinical"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AnimatedDemo />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Animated Workflow */}
              <div className="relative">
                <div className="flex items-center justify-between px-2">
                  {workflowSteps.map((step, index) => (
                    <motion.div
                      key={step.title}
                      className="flex flex-col items-center relative z-10"
                      animate={{
                        scale: activeStep === index ? 1.1 : 1,
                        opacity: activeStep === index ? 1 : 0.5,
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-2"
                        style={{
                          backgroundColor: activeStep === index 
                            ? `${step.color}20` 
                            : 'hsl(222, 45%, 16%)',
                          borderWidth: '1px',
                          borderColor: activeStep === index 
                            ? step.color 
                            : 'hsl(222, 40%, 22%)',
                        }}
                        animate={{
                          boxShadow: activeStep === index 
                            ? `0 0 20px ${step.color}40` 
                            : 'none',
                        }}
                      >
                        <step.icon 
                          className="h-5 w-5" 
                          style={{ color: activeStep === index ? step.color : 'hsl(215, 20%, 55%)' }}
                        />
                      </motion.div>
                      <span className="text-[10px] text-center text-foreground/60 max-w-[70px] leading-tight">
                        {step.title}
                      </span>
                    </motion.div>
                  ))}
                </div>
                
                {/* Connecting line */}
                <div className="absolute top-6 left-8 right-8 h-[2px] bg-[hsl(222,40%,20%)] -z-0">
                  <motion.div
                    className="h-full bg-primary"
                    animate={{
                      width: `${(activeStep / (workflowSteps.length - 1)) * 100}%`,
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Active Step Description */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center py-2"
                >
                  <p className="text-sm text-foreground/80">
                    {workflowSteps[activeStep].description}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Comparison Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground/60 uppercase tracking-wider text-center">
                  ELYN vs Others
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-foreground/50">
                        <th className="text-left py-2 pr-2">Feature</th>
                        <th className="text-center py-2 px-2 text-primary font-semibold">ELYN</th>
                        <th className="text-center py-2 px-2">Dictation</th>
                        <th className="text-center py-2 px-2">AI Scribes</th>
                      </tr>
                    </thead>
                    <tbody className="text-foreground/70">
                      {comparisonData.map((row, i) => (
                        <motion.tr 
                          key={row.feature}
                          className="border-t border-[hsl(222,40%,18%)]"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <td className="py-1.5 pr-2">{row.feature}</td>
                          <td className="text-center py-1.5 px-2">
                            <Check className="h-3.5 w-3.5 mx-auto text-green-500" />
                          </td>
                          <td className="text-center py-1.5 px-2">
                            {row.dictation ? (
                              <Check className="h-3.5 w-3.5 mx-auto text-green-500" />
                            ) : (
                              <X className="h-3.5 w-3.5 mx-auto text-red-500/50" />
                            )}
                          </td>
                          <td className="text-center py-1.5 px-2">
                            {row.scribes ? (
                              <Check className="h-3.5 w-3.5 mx-auto text-green-500" />
                            ) : (
                              <X className="h-3.5 w-3.5 mx-auto text-red-500/50" />
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Key Features Grid */}
              <div className="grid grid-cols-2 gap-2">
                {keyFeatures.map((feature, i) => {
                  const isRadiologyCard = feature.label === 'Radiology Reports';
                  return (
                    <motion.div
                      key={feature.label}
                      className={`flex items-start gap-2 p-2 rounded-lg border transition-colors cursor-pointer ${
                        isRadiologyCard && showRadiologyDemo
                          ? 'bg-cyan-500/10 border-cyan-500/30'
                          : 'bg-[hsl(222,45%,14%)] border-[hsl(222,40%,18%)] hover:border-primary/30'
                      }`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onMouseEnter={() => isRadiologyCard && setShowRadiologyDemo(true)}
                      onMouseLeave={() => isRadiologyCard && setShowRadiologyDemo(false)}
                    >
                      <feature.icon className={`h-4 w-4 mt-0.5 shrink-0 ${
                        isRadiologyCard && showRadiologyDemo ? 'text-cyan-400' : 'text-primary'
                      }`} />
                      <div>
                        <p className={`text-xs font-medium ${
                          isRadiologyCard && showRadiologyDemo ? 'text-cyan-400' : 'text-foreground/90'
                        }`}>{feature.label}</p>
                        <p className="text-[10px] text-foreground/50">{feature.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WorkflowDemo;
