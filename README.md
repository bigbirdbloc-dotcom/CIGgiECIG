# CIGgiECIG — Street Art Graffiti E-Commerce Platform

**21+ age-gated vape storefront** with neon graffiti aesthetics, hip-hop energy, and full vendor compliance.

## Stack

- **Frontend**: Vanilla JS + Canvas/WebGL, Tailwind CSS, GSAP animations
- **Backend**: Express.js, SQLite (upgradeable to Postgres)
- **Design**: Graffiti street art, neon magenta (#ff2bd6), electric cyan (#00f0ff), lime (#b6ff00)
- **Audio**: Hip-hop/rap soundtrack (streaming integration ready)
- **Effects**: Edge lighting, screen glitch, scanlines, animated text, neon glow

## Quick Start

```bash
cd ~/ciggiecig
npm install
npm run seed
npm start
```

Then visit `http://localhost:3000` and log into admin at `/admin` with password from `ADMIN_PASS`.

## Features

- ✅ Age gate (21+ verification)
- ✅ Neon graffiti UI with animated effects
- ✅ Hip-hop soundtrack with loop control
- ✅ Product catalog with FDA order requirements
- ✅ Checkout with state validation
- ✅ Spokane local delivery + shipping
- ✅ Admin panel with product management
- ✅ Order packing slips + CSV export
- ✅ Persona + Veriff webhook adapters
- ✅ CyberSource payment gateway

## Environment Variables

```bash
ADMIN_PASS='your-secure-password'
SHIP_STATES=WA,OR,CA
LOCAL_ZIPS=99201,99202,99203,99204,99208
STORE_ADDR='Your Shop Address, Spokane, WA'
CARRIER='Regional Carrier Name'
LOCAL_FEE=800  # cents
TAX_RATE=0.1065  # WA + excise

# ID Verification
AGE_PROVIDER=persona
PERSONA_API_KEY=xxx
PERSONA_TEMPLATE_ID=itmpl_xxx
PERSONA_WEBHOOK_SECRET=xxx

# Payment
PAY_PROVIDER=cybersource
CYBS_ACCESS_KEY=xxx
CYBS_PROFILE_ID=xxx
CYBS_SECRET_KEY=xxx
```

## File Structure

```
/
├── server.js              # Express server + routes
├── extra.js               # Utilities & helpers
├── genart.js              # SVG graffiti art generator
├── seed.js                # Product seeding
├── smoke.js               # Compliance tests
├── diag.js                # Adapter diagnostics
├── public/
│   ├── styles.css         # Neon graffiti styling
│   ├── app.js             # Client-side effects
│   ├── audio.js           # Hip-hop soundtrack controls
│   ├── hero.svg           # Animated mural
│   ├── tiles/             # Product frame SVGs
│   └── music/             # Hip-hop tracks
├── adapters/
│   ├── index.js
│   ├── persona.js         # Age verification
│   ├── veriff.js          # ID verification
│   ├── agechecker.js      # AgeChecker.Net
│   └── payment.js         # CyberSource + gateways
└── data/
    └── products.json      # Seeded SKUs
```

## Testing

```bash
# Compliance checks
node smoke.js

# Adapter diagnostics
node diag.js
```

## Deployment

Works on Termux, Replit, or Linux. Node 16+, 512 MB RAM minimum.

For production: use Postgres, add Cloudflare protection, verify host accepts tobacco commerce.

---

**Built for vape retailers with compliance on lock. Neon graffiti aesthetic that doesn't compromise on age-gating, vendor verification, or order tracking.**
