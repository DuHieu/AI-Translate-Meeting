import { useEffect, useRef } from 'react';

interface KeyboardShortcutsProps {
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onToggleCaptions?: () => void;
  onToggleRaiseHand?: () => void;
  isMicOn?: boolean;
  onPushToTalk?: (active: boolean) => void;
}

export const useKeyboardShortcuts = ({
  onToggleMic,
  onToggleCamera,
  onToggleCaptions,
  onToggleRaiseHand,
  isMicOn = false,
  onPushToTalk,
}: KeyboardShortcutsProps) => {
  const isPushingRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if active element is an input, textarea, select or contenteditable
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
        return;
      }

      // Ctrl + E / Cmd + E: Toggle Camera
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        onToggleCamera?.();
        return;
      }

      // 'c' or 'C': Toggle Captions / Subtitles (Google Meet standard)
      if (
        event.key.toLowerCase() === 'c' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        onToggleCaptions?.();
        return;
      }

      // 'h' or 'H': Toggle Raise Hand (Google Meet / Zoom standard)
      if (
        event.key.toLowerCase() === 'h' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        onToggleRaiseHand?.();
        return;
      }

      // Spacebar: Push-to-Talk (Hold Space to talk when muted)
      if (
        event.code === 'Space' &&
        !event.repeat &&
        !event.ctrlKey &&
        !event.metaKey &&
        !isMicOn &&
        !isPushingRef.current
      ) {
        event.preventDefault();
        isPushingRef.current = true;
        onPushToTalk?.(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space' && isPushingRef.current) {
        event.preventDefault();
        isPushingRef.current = false;
        onPushToTalk?.(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onToggleMic, onToggleCamera, onToggleCaptions, onToggleRaiseHand, isMicOn, onPushToTalk]);
};
