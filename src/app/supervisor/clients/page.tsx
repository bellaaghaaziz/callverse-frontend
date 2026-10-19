"use client";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import CustomerOnboarding from "@/components/staff/CustomerOnboarding";
import { FrontDesk } from "@/components/IntegrationTools";

// Customers: open a new one, or register a contact and follow it in the conversations list.
export default function SupervisorClientsPage() {
  const router = useRouter();
  return (
    <AppShell role="Superviseur" initials="SV" title="Clients">
      <div className="cv-supervisor">
        <div className="cv-page-heading cv-cs-reveal">
          <div>
            <p className="cv-eyebrow">CLIENTS</p>
            <h1>Ouvrir un client, enregistrer un contact</h1>
            <p className="cv-subtitle">Un nouveau client repart avec son accès, son compte et sa carte.</p>
          </div>
        </div>
        <div className="cv-staff-split cv-staff-split-even">
          <div className="cv-cs-reveal"><CustomerOnboarding /></div>
          <div className="cv-cs-reveal" id="frontdesk" style={{ animationDelay: "80ms" }}>
            <FrontDesk onOpened={conversation => router.push(`/supervisor/conversations?open=${conversation.id}`)} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
