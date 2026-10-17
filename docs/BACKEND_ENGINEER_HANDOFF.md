# CallVerse — backend engineer handoff report

**Prepared:** 8 October 2026
**Purpose:** Summarize frontend integration coverage, confirmed backend contract issues, and the work needed for the next phase.

## 1. Current status and scope

The frontend invokes **all 27 core REST operations currently exposed by the local backend under `/api/v1`**. Available conversation, queue, supervision KPI and supervision alert WebSocket subscriptions are connected.

The integrated frontend, including its redesign, was published to `bellaaghaaziz/callverse-frontend`, branch `main`, commit `45feac8`. The backend source reviewed is commit `c8471a5`. Backend implementation files were not modified during frontend integration.

This is an integration-coverage statement. It does **not** mean all operations have been exercised successfully against the live database. The live checks and their limits are described in section 6.

The inventory covers the application API used by the frontend. Swagger/OpenAPI and Actuator infrastructure endpoints are outside this count. The separate AI-service repository has not been reviewed in this workspace.

## 2. REST operations wired to the frontend

All paths below are relative to `/api/v1`. Query parameters shown describe current frontend usage.

| # | Method | Endpoint | Frontend integration |
|---|---|---|---|
| 1 | POST | `/auth/login` | Login form and four demo-role buttons; stores the bearer token and expiry. |
| 2 | GET | `/auth/me` | Identity verification, role routing and protected-page session checks. |
| 3 | GET | `/customers?externalRef=…` | Staff lookup before registering a customer contact. |
| 4 | GET | `/customers/{id}` | Adviser customer dossier, accounts/cards and conversation-list customer names. |
| 5 | GET | `/customers/{id}/transactions?count=10` | Adviser recent-transactions panel. |
| 6 | POST | `/conversations` | Adviser/supervisor/admin front desk registers a contact and receives its UUID. |
| 7 | GET | `/conversations/mine` | Adviser assigned-conversation inbox and refresh after actions. |
| 8 | GET | `/conversations/{id}` | Customer and staff conversation inspection; access check before shared-panel subscription. |
| 9 | GET | `/conversations/{id}/messages?limit=200` | Initial transcript and REST resynchronization after reconnection. |
| 10 | POST | `/conversations/{id}/messages` | Adviser and customer message sending; REST response merged with live delivery. |
| 11 | POST | `/conversations/{id}/resolve` | Adviser resolution and supervisor resolution of an escalated conversation. |
| 12 | POST | `/conversations/{id}/abandon` | End a conversation when the customer leaves, where permitted. |
| 13 | POST | `/conversations/{id}/escalations` | Adviser escalation form with an entered reason. |
| 14 | GET | `/queues` | Adviser queue counts and refresh. |
| 15 | POST | `/queues/{skill}/next` | Take the next eligible contact; an empty queue's HTTP 204 is handled normally. |
| 16 | POST | `/cards/{id}/block` | Adviser card-block action with reason `FRAUD_SUSPECTED`; customer details refresh afterward. |
| 17 | POST | `/tickets` | Adviser ticket form: customer/conversation IDs, category, title, description and severity. |
| 18 | GET | `/kb/articles?q=…&limit=5` | Procedure search and article reading. |
| 19 | GET | `/service-incidents` | Customer/adviser incident panels; adviser includes regional and national incidents. |
| 20 | GET | `/supervision/kpi` | Initial supervisor KPI snapshot and refresh. |
| 21 | GET | `/health/status` | Public service-availability indicator on login. |
| 22 | GET | `/admin/users` | Paginated user list with `page`, `size`, `q`, `role` and `active` filters. |
| 23 | GET | `/admin/users/{id}` | User details. |
| 24 | POST | `/admin/users` | Account creation form. |
| 25 | PUT | `/admin/users/{id}/role` | Change a user's role. |
| 26 | POST | `/admin/users/{id}/block` | Block an account. |
| 27 | POST | `/admin/users/{id}/unblock` | Unblock an account. |

Role restrictions remain enforced by the backend. Frontend controls also reflect permitted business states. Supervisor/admin conversation views do not provide a chat composer. The administrator cannot change their own role or block their own account through the UI.

## 3. Real-time integration

The frontend uses native STOMP over the backend `/ws` connection.

