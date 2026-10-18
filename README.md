<div align="center">

# CIGgiECIG

### ⚡ VIBE. BUILD. EVOLVE. ⚡

**Punk-rock rave energy. Psychedelic graffiti visuals. A storefront project built to evolve.**

![Style](https://img.shields.io/badge/ART%20DIRECTION-PUNK%20%2B%20PSYCHEDELIC-ff2bd6?style=for-the-badge)
![CI](https://img.shields.io/badge/CI-GITHUB%20ACTIONS-00f0ff?style=for-the-badge)
![Node](https://img.shields.io/badge/NODE.JS-20%2B-b6ff00?style=for-the-badge)

[Repository](https://github.com/bigbirdbloc-dotcom/CIGgiECIG) · [Actions & builds](https://github.com/bigbirdbloc-dotcom/CIGgiECIG/actions) · [Production checklist](docs/PRODUCTION_RELEASE_CHECKLIST.md)

</div>

---

## 🎨 THE ART DIRECTION

CIGgiECIG is an evolving storefront and project showcase with a visual identity inspired by **underground gig posters, layered graffiti, rave flyers, and psychedelic liquid light**.

The visual language combines distressed lettering, collage-like composition, acid-bright color, and fluid motion against dark surfaces. The aim is visceral and hypnotic—not a generic polished neon dashboard.

> **Hosting boundary:** GitHub Pages serves the static showcase in `site/` only. The full commerce application depends on the Express/Node.js backend for product APIs, age verification, admin operations, checkout, payments, and webhooks. Deploy and configure that backend separately. A Pages URL alone is **not** a live or production-ready checkout.

## ✦ PROJECT HIGHLIGHTS

- **Graffiti-led showcase** — responsive punk poster styling, layered mural details, and psychedelic motion effects.
- **Storefront foundations** — catalog and cart flow, product API integration, stock checks, server-authoritative pricing, and checkout validation.
- **Protected operations** — admin routes, provider adapters, and webhook signature checks.
- **Automated Pages deployment** — GitHub Actions validates the static showcase and deploys it to GitHub Pages.
- **Release checks** — automated tests plus a production checklist for external services, security, and deployment readiness.

## 🚀 QUICK START

### Requirements

- Node.js 20 or newer
- npm

### Install and run locally

```bash
git clone https://github.com/bigbirdbloc-dotcom/CIGgiECIG.git
cd CIGgiECIG
npm install
cp .env.example .env
```

Set strong, private values for `ADMIN_PASS` and `ADMIN_SESSION_SECRET` in `.env`, then run:

```bash
set -a
. ./.env
set +a
npm test
npm start
```

Open [http://localhost:3000](http://localhost:3000).

**Keep secrets private:** never commit `.env`, credentials, payment secrets, session keys, or real customer data.

## 🧱 GITHUB PAGES SHOWCASE

- **Workflow:** [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
- **Published source directory:** [`site/`](site/)

To configure or run the showcase deployment:

1. Open **Repository Settings → Pages**.
2. Set the build source to **GitHub Actions**.
3. Push changes to `site/`, `README.md`, or the Pages workflow on `main`; alternatively, run the workflow manually from **Actions → Build and deploy CIGgiECIG GitHub Pages**.
4. Review the workflow result and deployment URL in the `github-pages` environment.

The workflow validates the showcase, uploads the `site/` artifact, and deploys it using GitHub Pages Actions. It does **not** package or host the Node.js commerce server.

## 🧪 VALIDATE BEFORE RELEASE

Run the project tests and build the container image:

```bash
npm test
docker build -t ciggiecig:release .
```

A successful CI run is important, but it does not by itself verify live payment processing, identity checks, signed callbacks, persistent storage, or public hosting configuration.

## 🔐 PRODUCTION READINESS CHECKLIST

Before enabling live orders, complete the [production release checklist](docs/PRODUCTION_RELEASE_CHECKLIST.md).

- [ ] Deploy the Express application to a supported Node.js host with HTTPS.
- [ ] Configure strong admin/session secrets and provider credentials using a secret manager.
- [ ] Test payment sandbox success and failure paths, including signed callbacks.
- [ ] Verify age/identity checks are enforced throughout the customer and order flow.
- [ ] Configure the approved catalog, shipping and tax rules, monitoring, backups, and restore procedures.
- [ ] Replace JSON-file persistence before multi-instance deployment or high-concurrency transactions.

Do not represent the project as production-ready until the applicable checks have been completed and verified.

## 🗂️ REPOSITORY MAP

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

**⚡ LOUD ART. CLEAR ARCHITECTURE. VERIFIED RELEASES. ⚡**

</div>
