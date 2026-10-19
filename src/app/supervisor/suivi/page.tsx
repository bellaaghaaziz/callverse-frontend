"use client";
import AppShell from "@/components/AppShell";
import SupportDesk from "@/components/SupportDesk";

// The follow-up of tickets and commercial gestures after the conversations.
export default function SupervisorFollowupPage() {
  return (
    <AppShell role="Superviseur" initials="SV" title="Suivi des demandes">
      <div className="cv-supervisor">
        <div className="cv-page-heading cv-cs-reveal">
          <div>
            <p className="cv-eyebrow">SUIVI DES DEMANDES</p>
            <h1>Tickets et gestes commerciaux</h1>
            <p className="cv-subtitle">Ce qui continue après la conversation, jusqu’à la résolution.</p>
          </div>
        </div>
        <div className="cv-cs-reveal" style={{ animationDelay: "60ms" }}><SupportDesk role="SUPERVISOR" /></div>
      </div>
    </AppShell>
  );
}
