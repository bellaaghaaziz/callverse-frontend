"use client";
import { ReactNode, useEffect, useRef } from "react";

// A native modal dialog: the browser traps focus and closes on Escape. Focus returns to the
// control that opened it, so a keyboard user does not lose their place in the list.
export default function ConfirmDialog({ open, title, children, confirmLabel, busy, onConfirm, onCancel }: {
  open: boolean; title: string; children: ReactNode; confirmLabel: string; busy?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      opener.current = document.activeElement as HTMLElement | null;
      node.showModal();
    } else if (!open && node.open) {
      node.close();
      if (opener.current?.isConnected) opener.current.focus();
    }
  }, [open]);
  return (
    <dialog ref={dialog} className="cv-cs-dialog" aria-labelledby="cv-cs-dialog-title"
      onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
      <h2 id="cv-cs-dialog-title">{title}</h2>
      <div className="cv-cs-dialog-body">{children}</div>
      <div className="cv-cs-dialog-actions">
        <button type="button" className="cv-button cv-button-secondary" disabled={busy} onClick={onCancel} autoFocus>Annuler</button>
        <button type="button" className="cv-button cv-button-danger" disabled={busy} onClick={onConfirm}>{busy ? "Suppression…" : confirmLabel}</button>
      </div>
    </dialog>
  );
}
