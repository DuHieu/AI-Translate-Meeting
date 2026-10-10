import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop ensures that navigating between pages always scrolls the window back to (0, 0),
 * and resets any residual scroll locks on document.body to eliminate modal scroll traps.
 */
export const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    // Guarantee document body is never trapped in overflow: hidden after route transitions
    if (document.body.style.overflow === 'hidden') {
      document.body.style.overflow = '';
    }
  }, [pathname]);

  return null;
};
