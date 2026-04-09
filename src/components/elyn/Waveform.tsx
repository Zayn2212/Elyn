import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WaveformProps {
  active: boolean;
  barCount?: number;
  className?: string;
}

/**
 * Audio waveform visualization component.
 * Animates bars when active (recording).
 */
const Waveform = ({ active, barCount = 20, className }: WaveformProps) => (
  <div className={cn("flex items-center justify-center gap-0.5 h-12", className)}>
    {[...Array(barCount)].map((_, i) => (
      <motion.div
        key={i}
        animate={
          active
            ? { height: [4, Math.random() * 32 + 8, 4] }
            : { height: 4 }
        }
        transition={{
          duration: 0.5,
          repeat: active ? Infinity : 0,
          delay: i * 0.02,
        }}
        className={cn(
          "w-0.5 rounded-full",
          active ? "bg-cyan-400" : "bg-muted"
        )}
      />
    ))}
  </div>
);

export default Waveform;
