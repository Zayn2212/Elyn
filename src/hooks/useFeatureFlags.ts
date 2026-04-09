import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface FeatureFlag {
  feature_key: string;
  enabled: boolean;
  label: string;
  description: string;
  category: 'clinician' | 'admin';
  locked?: boolean;
}

export const FEATURE_DEFINITIONS: Omit<FeatureFlag, 'enabled'>[] = [
  // Clinician features
  { feature_key: 'ambient_capture', label: 'Voice Recording & Transcription', description: 'Enable ambient voice capture during patient encounters', category: 'clinician' },
  { feature_key: 'ai_note_generation', label: 'AI Note Generation', description: 'Generate structured clinical notes from transcripts using AI', category: 'clinician' },
  { feature_key: 'ai_billing_intelligence', label: 'AI Denial Prevention', description: 'AI-powered denial risk analysis and code validation', category: 'clinician' },
  { feature_key: 'billing_auto_coding', label: 'Automatic CPT/ICD Coding', description: 'Auto-suggest CPT and ICD-10 codes from clinical documentation', category: 'clinician' },
  { feature_key: 'face_sheet_parser', label: 'Face Sheet Import', description: 'Parse patient demographics from face sheet images or text', category: 'clinician' },
  { feature_key: 'handoff_generation', label: 'Shift Handoff Reports', description: 'Generate AI-powered shift handoff summaries', category: 'clinician' },
  { feature_key: 'medical_term_correction', label: 'Medical Term Auto-Correction', description: 'Automatically correct medical terminology in transcripts', category: 'clinician' },
  // Admin features
  { feature_key: 'rvu_tracking', label: 'RVU & Revenue Tracking', description: 'Track relative value units and estimated revenue', category: 'admin' },
  { feature_key: 'billing_analytics', label: 'Billing Analytics Dashboard', description: 'Visual analytics for billing patterns and performance', category: 'admin' },
  { feature_key: 'audit_logging', label: 'Audit Trail', description: 'Immutable logging of all PHI access and modifications. Required for HIPAA compliance.', category: 'admin', locked: true },
  { feature_key: 'mfa_required', label: 'Require MFA', description: 'Enforce multi-factor authentication for all users', category: 'admin' },
  { feature_key: 'billing_outcomes', label: 'Outcome Tracking for AI Training', description: 'Collect billing outcome data to improve AI denial predictions', category: 'admin' },
];

export default function useFeatureFlags() {
  const { user, isAdmin } = useAuth();
  const [flags, setFlags] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchFlags = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('feature_flags')
      .select('feature_key, enabled');
    
    const map = new Map<string, boolean>();
    // Default all features to enabled
    FEATURE_DEFINITIONS.forEach(f => map.set(f.feature_key, true));
    // Override with stored values
    if (data) {
      data.forEach((row: any) => map.set(row.feature_key, row.enabled));
    }
    setFlags(map);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const isFeatureEnabled = useCallback((key: string): boolean => {
    // Audit logging is always on
    if (key === 'audit_logging') return true;
    return flags.get(key) ?? true;
  }, [flags]);

  const toggleFeature = useCallback(async (key: string, enabled: boolean) => {
    if (!user || key === 'audit_logging') return;
    
    // Upsert the flag
    const { error } = await supabase
      .from('feature_flags')
      .upsert(
        { user_id: user.id, feature_key: key, enabled, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,feature_key' }
      );
    
    if (!error) {
      setFlags(prev => new Map(prev).set(key, enabled));
    }
    return error;
  }, [user]);

  return { flags, loading, isFeatureEnabled, toggleFeature, refetch: fetchFlags, isAdmin };
}
