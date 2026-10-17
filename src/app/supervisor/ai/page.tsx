import AppShell from "@/components/AppShell";
import AiWorkspace from "@/components/ai/AiWorkspace";
import Link from "next/link";
export default function Page() {
  return <AppShell role="Superviseur" initials="SV" title="Pilotage IA"><Link className="cv-button cv-button-secondary" href="/supervisor">Retour au superviseur</Link><AiWorkspace /></AppShell>;
}