| Topic | Connected behavior |
|---|---|
| `/topic/conversation/{conversationId}` | Message and status updates for the selected, authorized conversation. |
| `/topic/queue/{skill}` | Updates across the adviser's displayed skill queues, rather than only the first queue. |
| `/topic/supervision/kpi` | Supervisor metrics update from the live feed. |
| `/topic/supervision/alerts` | Escalation and fraud-card-block alerts received during the current session. |

Subscriptions survive reconnects; removed subscriptions are not restored. Messages are deduplicated across REST and WebSocket delivery, and older status events are ignored. Conversation data is resynchronized through REST after reconnection.

`/topic/runs/{runId}` is described as a future simulation topic in the supplied guide. No functioning simulation feed has been integrated or claimed.

## 4. Confirmed backend contract/documentation issues

### B1 — OpenAPI does not correctly describe nullable response fields

**Classification:** Confirmed contract defect; frontend compatibility handling is in place.

The previously checked live contract reports OpenAPI 3.0.1. The response fields below can be null but lack the corresponding nullable declaration:

| Schema | Fields |
|---|---|
| `Conversation` | `advisorId`, `intent`, `assignedAt`, `endedAt` |
| `LiveKpi` | `averageWaitSeconds`, `slaRatio`, `abandonRate` |
| `Queue` | `oldestWaitSeconds` |

Evidence includes live responses with `endedAt: null` and empty queues with `oldestWaitSeconds: null`. Current DTOs also describe or produce null values. An optional property and a property containing null are different contracts.

**Impact:** Generated frontend types do not accurately represent valid responses. Other clients generated from the same contract can encounter the same mismatch.

**Backend action:** Correct the nullable schema metadata and regenerate the published contract. Relevant files:

- `src/main/java/com/callverse/host/api/dto/response/ConversationResponse.java`
- `src/main/java/com/callverse/host/api/dto/response/LiveKpiResponse.java`
- `src/main/java/com/callverse/host/api/dto/response/QueuesResponse.java`

**Acceptance criteria:** Contract tests cover queued/unfinished conversations, empty queues and KPI snapshots without sufficient observations. Generated client types explicitly allow valid null values.

**Frontend follow-up:** Regenerate `src/shared/api-client/generated/callverse-api.d.ts` from the corrected contract. Review the compatibility types in `src/lib/contracts.ts` before removing them.

### B2 — The supplied integration guide is behind the current API

**Classification:** Documentation mismatch.

The supplied `BACKEND_INTEGRATION_GUIDE.md` describes 21 REST operations and says lists are not paginated. Current controllers expose 27 operations; the six user-administration operations are available, and the user list is paginated.

**Backend action:** Update the guide with the administration operations, roles, request validation, response/error examples and pagination shape. User-list pages are zero-based; the controller documents a default size of 20 and supported sizes from 1 to 100.

No functional backend failure was found in the live reads checked. This should not be interpreted as a full backend correctness audit.

## 5. Capabilities still unavailable through the current frontend API

These are missing published interfaces or unreviewed AI-service capabilities, **not confirmed failures of existing endpoints**. Domain models or internal implementation may already exist. Endpoint names and payloads should be agreed with the responsible teams before frontend implementation.

| Capability | Current limitation | Interface/work needed | Coordination |
|---|---|---|---|
| Customer self-service | Customer needs a staff-provided conversation UUID; cannot discover their own conversations or start one. | Ownership-scoped conversation/account listing and customer conversation creation. | Backend |
| Adviser provisioning and presence | Creating an adviser login does not complete profile/skill provisioning; presence controls are unavailable. | Profile/skill management, adviser listing and documented presence transitions. | Backend |
| Supervisor reassignment | No published reassignment operation. | Authorized reassignment with skill/capacity checks and corresponding updates. | Backend |
| Escalation discovery and alert history | Alerts are session-only; existing escalations cannot be rediscovered through a list after reload. | Pending-escalation listing and persistent, paginated alert/history retrieval. | Backend |
| Product catalogue and rules administration | UI cannot read/manage a dedicated catalogue or configure rules. | Agreed catalogue/rule read and write contracts with validation and permissions. | Backend |
| Procedure management | Articles can be searched/read, but not created or edited. | Authorized article management and publication lifecycle, if required by the specification. | Backend |
| Commercial credits | No published grant operation. | Backend-enforced ceilings, authorization, validation and auditable grant results. | Backend |
| Customer statements and ticket history | No statement downloads or customer-owned ticket history. | Ownership-scoped lists/detail/download interfaces. | Backend |
| Session refresh / public registration | Access tokens expire; account creation is administrator-operated. | Decide whether these features are required; publish contracts only if in scope. | Backend/product |
| AI adviser | No integrated suggestions, grounded sources or agent execution. | Review the AI service; agree conversation context, retrieval, responses, tool calls, approval requirements, status and error contracts. | Backend + AI + frontend |
| Simulation / RL workforce management | No integrated run creation, progress, results or comparison. | Scenario/strategy/run contracts, progress events, agent decisions and baseline-versus-RL metrics. | Backend + AI |
| Quality analysis | No integrated scores, evaluations or review workflow. | Evaluation triggers/results, scoring definitions, conversation links and review permissions. | Backend + AI |

