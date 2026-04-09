import { useEffect } from 'react';

interface KeyboardShortcutsConfig {
  onNewNote: () => void;
  onFocusSearch?: () => void;
  onSwitchTab: (tab: string) => void;
  onEscape?: () => void;
  enabled?: boolean;
}

const TAB_MAP: Record<string, string> = {
  '1': 'patients',
  '2': 'notes',
  '3': 'bills',
  '4': 'settings',
};

export default function useKeyboardShortcuts({
  onNewNote,
  onFocusSearch,
  onSwitchTab,
  onEscape,
  enabled = true,
}: KeyboardShortcutsConfig) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Escape always works
      if (e.key === 'Escape') {
        onEscape?.();
        return;
      }

      // Don't trigger shortcuts when typing in inputs
      if (isInput) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onNewNote();
      } else if (e.key === '/') {
        e.preventDefault();
        onFocusSearch?.();
      } else if (TAB_MAP[e.key]) {
        e.preventDefault();
        onSwitchTab(TAB_MAP[e.key]);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNewNote, onFocusSearch, onSwitchTab, onEscape, enabled]);
}
