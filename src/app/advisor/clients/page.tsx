"use client";
import AppShell from "@/components/AppShell";
import CustomerOnboarding from "@/components/staff/CustomerOnboarding";
import { FrontDesk } from "@/components/IntegrationTools";

// Customers at the desk: open a new customer, or register a contact for an existing one.
export default function AdvisorClientsPage() {
  return (
    <AppShell role="Conseiller" initials="CO" title="Clients">
      <div className="cv-page-heading cv-cs-reveal">
        <div>
          <p className="cv-eyebrow">CLIENTS</p>
          <h1>Accueillir un client</h1>
          <p className="cv-subtitle">Ouvrez un nouveau client ou enregistrez un contact pour un client existant.</p>
        </div>
      </div>
      <div className="cv-staff-split cv-staff-split-even">
        <div className="cv-cs-reveal"><CustomerOnboarding /></div>
        <div className="cv-cs-reveal" id="frontdesk" style={{ animationDelay: "80ms" }}><FrontDesk /></div>
      </div>
    </AppShell>
  );
}
