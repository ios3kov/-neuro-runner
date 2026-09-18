import React, { useEffect, useId, useRef } from 'react';

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({ open, title, onClose, children }: React.PropsWithChildren<{open: boolean; title: string; onClose: () => void}>) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);
  if (!open) return null;
  const onKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); onClose(); return;
    }
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)]
      .filter(element => element.getClientRects().length > 0 && !element.closest('[inert]'));
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first || !last) { event.preventDefault(); return; }
    // Explicitly wrap the page's focus even in one-button dialogs.
    if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) {
      event.preventDefault(); first.focus();
    }
  };
  return <dialog ref={ref} className="nr-dialog custom-scrollbar" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={onKeyDown}
    onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <header className="nr-dialog-header"><h2 id={titleId}>{title}</h2><button className="nr-icon-button" type="button" aria-label={`Close ${title}`} onClick={onClose}>✕</button></header>
    <div className="nr-dialog-body">{children}</div>
  </dialog>;
}
