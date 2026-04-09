import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, FileText, DollarSign, Scan, Activity } from 'lucide-react';

const mockTranscript = [
  "CT abdomen pelvis with contrast...",
  "...liver demonstrates 2.3cm hypodense lesion segment 6.",
  "Washout on delayed phase consistent with HCC.",
  "LI-RADS 5. Recommend multidisciplinary review.",
];

const mockReport = {
  technique: "CT with IV contrast, portal venous and delayed phases",
  findings: "2.3cm arterially enhancing lesion segment 6 with washout...",
  impression: "1. LI-RADS 5 lesion segment 6, HCC\n2. No metastatic disease",
};

const mockBilling = {
  cpt: "74177",
  icd10: ["C22.0", "K74.60"],
  modality: "CT",
  rvu: "2.82",
};

const RadiologyAnimatedDemo = () => {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'generating' | 'complete'>('idle');
  const [transcriptIndex, setTranscriptIndex] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [showBilling, setShowBilling] = useState(false);

  // Auto-cycle through the demo
  useEffect(() => {
    const cycle = () => {
      // Reset
      setPhase('idle');
      setTranscriptIndex(0);
      setShowReport(false);
      setShowBilling(false);

      // Start recording after 1s
      setTimeout(() => setPhase('recording'), 1000);

      // Show transcript lines progressively
      setTimeout(() => setTranscriptIndex(1), 2000);
      setTimeout(() => setTranscriptIndex(2), 3000);
      setTimeout(() => setTranscriptIndex(3), 4000);
      setTimeout(() => setTranscriptIndex(4), 5000);

      // Generating phase
      setTimeout(() => setPhase('generating'), 5500);
      setTimeout(() => setShowReport(true), 6000);

      // Complete with billing
      setTimeout(() => {
        setPhase('complete');
        setShowBilling(true);
      }, 7000);
    };

    cycle();
    const interval = setInterval(cycle, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-[hsl(222,40%,22%)] bg-[hsl(222,47%,8%)]">
      {/* Simulated PACS Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[hsl(222,47%,12%)] border-b border-[hsl(222,40%,18%)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <div className="w-2 h-2 rounded-full bg-green-500" />
        </div>
        <span className="text-[10px] text-foreground/50 font-mono">PACS - Radiology Workstation</span>
        <div className="w-12" />
      </div>

      {/* Main Content Area */}
      <div className="flex h-[calc(100%-32px)]">
        {/* Left Panel - Study Info */}
        <div className="w-1/4 border-r border-[hsl(222,40%,18%)] p-2 space-y-2">
          <div className="flex items-center gap-1.5">
            <Scan className="h-3 w-3 text-cyan-400" />
            <span className="text-[9px] font-medium text-foreground/80">CT Abdomen</span>
          </div>
          <div className="space-y-1 text-[8px] text-foreground/50">
            <p>Acc: RAD-2024-1234</p>
            <p>DOS: 12/20/2024</p>
            <p>Ref: Dr. Johnson</p>
          </div>
          <div className="pt-1 border-t border-[hsl(222,40%,18%)]">
            <div className="flex items-center gap-1">
              <Activity className="h-2.5 w-2.5 text-cyan-400" />
              <span className="text-[8px] text-cyan-400">With Contrast</span>
            </div>
          </div>
          {/* Mini CT preview squares */}
          <div className="grid grid-cols-2 gap-1 pt-1">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="aspect-square bg-[hsl(222,47%,6%)] rounded border border-[hsl(222,40%,18%)] flex items-center justify-center"
              >
                <div className="w-3/4 h-3/4 bg-gradient-to-br from-foreground/10 to-foreground/5 rounded-sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel - ELYN Interface */}
        <div className="flex-1 p-2 space-y-2">
          {/* Recording Indicator */}
          <div className="flex items-center justify-center gap-2 py-1">
            <motion.div
              animate={{
                scale: phase === 'recording' ? [1, 1.2, 1] : 1,
                opacity: phase === 'recording' ? 1 : 0.3,
              }}
              transition={{ duration: 0.5, repeat: phase === 'recording' ? Infinity : 0 }}
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                phase === 'recording' 
                  ? 'bg-red-500/20 border border-red-500' 
                  : 'bg-[hsl(222,45%,16%)] border border-[hsl(222,40%,22%)]'
              }`}
            >
              <Mic className={`h-3 w-3 ${phase === 'recording' ? 'text-red-500' : 'text-foreground/40'}`} />
            </motion.div>
            <span className="text-[9px] text-foreground/60">
              {phase === 'recording' ? 'Dictating...' : phase === 'generating' ? 'Generating Report...' : phase === 'complete' ? 'Complete' : 'Ready'}
            </span>
          </div>

          {/* Waveform Animation */}
          {phase === 'recording' && (
            <div className="flex items-center justify-center gap-0.5 h-4">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-0.5 bg-cyan-400 rounded-full"
                  animate={{
                    height: [4, 12 + Math.random() * 8, 4],
                  }}
                  transition={{
                    duration: 0.4 + Math.random() * 0.3,
                    repeat: Infinity,
                    delay: i * 0.05,
                  }}
                />
              ))}
            </div>
          )}

          {/* Transcript Area */}
          <div className="bg-[hsl(222,47%,10%)] rounded-lg p-2 min-h-[40px] border border-[hsl(222,40%,18%)]">
            <p className="text-[8px] text-foreground/40 mb-1">Dictation</p>
            <div className="space-y-0.5">
              {mockTranscript.slice(0, transcriptIndex).map((line, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[9px] text-foreground/70"
                >
                  {line}
                </motion.p>
              ))}
            </div>
          </div>

          {/* Generated Report Preview */}
          <AnimatePresence>
            {showReport && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[hsl(222,47%,10%)] rounded-lg p-2 border border-cyan-500/30"
              >
                <div className="flex items-center gap-1 mb-1">
                  <FileText className="h-2.5 w-2.5 text-cyan-400" />
                  <span className="text-[8px] text-cyan-400">Report Generated</span>
                </div>
                <div className="space-y-1 text-[8px]">
                  <p><span className="text-foreground/40">Technique:</span> <span className="text-foreground/70">{mockReport.technique}</span></p>
                  <p><span className="text-foreground/40">Impression:</span> <span className="text-foreground/70">{mockReport.impression.split('\n')[0]}</span></p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel - Billing */}
        <div className="w-1/4 border-l border-[hsl(222,40%,18%)] p-2">
          <div className="flex items-center gap-1 mb-2">
            <DollarSign className="h-3 w-3 text-cyan-400" />
            <span className="text-[9px] font-medium text-foreground/80">Billing</span>
          </div>

          <AnimatePresence>
            {showBilling ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <motion.div
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-cyan-500/10 border border-cyan-500/30 rounded px-1.5 py-1"
                >
                  <p className="text-[8px] text-foreground/40">CPT</p>
                  <p className="text-[11px] font-mono text-cyan-400 font-semibold">{mockBilling.cpt}</p>
                </motion.div>

                <motion.div
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-0.5"
                >
                  <p className="text-[8px] text-foreground/40">ICD-10</p>
                  {mockBilling.icd10.map((code, i) => (
                    <motion.span
                      key={code}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="inline-block text-[9px] font-mono bg-[hsl(222,45%,16%)] px-1 py-0.5 rounded mr-0.5 text-foreground/70"
                    >
                      {code}
                    </motion.span>
                  ))}
                </motion.div>

                {/* LI-RADS Badge */}
                <motion.div
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-red-500/10 border border-red-500/30 rounded px-1.5 py-1"
                >
                  <p className="text-[8px] text-foreground/40">Category</p>
                  <p className="text-[10px] font-semibold text-red-400">LI-RADS 5</p>
                </motion.div>

                <motion.div
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex justify-between items-center pt-1 border-t border-[hsl(222,40%,18%)]"
                >
                  <div>
                    <p className="text-[8px] text-foreground/40">Modality</p>
                    <p className="text-[9px] text-foreground/70">{mockBilling.modality}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-foreground/40">RVU</p>
                    <p className="text-[11px] font-mono text-green-500 font-semibold">{mockBilling.rvu}</p>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <div className="text-[8px] text-foreground/30 italic">
                Awaiting report...
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Phase indicator dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {['idle', 'recording', 'generating', 'complete'].map((p) => (
          <div
            key={p}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              phase === p ? 'bg-cyan-400' : 'bg-foreground/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default RadiologyAnimatedDemo;
