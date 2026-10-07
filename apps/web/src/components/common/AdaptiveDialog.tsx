import React, { useEffect, useRef } from 'react';

interface AdaptiveDialogProps extends Pick<React.DialogHTMLAttributes<HTMLDialogElement>, 'aria-modal'> {
  children: React.ReactNode;
  label: string;
  onClose: () => void;
  className?: string;
  /** Dock in the layout on desktop; use a modal bottom sheet below 1024px. */
  docked?: boolean;
}

export function AdaptiveDialog({ children, label, onClose, className = '', docked = false, 'aria-modal': ariaModal }: AdaptiveDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const startY = useRef<number | null>(null);
  const backdropPointer = useRef(false);
  useEffect(() => {
    const dialog = ref.current!;
    const media = window.matchMedia('(min-width: 1024px)');
    const previousFocus = document.activeElement as HTMLElement | null;
    let restoreOverflow: string | null = null;
    const update = () => {
      dialog.close();
      if (docked && media.matches) {
        dialog.show();
        if (restoreOverflow !== null) document.body.style.overflow = restoreOverflow;
        restoreOverflow = null;
      } else {
        dialog.showModal();
        if (restoreOverflow === null) restoreOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
    };
    update();
    media.addEventListener('change', update);
    const escape = (event: KeyboardEvent) => {
      // Native cancel handles modal Escape; nonmodal desktop dialogs need this.
      if (event.key === 'Escape' && docked && media.matches) closeRef.current();
    };
    window.addEventListener('keydown', escape);
    return () => {
      dialog.close();
      media.removeEventListener('change', update);
      window.removeEventListener('keydown', escape);
      if (restoreOverflow !== null) document.body.style.overflow = restoreOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [docked]);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      aria-modal={docked ? undefined : ariaModal}
      className={`adaptive-dialog ${docked ? 'adaptive-dialog--docked' : ''} ${className}`}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onPointerDownCapture={(event) => { backdropPointer.current = event.target === event.currentTarget; }}
      onClick={(event) => {
        if (backdropPointer.current && event.target === event.currentTarget) onClose();
        backdropPointer.current = false;
      }}
    >
      <button
        type="button"
        className="sheet-handle"
        aria-label={`Đóng ${label}`}
        onClick={onClose}
        onPointerDown={(event) => { startY.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerUp={(event) => {
          if (startY.current !== null && event.clientY - startY.current > 48) onClose();
          startY.current = null;
        }}
      ><span aria-hidden="true" /></button>
      <div className="adaptive-dialog__content">{children}</div>
    </dialog>
  );
}
