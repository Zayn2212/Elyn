import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, FileText, DollarSign, User, Activity } from 'lucide-react';

const mockTranscript = [
  "Patient is a 68-year-old male...",
  "...presenting with chest pain for 2 days.",
  "Troponins negative, EKG shows sinus rhythm.",
  "Plan: Continue monitoring, serial troponins.",
];

const mockNote = {
  cc: "Chest pain x 2 days",
  hpi: "68 y/o M with HTN, DM presents with substernal chest pain...",
  assessment: "1. Chest pain - likely non-cardiac\n2. Hypertension - controlled",
  plan: "• Serial troponins q6h\n• Telemetry monitoring\n• Cardiology consult if enzymes rise",
};

const mockBilling = {
  cpt: "99223",
  icd10: ["R07.9", "I10", "E11.9"],
  mdm: "High",
  rvu: "3.86",
};

const AnimatedDemo = () => {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'generating' | 'complete'>('idle');
  const [transcriptIndex, setTranscriptIndex] = useState(0);
  const [showNote, setShowNote] = useState(false);
  const [showBilling, setShowBilling] = useState(false);

  // Auto-cycle through the demo
  useEffect(() => {
    const cycle = () => {
      // Reset
      setPhase('idle');
      setTranscriptIndex(0);
      setShowNote(false);
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
      setTimeout(() => setShowNote(true), 6000);

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
      {/* Simulated EMR Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[hsl(222,47%,12%)] border-b border-[hsl(222,40%,18%)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <div className="w-2 h-2 rounded-full bg-green-500" />
        </div>
        <span className="text-[10px] text-foreground/50 font-mono">EMR - Patient Chart</span>
        <div className="w-12" />
      </div>

      {/* Main Content Area */}
      <div className="flex h-[calc(100%-32px)]">
        {/* Left Panel - Patient Info */}
        <div className="w-1/4 border-r border-[hsl(222,40%,18%)] p-2 space-y-2">
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 text-primary" />
            <span className="text-[9px] font-medium text-foreground/80">John Smith</span>
          </div>
          <div className="space-y-1 text-[8px] text-foreground/50">
            <p>MRN: 12345678</p>
            <p>DOB: 03/15/1956</p>
            <p>Room: ICU-4B</p>
          </div>
          <div className="pt-1 border-t border-[hsl(222,40%,18%)]">
            <div className="flex items-center gap-1">
              <Activity className="h-2.5 w-2.5 text-yellow-500" />
              <span className="text-[8px] text-yellow-500">High Acuity</span>
            </div>
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
              {phase === 'recording' ? 'Listening...' : phase === 'generating' ? 'Generating...' : phase === 'complete' ? 'Complete' : 'Ready'}
            </span>
          </div>

          {/* Waveform Animation */}
          {phase === 'recording' && (
            <div className="flex items-center justify-center gap-0.5 h-4">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-0.5 bg-primary rounded-full"
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
            <p className="text-[8px] text-foreground/40 mb-1">Transcript</p>
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

          {/* Generated Note Preview */}
          <AnimatePresence>
            {showNote && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[hsl(222,47%,10%)] rounded-lg p-2 border border-green-500/30"
              >
                <div className="flex items-center gap-1 mb-1">
                  <FileText className="h-2.5 w-2.5 text-green-500" />
                  <span className="text-[8px] text-green-500">Note Generated</span>
                </div>
                <div className="space-y-1 text-[8px]">
                  <p><span className="text-foreground/40">CC:</span> <span className="text-foreground/70">{mockNote.cc}</span></p>
                  <p><span className="text-foreground/40">Assessment:</span> <span className="text-foreground/70">{mockNote.assessment.split('\n')[0]}</span></p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel - Billing */}
        <div className="w-1/4 border-l border-[hsl(222,40%,18%)] p-2">
          <div className="flex items-center gap-1 mb-2">
            <DollarSign className="h-3 w-3 text-primary" />
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
                  className="bg-primary/10 border border-primary/30 rounded px-1.5 py-1"
                >
                  <p className="text-[8px] text-foreground/40">CPT</p>
                  <p className="text-[11px] font-mono text-primary font-semibold">{mockBilling.cpt}</p>
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

                <motion.div
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex justify-between items-center pt-1 border-t border-[hsl(222,40%,18%)]"
                >
                  <div>
                    <p className="text-[8px] text-foreground/40">MDM</p>
                    <p className="text-[9px] text-foreground/70">{mockBilling.mdm}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-foreground/40">RVU</p>
                    <p className="text-[11px] font-mono text-green-500 font-semibold">{mockBilling.rvu}</p>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <div className="text-[8px] text-foreground/30 italic">
                Awaiting note...
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
              phase === p ? 'bg-primary' : 'bg-foreground/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default AnimatedDemo;
