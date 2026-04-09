import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { applyInstantCorrections } from '@/data/medicalDictionary';

interface CorrectionState {
  rawText: string;
  correctedText: string;
  isCorrectingAI: boolean;
  recentCorrections: Array<{ original: string; corrected: string; timestamp: number }>;
}

interface UseMedicalTermCorrectionOptions {
  debounceMs?: number;
  enableAICorrection?: boolean;
}

export function useMedicalTermCorrection(options: UseMedicalTermCorrectionOptions = {}) {
  const { debounceMs = 2000, enableAICorrection = true } = options;
  
  const [state, setState] = useState<CorrectionState>({
    rawText: '',
    correctedText: '',
    isCorrectingAI: false,
    recentCorrections: [],
  });
  
  const aiCorrectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAICorrectedTextRef = useRef<string>('');
  const pendingTextRef = useRef<string>('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (aiCorrectionTimeoutRef.current) {
        clearTimeout(aiCorrectionTimeoutRef.current);
      }
    };
  }, []);

  // AI correction function
  const correctWithAI = useCallback(async (text: string): Promise<string> => {
    if (!text.trim() || text === lastAICorrectedTextRef.current) {
      return text;
    }

    try {
      console.log('[MedicalCorrection] Sending to AI for correction:', text.slice(0, 100) + '...');
      
      const { data, error } = await supabase.functions.invoke('correct-medical-terms', {
        body: { transcript: text, streaming: true }
      });

      if (error) {
        console.error('[MedicalCorrection] AI correction error:', error);
        return text;
      }

      const correctedText = data?.correctedTranscript || text;
      lastAICorrectedTextRef.current = correctedText;
      
      console.log('[MedicalCorrection] AI correction complete');
      return correctedText;
    } catch (err) {
      console.error('[MedicalCorrection] AI correction failed:', err);
      return text;
    }
  }, []);

  // Process new text with instant corrections and debounced AI
  const processText = useCallback((newRawText: string) => {
    // Apply instant client-side corrections
    const { correctedText: instantCorrected, corrections } = applyInstantCorrections(newRawText);
    
    // Track recent corrections for UI feedback
    const timestamp = Date.now();
    const newCorrections = corrections.map(c => ({ ...c, timestamp }));
    
    setState(prev => ({
      ...prev,
      rawText: newRawText,
      correctedText: instantCorrected,
      recentCorrections: [
        ...newCorrections,
        ...prev.recentCorrections.filter(c => timestamp - c.timestamp < 5000) // Keep last 5 seconds
      ].slice(0, 10), // Max 10 recent corrections
    }));

    // Store for AI correction
    pendingTextRef.current = instantCorrected;

    // Debounce AI correction
    if (enableAICorrection) {
      if (aiCorrectionTimeoutRef.current) {
        clearTimeout(aiCorrectionTimeoutRef.current);
      }

      aiCorrectionTimeoutRef.current = setTimeout(async () => {
        const textToCorrect = pendingTextRef.current;
        
        // Only call AI if text has changed significantly
        if (textToCorrect.length > 20 && textToCorrect !== lastAICorrectedTextRef.current) {
          setState(prev => ({ ...prev, isCorrectingAI: true }));
          
          const aiCorrected = await correctWithAI(textToCorrect);
          
          setState(prev => ({
            ...prev,
            correctedText: aiCorrected,
            isCorrectingAI: false,
          }));
        }
      }, debounceMs);
    }
  }, [enableAICorrection, debounceMs, correctWithAI]);

  // Append new text (for streaming transcription)
  const appendText = useCallback((newText: string) => {
    setState(prev => {
      const combinedRaw = prev.rawText + (prev.rawText ? ' ' : '') + newText;
      return prev;
    });
    
    // Get current raw text and append
    setState(prev => {
      const combinedRaw = prev.rawText + (prev.rawText ? ' ' : '') + newText;
      processText(combinedRaw);
      return prev;
    });
  }, [processText]);

  // Reset state
  const reset = useCallback(() => {
    if (aiCorrectionTimeoutRef.current) {
      clearTimeout(aiCorrectionTimeoutRef.current);
    }
    lastAICorrectedTextRef.current = '';
    pendingTextRef.current = '';
    
    setState({
      rawText: '',
      correctedText: '',
      isCorrectingAI: false,
      recentCorrections: [],
    });
  }, []);

  // Force AI correction now
  const forceAICorrection = useCallback(async () => {
    if (aiCorrectionTimeoutRef.current) {
      clearTimeout(aiCorrectionTimeoutRef.current);
    }
    
    const textToCorrect = state.correctedText || state.rawText;
    if (!textToCorrect.trim()) return;
    
    setState(prev => ({ ...prev, isCorrectingAI: true }));
    const aiCorrected = await correctWithAI(textToCorrect);
    setState(prev => ({
      ...prev,
      correctedText: aiCorrected,
      isCorrectingAI: false,
    }));
  }, [state.correctedText, state.rawText, correctWithAI]);

  return {
    ...state,
    processText,
    appendText,
    reset,
    forceAICorrection,
    hasRecentCorrections: state.recentCorrections.length > 0,
  };
}
