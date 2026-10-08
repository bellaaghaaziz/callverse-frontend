"use client";
import { useState } from "react";
import {
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Headphones,
  Check,
  Wallet,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import ConversationPanel from "@/components/ConversationPanel";
import { Incidents } from "@/components/IntegrationTools";
export default function ClientPage() {
  const [input, setInput] = useState("");
  const [id, setId] = useState<string | null>(null);
  return (
    <AppShell role="Client" initials="CL" title="Mon espace client">
      <div className="cv-page-heading" id="workspace">
        <div>
          <p className="cv-eyebrow">VOTRE RELATION BANCAIRE</p>
          <h1>Bonjour, bienvenue chez vous.</h1>
          <p className="cv-subtitle">
            Un espace simple pour rester en contact avec votre conseiller.
          </p>
        </div>
        <span className="cv-badge cv-badge-green">
          <ShieldCheck size={12} />
          Session personnelle
        </span>
      </div>
      <div className="cv-two-columns">
        <div className="cv-stack" id="conversation">
          <section className="cv-card cv-card-pad">
            <h2 className="cv-tool-title">
              <MessageSquare size={19} />
              Échangez avec votre conseiller
            </h2>
            <p className="cv-subtitle mb-5">
              Saisissez l’identifiant transmis par votre conseiller pour
              retrouver votre conversation et envoyer un message.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setId(input.trim());
              }}
            >
              <label className="cv-label" htmlFor="client-conversation-id">
                Identifiant de conversation
              </label>
              <div className="cv-inline-form">
                <input
                  id="client-conversation-id"
                  aria-label="Identifiant de conversation"
                  className="cv-input"
                  required
                  pattern="[0-9a-fA-F-]{36}"
                  placeholder="Collez l’identifiant reçu"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button className="cv-button">
                  Ouvrir
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </section>
          {id ? (
            <ConversationPanel key={id} id={id} role="CUSTOMER" />
          ) : (
            <section className="cv-card">
              <div className="cv-empty !py-16">
                <span className="cv-empty-icon mx-auto">
                  <MessageSquare size={26} />
                </span>
                <strong className="!text-lg">
                  Votre conseiller vous attend.
                </strong>
                Vos messages apparaîtront ici dès l’ouverture de votre échange.
              </div>
            </section>
          )}
        </div>
        <aside className="cv-stack">
          <section className="cv-card cv-card-pad">
            <h2 className="cv-tool-title">
              <Headphones size={18} />
              Comment ça marche ?
            </h2>
            {[
              [
                "01",
                "Prenez contact",
                "Votre conseiller enregistre votre demande.",
              ],
              [
                "02",
                "Retrouvez l’échange",
                "Il vous transmet un identifiant de conversation.",
              ],
              [
                "03",
                "Discutez simplement",
                "Envoyez vos messages et recevez ses réponses en direct.",
              ],
            ].map(([n, title, desc]) => (
              <div className="cv-list-row" key={n}>
                <span className="cv-count">{n}</span>
                <div>
                  <strong>{title}</strong>
                  <p className="!leading-relaxed">{desc}</p>
                </div>
                {n === "03" && <Check size={14} className="text-emerald-600" />}
              </div>
            ))}
          </section>
          <div id="incidents">
            <Incidents />
          </div>
          <section className="cv-card cv-card-pad">
            <h2 className="cv-tool-title">
              <Wallet size={18} />
              Vos demandes bancaires
            </h2>
            <p className="cv-subtitle">
              Besoin d’un relevé, d’informations sur un compte ou d’aide avec
              votre carte ? Votre conseiller peut vous accompagner dans la
              conversation.
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
