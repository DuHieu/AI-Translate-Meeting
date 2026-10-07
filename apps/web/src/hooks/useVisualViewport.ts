import { useEffect } from 'react';

/** Keep fixed controls and dialogs inside the visible area when a keyboard opens. */
export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      const root = document.documentElement;
      root.style.setProperty('--app-height', `${viewport?.height ?? window.innerHeight}px`);
      root.style.setProperty('--viewport-top', `${viewport?.offsetTop ?? 0}px`);
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.documentElement.style.removeProperty('--app-height');
      document.documentElement.style.removeProperty('--viewport-top');
    };
  }, []);
}
