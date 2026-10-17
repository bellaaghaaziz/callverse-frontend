import AppShell from "@/components/AppShell";
import AiLab from "@/components/AiLab";
import Link from "next/link";
export default function Page() {
  return <AppShell role="Superviseur" initials="SV" title="Essais IA"><Link className="cv-button cv-button-secondary" href="/supervisor">Retour au superviseur</Link><AiLab supervision /></AppShell>;
}
