import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export type SpeechErrorType = 
  | 'not-supported' 
  | 'not-allowed' 
  | 'no-microphone' 
  | 'network' 
  | 'aborted' 
  | 'no-speech'
  | 'unknown';

interface SpeechError {
  type: SpeechErrorType;
  message: string;
}

/**
 * Custom hook for speech recognition functionality.
 * Handles continuous speech-to-text with interim results and proper error handling.
 */
const useSpeech = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<SpeechError | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecordingRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Check microphone permission
  useEffect(() => {
    const checkPermission = async () => {
      try {
        if (navigator.permissions) {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setPermissionState(result.state as 'prompt' | 'granted' | 'denied');
          
          result.onchange = () => {
            setPermissionState(result.state as 'prompt' | 'granted' | 'denied');
          };
        }
      } catch {
        // Permissions API not supported, will check on first use
        setPermissionState('unknown');
      }
    };
    
    checkPermission();
  }, []);

  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionClass) {
      setError({
        type: 'not-supported',
        message: 'Speech recognition is not supported in this browser. Try Chrome or Edge.'
      });
      return;
    }

    recognitionRef.current = new SpeechRecognitionClass();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (e: SpeechRecognitionEvent) => {
      let final = '';
      let temp = '';
      
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript + ' ';
        } else {
          temp += e.results[i][0].transcript;
        }
      }
      
      if (final) {
        setTranscript((prev) => prev + final);
        // Clear error on successful recognition
        setError(null);
        retryCountRef.current = 0;
      }
      setInterim(temp);
    };

    recognitionRef.current.onend = () => {
      if (isRecordingRef.current && retryCountRef.current < maxRetries) {
        try {
          recognitionRef.current?.start();
        } catch {
          // Ignore restart errors
        }
      } else if (isRecordingRef.current) {
        // Max retries reached, stop recording
        isRecordingRef.current = false;
        setIsRecording(false);
        setError({
          type: 'unknown',
          message: 'Recording stopped unexpectedly. Please try again.'
        });
      }
    };

    recognitionRef.current.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.log('Speech recognition error:', e.error);
      
      switch (e.error) {
        case 'not-allowed':
          setError({
            type: 'not-allowed',
            message: 'Microphone access denied. Please allow microphone access and try again.'
          });
          setPermissionState('denied');
          isRecordingRef.current = false;
          setIsRecording(false);
          break;
          
        case 'no-speech':
          // No speech detected - this is normal, try to restart
          retryCountRef.current++;
          if (isRecordingRef.current && retryCountRef.current < maxRetries) {
            try {
              recognitionRef.current?.start();
            } catch {
              // Ignore restart errors
            }
          }
          break;
          
        case 'audio-capture':
          setError({
            type: 'no-microphone',
            message: 'No microphone found. Please connect a microphone and try again.'
          });
          isRecordingRef.current = false;
          setIsRecording(false);
          break;
          
        case 'network':
          setError({
            type: 'network',
            message: 'Network error. Please check your internet connection.'
          });
          isRecordingRef.current = false;
          setIsRecording(false);
          break;
          
        case 'aborted':
          // User or system aborted - don't show error
          break;
          
        default:
          if (isRecordingRef.current) {
            retryCountRef.current++;
            if (retryCountRef.current < maxRetries) {
              try {
                recognitionRef.current?.start();
              } catch {
                // Ignore restart errors
              }
            }
          }
      }
    };

    setIsSupported(true);
  }, []);

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      setPermissionState('granted');
      setError(null);
      return true;
    } catch (err) {
      setPermissionState('denied');
      setError({
        type: 'not-allowed',
        message: 'Microphone access denied. Please allow microphone access in your browser settings.'
      });
      return false;
    }
  }, []);

  const start = useCallback(async () => {
    if (!recognitionRef.current) {
      setError({
        type: 'not-supported',
        message: 'Speech recognition is not available.'
      });
      return;
    }

    // Clear previous errors
    setError(null);
    retryCountRef.current = 0;

    // Check/request permission first
    if (permissionState !== 'granted') {
      const granted = await requestMicrophonePermission();
      if (!granted) return;
    }
    
    try {
      isRecordingRef.current = true;
      setIsRecording(true);
      recognitionRef.current.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      setError({
        type: 'unknown',
        message: 'Failed to start recording. Please try again.'
      });
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  }, [permissionState, requestMicrophonePermission]);

  const stop = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setInterim('');
    retryCountRef.current = 0;
    
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop errors
    }
  }, []);

  const clear = useCallback(() => {
    setTranscript('');
    setInterim('');
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isRecording,
    transcript,
    interim,
    isSupported,
    error,
    permissionState,
    start,
    stop,
    clear,
    clearError,
    setTranscript,
    requestMicrophonePermission,
  };
};

export default useSpeech;
