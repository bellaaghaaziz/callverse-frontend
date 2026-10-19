// Banner navigation for the staff spaces: one route per need, as in the customer's space.
// No React here; tested in tests/workspace-ux.test.mjs.

export interface NavItem { href: string; label: string; icon: string }

const NAV: Record<string, NavItem[]> = {
  Conseiller: [
    { href: "/advisor", label: "Poste de travail", icon: "workspace" },
    { href: "/advisor/historique", label: "Mes conversations", icon: "history" },
    { href: "/advisor/clients", label: "Clients", icon: "clients" },
    { href: "/advisor/outils", label: "Procédures et incidents", icon: "tools" },
    { href: "/advisor/ai", label: "Laboratoire IA", icon: "ai" },
  ],
  Superviseur: [
    { href: "/supervisor", label: "Vue d’ensemble", icon: "overview" },
    { href: "/supervisor/conversations", label: "Conversations", icon: "history" },
    { href: "/supervisor/suivi", label: "Suivi des demandes", icon: "followup" },
    { href: "/supervisor/clients", label: "Clients", icon: "clients" },
    { href: "/supervisor/twin", label: "Jumeau numérique", icon: "twin" },
    { href: "/supervisor/ai", label: "Pilotage IA", icon: "ai" },
  ],
  // The admin keeps its tabbed page; each banner item opens one tab.
  "Analyste / Admin": [
    { href: "/admin?section=Utilisateurs", label: "Utilisateurs", icon: "users" },
    { href: "/admin?section=Clients", label: "Clients", icon: "clients" },
    { href: "/admin?section=Proc%C3%A9dures", label: "Procédures", icon: "tools" },
    { href: "/admin?section=Accueil", label: "Accueil", icon: "frontdesk" },
    { href: "/admin?section=Jumeau%20num%C3%A9rique", label: "Jumeau numérique", icon: "twin" },
    { href: "/admin?section=Catalogue%20produits", label: "Catalogue", icon: "catalog" },
    { href: "/admin?section=Conseillers", label: "Conseillers", icon: "advisors" },
    { href: "/admin?section=R%C3%A8gles", label: "Règles et accès", icon: "rules" },
    { href: "/admin/ai", label: "Pilotage IA", icon: "ai" },
  ],
};

export function staffNav(role: string): NavItem[] {
  return NAV[role] || [];
}

// The item for the page on screen: the longest matching path, or the admin section in the query.
export function activeHref(items: NavItem[], pathname: string, search: string): string | null {
  const path = pathname.replace(/\/$/, "") || "/";
  const section = new URLSearchParams(search).get("section");
  if (path === "/admin" && items.some(item => item.href.startsWith("/admin?"))) {
    const wanted = section || "Utilisateurs";
    return items.find(item => new URLSearchParams(item.href.split("?")[1] || "").get("section") === wanted)?.href ?? items[0].href;
  }
  let best: NavItem | null = null;
  for (const item of items) {
    const base = item.href.split("?")[0];
    if ((path === base || path.startsWith(base + "/")) && (!best || base.length > best.href.split("?")[0].length)) best = item;
  }
  return best?.href ?? null;
}

// Banner space is limited: the first items stay, the rest go into « Plus ». The current page
// always stays in the banner, replacing the last visible item if needed.
export function splitNav(items: NavItem[], max: number, current?: string | null) {
  if (items.length <= max) return { visible: items, more: [] as NavItem[] };
  let visible = items.slice(0, max);
  let more = items.slice(max);
  const hidden = more.find(item => item.href === current);
  if (hidden) {
    const pushedOut = visible[max - 1];
    visible = [...visible.slice(0, max - 1), hidden];
    more = [pushedOut, ...more.filter(item => item !== hidden)];
  }
  return { visible, more };
}
