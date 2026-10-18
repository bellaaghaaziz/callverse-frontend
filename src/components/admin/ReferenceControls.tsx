"use client";
import { useState } from "react";

/** Destructive actions name their target and require an explicit inline confirmation. */
export function DeleteReference({ name, busy, onDelete }: { name: string; busy: boolean; onDelete: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? <div className="cv-notice cv-section" role="group" aria-label={"Confirmer la suppression de " + name}>
    <p>Supprimer « {name} » définitivement ?</p><div className="cv-toolbar">
      <button type="button" className="cv-button cv-button-danger" disabled={busy} onClick={() => void onDelete()}>Confirmer la suppression</button>
      <button type="button" className="cv-button cv-button-secondary" disabled={busy} onClick={() => setConfirm(false)}>Annuler</button>
    </div></div> : <button type="button" className="cv-button cv-button-danger" disabled={busy} onClick={() => setConfirm(true)}>Supprimer</button>;
}

export function ReferenceFeedback({ error, notice, loading }: { error: string; notice: string; loading: boolean }) {
  return <>{error && <p className="cv-error cv-section" role="alert">{error}</p>}
    {notice && <p className="cv-notice cv-section" role="status">{notice}</p>}
    {loading && <p className="cv-muted cv-section" role="status">Chargement…</p>}</>;
}
