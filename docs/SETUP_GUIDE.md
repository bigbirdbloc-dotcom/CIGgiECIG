# CIGgiECIG Setup Guide

This guide describes the repository as implemented: a vanilla JavaScript storefront served by Express, local JSON data files, existing vendor adapters, and an optional server-side AI chat helper. It does **not** install a separate React/Vite app, Babel/Webpack build, OpenAI SDK, Stripe SDK, GitHub automation service, or Linear API client.

## 1. Prerequisites

- Node.js 16 or newer and npm
- Git
- A terminal on Linux, macOS, Windows with a compatible shell, or Android Termux
- AI provider credentials only if you plan to enable the optional AI helper

The application declares Express and cookie-parser as runtime dependencies in package.json. It uses Node's built-in HTTP/HTTPS, crypto, filesystem, and URL APIs for the AI client; no provider SDK is required.

## 2. Clone and install

~~~bash
git clone https://github.com/bigbirdbloc-dotcom/CIGgiECIG.git
cd CIGgiECIG
npm install
~~~

Create a local environment file:

~~~bash
cp .env.example .env
~~~

Edit .env before starting the app. The example intentionally leaves admin secrets and AI credentials blank. **Do not start a publicly accessible deployment with blank or placeholder secrets.**

## 3. Configure admin access

Generate a long, unique admin password and a separate signing secret. This command uses Node's built-in crypto module:

~~~bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
~~~

Run the command twice and copy the two outputs into ADMIN_PASS and ADMIN_SESSION_SECRET in .env. Keep both private and do not reuse an API key as either value. Admin login remains disabled unless both variables are set.

The admin session is an HMAC-signed, expiring cookie. On a production HTTPS deployment, the cookie is marked Secure, HttpOnly, and SameSite=Strict. The cookie expires after eight hours. Use HTTPS outside local development.

To load .env into a Bash-compatible shell before starting Node:

~~~bash
set -a
. ./.env
set +a
npm run seed
npm start
~~~

Node does not automatically load .env on the versions supported by this project. On process managers or hosting platforms, configure the same values as environment variables instead. Never commit .env; .gitignore excludes it.

## 4. Run and access the application

The server listens on port 3000 unless PORT is set. Open http://localhost:3000. For local admin API testing, use the /admin/login JSON endpoint to obtain a session cookie; the server does not currently provide a separate login HTML page.

Example login request (replace the placeholder with the ADMIN_PASS value from your local .env):

~~~bash
curl -sS -c cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"password":"REPLACE_WITH_LOCAL_ADMIN_PASS"}' \
  http://localhost:3000/admin/login
~~~

Use that cookie jar for protected admin routes, then remove it when finished:

~~~bash
curl -sS -b cookies.txt http://localhost:3000/api/admin/ai/status
rm -f cookies.txt
~~~

The admin endpoints are not intended to be public. Place the app behind HTTPS and network access controls for non-local deployments.

## 5. Optional AI chat configuration

The AI integration is disabled until AI_API_KEY and AI_MODEL are set and the endpoint is valid. It makes server-to-server requests to an OpenAI-compatible Chat Completions endpoint; the browser never receives the provider key.

Set these variables in .env:

~~~dotenv
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=REPLACE_WITH_YOUR_PROVIDER_KEY
AI_MODEL=REPLACE_WITH_A_MODEL_SUPPORTED_BY_YOUR_PROVIDER
AI_TIMEOUT_MS=15000
~~~

For OpenCode Zen, use its documented Chat Completions endpoint and a model currently supported by that endpoint. For example:

~~~dotenv
AI_API_URL=https://opencode.ai/zen/v1/chat/completions
AI_API_KEY=REPLACE_WITH_YOUR_OPENCODE_ZEN_KEY
AI_MODEL=glm-5.1
~~~

