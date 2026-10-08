# Backend integration review — 2026-10-07

Reviewed the supplied BACKEND_INTEGRATION_GUIDE.md against the local backend source, its OpenAPI contract, the live service on port 8080, and the frontend.

## Connected flows

- Authentication: backend login, /auth/me verification, routing by verified role, JWT in sessionStorage, expiry warning, 401 sign-out, 403 permission errors, and complete logout with WebSocket disconnection.
- Advisor workspace: all skill queues and live subscriptions, taking the next conversation (including normal 204), assigned conversations, customer accounts/cards, transactions, transcript and chat, card blocking, configurable tickets, escalation with a reason, resolve and abandon.
- Front desk: customer reference lookup and staff-created conversations, available to advisors, supervisors and administrators.
- Procedures: published knowledge article search. This is search/read access, not article editing.
- Incidents: real service incidents; advisor view includes regional and national incidents.
- Supervision: real KPI snapshot and STOMP updates, nullable ratio display, session alerts, inspecting a conversation by UUID, and resolving an escalated conversation. Supervisors can read but cannot write chat messages.
- Customer portal: viewing and messaging a staff-created conversation (including while queued), live updates, and leaving the conversation. A conversation UUID must be supplied by staff.
- Administration: paged/filterable users, account details, account creation, changing roles and blocking/unblocking accounts. The current administrator cannot block themselves or change their own role.
- Public backend health status.

## Frontend mistakes corrected

1. The supervision page imported a missing useRealtime hook and used a mock WebSocket on port 8081.
2. Demo login buttons sent @banque.com addresses and demo1234 rather than the documented demo credentials.
3. A fake Next.js login endpoint accepted arbitrary credentials; it has been removed.
4. Logout cleared localStorage although login used sessionStorage, and left the live socket open.
5. Authentication expiry, /auth/me verification, 401/403 distinctions and unknown roles were not handled.
6. The role cookie was treated as sufficient for navigation. It is now only a navigation hint; /auth/me verifies identity and the backend remains the permission authority.
7. Both live hooks overwrote the shared onConnect handler, restored subscriptions unreliably, and only the first queue was followed.
8. Live chat did not deduplicate messages or handle out-of-order status updates. A last-event state also risked dropping bursts of messages; callbacks now consume each event directly.
9. Sending relied entirely on live delivery rather than merging the REST response. Reconnection now resynchronizes REST data.
10. Initial requests and most actions had no visible error handling. Business-state buttons now reflect valid transitions.
11. Customer accounts used iban rather than maskedIban; account balances, overdraft limits and currency formatting are now included.
12. Tickets and escalations used fixed placeholder values. Forms now collect the required information.
13. The account dropdown was behind the main workspace because of stacking contexts.
14. Customer chat simulated replies, and supervision/administration presented mock data as real. Available flows now use the API; unavailable features are explicitly marked.
15. The signup tab actually called login. Account creation now belongs to the administrator.
16. Trying to open an unknown conversation could send a refused STOMP subscription and interrupt the shared connection. The conversation panel now checks REST access before subscribing.

## Backend issues to send to the backend engineer

### Confirmed OpenAPI nullability mismatch

The live service reports OpenAPI 3.0.1. These nullable response fields lack nullable: true:

- Conversation: advisorId, intent, assignedAt, endedAt.
- LiveKpi: averageWaitSeconds, slaRatio, abandonRate.
- Queue: oldestWaitSeconds.

Observed examples: a live held conversation returned endedAt: null; empty queues returned oldestWaitSeconds: null. Generated TypeScript currently models these as optional non-null fields. Optional and nullable are different.

Backend correction: annotate the nullable DTO fields, regenerate openapi.yaml, and add contract assertions for nullability. Regenerate frontend types afterward. The frontend currently normalizes Conversation/LiveKpi types and handles null in the UI without hand-editing the generated contract.

Relevant backend sources:

- src/main/java/com/callverse/host/api/dto/response/ConversationResponse.java
- src/main/java/com/callverse/host/api/dto/response/LiveKpiResponse.java
- src/main/java/com/callverse/host/api/dto/response/QueuesResponse.java

### Integration guide is outdated

The supplied guide advertises 21 REST operations and says lists are not paginated. Both the current backend source and live /v3/api-docs expose 27 operations. The six user-administration operations now exist, and the users list is paginated. Update the guide to include them and their validation/errors.

No failure was found in the live read operations checked. The backend source was not changed.

## Backend gaps — unavailable endpoints, not frontend integration failures

These features still have no corresponding published controller operation in the current 27-operation API:

- Customer-owned account/conversation listing and customer-created conversations.
- Advisor profile/skill provisioning and presence, plus supervisor reassignment.
- Pending-escalation listing and alert history. Existing escalations cannot be discovered after a reload unless the supervisor already knows the conversation UUID. Alerts displayed by the frontend are those received during this session.
- Product catalogue and rules administration; article creation/editing.
- Simulation runs/comparison, quality review and AI reply suggestions.
- Commercial credit, customer statements/downloads and customer ticket history.
- Token refresh and public registration.

The guide's run topic remains a future simulation contract. No AI or simulation connection is claimed.

## Verification

- Live REST checks: all four documented demo logins and /auth/me; advisor queues, held conversations, demo customer, transactions, knowledge search, incidents, conversation/transcript; supervisor KPIs; admin user listing; customer incidents. All returned HTTP 200 with the expected frontend CORS origin.
- Headless Chrome: advisor, supervisor, administrator and customer screens, login/logout, available data, real STOMP connections, unknown conversation handling, session expiry and forged role-cookie navigation.
- Regression tests: transcript merge/deduplication, bearer/204 handling, 401 vs 403, shared STOMP subscriptions across reconnects.
- Production build, TypeScript and ESLint checks.

Action browser checks use intercepted mutation responses. They verify frontend request payloads and UI transitions without blocking cards, opening tickets or changing accounts in the live database. This does not constitute a live end-to-end mutation test.
