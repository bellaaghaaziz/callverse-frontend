"use client";
import Link from "next/link";
import { MessageSquarePlus } from "lucide-react";
import SupportDesk from "@/components/SupportDesk";
import { Incidents } from "@/components/IntegrationTools";
import { useCustomer } from "@/components/customer/CustomerShell";

// Help on its own page: the follow-up of requests the bank opened, and the service status.
export default function ClientHelp() {
  const { profile } = useCustomer();
  return (
    <div className="cv-cs-stack">
      <section className="cv-cs-page-head cv-cs-page-head-row cv-cs-reveal" data-tour="client-welcome">
        <div>
          <p className="cv-cs-eyebrow">Aide et suivi</p>
          <h1>Nous sommes là pour vous</h1>
          <p className="cv-cs-lead">Suivez vos demandes et l’état de nos services.</p>
        </div>
        <Link href="/client/messages?nouveau=1" className="cv-button"><MessageSquarePlus size={18} aria-hidden="true" />Écrire à un conseiller</Link>
      </section>
      <div className="cv-cs-reveal" data-tour="client-followup" style={{ animationDelay: "80ms" }}><SupportDesk role="CUSTOMER" /></div>
      <div className="cv-cs-reveal" data-tour="client-status" style={{ animationDelay: "160ms" }}><Incidents region={profile?.region} /></div>
    </div>
  );
}