The backend README identifies four agents: Client Simulator, Customer Advisor, RL Workforce Manager and Quality Analyst, implemented through a separate Python/FastAPI LangGraph service. That repository has not yet been inspected here.

The README also says the previous `/internal` agent-tool HTTP surface was withdrawn. Agree the supported authenticated tool interface before connecting agents. The backend must continue to enforce business rules and permissions for agent-requested actions.

## 6. Verification performed and remaining testing

### Completed checks

- Live backend reads and authentication: all four demo roles, identity, adviser queues/conversations, customer lookup/details/transactions, transcripts, knowledge search, incidents, supervisor KPIs and administrator user listing.
- Browser checks: role login/logout, available data, live connections, handling an unknown conversation without interrupting supervision, session expiry and forged role-cookie protection.
- Frontend action checks with intercepted mutation responses: empty queue, message sending, duplicate delivery, stale status events, card blocking, configurable tickets, resolution, escalation, abandonment and contact registration.
- Regression tests for REST authentication/error handling and STOMP subscription behavior.
- Production build, TypeScript, lint and desktop/mobile interface checks.

The live checks were performed during the preceding integration work; this report is not a new live test of every operation on 8 October.

### Still required: controlled end-to-end mutation verification

Use an isolated demo/test database branch and known test accounts. Complete these scenarios with real backend responses:

1. Register a contact, take it from its queue, exchange adviser/customer messages and resolve it. Verify persistence, statuses and live updates.
2. Verify the empty-queue 204 and relevant capacity/state-conflict responses.
3. Create a ticket and confirm stored fields and conversation/customer association.
4. Block a demo card and confirm persistence and the supervisor alert.
5. Escalate a conversation, inspect it as supervisor and resolve it. Verify permissions and status changes.
6. Abandon a permitted conversation and verify its queue/KPI effects.
7. Create a user, inspect it, change its role and block/unblock it. Verify authorization, validation and documented effects on existing sessions.
8. Exercise unauthorized ownership access and invalid transitions; confirm consistent 401/403/404/409 behavior as specified.
9. Disconnect/reconnect clients during updates and verify that REST recovery restores the correct state.

These scenarios remain unverified end-to-end against real database mutations. The earlier intercepted checks prove frontend request/UI behavior, not backend persistence or complete lifecycle correctness.

## 7. Recommended delivery order

1. Correct OpenAPI nullability and synchronize the integration guide.
2. Complete controlled end-to-end testing of the existing wired operations.
3. Add conversation/escalation discovery and adviser provisioning/presence to close the most visible operational gaps.
4. In parallel, review the AI repository and agree the supported agent-tool and frontend-facing contracts.
5. Deliver one complete AI adviser workflow before expanding to simulation, RL optimization and quality review.
6. Schedule the remaining management/self-service capabilities according to the full project specification.

For the next integration handoff, provide the updated OpenAPI document, REST examples/errors, role and ownership rules, business-state transitions, WebSocket event contracts, demo fixtures and AI-service interface documentation.

## 8. Frontend issues already corrected

Frontend integration work corrected the fake local login route and simulated customer replies, mismatched demo credentials, incomplete logout/session expiry handling, unreliable shared STOMP subscriptions, missing message deduplication, incorrect account fields, fixed placeholder ticket/escalation payloads and weak action error handling. The old hardcoded AI suggestion was removed.

The current frontend presents real API data for available operations and clearly identifies unavailable capabilities. Those resolved frontend problems should not be filed as outstanding backend defects.

**Related review:** [BACKEND_INTEGRATION_STATUS.md](BACKEND_INTEGRATION_STATUS.md).
