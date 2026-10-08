const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const { generateArt } = require('./genart');
const { ensureSeed } = require('./seed');
const {
  computePrice,
  isAgeVerified,
  productStatus,
  isAllowedZip,
  decodeFormPreservingPlus,
  verifyPersonaWebhook,
  verifyVeriffWebhook,
  verifyCyberSourceSignature,
  money
} = require('./extra');
const { payment } = require('./adapters');

const app = express();
const port = Number(process.env.PORT || 3000);
const adminPass = process.env.ADMIN_PASS || 'admin123';
const allowedZips = (process.env.LOCAL_ZIPS || '99201,99202,99203,99204,99208').split(',').map((value) => value.trim()).filter(Boolean);
const provider = (process.env.PAY_PROVIDER || 'cybersource').toLowerCase();
const state = {
  cart: [],
  orders: [],
  products: []
};

function readSeedProducts() {
  const filePath = path.join(__dirname, 'data', 'products.json');
  if (!fs.existsSync(filePath)) {
    return ensureSeed();
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    return ensureSeed();
  }
}

function ensureSetup() {
  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(path.join(publicDir, 'hero.svg'))) {
    generateArt();
  }
  state.products = readSeedProducts();
  state.products = state.products.map((product) => ({
    ...product,
    price: Number(product.price || computePrice(product.cost || 0))
  }));
}

ensureSetup();

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false, verify: (req, res, buf) => { req.rawBody = buf; } }));

function requireAdult(req, res, next) {
  if (req.path.startsWith('/verify') || req.path.startsWith('/admin') || req.path.startsWith('/webhooks') || req.path.startsWith('/return')) {
    return next();
  }
  if (!req.cookies.age_verified || req.cookies.age_verified !== 'true') {
    return res.redirect('/verify?next=' + encodeURIComponent(req.originalUrl || '/'));
  }
  next();
}
app.use(requireAdult);

