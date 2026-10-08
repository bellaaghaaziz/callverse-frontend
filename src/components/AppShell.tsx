"use client";
import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  LayoutDashboard,
  Users,
  BookOpen,
  ShieldCheck,
  SlidersHorizontal,
  Package,
  Headphones,
  ChevronDown,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
  LifeBuoy,
  Activity,
  Inbox,
} from "lucide-react";
import SessionGuard from "./SessionGuard";
import Brand from "./Brand";
import { clearSession } from "@/lib/auth";
const itemsByRole = {
  Conseiller: [
    { id: "workspace", label: "Espace de travail", icon: MessageSquare },
    { id: "frontdesk", label: "Enregistrer un contact", icon: Headphones },
    { id: "knowledge", label: "Procédures", icon: BookOpen },
    { id: "incidents", label: "Incidents", icon: Activity },
  ],
  Superviseur: [
    { id: "workspace", label: "Vue d’ensemble", icon: LayoutDashboard },
    { id: "alerts", label: "Alertes", icon: Inbox },
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
export default function AppShell({
  role,
  initials,
  title,
  children,
}: {
  role: string;
  initials: string;
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width:900px)");
    const update = () => {
      setIsMobile(media.matches);
      if (!media.matches) setMobileOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (document.querySelector(".cv-mobile-close") as HTMLElement | null)?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [mobileOpen]);
  const [email, setEmail] = useState("");
  const items =
    itemsByRole[role as keyof typeof itemsByRole] || itemsByRole.Client;
  const [active, setActive] = useState(items[0].id);
  useEffect(() => {
    if (!profileOpen && !mobileOpen) return;
    const key = (event: KeyboardEvent) => {
      if (mobileOpen && event.key === "Tab") {
        const nodes = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".cv-sidebar button,.cv-sidebar a",
          ),
        ).filter((node) => node.offsetParent !== null);
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
      if (event.key === "Escape") {
        setProfileOpen(false);
        setMobileOpen(false);
      }
    };
    const click = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest(".cv-account-container"))
        setProfileOpen(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("click", click);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("click", click);
    };
  }, [profileOpen, mobileOpen]);
  useEffect(() => {
    try {
      setEmail(JSON.parse(sessionStorage.getItem("user") || "{}").email || "");
    } catch {}
    const listener = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (id) setActive(id);
    };
    window.addEventListener("callverse:section", listener);
    return () => window.removeEventListener("callverse:section", listener);
  }, []);
  function logout() {
    clearSession();
    router.push("/");
  }
  function navigate(id: string) {
    setActive(id);
    setMobileOpen(false);
    if (role === "Analyste / Admin")
      window.dispatchEvent(
        new CustomEvent("callverse:navigate", { detail: id }),
      );
    else
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return (
    <SessionGuard>
      <div className="cv-app">
        {mobileOpen && (
          <button
            className="cv-nav-backdrop"
            tabIndex={-1}
            aria-label="Fermer la navigation"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside
          inert={isMobile && !mobileOpen}
          aria-hidden={isMobile && !mobileOpen}
          className={"cv-sidebar " + (mobileOpen ? "cv-sidebar-open" : "")}
        >
          <div className="cv-sidebar-brand">
            <Brand dark />
            <button
              className="cv-mobile-close"
              aria-label="Fermer le menu"
              onClick={() => setMobileOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <div className="cv-workspace-switch">
            <span className="cv-workspace-logo">
              <Headphones size={18} />
            </span>
            <div>
              <strong>Espace CallVerse</strong>
              <small>Relation client bancaire</small>
            </div>
            <ChevronDown size={14} />
          </div>
          <p className="cv-nav-caption">VOTRE ESPACE</p>
          <nav aria-label="Navigation principale">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={
                  "cv-nav-item " + (active === item.id ? "cv-nav-active" : "")
                }
                aria-current={active === item.id ? "page" : undefined}
              >
                <item.icon size={19} />
                <span>{item.label}</span>
                {active === item.id && <span className="cv-nav-active-dot" />}
              </button>
            ))}
          </nav>
          <div className="cv-sidebar-bottom">
            <div className="cv-sidebar-help">
              <LifeBuoy size={20} />
              <strong>Un espace, chaque échange.</strong>
              <p>
                Retrouvez vos conversations et les outils utiles à votre rôle.
              </p>
            </div>
            <div className="cv-sidebar-account">
              <span className="cv-avatar">{initials}</span>
              <div>
                <strong>
                  {role === "Analyste / Admin" ? "Administrateur" : role}
                </strong>
                <small title={email}>{email || "Session active"}</small>
              </div>
              <button
                aria-label="Se déconnecter"
                title="Se déconnecter"
                onClick={logout}
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </aside>
        <div className="cv-app-content" inert={mobileOpen}>
          <header className="cv-app-header">
            <div className="cv-header-left">
              <button
                className="cv-mobile-toggle cv-icon-button"
                aria-label="Ouvrir le menu"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={21} />
              </button>
              <div className="cv-breadcrumb">
                <span>CallVerse</span>
                <span>/</span>
                <strong>{title}</strong>
              </div>
            </div>
            <div className="cv-header-right">
              <span className="cv-header-role">
                <ShieldCheck size={14} />
                {role === "Analyste / Admin" ? "Administration" : role}
              </span>
              <div className="relative cv-account-container">
                <button
                  aria-label="Menu du compte"
                  aria-expanded={profileOpen}
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="cv-account-trigger"
                >
                  <span className="cv-avatar cv-avatar-light">{initials}</span>
                  <ChevronDown size={15} />
                </button>
                {profileOpen && (
                  <div className="cv-account-menu">
                    <strong>Session active</strong>
                    <p>{email}</p>
                    <button onClick={logout}>
                      <LogOut size={16} />
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="cv-main" id="main-content">
            {children}
          </main>
          <footer className="cv-app-footer">
            <span>
              <span className="cv-footer-dot" />
              CallVerse · Relation client
            </span>
            <span>
              Chaque échange compte.
              <ArrowUpRight size={12} />
            </span>
          </footer>
        </div>
      </div>
    </SessionGuard>
  );
}
