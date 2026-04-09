import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AmbientRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  isTranscribing: boolean;
  transcript: string;
  liveTranscript: string; // Live streaming transcript
  error: string | null;
  errorCode: string | null; // For specific error handling
}

// Interval for streaming transcription (in ms)
const STREAM_INTERVAL_MS = 8000;

export default function useAmbientRecording() {
  const [state, setState] = useState<AmbientRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    isTranscribing: false,
    transcript: '',
    liveTranscript: '',
    error: null,
    errorCode: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcribedChunksRef = useRef<number>(0);
  const streamingIntervalRef = useRef<number | null>(null);
  const isTranscribingChunkRef = useRef<boolean>(false);

  const startTimer = useCallback(() => {
    timerRef.current = window.setInterval(() => {
      setState(prev => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Transcribe the latest audio chunks for streaming
  const transcribeLatestChunks = useCallback(async () => {
    if (isTranscribingChunkRef.current) return;
    if (audioChunksRef.current.length <= transcribedChunksRef.current) return;

    isTranscribingChunkRef.current = true;

    try {
      // Get all chunks accumulated so far
      const allChunks = audioChunksRef.current.slice(0);
      if (allChunks.length === 0) return;

      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(allChunks, { type: mimeType });

      // Convert blob to base64
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(audioBlob);
      });

      console.log('[Ambient] Streaming transcription: sending', allChunks.length, 'chunks, size:', Math.round(audioBlob.size / 1024), 'KB');

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { 
          audio: base64Audio,
          mimeType: mimeType 
        },
      });

      if (error) {
        console.warn('[Ambient] Streaming transcription error:', error);
        return;
      }

      if (data?.success && data?.text) {
        transcribedChunksRef.current = allChunks.length;
        console.log('[Ambient] Live transcript updated:', data.text.substring(0, 50) + '...');
        setState(prev => ({ 
          ...prev, 
          liveTranscript: data.text
        }));
      } else if (data?.error) {
        console.warn('[Ambient] Streaming transcription failed:', data.error, 'code:', data.errorCode);
      }
    } catch (e) {
      console.warn('[Ambient] Streaming transcription exception:', e);
    } finally {
      isTranscribingChunkRef.current = false;
    }
  }, []);

  // Start streaming transcription interval
  const startStreamingTranscription = useCallback(() => {
    if (streamingIntervalRef.current) return;
    
    streamingIntervalRef.current = window.setInterval(() => {
      transcribeLatestChunks();
    }, STREAM_INTERVAL_MS);
  }, [transcribeLatestChunks]);

  // Stop streaming transcription
  const stopStreamingTranscription = useCallback(() => {
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    try {
      console.log('[Ambient] Starting recording...');
      setState(prev => ({ ...prev, error: null, errorCode: null, liveTranscript: '' }));
      transcribedChunksRef.current = 0;
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      console.log('[Ambient] Microphone access granted');
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/mp4';
      
      console.log('[Ambient] Using MIME type:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('[Ambient] Audio chunk received:', event.data.size, 'bytes, total chunks:', audioChunksRef.current.length);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('[Ambient] Recording stopped, blob size:', audioBlob.size, 'bytes');
        setState(prev => ({ ...prev, audioBlob }));
      };

      // Collect data every 4 seconds for streaming chunks
      mediaRecorder.start(4000);
      startTimer();
      startStreamingTranscription();
      
      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        isPaused: false,
        duration: 0,
        audioBlob: null,
        transcript: '',
        liveTranscript: '',
      }));
      
      console.log('[Ambient] Recording started successfully');

    } catch (error) {
      console.error('[Ambient] Failed to start recording:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to access microphone',
        errorCode: 'MIC_ACCESS_ERROR'
      }));
    }
  }, [startTimer, startStreamingTranscription]);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      stopTimer();
      stopStreamingTranscription();
      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, [stopTimer, stopStreamingTranscription]);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      startTimer();
      startStreamingTranscription();
      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, [startTimer, startStreamingTranscription]);

  const stop = useCallback(async () => {
    stopTimer();
    stopStreamingTranscription();
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setState(prev => ({ ...prev, isRecording: false, isPaused: false }));
  }, [stopTimer, stopStreamingTranscription]);

  const transcribe = useCallback(async (): Promise<string> => {
    if (!state.audioBlob) {
      console.warn('[Ambient] No audio blob to transcribe');
      setState(prev => ({ ...prev, error: 'No audio to transcribe' }));
      return '';
    }

    console.log('[Ambient] Starting final transcription, blob size:', state.audioBlob.size, 'bytes');
    setState(prev => ({ ...prev, isTranscribing: true, error: null, errorCode: null }));

    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(state.audioBlob);
      const base64Audio = await base64Promise;

      console.log('[Ambient] Final transcription: sending', Math.round(base64Audio.length * 0.75 / 1024), 'KB to server...');
      
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { 
          audio: base64Audio,
          mimeType: state.audioBlob.type 
        },
      });

      if (error) {
        console.error('[Ambient] Transcription invoke error:', error);
        throw new Error(error.message || 'Transcription failed');
      }

      console.log('[Ambient] Transcription response:', { success: data?.success, hasText: !!data?.text, error: data?.error });

      if (!data?.success) {
        // Handle specific error codes from the API
        const errorCode = data?.errorCode || null;
        const errorMessage = data?.error || 'Transcription failed';
        
        console.warn('[Ambient] Transcription failed:', errorMessage, 'code:', errorCode);
        
        setState(prev => ({ 
          ...prev, 
          isTranscribing: false,
          error: errorMessage,
          errorCode: errorCode
        }));
        
        // Return live transcript as fallback if available
        if (state.liveTranscript) {
          console.log('[Ambient] Using live transcript as fallback');
          return state.liveTranscript;
        }
        
        return '';
      }

      const transcriptText = data.text || '';
      console.log('[Ambient] Transcription successful, length:', transcriptText.length);

      setState(prev => ({ 
        ...prev, 
        isTranscribing: false,
        transcript: transcriptText,
        error: null,
        errorCode: null
      }));

      return transcriptText;

    } catch (error) {
      console.error('[Ambient] Transcription exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to transcribe audio';
      
      setState(prev => ({ 
        ...prev, 
        isTranscribing: false,
        error: errorMessage,
        errorCode: 'UNKNOWN_ERROR'
      }));
      
      // Return live transcript as fallback if available
      if (state.liveTranscript) {
        console.log('[Ambient] Using live transcript as fallback');
        return state.liveTranscript;
      }
      
      return '';
    }
  }, [state.audioBlob, state.liveTranscript]);

  const correctMedicalTerms = useCallback(async (text: string): Promise<string> => {
    if (!text.trim()) return text;

    try {
      const { data, error } = await supabase.functions.invoke('correct-medical-terms', {
        body: { transcript: text },
      });

      if (error) {
        console.error('Medical term correction error:', error);
        return text;
      }

      return data?.correctedTranscript || text;
    } catch (e) {
      console.error('Failed to correct medical terms:', e);
      return text;
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      isTranscribing: false,
      transcript: '',
      liveTranscript: '',
      error: null,
      errorCode: null,
    });
    transcribedChunksRef.current = 0;
  }, [stop]);

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      stopStreamingTranscription();
    };
  }, [stopTimer, stopStreamingTranscription]);

  return {
    ...state,
    formattedDuration: formatDuration(state.duration),
    start,
    pause,
    resume,
    stop,
    transcribe,
    correctMedicalTerms,
    reset,
  };
}