OpenCode model availability changes; consult the [official OpenCode Zen endpoint/model documentation](https://docs.opencode.ai/docs/zen/) before selecting a model. For OpenAI, consult the [official Chat Completions API reference](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create). Do not use the pasted https://opencode.ai/v2 value as a Chat Completions endpoint; configure the full documented endpoint path instead.

After saving the values, restart the server. Protected endpoints are:

- GET /api/admin/ai/status — reports whether required settings are present, without returning the API key.
- POST /api/admin/ai/chat — accepts JSON { "prompt": "..." } and returns { "ok": true, "model": "...", "response": "..." }.

Example chat request after logging in and saving the cookie jar:

~~~bash
curl -sS -b cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Explain the purpose of the existing smoke test without accessing secrets."}' \
  http://localhost:3000/api/admin/ai/chat
~~~

Requests are limited to 4,000 characters, provider responses are size-bounded, and requests time out after the configured interval (100–30,000 ms; default 15,000 ms). Only HTTPS provider URLs are accepted, except loopback HTTP endpoints used for local tests. Provider failures return a generic error; responses and prompts are not written to the audit log.

This feature returns text suggestions only. It does not execute shell commands, edit files, access GitHub or Linear, commit, merge, or deploy. Those actions remain a separately reviewed development workflow.

## 6. Existing npm scripts

| Command | Purpose |
|---|---|
| npm start | Start server.js |
| npm run seed | Seed local sample product data |
| npm run genart | Run the SVG art generator using the argument configured in package.json |
| npm run smoke | Run existing smoke/compliance checks |
| npm run diag | Run adapter/signature diagnostics |
| npm test | Run smoke tests, diagnostics, admin-auth tests, webhook signature tests, and AI integration tests |

There is no npm run build, npm run ai-setup, or npm run ai-integrate script in this implementation. There is no Babel/Webpack build step. Do not use those commands unless a future change adds and tests them.

## 7. Configuration and payment safety

Use test or sandbox credentials during development. Do not set live payment credentials while validating the AI helper. This setup does not create Stripe integration, Linear API integration, GitHub repository write automation, or a production deployment pipeline. Existing payment and identity-verification adapters remain separate from the AI helper.

Store credentials in local environment variables or repository-hosted secret storage. Never paste keys into source files, commit history, screenshots, issue descriptions, chat prompts, test fixtures, or logs. Grant GitHub tokens and Linear credentials only the minimum permissions needed for their separate workflows.

The storefront currently stores some runtime data in JSON files. Keep order and audit records out of public source control and plan a database and backup strategy before production use. Do not assume that age-gating or the current sample checkout code alone establishes regulatory compliance.

## 8. Tests and troubleshooting

Run all repository tests:

~~~bash
npm test
~~~

Run specific existing checks:

~~~bash
npm run smoke
npm run diag
~~~

Common problems:

- **Admin login returns 503:** set both ADMIN_PASS and ADMIN_SESSION_SECRET, load the environment into the process, and restart the server.
- **AI status shows disabled:** check AI_API_KEY, AI_MODEL, and AI_API_URL. Status does not expose secrets.
- **AI returns 502 or 504:** verify provider availability, exact endpoint and model, API-key access, network connectivity, and timeout configuration. Provider error details are deliberately not echoed to clients.
- **Port already in use:** set PORT=3001 before starting the server.
- **Tests fail:** run npm install, then npm test; keep the first failing assertion and Node version when reporting it.

## 9. Agentic development workflow

Development work is tracked in the Linear project **CIGgiECIG — Agentic AI Integration**. Keep changes small and reviewable: audit the real code, create/update a scoped Linear issue, work on a feature branch, implement only verified interfaces, run tests, inspect the diff for secrets and unrelated changes, and open a pull request for human review. Do not grant an AI agent permission to auto-merge, run arbitrary shell commands, use production credentials, or deploy production changes without separate explicit approval. See [the workflow guide](AGENTIC_DEVELOPMENT.md).
