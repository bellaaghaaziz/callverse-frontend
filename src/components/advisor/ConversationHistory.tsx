"use client";
import { useState } from "react";
import ConversationPicker, {type ConversationChoice} from "../ConversationPicker";
import ConversationPanel from "../ConversationPanel";
import type { AdvisorWorkspace } from "@/hooks/useAdvisorWorkspace";

export default function ConversationHistory({workspace}: {workspace: AdvisorWorkspace}) {
  const [selected, setSelected] = useState<ConversationChoice | null>(null);
  return <section className="cv-card cv-card-pad cv-section" id="history">
    <ConversationPicker title="Retrouver mes conversations" selectedId={selected?.id || workspace.activeConvId} onSelect={choice=>{
      if (["ASSIGNED","ACTIVE","ESCALATED"].includes(choice.status)) {
        setSelected(null);
        void workspace.perform(async()=>{
          await workspace.refreshMine();
          workspace.setActiveConvId(choice.id);
          document.querySelector(".cv-advisor-grid")?.scrollIntoView({behavior:"smooth",block:"start"});
        });
      } else {
        setSelected(choice);
        requestAnimationFrame(()=>document.getElementById("advisor-history-detail")?.scrollIntoView({behavior:"smooth",block:"start"}));
      }
    }} />
    {selected && <div className="cv-section" id="advisor-history-detail"><h3 className="cv-tool-title">{selected.customerName} · Historique de l’échange</h3><ConversationPanel key={selected.id} id={selected.id} role="ADVISOR" /></div>}
  </section>;
}
