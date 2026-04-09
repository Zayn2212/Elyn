import { useState, useCallback, useRef, useEffect } from 'react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { applyInstantCorrections } from '@/data/medicalDictionary';

interface RealtimeTranscriptionState {
  isConnected: boolean;
  isConnecting: boolean;
  partialTranscript: string;
  fullTranscript: string;
  correctedTranscript: string;
  error: string | null;
  isCorrectingAI: boolean;
  recentCorrections: Array<{ original: string; corrected: string }>;
}

export default function useRealtimeTranscription() {
  const [state, setState] = useState<RealtimeTranscriptionState>({
    isConnected: false,
    isConnecting: false,
    partialTranscript: '',
    fullTranscript: '',
    correctedTranscript: '',
    error: null,
    isCorrectingAI: false,
    recentCorrections: [],
  });

  const committedTranscriptsRef = useRef<string[]>([]);
  const aiCorrectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAICorrectedRef = useRef<string>('');

  // Cleanup AI correction timeout on unmount
  useEffect(() => {
    return () => {
      if (aiCorrectionTimeoutRef.current) {
        clearTimeout(aiCorrectionTimeoutRef.current);
      }
    };
  }, []);

  // AI correction function
  const correctWithAI = useCallback(async (text: string) => {
    if (!text.trim() || text === lastAICorrectedRef.current) return;
    
    try {
      console.log('[Realtime] Sending to AI for correction...');
      setState(prev => ({ ...prev, isCorrectingAI: true }));
      
      const { data, error } = await supabase.functions.invoke('correct-medical-terms', {
        body: { transcript: text, streaming: true }
      });

      if (error) {
        console.error('[Realtime] AI correction error:', error);
        return;
      }

      const correctedText = data?.correctedTranscript || text;
      lastAICorrectedRef.current = correctedText;
      
      setState(prev => ({
        ...prev,
        correctedTranscript: correctedText,
        isCorrectingAI: false,
      }));
      
      console.log('[Realtime] AI correction complete');
    } catch (err) {
      console.error('[Realtime] AI correction failed:', err);
      setState(prev => ({ ...prev, isCorrectingAI: false }));
    }
  }, []);

  // Schedule debounced AI correction
  const scheduleAICorrection = useCallback((text: string) => {
    if (aiCorrectionTimeoutRef.current) {
      clearTimeout(aiCorrectionTimeoutRef.current);
    }
    
    // Only correct if text is substantial (more than 20 chars)
    if (text.length > 20) {
      aiCorrectionTimeoutRef.current = setTimeout(() => {
        correctWithAI(text);
      }, 2500); // 2.5 second debounce
    }
  }, [correctWithAI]);

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      console.log('[Realtime] Partial transcript:', data.text);
      setState(prev => ({
        ...prev,
        partialTranscript: data.text,
      }));
    },
    onCommittedTranscript: (data) => {
      console.log('[Realtime] Committed transcript:', data.text);
      
      // Apply instant client-side corrections
      const { correctedText, corrections } = applyInstantCorrections(data.text);
      
      if (corrections.length > 0) {
        console.log('[Realtime] Instant corrections applied:', corrections);
      }
      
      committedTranscriptsRef.current.push(correctedText);
      const fullText = committedTranscriptsRef.current.join(' ');
      
      setState(prev => ({
        ...prev,
        fullTranscript: fullText,
        correctedTranscript: fullText, // Start with instant corrections
        partialTranscript: '',
        recentCorrections: corrections,
      }));
      
      // Schedule AI correction for deeper analysis
      scheduleAICorrection(fullText);
    },
    onError: (error) => {
      console.error('[Realtime] Scribe error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Transcription error',
      }));
    },
  });

  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    committedTranscriptsRef.current = [];
    lastAICorrectedRef.current = '';

    try {
      console.log('[Realtime] Requesting scribe token...');
      
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      
      if (error) {
        console.error('[Realtime] Token request error:', error);
        throw new Error(error.message || 'Failed to get transcription token');
      }

      if (!data?.token) {
        console.error('[Realtime] No token in response:', data);
        throw new Error('No token received from server');
      }

      console.log('[Realtime] Token received, connecting to ElevenLabs...');

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log('[Realtime] Connected successfully');
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
      }));
    } catch (error) {
      console.error('[Realtime] Connection error:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect',
      }));
    }
  }, [scribe]);

  const disconnect = useCallback(() => {
    console.log('[Realtime] Disconnecting...');
    
    // Clear any pending AI correction
    if (aiCorrectionTimeoutRef.current) {
      clearTimeout(aiCorrectionTimeoutRef.current);
    }
    
    scribe.disconnect();
    setState(prev => ({
      ...prev,
      isConnected: false,
      partialTranscript: '',
    }));
  }, [scribe]);

  const reset = useCallback(() => {
    disconnect();
    committedTranscriptsRef.current = [];
    lastAICorrectedRef.current = '';
    
    if (aiCorrectionTimeoutRef.current) {
      clearTimeout(aiCorrectionTimeoutRef.current);
    }
    
    setState({
      isConnected: false,
      isConnecting: false,
      partialTranscript: '',
      fullTranscript: '',
      correctedTranscript: '',
      error: null,
      isCorrectingAI: false,
      recentCorrections: [],
    });
  }, [disconnect]);

  // Combined transcript (corrected + current partial)
  const liveTranscript = state.correctedTranscript + (state.partialTranscript ? ' ' + state.partialTranscript : '');

  return {
    ...state,
    liveTranscript: liveTranscript.trim(),
    rawTranscript: state.fullTranscript,
    connect,
    disconnect,
    reset,
    isRecording: state.isConnected,
    hasRecentCorrections: state.recentCorrections.length > 0,
  };
}
