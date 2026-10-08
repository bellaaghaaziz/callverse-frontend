# Frontend design

The landing page, login and all four role spaces now share an original CallVerse interface: navy navigation, warm white workspaces, teal actions, and consistent typography. The implementation adds no UI framework or paid assets.

## Main changes

- Responsive sidebar with working section navigation and admin tabs, keyboard focus management, Escape handling and logout.
- Adviser workspace with inbox, active conversation and customer context. Customer names, translated statuses, account and card details, and real actions remain connected to the existing API.
- Shared chat rendering for adviser, customer, supervisor and administrator: sender identification, message times, day separators, grouped messages and readable bubbles.
- Messages follow the bottom of the thread when appropriate. Reading older messages preserves your position; a new-message button returns to the latest message. Resizing the viewport preserves the bottom position.
- Clearer customer onboarding, live supervision and user-management screens.
- Hardcoded AI reply removed. The public-page example is explicitly illustrative; authenticated screens use backend data.

Reusable components live in src/components (AppShell, Brand, StatusBadge, ChatThread). Presentation labels and date/duration helpers live in src/lib/presentation.ts. Styling lives in src/app/globals.css.

## Verification

Lint, TypeScript, four API/STOMP regression tests and the production build pass. Browser checks covered all six pages at desktop (1440px) and mobile (390px), without page errors or horizontal overflow.

The four roles were checked against the running backend for authentication, permitted reads, live connections, logout, token expiry and role protection. Adviser mutations were tested with intercepted responses: empty queue, messages, duplicate delivery, stale status events, card blocking, tickets, resolution, escalation, abandonment and contact registration. Those browser checks did not change backend records.

Additional chat checks covered automatic scrolling, retained reading position, jumping to new messages, mobile input visibility, viewport resizing and mobile-menu keyboard focus.

The backend integration scope and remaining backend capabilities are documented in BACKEND_INTEGRATION_STATUS.md.
