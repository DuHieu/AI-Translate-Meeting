/**
 * Global Scroll Lock Manager
 *
 * Prevents multiple modal/drawer dialogs from corrupting document body overflow.
 * Uses reference counting so scrolling is restored ONLY when all active overlays close,
 * and guarantees clean scrollbar recovery on route transitions.
 */

let activeLockCount = 0;
let originalBodyOverflow: string | null = null;

export const scrollLock = {
  /**
   * Acquire a scroll lock. Returns a cleanup function that automatically decrements the lock.
   */
  lock(): () => void {
    if (typeof document === 'undefined') return () => {};

    if (activeLockCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    activeLockCount++;

    let released = false;
    return () => {
      if (released) return;
      released = true;
      scrollLock.unlock();
    };
  },

  /**
   * Release one lock instance. Restores scrolling if all locks have cleared.
   */
  unlock(): void {
    if (typeof document === 'undefined') return;

    activeLockCount = Math.max(0, activeLockCount - 1);
    if (activeLockCount === 0) {
      if (originalBodyOverflow && originalBodyOverflow !== 'hidden') {
        document.body.style.overflow = originalBodyOverflow;
      } else {
        document.body.style.overflow = '';
      }
      originalBodyOverflow = null;
    }
  },

  /**
   * Force unlock: immediately clears all locks and resets body/html overflow.
   * Crucial for route changes to prevent residual overflow traps.
   */
  forceUnlock(): void {
    if (typeof document === 'undefined') return;

    activeLockCount = 0;
    originalBodyOverflow = null;
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  },

  /**
   * Return whether scrolling is currently locked.
   */
  isLocked(): boolean {
    return activeLockCount > 0;
  },
};
