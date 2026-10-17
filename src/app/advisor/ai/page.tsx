import AppShell from "@/components/AppShell";
import AiLab from "@/components/AiLab";
import Link from "next/link";
export default function Page() {
  return <AppShell role="Conseiller" initials="CO" title="Essais IA"><Link data-tour="ai-return" className="cv-button cv-button-secondary" href="/advisor">Retour au poste conseiller</Link><AiLab /></AppShell>;
}
