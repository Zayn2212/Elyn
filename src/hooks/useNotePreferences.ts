import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface NotePreferences {
  noteFormat: 'soap' | 'apso' | 'brief' | 'custom';
  sections: {
    subjective: boolean;
    objective: boolean;
    assessment: boolean;
    plan: boolean;
    patientEducation: boolean;
    followUp: boolean;
  };
  sectionOrder: string[];
}

export const DEFAULT_NOTE_PREFERENCES: NotePreferences = {
  noteFormat: 'soap',
  sections: {
    subjective: true,
    objective: true,
    assessment: true,
    plan: true,
    patientEducation: false,
    followUp: false,
  },
  sectionOrder: ['subjective', 'objective', 'assessment', 'plan'],
};

// Template presets
export const NOTE_TEMPLATES: Record<string, Partial<NotePreferences>> = {
  soap: {
    noteFormat: 'soap',
    sections: {
      subjective: true,
      objective: true,
      assessment: true,
      plan: true,
      patientEducation: false,
      followUp: false,
    },
    sectionOrder: ['subjective', 'objective', 'assessment', 'plan'],
  },
  apso: {
    noteFormat: 'apso',
    sections: {
      subjective: true,
      objective: true,
      assessment: true,
      plan: true,
      patientEducation: false,
      followUp: false,
    },
    sectionOrder: ['assessment', 'plan', 'subjective', 'objective'],
  },
  brief: {
    noteFormat: 'brief',
    sections: {
      subjective: false,
      objective: false,
      assessment: true,
      plan: true,
      patientEducation: false,
      followUp: false,
    },
    sectionOrder: ['assessment', 'plan'],
  },
};

export const SECTION_LABELS: Record<string, { label: string; description: string }> = {
  subjective: {
    label: 'Subjective',
    description: 'HPI, ROS, PMH, Medications, Allergies',
  },
  objective: {
    label: 'Objective',
    description: 'Vitals, Physical Exam, Labs',
  },
  assessment: {
    label: 'Assessment',
    description: 'Diagnosis, Problem List',
  },
  plan: {
    label: 'Plan',
    description: 'Treatment, Follow-up',
  },
  patientEducation: {
    label: 'Patient Education',
    description: 'Instructions given to patient',
  },
  followUp: {
    label: 'Follow-up',
    description: 'Next appointment, when to return',
  },
};

export default function useNotePreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotePreferences>(DEFAULT_NOTE_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load preferences from profiles table
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('preferences')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading note preferences:', error);
        } else if (data?.preferences) {
          // Parse the stored preferences and merge with defaults
          const stored = data.preferences as Record<string, unknown>;
          if (stored.notePreferences) {
            const notePrefs = stored.notePreferences as NotePreferences;
            setPreferences({
              ...DEFAULT_NOTE_PREFERENCES,
              ...notePrefs,
              sections: {
                ...DEFAULT_NOTE_PREFERENCES.sections,
                ...(notePrefs.sections || {}),
              },
            });
          }
        }
      } catch (e) {
        console.error('Failed to load note preferences:', e);
      }
      setLoading(false);
    };

    loadPreferences();
  }, [user]);

  // Save preferences to profiles table
  const savePreferences = useCallback(async (newPreferences: NotePreferences) => {
    if (!user) return false;

    setSaving(true);
    try {
      // First get existing preferences to merge
      const { data: existingData } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      const existingPrefs = (existingData?.preferences as Record<string, unknown>) || {};
      
      // Convert NotePreferences to a JSON-compatible structure
      const notePrefsForStorage = {
        noteFormat: newPreferences.noteFormat,
        sections: { ...newPreferences.sections },
        sectionOrder: [...newPreferences.sectionOrder],
      };
      
      const { error } = await supabase
        .from('profiles')
        .update({
          preferences: {
            ...existingPrefs,
            notePreferences: notePrefsForStorage,
          },
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving note preferences:', error);
        setSaving(false);
        return false;
      }

      setPreferences(newPreferences);
      setSaving(false);
      return true;
    } catch (e) {
      console.error('Failed to save note preferences:', e);
      setSaving(false);
      return false;
    }
  }, [user]);

  // Apply a template preset
  const applyTemplate = useCallback((templateId: 'soap' | 'apso' | 'brief' | 'custom') => {
    if (templateId === 'custom') {
      // Custom keeps current settings
      setPreferences(prev => ({ ...prev, noteFormat: 'custom' }));
    } else {
      const template = NOTE_TEMPLATES[templateId];
      if (template) {
        setPreferences({
          ...DEFAULT_NOTE_PREFERENCES,
          ...template,
          noteFormat: templateId,
        } as NotePreferences);
      }
    }
  }, []);

  // Toggle a section on/off
  const toggleSection = useCallback((sectionKey: keyof NotePreferences['sections']) => {
    setPreferences(prev => ({
      ...prev,
      noteFormat: 'custom', // Switching to custom when manually editing
      sections: {
        ...prev.sections,
        [sectionKey]: !prev.sections[sectionKey],
      },
    }));
  }, []);

  // Reorder sections
  const reorderSections = useCallback((newOrder: string[]) => {
    setPreferences(prev => ({
      ...prev,
      noteFormat: 'custom',
      sectionOrder: newOrder,
    }));
  }, []);

  return {
    preferences,
    loading,
    saving,
    savePreferences,
    applyTemplate,
    toggleSection,
    reorderSections,
    setPreferences,
  };
}
