"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import ConversationPicker, { type ConversationChoice } from "@/components/ConversationPicker";
import ConversationPanel from "@/components/ConversationPanel";
import SupportDesk from "@/components/SupportDesk";

// The advisor's conversations and follow-up on their own page. A live conversation opens on the
// workstation, where it can be answered; an ended one is read here.
export default function AdvisorHistoryPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<ConversationChoice | null>(null);
  return (
    <AppShell role="Conseiller" initials="CO" title="Mes conversations">
      <div className="cv-page-heading cv-cs-reveal">
        <div>
          <p className="cv-eyebrow">MES CONVERSATIONS</p>
          <h1>Retrouver un échange</h1>
          <p className="cv-subtitle">Recherchez une conversation, relisez-la ou reprenez-la sur votre poste.</p>
        </div>
      </div>
      <div className="cv-staff-split">
        <section className="cv-card cv-card-pad cv-cs-reveal" data-tour="history-list">
          <ConversationPicker title="Mes conversations" selectedId={selected?.id} onSelect={choice => {
            if (["ASSIGNED", "ACTIVE", "ESCALATED"].includes(choice.status)) router.push(`/advisor?conversation=${choice.id}`);
            else setSelected(choice);
          }} />
        </section>
        <div className="cv-cs-reveal" style={{ animationDelay: "80ms" }}>
          {selected ? (
            <>
              <h2 className="cv-tool-title">{selected.counterpartName ?? selected.customerName} · Historique de l’échange</h2>
              <ConversationPanel key={selected.id} id={selected.id} role="ADVISOR" />
            </>
          ) : (
            <section className="cv-card cv-cs-empty-chat"><strong>Choisissez une conversation</strong><span>Les échanges en cours s’ouvrent sur votre poste de travail.</span></section>
          )}
        </div>
      </div>
      <div className="cv-section cv-cs-reveal" style={{ animationDelay: "160ms" }}>
        <SupportDesk role="ADVISOR" />
      </div>
    </AppShell>
  );
}
