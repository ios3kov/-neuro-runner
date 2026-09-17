import React, { useEffect, useId, useRef } from 'react';

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
  return <dialog ref={ref} className="nr-dialog custom-scrollbar" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); } }}
    onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <header className="nr-dialog-header"><h2 id={titleId}>{title}</h2><button className="nr-icon-button" type="button" aria-label={`Close ${title}`} onClick={onClose}>✕</button></header>
    <div className="nr-dialog-body">{children}</div>
  </dialog>;
}
