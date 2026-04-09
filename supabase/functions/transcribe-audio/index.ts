import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Constants for validation
const MAX_AUDIO_SIZE_MB = 20;
const MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'];

// Sanitize error messages - don't expose internal details
function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('Audio file is too large')) return error.message;
    if (error.message.includes('No audio data provided')) return error.message;
    if (error.message.includes('Invalid audio format')) return error.message;
    if (error.message.includes('API key')) return 'Service configuration error. Please contact support.';
    console.error('Transcription error:', error.message);
  }
  return 'Failed to transcribe audio. Please try again.';
}

// Map browser mime types to ElevenLabs-compatible ones
function getElevenLabsMimeType(mimeType: string): string {
  if (mimeType.includes('webm')) return 'audio/webm';
  if (mimeType.includes('mp4')) return 'audio/mp4';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'audio/mpeg';
  if (mimeType.includes('wav')) return 'audio/wav';
  if (mimeType.includes('ogg')) return 'audio/ogg';
  return 'audio/webm'; // default
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY is not configured');
      throw new Error('Service configuration error');
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      throw new Error('Invalid request body');
    }

    const { audio, mimeType } = body;

    if (!audio || typeof audio !== 'string') {
      throw new Error('No audio data provided');
    }

    const normalizedMimeType = mimeType || 'audio/webm';

    // Estimate size (base64 is ~4/3 larger than binary)
    const estimatedSize = Math.ceil(audio.length * 0.75);
    if (estimatedSize > MAX_AUDIO_SIZE_BYTES) {
      throw new Error(`Audio file is too large. Maximum size is ${MAX_AUDIO_SIZE_MB}MB.`);
    }

    console.log('Transcribing audio with ElevenLabs Scribe v2, mimeType:', normalizedMimeType, 'size:', Math.round(estimatedSize / 1024), 'KB');

    // Decode base64 to binary
    const binaryData = Uint8Array.from(atob(audio), c => c.charCodeAt(0));

    // Build multipart form data for ElevenLabs batch STT
    const formData = new FormData();
    const elevenLabsMime = getElevenLabsMimeType(normalizedMimeType);
    const ext = elevenLabsMime.split('/')[1] || 'webm';
    const audioBlob = new Blob([binaryData], { type: elevenLabsMime });
    formData.append('file', audioBlob, `recording.${ext}`);
    formData.append('model_id', 'scribe_v2');
    formData.append('tag_audio_events', 'false');
    formData.append('diarize', 'false');

    console.log('Sending audio to ElevenLabs Scribe v2...');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs STT error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: 'Transcription service is temporarily unavailable due to high usage. Your recording was saved - please try generating the note again in a few minutes.',
            errorCode: 'QUOTA_EXCEEDED',
            success: false,
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({
            error: 'API access denied. Please check your ElevenLabs API key configuration.',
            errorCode: 'AUTH_ERROR',
            success: false,
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 400) {
        return new Response(
          JSON.stringify({
            error: 'Invalid request to transcription service. Please try again with a different recording.',
            errorCode: 'BAD_REQUEST',
            success: false,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error('Transcription service error');
    }

    const result = await response.json();

    // ElevenLabs returns { text: "...", words: [...] }
    const transcription = result.text || '';

    if (!transcription) {
      console.warn('Empty transcription received from ElevenLabs');
    }

    console.log('Transcription successful, length:', transcription.length);

    return new Response(
      JSON.stringify({
        text: transcription.trim(),
        success: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const safeError = sanitizeError(error);
    return new Response(
      JSON.stringify({
        error: safeError,
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
