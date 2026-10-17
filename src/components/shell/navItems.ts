import {
  MessageSquare,
  LayoutDashboard,
  Users,
  BookOpen,
  SlidersHorizontal,
  Package,
  Headphones,
  Activity,
  House,
  Bell,
} from "lucide-react";

// Sidebar items per role: each id is a section on the page (or an admin tab).
export const itemsByRole = {
  Conseiller: [
    { id: "workspace", label: "Espace de travail", icon: MessageSquare },
    { id: "history", label: "Mes conversations", icon: MessageSquare },
    { id: "frontdesk", label: "Enregistrer un contact", icon: Headphones },
    { id: "knowledge", label: "Procédures", icon: BookOpen },
    { id: "incidents", label: "Incidents", icon: Activity },
  ],
  Superviseur: [
    { id: "workspace", label: "Vue d’ensemble", icon: House },
    { id: "alerts", label: "Alertes", icon: Bell },
    { id: "conversation", label: "Conversations", icon: MessageSquare },
    { id: "frontdesk", label: "Accueil", icon: Headphones },
  ],
  Client: [
    { id: "workspace", label: "Mon espace", icon: LayoutDashboard },
    { id: "conversation", label: "Mes échanges", icon: MessageSquare },
    { id: "incidents", label: "Incidents de service", icon: Activity },
  ],
  "Analyste / Admin": [
    { id: "Utilisateurs", label: "Utilisateurs", icon: Users },
    { id: "Procédures", label: "Procédures", icon: BookOpen },
    { id: "Accueil", label: "Accueil", icon: Headphones },
    { id: "Catalogue produits", label: "Catalogue", icon: Package },
    { id: "Conseillers", label: "Conseillers", icon: Headphones },
    { id: "Règles", label: "Règles et accès", icon: SlidersHorizontal },
  ],
};
