import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface OnboardingState {
  facility_added: boolean;
  template_set: boolean;
  mfa_enabled: boolean;
  first_note_recorded: boolean;
  dismissed: boolean;
}

const DEFAULT_STATE: OnboardingState = {
  facility_added: false,
  template_set: false,
  mfa_enabled: false,
  first_note_recorded: false,
  dismissed: false,
};

export function useOnboarding() {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  const fetchState = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    const [
      { count: facilityCount },
      { data: profile },
      { data: factorsData },
      { count: noteCount },
    ] = await Promise.all([
      supabase.from('facilities').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('profiles').select('preferences').eq('user_id', user.id).maybeSingle(),
      supabase.auth.mfa.listFactors(),
      supabase.from('clinical_notes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    const prefs = (profile?.preferences as Record<string, unknown>) || {};
    const onboarding = (prefs.onboarding as Partial<OnboardingState>) || {};

    const verifiedMfa = factorsData?.totp?.filter(f => f.status === 'verified') ?? [];

    setState({
      facility_added: (facilityCount ?? 0) > 0,
      template_set: !!(prefs.notePreferences),
      mfa_enabled: verifiedMfa.length > 0,
      first_note_recorded: (noteCount ?? 0) > 0,
      dismissed: onboarding.dismissed ?? false,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchState(); }, [fetchState]);

  const dismiss = useCallback(async () => {
    if (!user) return;
    setState(prev => ({ ...prev, dismissed: true }));

    const { data: existing } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('user_id', user.id)
      .maybeSingle();

    const prefs = (existing?.preferences as Record<string, unknown>) || {};
    await supabase.from('profiles').update({
      preferences: { ...prefs, onboarding: { dismissed: true } },
    }).eq('user_id', user.id);
  }, [user]);

  const steps = [
    state.facility_added,
    state.template_set,
    state.mfa_enabled,
    state.first_note_recorded,
  ];
  const completed = steps.filter(Boolean).length;
  const total = steps.length;

  return { state, loading, dismiss, completed, total };
}
