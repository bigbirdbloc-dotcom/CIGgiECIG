<!-- CIGgiECIG • PUNK-PSYCHEDELIC PROJECT README -->

<div align="center">

# CIGgiECIG

### ⚡ VIBE LOUD. BUILD BOLD. EVOLVE WILD. ⚡

**UNDERGROUND GRAFFITI × PUNK-ROCK RAVE × PSYCHEDELIC LIQUID LIGHT**

*An evolving storefront project with a loud visual identity and an architecture that keeps the real-world boundaries clear.*

![Art Direction](https://img.shields.io/badge/ART-DIRTY%20%2F%20LOUD-ff2bd6?style=for-the-badge&labelColor=17121d)
![Motion](https://img.shields.io/badge/MOTION-FLUID%20%2F%20HYPNOTIC-b6ff00?style=for-the-badge&labelColor=17121d)
![Runtime](https://img.shields.io/badge/NODE.JS-20%2B-00f0ff?style=for-the-badge&labelColor=17121d)
![Automation](https://img.shields.io/badge/BUILDS-GITHUB%20ACTIONS-ff8a24?style=for-the-badge&labelColor=17121d)

[⚡ REPOSITORY](https://github.com/bigbirdbloc-dotcom/CIGgiECIG) · [🧪 ACTIONS & BUILDS](https://github.com/bigbirdbloc-dotcom/CIGgiECIG/actions) · [🔒 RELEASE CHECKLIST](docs/PRODUCTION_RELEASE_CHECKLIST.md)

</div>

---

> [!NOTE]
> **THE LOOK IS WILD. THE ARCHITECTURE MUST STAY CLEAR.** GitHub Pages publishes the static showcase in `site/` only. The full commerce application relies on the Express/Node.js backend for product APIs, age verification, admin operations, checkout, payments, and webhooks. Deploy and configure that backend separately. A Pages URL alone is **not** a live or production-ready checkout.

## 🎨 THE VIBE — NOT A POLISHED NEON DASHBOARD

CIGgiECIG's visual direction pulls from **underground gig posters, hand-painted graffiti, torn rave flyers, punk zines, and psychedelic liquid-light shows**.

- **Raw, layered composition:** oversized lettering, rough edges, sticker-like fragments, ink grain, and mural-inspired details.
- **Acid color collisions:** hot pink, electric cyan, acid green, ultraviolet, and ember orange against dark surfaces.
- **Hypnotic movement:** slow fluid gradients, orbiting color, and breathing edge-light effects—not aggressive flashing.
- **Accessibility in motion:** reduced-motion preferences are respected, with responsive layouts for smaller screens.

The goal: **visceral, rebellious, and immersive**—like stepping into a late-night warehouse rave painted by a street-art crew.

## ✦ WHAT'S INSIDE

| Zone | What it does |
| --- | --- |
| 🎨 **Graffiti showcase** | Responsive punk-poster styling, layered mural details, and psychedelic motion effects. |
| 🛍️ **Storefront foundations** | Catalog and cart flow, product API integration, stock checks, server-authoritative pricing, and checkout validation. |
| 🛡️ **Protected operations** | Admin routes, provider adapters, and webhook signature checks. |
| ⚙️ **Pages automation** | GitHub Actions validates and deploys the static showcase. |
| 🧪 **Release discipline** | Automated tests plus a checklist for external services, security, and deployment readiness. |

## 🚀 GET IT RUNNING

### Requirements

- Node.js **20 or newer**
- npm

### Local setup

```bash
git clone https://github.com/bigbirdbloc-dotcom/CIGgiECIG.git
cd CIGgiECIG
npm install
cp .env.example .env
```

Set strong, private values for `ADMIN_PASS` and `ADMIN_SESSION_SECRET` in `.env`. Then run:

```bash
set -a
. ./.env
set +a
npm test
npm start
```

Open **[http://localhost:3000](http://localhost:3000)**.

**Secret hygiene:** never commit `.env`, credentials, payment secrets, session keys, or real customer data.

## 🧱 THE SHOWCASE — GITHUB PAGES

- **Workflow:** [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
- **Published source:** [`site/`](site/)

To configure or deploy the static showcase:

1. Open **Repository Settings → Pages**.
2. Set the build source to **GitHub Actions**.
3. Push a change to `site/`, `README.md`, or the Pages workflow on `main`; or manually run **Actions → Build and deploy CIGgiECIG GitHub Pages**.
4. Check the workflow result and deployment URL in the `github-pages` environment.

The workflow validates the showcase, uploads the `site/` artifact, and deploys it with GitHub Pages Actions. It does **not** build or host the Node.js commerce server.

## 🧪 CHECK IT BEFORE YOU SHIP IT

Run the automated tests and build the container image:

```bash
npm test
docker build -t ciggiecig:release .
```

A green CI run is useful evidence—not proof that live payments, identity checks, signed callbacks, persistent storage, or public hosting are correctly configured.

## 🔐 RELEASE GATE — PRODUCTION READINESS

Before enabling live orders, work through the [Production Release Checklist](docs/PRODUCTION_RELEASE_CHECKLIST.md).

- [ ] Deploy the Express app to a supported Node.js host with HTTPS.
- [ ] Configure strong admin/session secrets and provider credentials through a secret manager.
- [ ] Test payment sandbox success and failure paths, including signed callbacks.
- [ ] Verify age/identity checks across the complete customer and order flow.
- [ ] Configure the approved catalog, shipping and tax rules, monitoring, backups, and restore procedures.
- [ ] Replace JSON-file persistence before multi-instance deployment or high-concurrency transactions.

**Do not describe the project as production-ready until the applicable checks have been completed and verified.**

## 🗺️ FIND YOUR WAY AROUND

| Path | Purpose |
| --- | --- |
| `.github/workflows/` | CI and GitHub Pages automation |
| `site/` | Static project showcase |
| `public/` | Storefront assets, styles, audio controller, and mural |
| `adapters/` | Payment and identity-provider adapters |
| `docs/` | Setup and production release guidance |
| `tests/` | Server, admin-auth, webhook, and AI integration tests |
| `server.js` | Express routes and checkout flow |
| `Dockerfile` | Container image for the Node.js application |

---

<div align="center">

### ⚡ LOUD ART. CLEAR ARCHITECTURE. VERIFIED RELEASES. ⚡

**KEEP IT RAW. KEEP IT ACCESSIBLE. SHIP IT ONLY WHEN IT'S TESTED.**

</div>
