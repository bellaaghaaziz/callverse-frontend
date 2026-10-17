import AppShell from "@/components/AppShell";
import AiWorkspace from "@/components/ai/AiWorkspace";
import Link from "next/link";
export default function Page() {
  return <AppShell role="Analyste / Admin" initials="AD" title="Pilotage IA"><Link data-tour="ai-return" className="cv-button cv-button-secondary" href="/admin">Retour à l’administration</Link><AiWorkspace /></AppShell>;
}
