"use client";
import { useState } from "react";
import WorkforceCard from "./WorkforceCard";
import SimulationStudio from "./SimulationStudio";
import QualityCard from "./QualityCard";
import ConversationPicker, { type ConversationChoice } from "@/components/ConversationPicker";

export default function AiWorkspace() {
  const [conversation, setConversation] = useState<ConversationChoice | null>(null);
  return <div className="cv-ai-workspace"><div className="cv-page-heading"><div><p className="cv-eyebrow">INTELLIGENCE ARTIFICIELLE</p><h1>Analysez, simulez, améliorez.</h1><p className="cv-subtitle">Des recommandations sur votre activité et des dialogues simulés dans un espace dédié.</p></div></div>
    <WorkforceCard /><SimulationStudio />
    <section className="cv-card cv-card-pad cv-section" data-tour="quality-lookup"><h2 className="cv-tool-title">Consulter une évaluation qualité</h2><p className="cv-subtitle">Choisissez un échange résolu ci-dessous pour lire son évaluation ou lancer l’analyse qualité.</p>
      <div className="cv-section"><ConversationPicker title="Conversations résolues" resolvedOnly selectedId={conversation?.id} onSelect={choice=>{
        setConversation(choice);
        requestAnimationFrame(()=>document.getElementById("quality-selected")?.scrollIntoView({behavior:"smooth",block:"start"}));
      }} /></div>
      {conversation && <p className="cv-notice cv-section" id="quality-selected">Échange sélectionné : {conversation.customerName} · {conversation.advisorName || "Conseiller non attribué"}</p>}
      {conversation && <QualityCard key={conversation.id} conversationId={conversation.id} status={conversation.status} />}
    </section>
  </div>;
}
