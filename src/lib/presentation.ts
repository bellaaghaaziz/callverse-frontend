export const skillLabel: Record<string, string> = {
  ACCOUNTS: "Comptes",
  CARDS: "Cartes bancaires",
  CREDIT: "Crédit",
  FRAUD: "Fraude",
};
export const statusLabel: Record<string, string> = {
  QUEUED: "En attente",
  ASSIGNED: "À prendre en charge",
  ACTIVE: "En cours",
  ESCALATED: "Escaladée",
  RESOLVED: "Résolue",
  ABANDONED: "Terminée",
  BLOCKED: "Bloquée",
  EXPIRED: "Expirée",
  CANCELLED: "Annulée",
  FROZEN: "Gelé",
  CLOSED: "Clôturé",
};
export const roleLabel: Record<string, string> = {
  CUSTOMER: "Client",
  ADVISOR: "Conseiller",
  SUPERVISOR: "Superviseur",
  ADMIN: "Administrateur",
  SYSTEM: "Information",
};
export const intentLabel: Record<string, string> = {
  BALANCE: "Solde du compte",
  CARD: "Carte bancaire",
  CREDIT: "Demande de crédit",
  FRAUD: "Suspicion de fraude",
  ACCOUNT_CLOSURE: "Clôture de compte",
  OTHER: "Autre demande",
};
export const initialsFor = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "CV";
export const timeLabel = (time: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(time));

export const segmentLabel: Record<string, string> = {
  STANDARD: "Standard",
  MASS: "Particulier",
  AFFLUENT: "Premium",
  PREMIUM: "Premium",
  PRIVATE: "Banque privée",
  BUSINESS: "Professionnel",
};
export const serviceLabel: Record<string, string> = {
  ONLINE_BANKING: "Banque en ligne",
  MOBILE_BANKING: "Application mobile",
  CARDS: "Cartes bancaires",
  CARD_PAYMENTS: "Paiements par carte",
  TRANSFERS: "Virements",
  ATM: "Distributeurs",
  PAYMENTS: "Paiements",
};
export function durationLabel(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days) return days + " j " + hours + " h";
  if (hours) return hours + " h " + Math.floor((seconds % 3600) / 60) + " min";
  return (
    String(Math.floor(seconds / 60)).padStart(2, "0") +
    ":" +
    String(seconds % 60).padStart(2, "0")
  );
}
