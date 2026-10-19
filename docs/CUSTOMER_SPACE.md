# Customer space — 2026-10-19

User testing found the customer home too crowded for a non-technical customer: chats, banking
data, tickets and the incidents table on one screen. The customer space now follows the pattern of
retail banking apps: a calm home, and one page per need.

| Route | What the customer finds |
|---|---|
| `/client` | greeting, total balance, three actions, the conversation in progress, last operations, service status |
| `/client/comptes` | accounts, cards, operations grouped by day (filter by account), statement download |
| `/client/messages` | conversations headed by the advisor and the subject, new request by topic, delete with confirmation |
| `/client/aide` | follow-up of requests (`SupportDesk`) and service incidents |

- `src/app/client/layout.tsx` gives every page `CustomerShell`: a banner navigation on desktop, a
  bottom tab bar on mobile, the account menu, and the profile loaded once (`useCustomer()`).
- Staff screens keep `AppShell`. `SessionGuard` still checks the session on every route, but a
  verified page stays visible while the next route is checked, so tabs do not flash.
- Motion is CSS only (`styles/customer.css`): entrance rise, floating background shapes, hover lift,
  a pulsing dot for the live conversation. All of it stops under `prefers-reduced-motion`.
- Rules without React live in `src/lib/customer.ts`, tested in `tests/customer-space.test.mjs`.

Backend rules used (`callverse-backend`, branch `integration/ai-frontend`):

- One live conversation per customer: `409 CONVERSATION_ALREADY_OPEN` names the conversation; the
  page offers « Reprendre ma conversation en cours ».
- `DELETE /me/conversations/{id}` removes it from the customer's space (the bank keeps it);
  escalated ones answer `409 CONVERSATION_UNDER_SUPERVISION`.
- The advisor workspace shows a pop-up on `CONVERSATION_DELETED_BY_CUSTOMER` for a conversation it
  held this session.

Sign-in shows « Connexion réussie » before the space opens; sign-out lands on `/login?logout=1`
with « Vous êtes bien déconnecté. À bientôt ! ». The demonstration accounts box is gone: no demo
e-mail or password remains in the bundle.
