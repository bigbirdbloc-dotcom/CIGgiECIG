<div align="center">

# <span style="color:#b6ff00">CIGgi</span><span style="color:#ff2bd6">ECIG</span>

### ⚡ VIBE. BUILD. EVOLVE. ⚡

**A neon graffiti-inspired storefront project with an automated GitHub Actions showcase deployment.**

![Neon](https://img.shields.io/badge/STYLE-NEON%20GRAFFITI-ff2bd6?style=for-the-badge)
![Build](https://img.shields.io/badge/BUILD-GITHUB%20ACTIONS-00f0ff?style=for-the-badge)
![Node](https://img.shields.io/badge/NODE.JS-20%2B-b6ff00?style=for-the-badge)

[Repository](https://github.com/bigbirdbloc-dotcom/CIGgiECIG) · [Build runs](https://github.com/bigbirdbloc-dotcom/CIGgiECIG/actions) · [Release checklist](docs/PRODUCTION_RELEASE_CHECKLIST.md)

</div>

---

## 🎨 THE VIBE

CIGgiECIG pairs a high-contrast street-art identity with an evolving web storefront: electric cyan `#00f0ff`, graffiti magenta `#ff2bd6`, acid lime `#b6ff00`, dark surfaces, neon borders, and responsive motion.

> **Important:** GitHub Pages hosts the static project showcase only. The full commerce application relies on the Express/Node.js backend for product APIs, age verification, admin operations, checkout, payments, and webhooks; deploy that backend separately to a supported Node.js host. Do not treat a Pages URL as a live checkout system.

## ✨ WHAT'S INSIDE

- **Neon storefront UI** — responsive styling, graffiti mural, audio controls, and screen-edge effects.
- **Product catalog and cart flow** — product API, stock checks, server-authoritative pricing, and checkout validation.
- **Admin and integration foundation** — protected admin routes, provider adapters, and webhook signature checks.
- **Automated showcase deployment** — GitHub Actions validates `site/` and deploys it to GitHub Pages when relevant files reach `main`.
- **Release discipline** — automated tests plus a separate production checklist for external integrations and deployment verification.

## 🚀 QUICK START — LOCAL APP

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/bigbirdbloc-dotcom/CIGgiECIG.git
cd CIGgiECIG
npm install
cp .env.example .env
```

Set secure values for `ADMIN_PASS` and `ADMIN_SESSION_SECRET` in `.env`, then load them and start the app:

```bash
set -a
. ./.env
set +a
npm test
npm start
```

Open `http://localhost:3000`. Never commit `.env`, credentials, payment secrets, or real customer data.

## 🛠️ AUTOMATED GITHUB PAGES BUILD

Workflow: [`.github/workflows/pages.yml`](.github/workflows/pages.yml)  
Showcase source: [`site/`](site/)

1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. Push a change to `site/`, `README.md`, or the Pages workflow on `main`, or manually run the workflow from **Actions → Build and deploy CIGgiECIG GitHub Pages → Run workflow**.
4. Inspect the workflow run and its deployment URL in the `github-pages` environment.

The workflow validates the static showcase, uploads the `site/` artifact, and deploys it with the official GitHub Pages Actions. The showcase build does not bundle or host the Node.js commerce server.

## 🧪 TEST BEFORE RELEASE

```bash
npm test
docker build -t ciggiecig:release .
```

CI runs the repository test suite on pushes and pull requests to `main`. A green CI run is necessary, but it does not prove the live payment provider, identity checks, signed callbacks, persistent storage, or public hosting are correctly configured.

## 🔐 PRODUCTION RELEASE GATES

Before accepting live orders, complete the [production release checklist](docs/PRODUCTION_RELEASE_CHECKLIST.md), including:

- Deploy the Express app to a supported Node.js host with HTTPS and persistent storage.
- Configure real admin/session secrets, payment credentials, and identity-provider settings through a secret manager.
- Complete payment sandbox success/failure and signed callback tests.
- Confirm age/identity verification is enforced through the complete customer and order flow.
- Configure the approved catalog, shipping/tax rules, monitoring, backups, and restore testing.
- Move beyond JSON file persistence before multi-instance deployment or high-concurrency transactions.

## 📁 PROJECT MAP

```text
.github/workflows/  CI and Pages deployment automation
site/               Static neon-themed GitHub Pages showcase
public/             Storefront assets, styles, audio controller, mural
adapters/           Payment and identity provider adapters
docs/               Setup and production release guidance
tests/              Server, admin-auth, webhook and AI integration tests
server.js            Express routes and checkout flow
Dockerfile           Container image for the Node.js app
```

---

<div align="center">

**⚡ NEON LOOK. VERIFIED BUILDS. HONEST RELEASE GATES. ⚡**

</div>
