import { Search } from "lucide-react";
import { SUPERVISED_STATUSES } from "@/lib/supervision";
import { skillLabel, statusLabel } from "@/lib/presentation";

// Search and filters above the supervised conversations. The parent owns the
// values; a change resets the page, the search applies on submit.
export default function ConversationFilters({
  query,
  onQuery,
  onSearch,
  choice,
  onChoice,
  skill,
  onSkill,
  from,
  onFrom,
  to,
  onTo,
}: {
  query: string;
  onQuery: (value: string) => void;
  onSearch: () => void;
  choice: string;
  onChoice: (value: string) => void;
  skill: string;
  onSkill: (value: string) => void;
  from: string;
  onFrom: (value: string) => void;
  to: string;
  onTo: (value: string) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
      className="cv-toolbar"
    >
      <div className="cv-search">
        <Search size={16} aria-hidden="true" />
        <input
          aria-label="Rechercher un client ou une référence"
          className="cv-input"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Rechercher un client ou une référence"
        />
      </div>
      <button className="cv-button">
        <Search size={15} />
        Rechercher
      </button>
      <select
        aria-label="Filtrer par statut"
        className="cv-input"
        value={choice}
        onChange={(e) => onChoice(e.target.value)}
      >
        <option value="live">Non clôturées</option>
        <option value="escalated">Escalades en attente</option>
        <option value="all">Toutes</option>
        {SUPERVISED_STATUSES.filter((status) => status !== "ESCALATED").map(
          (status) => (
            <option key={status} value={status}>
              {statusLabel[status]}
            </option>
          ),
        )}
      </select>
      <select
        aria-label="Filtrer par file"
        className="cv-input"
        value={skill}
        onChange={(e) => onSkill(e.target.value)}
      >
        <option value="">Toutes les files</option>
        {Object.entries(skillLabel).map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
      <details className="cv-date-filters">
      <summary>Période{from || to ? " · filtre actif" : " (facultatif)"}</summary>
      <label className="cv-label">Depuis<input
        type="datetime-local"
        aria-label="Arrivées depuis"
        className="cv-input"
        max={to || undefined}
        value={from}
        onChange={(e) => onFrom(e.target.value)}
      /></label>
      <label className="cv-label">Jusqu’au<input
        type="datetime-local"
        aria-label="Arrivées avant"
        className="cv-input"
        min={from || undefined}
        value={to}
        onChange={(e) => onTo(e.target.value)}
      /></label>
      </details>
    </form>
  );
}
