"use client";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  ChevronDown,
  FlaskConical,
  Headphones,
  History,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import SessionGuard from "./SessionGuard";
import Brand from "./Brand";
import GuidedTour from "./GuidedTour";
import RouteProgress from "./shell/RouteProgress";
import { logoutSession } from "@/lib/api";
import { activeHref, splitNav, staffNav, type NavItem } from "@/lib/navigation";

const icons: Record<string, LucideIcon> = {
  workspace: MessageSquare, history: History, clients: UserPlus, tools: BookOpen, ai: Sparkles,
  overview: House, followup: Bell, twin: FlaskConical, users: Users, frontdesk: Headphones,
  catalog: Package, advisors: LayoutDashboard, rules: SlidersHorizontal,
};
const roleName: Record<string, string> = {
  Conseiller: "Conseiller", Superviseur: "Superviseur", "Analyste / Admin": "Administrateur",
};
const VISIBLE_ITEMS = 5;

// The staff spaces share the customer's banner layout: the brand, one link per page, the guide and
// the account on the right, and a menu panel on small screens. Each page is its own route.
export default function AppShell({
  role,
  initials,
  title,
  children,
}: {
  role: string;
  initials: string;
  title: string;
  // Kept for the pages that still pass it: every space now shares the same direction.
  variant?: "green";
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const items = staffNav(role);
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    setSearch(window.location.search);
    try { setEmail(JSON.parse(sessionStorage.getItem("user") || "{}").email || ""); } catch {}
    // The admin page announces its tab; the banner follows it.
    const section = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (id) setSearch("?section=" + encodeURIComponent(id));
    };
    window.addEventListener("callverse:section", section);
    return () => window.removeEventListener("callverse:section", section);
  }, []);
  useEffect(() => {
    if (!accountOpen && !moreOpen && !mobileOpen) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") { setAccountOpen(false); setMoreOpen(false); setMobileOpen(false); }
        return;
      }
      const target = event.target as HTMLElement;
      if (!target.closest(".cv-cs-account")) setAccountOpen(false);
      if (!target.closest(".cv-cs-more")) setMoreOpen(false);
      if (!target.closest(".cv-cs-mobile-panel, .cv-cs-mobile-toggle")) setMobileOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("click", close);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("click", close); };
  }, [accountOpen, moreOpen, mobileOpen]);
  useEffect(() => { setMoreOpen(false); setMobileOpen(false); setAccountOpen(false); }, [pathname]);

  const current = activeHref(items, pathname, search);
  const { visible, more } = splitNav(items, VISIBLE_ITEMS, current);

  function open(item: NavItem, event: React.MouseEvent) {
    // Admin sections are tabs of one page: switch the tab in place instead of reloading the page.
    if (item.href.startsWith("/admin?") && window.location.pathname === "/admin") {
      event.preventDefault();
      const id = new URLSearchParams(item.href.split("?")[1]).get("section") || "";
      window.history.replaceState(null, "", item.href);
      setSearch("?section=" + encodeURIComponent(id));
      window.dispatchEvent(new CustomEvent("callverse:navigate", { detail: id }));
      setMoreOpen(false); setMobileOpen(false);
    }
  }
  function logout() {
    void logoutSession().catch(() => { /* The local session is already closed. */ });
    router.push("/login?logout=1");
  }
  const link = (item: NavItem, className: string, currentClass: string) => {
    const Icon = icons[item.icon] || MessageSquare;
    const isCurrent = item.href === current;
    return (
      <Link key={item.href} href={item.href} onClick={event => open(item, event)}
        // Fixed same-origin AI links copy the tab's session and keep the chat mounted.
        target={item.icon === "ai" ? "_blank" : undefined} rel={item.icon === "ai" ? "opener" : undefined}
        data-tour={item.icon === "ai" ? "ai-entry" : undefined}
        className={className + (isCurrent ? " " + currentClass : "")} aria-current={isCurrent ? "page" : undefined}>
        <Icon size={17} aria-hidden="true" />{item.label}
      </Link>
    );
  };

  return (
    <SessionGuard>
      <div className="cv-cs cv-staff">
        <div className="cv-cs-orbs" aria-hidden="true"><span /><span /><span /></div>
        <a href="#main-content" className="cv-button cv-skip-link">Aller au contenu principal</a>
        <header className="cv-cs-banner">
          <div className="cv-cs-banner-inner">
            <Brand dark />
            <nav className="cv-cs-nav" aria-label="Navigation principale" data-tour="navigation">
              {visible.map(item => link(item, "cv-cs-nav-link", "cv-cs-nav-current"))}
              {more.length > 0 && (
                <div className="cv-cs-more">
                  <button type="button" className="cv-cs-nav-link" aria-expanded={moreOpen} onClick={() => setMoreOpen(o => !o)}>
                    Plus <ChevronDown size={15} aria-hidden="true" />
                  </button>
                  {moreOpen && <div className="cv-cs-more-menu">{more.map(item => link(item, "cv-cs-more-link", "cv-cs-more-current"))}</div>}
                </div>
              )}
            </nav>
            <div className="cv-cs-tools">
              <GuidedTour />
              <div className="cv-cs-account">
                <button type="button" className="cv-cs-account-trigger" aria-expanded={accountOpen} aria-haspopup="true"
                  aria-label={initials + ", menu du compte"} data-tour="account" onClick={() => setAccountOpen(o => !o)}>
                  <span className="cv-cs-avatar" aria-hidden="true">{initials}</span>
                  <span className="cv-cs-account-name">{roleName[role] || role}</span>
                  <ChevronDown size={15} aria-hidden="true" />
                </button>
                {accountOpen && <div className="cv-cs-account-menu">
                  <strong>{roleName[role] || role}</strong>
                  <p>{email}</p>
                  <button type="button" onClick={logout}><LogOut size={16} aria-hidden="true" />Se déconnecter</button>
                </div>}
              </div>
              <button type="button" className="cv-cs-mobile-toggle" aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
                aria-expanded={mobileOpen} data-tour="mobile-menu" onClick={() => setMobileOpen(o => !o)}>
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
          <RouteProgress />
        </header>
        {mobileOpen && (
          <nav className="cv-cs-mobile-panel" aria-label="Navigation principale (mobile)">
            {items.map(item => link(item, "cv-cs-mobile-link", "cv-cs-mobile-current"))}
          </nav>
        )}
        <main className="cv-cs-main cv-staff-main cv-green" id="main-content" tabIndex={-1} aria-label={title}>
          <div className="cv-cs-page" key={pathname}>{children}</div>
        </main>
      </div>
    </SessionGuard>
  );
}
