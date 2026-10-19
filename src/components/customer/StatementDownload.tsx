"use client";
import { useId, useState } from "react";
import { Download } from "lucide-react";
import { apiResponse, errorMessage } from "@/lib/api";

// A statement of movements over a period, downloaded as a CSV file a spreadsheet opens.
export default function StatementDownload() {
  const id = useId();
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [done, setDone] = useState(false);
  const valid = !!from && !!to && to >= from && Date.parse(to) - Date.parse(from) <= 366 * 86400000;
  return (
    <form className="cv-cs-statement" onSubmit={async e => {
      e.preventDefault(); if (busy || !valid) return; setBusy(true); setError(""); setDone(false);
      try {
        const response = await apiResponse("/me/statement?" + new URLSearchParams({ from, to }));
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        link.href = url; link.download = `releve-callverse-${from}-${to}.csv`;
        document.body.append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setDone(true);
      } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
    }}>
      <div className="cv-form-row">
        <label className="cv-label" htmlFor={id + "-from"}>Du<input id={id + "-from"} className="cv-input" type="date" required value={from} disabled={busy} onChange={e => setFrom(e.target.value)} /></label>
        <label className="cv-label" htmlFor={id + "-to"}>Au<input id={id + "-to"} className="cv-input" type="date" min={from} required value={to} disabled={busy} onChange={e => setTo(e.target.value)} /></label>
      </div>
      {!valid && <p className="cv-error">Choisissez une période dans l’ordre chronologique, d’un an au maximum.</p>}
      {error && <p role="alert" className="cv-error">{error}</p>}
      <div role="status">{done && <p className="cv-notice">Votre relevé a été téléchargé.</p>}</div>
      <button className="cv-button" disabled={busy || !valid}><Download size={16} aria-hidden="true" />{busy ? "Préparation du relevé…" : "Télécharger mon relevé"}</button>
    </form>
  );
}
