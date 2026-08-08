import { useEffect } from 'react';

interface KeyboardShortcutsProps {
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
}

export const useKeyboardShortcuts = ({ onToggleMic, onToggleCamera }: KeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if active element is an input field
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Ctrl + D / Cmd + D: Toggle Mic
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        onToggleMic?.();
      }

      // Ctrl + E / Cmd + E: Toggle Camera
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        onToggleCamera?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleMic, onToggleCamera]);
};
