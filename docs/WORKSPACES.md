# Staff workspaces — 2026-10-19

Every role now uses the banner layout of the customer space: the brand, one link per page, the
guide and the account on the right, a menu panel on mobile. The old sidebar that scrolled inside one
long page is gone (`navItems.ts` and `GreenSidebar.tsx` removed).

| Role | Pages |
|---|---|
| Advisor | `/advisor` workstation (live activity strip + queue chart), `/advisor/historique`, `/advisor/clients`, `/advisor/outils`, `/advisor/ai` |
| Supervisor | `/supervisor` overview (KPIs, 3 live charts, workforce, queues, alerts), `/supervisor/conversations`, `/supervisor/suivi`, `/supervisor/clients`, `/supervisor/twin`, `/supervisor/ai` |
| Admin | `/admin` tabs, one banner link per tab (extra links under « Plus »), new « Clients » tab |

- Navigation lives in `src/lib/navigation.ts` (tested). `AppShell` keeps its props, so pages did
  not change how they call it; `<main>` keeps `cv-green` so Aziz's component styles still apply.
- Motion: a page transition on every route (`.cv-cs-page`), a progress bar under the banner while
  the next page loads (`RouteProgress`), and a branded launch screen while the session is secured
  (`LaunchScreen`, in `SessionGuard`). Pages of a space already verified open without it.
  Everything stops under `prefers-reduced-motion`.
- Charts (`src/components/charts`): bars for magnitude, one stacked bar for part-to-whole, a line for
  change over time. Pure SVG/HTML, a data table for screen readers, values written as text. The
  4-colour order of the stacked bar passes the dataviz validator (CVD, contrast, chroma).
- Customers can be opened by advisors, supervisors and admins (`/…/clients`, admin « Clients »):
  backend `POST /api/v1/customers` creates the login, profile, current account (valid IBAN) and
  debit card in one transaction. The temporary password is checked in the form with the backend's
  rules, can be generated, and is shown once.
- The customer's accounts page adds « Mes dépenses sur 30 jours ».

Banking features worth adding next (not built): card opposition and limits by the customer
(needs a customer-facing card route), notification centre (statement ready, payment refused),
budget categories set by the customer, transfers between own accounts, appointment booking with
the advisor, secure document upload (KYC).
