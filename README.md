# CallVerse frontend

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
npx tsc --noEmit --incremental false
npm run build
```

To build without overwriting a running development server's output:

```powershell
$env:CALLVERSE_BUILD_DIR = ".next-validation"
npm run build
```

Unset CALLVERSE_BUILD_DIR afterward for normal development. Never commit real .env files or credentials.

See [the integration review](docs/BACKEND_INTEGRATION_STATUS.md) for connected flows, backend contract findings, remaining endpoints and verification limits.

See [the frontend design notes](docs/FRONTEND_DESIGN.md) for the interface, reusable components and browser checks.
