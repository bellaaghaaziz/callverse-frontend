import AppShell from "@/components/AppShell";
import TwinLab from "@/components/twin/TwinLab";
import Link from "next/link";
export default function Page() { return <AppShell role="Superviseur" initials="SV" title="Jumeau numérique"><Link className="cv-button cv-button-secondary" href="/supervisor">Retour au superviseur</Link><TwinLab /></AppShell>; }
