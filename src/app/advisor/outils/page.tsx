"use client";
import AppShell from "@/components/AppShell";
import { Incidents, KnowledgeSearch } from "@/components/IntegrationTools";

// The advisor's references: the bank's procedures and the service incidents.
export default function AdvisorToolsPage() {
  return (
    <AppShell role="Conseiller" initials="CO" title="Procédures et incidents">
      <div className="cv-page-heading cv-cs-reveal">
        <div>
          <p className="cv-eyebrow">RÉFÉRENCES</p>
          <h1>Procédures et incidents</h1>
          <p className="cv-subtitle">La bonne réponse et l’état des services, avant de répondre au client.</p>
        </div>
      </div>
      <div className="cv-staff-split cv-staff-split-even">
        <div className="cv-cs-reveal" id="knowledge"><KnowledgeSearch /></div>
        <div className="cv-cs-reveal" id="incidents" style={{ animationDelay: "80ms" }}><Incidents /></div>
      </div>
    </AppShell>
  );
}
