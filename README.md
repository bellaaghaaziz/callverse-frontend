# CallVerse frontend

Pour les parcours IA connectés à Spring (effectifs, simulation et lecture qualité),
voir [AI_CONNECTED.md](docs/AI_CONNECTED.md) et le lancement local sur le port 3100.

Une visite guidée accompagne chaque compte à sa première visite des espaces
authentifiés. Le bouton **Guide** permet de la relancer ; voir [GUIDED_TOUR.md](docs/GUIDED_TOUR.md).

Next.js frontend for the CallVerse backend. Authentication, the advisor workspace, live supervision, staff contact registration, existing customer chat, incidents, knowledge search and user administration use real backend endpoints.

## Local setup

Run commands from this directory:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Default backend URLs are http://localhost:8080/api/v1 and ws://localhost:8080/ws. Configure NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL in this directory's .env.local. For HTTPS deployments, use HTTPS/WSS and configure the backend CORS_ALLOWED_ORIGINS with the exact frontend origin.

For the demo, start the backend with its dev profile and CALLVERSE_DEMODATA_ENABLED=true. The documented demo accounts use customer@callverse.local, advisor@callverse.local, supervisor@callverse.local and admin@callverse.local. Use the backend integration guide's demo password; these accounts are for local demonstrations.

Customer chat requires the UUID of a conversation staff registered for that customer. Customer self-service account/conversation lists and chat creation are not yet available.

## Validation

```powershell
npm run lint
npm test
npm run typecheck
npm run build
```

After a backend contract change, start the backend on http://localhost:8080 and run `npm run gen:api` to regenerate src/shared/api-client/generated/callverse-api.d.ts from its OpenAPI document.

GitHub Actions runs the same four checks on every pull request and push to main (.github/workflows/ci.yml).

To build without overwriting a running development server's output:

```powershell
$env:CALLVERSE_BUILD_DIR = ".next-validation"
npm run build
```

Unset CALLVERSE_BUILD_DIR afterward for normal development. Never commit real .env files or credentials.

See [the integration review](docs/BACKEND_INTEGRATION_STATUS.md) for connected flows, backend contract findings, remaining endpoints and verification limits.

See [the frontend design notes](docs/FRONTEND_DESIGN.md) for the interface, reusable components and browser checks.

See [the green direction guide](docs/GREEN_DIRECTION.md) for the R4.7 redesign (landing, login, supervisor): tokens, components, scoping, and how to bring the other screens into it.

## Styles

`src/app/globals.css` imports Tailwind, then the files in `src/app/styles/` in a fixed order: tokens, base, shell, components, workspace, app-responsive, shell-green, supervisor, landing, landing-preview, landing-sections, landing-responsive, login, login-story, login-responsive, loader, refinements. The green-direction proposal (R4.7) has its own `--lp-*` tokens: the landing, the login and the supervisor screen use them; the other app screens do not. `shell-green.css` styles `AppShell variant="green"` (under `.cv-shell-green`) and `supervisor.css` the supervisor dashboard: shared classes under `.cv-supervisor`, its own classes rendered only by `src/components/supervisor/`. Keep those class names out of other screens. The order is the cascade, so add a rule to the file for its area rather than at the end of the list. Colours that carry a role (surfaces, borders, brand, focus rings, muted text) are tokens in `tokens.css`.

`npm test` reads the stylesheet through these imports, resolves the tokens and checks that key text keeps a 4.5:1 contrast and every focus ring 3:1.