function renderPage(title, content) {
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      <link rel="stylesheet" href="/styles.css" />
    </head>
    <body>
      <div class="shell">
        <header class="topbar">
          <div class="brand">CIGgiECIG</div>
          <nav class="nav">
            <a href="/">Home</a>
            <a href="/shop">Shop</a>
            <a href="/checkout">Checkout</a>
            <a href="/admin">Admin</a>
          </nav>
        </header>
        ${content}
      </div>
    </body>
  </html>`;
}

function productCards() {
  return state.products.map((product) => {
    const published = productStatus(product) === 'active';
    const effectivePrice = computePrice(product.cost);
    return `
      <article class="card">
        <img src="${product.image || '/tiles/tile-1.svg'}" alt="${product.name}" />
        <div class="card-body">
          <div class="tag">${product.badge || 'drop'}</div>
          <h3>${product.name}</h3>
          <div class="muted">${product.description}</div>
          <div class="price">$${money(effectivePrice)}</div>
          <div class="small">
            ${published ? 'Published' : 'Blocked — add FDA order #'}
          </div>
          <form method="POST" action="/add-to-cart" style="margin-top: 14px;">
            <input type="hidden" name="product_id" value="${product.id}" />
            <button type="submit">Add to cart</button>
          </form>
        </div>
      </article>`;
  }).join('');
}

app.get('/', (req, res) => {
  const content = `
    <div class="hero">
      <img src="/hero.svg" alt="CIGgiECIG hero banner" />
    </div>
    <div class="cta-row">
      <a class="cta" href="/shop">Shop collection</a>
      <a class="ghost" href="/admin">Admin</a>
    </div>
    <section class="section">
      <div class="status">21+ only • warped storefront</div>
      <div class="grid">${productCards()}</div>
    </section>
  `;
  res.send(renderPage('CIGgiECIG', content));
});

app.get('/shop', (req, res) => {
  const content = `<section class="section"><div class="status">Live storefront</div><div class="grid">${productCards()}</div></section>`;
  res.send(renderPage('Shop', content));
});

app.get('/verify', (req, res) => {
  const content = `
    <section class="spotlight">
      <h1>AGE CHECK</h1>
      <p class="muted">You must be 21+ to continue. This storefront is restricted to legal-age buyers.</p>
      <form method="POST" action="/verify">
        <label for="dob">Date of birth</label>
        <input id="dob" name="dob" type="date" required />
        <button type="submit">Continue</button>
      </form>
      <div class="small">${req.query.error ? `<span class="warn">${req.query.error}</span>` : ''}</div>
    </section>
  `;
  res.send(renderPage('Age gate', content));
});

app.post('/verify', (req, res) => {
  const dob = req.body.dob;
  if (!dob || !isAgeVerified(dob)) {
    return res.redirect('/verify?error=' + encodeURIComponent('Age verification failed. Must be 21 or older.'));
  }
  res.cookie('age_verified', 'true', { httpOnly: true, maxAge: 86400000 * 365 });
  return res.redirect(req.query.next || '/');
});

app.post('/add-to-cart', (req, res) => {
  const product = state.products.find((entry) => entry.id === req.body.product_id);
  if (!product) return res.status(404).send('Product not found');
  state.cart.push({ product_id: product.id, cost: Number(product.cost || 0), price: computePrice(product.cost || 0) });
  res.redirect('/checkout');
});

app.get('/checkout', (req, res) => {
  const total = state.cart.reduce((sum, item) => sum + item.price, 0);
  const content = `
    <section class="section spotlight">
      <h1>Checkout</h1>
      <div class="small">Cart items: ${state.cart.length || 0}</div>
      <div class="price">Total: $${money(total)}</div>
      <form method="POST" action="/checkout" style="margin-top: 20px;">
        <label>Shipping method</label>
        <select name="shipping_method">
          <option value="ship">Ship</option>
          <option value="pickup">Pickup</option>
        </select>
        <label>State</label>
        <select name="buyer_state">
          <option value="WA">Washington</option>
          <option value="CA">California</option>
          <option value="OR">Oregon</option>
        </select>
        <label>ZIP code</label>
        <input name="zip" value="99201" />
        <label>Payment provider</label>
        <select name="payment_provider">
          <option value="cybersource">CyberSource</option>
          <option value="authorize">Authorize.Net</option>
          <option value="nmi">NMI</option>
        </select>
        <button type="submit">Place order</button>
      </form>
    </section>
  `;
  res.send(renderPage('Checkout', content));
});

app.post('/checkout', (req, res) => {
  const { buyer_state, zip, shipping_method, payment_provider } = req.body;
  const hasCart = state.cart.length > 0;
  if (!hasCart) return res.status(400).send('Cart empty');
  if (buyer_state === 'CA') return res.status(400).send('Checkout rejected: sales to California are blocked.');
  if (shipping_method === 'ship' && !req.cookies.id_verified) {
    return res.status(400).send('Shipped orders require verified photo ID before payment.');
  }
  if (shipping_method !== 'ship' && zip && !isAllowedZip(zip, allowedZips)) {
    return res.status(400).send('Local delivery is only available for approved ZIP codes.');
  }
  const total = state.cart.reduce((sum, item) => sum + item.price, 0);
  const order = {
    id: `ord-${Date.now()}`,
    total,
    provider: payment_provider || provider,
    shipping_method,
    buyer_state,
    zip,
    id_verified: Boolean(req.cookies.id_verified),
    paid: false,
    created_at: new Date().toISOString()
  };
  state.orders.push(order);
  state.cart = [];
  res.send(`<html><body><h1>Order queued</h1><p>Order ${order.id} is ready for processor flow.</p><p>Total: $${money(total)}</p></body></html>`);
});

app.get('/admin', (req, res) => {
  const authenticated = req.cookies.admin === 'true';
  if (!authenticated) {
    const content = `
      <section class="spotlight">
        <h1>Admin login</h1>
        <form method="POST" action="/admin/login">
          <input type="password" name="password" placeholder="Admin password" required />
          <button type="submit">Unlock</button>
        </form>
      </section>
    `;
    return res.send(renderPage('Admin', content));
  }

  const statusHtml = Object.entries(payment.getAdapterStatus()).map(([providerName, info]) => `
    <tr>
      <td>${providerName}</td>
      <td>${info.status}</td>
      <td>${info.note || 'ok'}</td>
    </tr>
  `).join('');

  const content = `
    <section class="section spotlight admin-panel">
      <div class="admin-card">
        <h3>Controls</h3>
        <div><a href="/admin/adapters">Adapter status</a></div>
      </div>
      <div class="admin-card">
        <h3>Environment</h3>
        <table>
          <tr><th>Provider</th><th>Status</th><th>Note</th></tr>
          ${statusHtml}
        </table>
      </div>
    </section>
  `;
  res.send(renderPage('Admin dashboard', content));
});

app.post('/admin/login', (req, res) => {
  if (req.body.password !== adminPass) {
    return res.status(401).send('Unauthorized');
  }
  res.cookie('admin', 'true', { httpOnly: true, maxAge: 3600000 });
  res.redirect('/admin');
});

app.get('/admin/adapters', (req, res) => {
  if (req.cookies.admin !== 'true') return res.status(401).send('Unauthorized');
  const data = payment.getAdapterStatus();
  const html = `
    <section class="section spotlight">
      <h1>Adapter status</h1>
      <table>
        <tr><th>Provider</th><th>Status</th><th>Detail</th></tr>
        ${Object.entries(data).map(([name, value]) => `<tr><td>${name}</td><td>${value.status}</td><td>${value.note || ''}</td></tr>`).join('')}
      </table>
    </section>
  `;
  res.send(renderPage('Adapters', html));
});

app.post('/webhooks/persona', express.raw({ type: '*/*' }), (req, res) => {
  const rawBody = req.body && req.body.toString ? req.body.toString() : String(req.body || '');
  const secret = process.env.PERSONA_WEBHOOK_SECRET || 'persona-secret';
  const headers = req.headers || {};
  const valid = verifyPersonaWebhook(rawBody, headers, secret);
  if (!valid) return res.status(400).send('bad signature');
  return res.json({ ok: true, event: 'inquiry.started' });
});

app.post('/webhooks/veriff', express.raw({ type: '*/*' }), (req, res) => {
  const rawBody = req.body && req.body.toString ? req.body.toString() : String(req.body || '');
  const secret = process.env.VERIFF_WEBHOOK_SECRET || 'veriff-secret';
  const signature = req.headers['x-hmac-signature'] || req.headers['X-HMAC-SIGNATURE'] || '';
  const valid = verifyVeriffWebhook(rawBody, signature, secret);
  if (!valid) return res.status(400).send('bad signature');
  return res.json({ ok: true, decision: 'approved' });
});

app.post('/return/pay', express.raw({ type: 'application/x-www-form-urlencoded' }), (req, res) => {
  const raw = req.body && req.body.toString ? req.body.toString() : '';
  const values = decodeFormPreservingPlus(raw);
  const secret = process.env.CYBS_SECRET_KEY || 'cybs-secret';
  const signedNames = values.signed_field_names || '';
  const signature = values.signature || '';
  const success = verifyCyberSourceSignature(values, secret, signedNames, signature);
  if (!success) return res.status(400).send('signature mismatch');
  if ((values.decision || '').toUpperCase() === 'ACCEPT') {
    res.cookie('id_verified', 'true', { httpOnly: true, maxAge: 86400000 * 7 });
    return res.send('payment accepted');
  }
  return res.send('payment rejected');
});

app.post('/id-check', (req, res) => {
  const passes = (req.body.pass === 'yes') || (req.body.photo_id === 'verified');
  if (!passes) return res.status(400).send('ID check failed');
  res.cookie('id_verified', 'true', { httpOnly: true, maxAge: 86400000 * 7 });
  res.send('ID verified');
});

app.post('/api/adapters/status', (req, res) => {
  res.json(payment.getAdapterStatus());
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`CIGgiECIG running at http://localhost:${port}`);
  });
}

module.exports = { app, state, ensureSetup, readSeedProducts };
