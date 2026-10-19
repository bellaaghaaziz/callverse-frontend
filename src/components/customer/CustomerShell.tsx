"use client";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Home, LifeBuoy, LogOut, MessageSquare, Wallet } from "lucide-react";
import SessionGuard from "@/components/SessionGuard";
import Brand from "@/components/Brand";
import GuidedTour from "@/components/GuidedTour";
import RouteProgress from "@/components/shell/RouteProgress";
import { apiFetch, errorMessage, logoutSession } from "@/lib/api";
import { customerNav, isCurrent } from "@/lib/customer";
import { initialsFor } from "@/lib/presentation";
import type { Customer } from "@/lib/contracts";

// The customer's own space: a bank-style banner instead of the staff sidebar,
// one page per need (home, accounts, messages, help), and the profile loaded once for all of them.
interface CustomerSpace { profile: Customer | null; error: string; reload: () => void }
const CustomerContext = createContext<CustomerSpace>({ profile: null, error: "", reload: () => {} });
export const useCustomer = () => useContext(CustomerContext);

const icons = { "/client": Home, "/client/comptes": Wallet, "/client/messages": MessageSquare, "/client/aide": LifeBuoy };

export default function CustomerShell({ children }: { children: ReactNode }) {
  return <SessionGuard><CustomerFrame>{children}</CustomerFrame></SessionGuard>;
}

function CustomerFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Customer | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const reload = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch<Customer>("/me/customer", { signal: controller.signal })
      .then(customer => { if (!controller.signal.aborted) { setProfile(customer); setError(""); } })
      .catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    try { setEmail(JSON.parse(sessionStorage.getItem("user") || "{}").email || ""); } catch {}
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !(event.target as HTMLElement).closest(".cv-cs-account")) setMenuOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("click", close);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("click", close); };
  }, [menuOpen]);
  useEffect(() => setMenuOpen(false), [pathname]);
  const name = profile ? `${profile.firstName} ${profile.lastName}` : "";
  function logout() {
    void logoutSession().catch(() => { /* The local session is already closed. */ });
    router.push("/login?logout=1");
  }
  return (
    <CustomerContext.Provider value={{ profile, error, reload }}>
      <div className="cv-cs">
        <div className="cv-cs-orbs" aria-hidden="true"><span /><span /><span /></div>
        <a href="#main-content" className="cv-button cv-skip-link">Aller au contenu principal</a>
        <header className="cv-cs-banner">
          <div className="cv-cs-banner-inner">
            <Brand dark />
            <nav className="cv-cs-nav" aria-label="Mon espace" data-tour="navigation">
              {customerNav.map(item => {
                const Icon = icons[item.href];
                const current = isCurrent(pathname, item.href);
                return <Link key={item.href} href={item.href} className={"cv-cs-nav-link" + (current ? " cv-cs-nav-current" : "")} aria-current={current ? "page" : undefined}>
                  <Icon size={17} aria-hidden="true" />{item.label}
                </Link>;
              })}
            </nav>
            <div className="cv-cs-tools">
              <GuidedTour />
              <div className="cv-cs-account">
                <button type="button" className="cv-cs-account-trigger" aria-expanded={menuOpen} aria-haspopup="true"
                  aria-label={(name ? initialsFor(name) + ", " : "") + "menu de mon compte"} data-tour="account" onClick={() => setMenuOpen(open => !open)}>
                  <span className="cv-cs-avatar" aria-hidden="true">{name ? initialsFor(name) : "··"}</span>
                  <span className="cv-cs-account-name">{profile?.firstName || "Mon compte"}</span>
                  <ChevronDown size={15} aria-hidden="true" />
                </button>
                {menuOpen && <div className="cv-cs-account-menu">
                  <strong>{name || "Mon compte"}</strong>
                  <p>{email}</p>
                  {profile && <p className="cv-cs-account-ref">Client n° {profile.externalRef}</p>}
                  <button type="button" onClick={logout}><LogOut size={16} aria-hidden="true" />Se déconnecter</button>
                </div>}
              </div>
            </div>
          </div>
          <RouteProgress />
        </header>
        <main className="cv-cs-main" id="main-content" tabIndex={-1}>
          <div className="cv-cs-page" key={pathname}>{children}</div>
        </main>
        <nav className="cv-cs-tabbar" aria-label="Mon espace (mobile)" data-tour="mobile-menu">
          {customerNav.map(item => {
            const Icon = icons[item.href];
            const current = isCurrent(pathname, item.href);
            return <Link key={item.href} href={item.href} className={"cv-cs-tab" + (current ? " cv-cs-tab-current" : "")} aria-current={current ? "page" : undefined}>
              <Icon size={20} aria-hidden="true" /><span>{item.label}</span>
            </Link>;
          })}
        </nav>
      </div>
    </CustomerContext.Provider>
  );
}
