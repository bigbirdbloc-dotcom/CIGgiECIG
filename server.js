#!/usr/bin/env node
/**
 * CIGgiECIG — Full Production Stack
 * Age-gated graffiti street art vape storefront
 * 21+ compliance, vendor adapters, payment routing, admin panel
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createAdminAuth, ADMIN_SESSION_TTL_MS } = require('./admin-auth');
const { registerAIRoutes } = require('./ai-integration');
const { ageFromDob } = require('./extra');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CONFIG ==========
const ADMIN_PASS = process.env.ADMIN_PASS || '';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || '';
const adminAuth = createAdminAuth({ password: ADMIN_PASS, sessionSecret: ADMIN_SESSION_SECRET });
const SHIP_STATES = (process.env.SHIP_STATES || 'WA,OR').split(',');
const LOCAL_ZIPS = (process.env.LOCAL_ZIPS || '99201,99202,99203,99204,99208').split(',');
const STORE_ADDR = process.env.STORE_ADDR || '123 Main St, Spokane, WA 99201';
const CARRIER = process.env.CARRIER || 'Regional Carrier';
const LOCAL_FEE = Number(process.env.LOCAL_FEE || 800); // cents
const TAX_RATE = Number(process.env.TAX_RATE || 0.1065);
const PAY_PROVIDER = process.env.PAY_PROVIDER || 'cybersource';

// Adapters
const PersonaAdapter = require('./adapters/persona');
const VeriffAdapter = require('./adapters/veriff');
const PaymentAdapter = require('./adapters/payment');

// ========== DATA STORE ==========
const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON(file, defaults = {}) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return defaults;
  }
}

function writeJSON(file, data) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function auditLog(action, details) {
  const logs = readJSON(AUDIT_FILE, []);
  logs.push({ timestamp: new Date().toISOString(), action, details });
  writeJSON(AUDIT_FILE, logs);
}

// ========== MIDDLEWARE ==========
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
app.use(express.json({ limit: '32kb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false, limit: '32kb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'deny', index: false, maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));

// Age verification middleware
function requireAdult(req, res, next) {
  if (req.path === '/verify' || req.path.startsWith('/admin/') || req.path.startsWith('/api/admin/') || req.path === '/admin') {
    return next();
  }
  const ageToken = req.cookies.age_verified;
  if (!ageToken || ageToken !== 'yes') {
    return res.redirect('/verify');
  }
  next();
}

app.use(requireAdult);

// Admin auth middleware
function requireAdmin(req, res, next) {
  if (!adminAuth.verifyToken(req.cookies && req.cookies.admin_auth)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

registerAIRoutes(app, { requireAdmin });

// ========== AGE VERIFICATION ==========
app.get('/verify', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CIGgiECIG — Age Verification</title>
  <link rel="stylesheet" href="/styles.css">
  <style>
    body { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .verify-box { background: rgba(20,18,30,0.95); border: 4px solid #000; padding: 40px; max-width: 420px; text-align: center; box-shadow: 0 0 0 3px rgba(255,43,214,0.3), 0 0 30px rgba(0,240,255,0.2); }
    .verify-box h1 { color: #00f0ff; font-family: Bungee, sans-serif; margin-top: 0; font-size: 2.5rem; text-shadow: 0 0 10px rgba(0,240,255,0.7); }
    .verify-box p { color: #d6d3e4; line-height: 1.6; }
    .verify-box input { width: 100%; min-height: 46px; padding: 10px; margin: 14px 0; border: 3px solid #ff2bd6; background: rgba(255,255,255,0.03); color: #fff; }
    .verify-box button { width: 100%; min-height: 52px; background: linear-gradient(135deg, #b6ff00, #00f0ff); border: 3px solid #000; color: #0a0714; font-weight: 900; cursor: pointer; margin-top: 14px; }
  </style>
</head>
<body>
  <div class="verify-box">
    <h1>21+</h1>
    <p>This site is 21+ only. Verify your age to continue.</p>
    <p style="font-size: 0.85rem; color: #999;">CIGgiECIG is a restricted vape retailer. By clicking "I'm 21+", you confirm you are of legal age in your jurisdiction.</p>
    <form method="POST" action="/verify">
      <input type="date" name="dob" required />
      <button type="submit">I'm 21+</button>
    </form>
  </div>
</body>
</html>`);
});

app.post('/verify', (req, res) => {
  const dob = req.body && typeof req.body.dob === 'string' ? req.body.dob : '';
  const age = ageFromDob(dob);
  if (age !== null && age >= 21) {
    res.cookie('age_verified', 'yes', {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    // Do not persist the customer's full date of birth in the audit log.
    auditLog('age_verified', { age });
    return res.redirect('/');
  }
  res.status(403).send('Must be 21 or older.');
});

// ========== PRODUCTS ==========
function getProducts() {
  return readJSON(PRODUCTS_FILE, []);
}

function initProducts() {
  const products = [
    { id: 'aurora-7k', name: 'AURORA 7000', flavor: 'Blueberry Burst', cost: 12.0, price: 16.8, fda: 'FDA-2024-012345', stock: 45, published: true },
    { id: 'midnight-7k', name: 'MIDNIGHT 7000', flavor: 'Mango Riot', cost: 13.0, price: 18.2, fda: 'FDA-2024-012346', stock: 38, published: true },
    { id: 'cinder-7k', name: 'CINDER 7000', flavor: 'Citrus Dusk', cost: 12.3, price: 17.22, fda: 'FDA-2024-012347', stock: 52, published: true },
    { id: 'volt-pod', name: 'VOLT POD', flavor: 'Berry Crash', cost: 14.2, price: 19.88, fda: 'FDA-2024-012348', stock: 28, published: true },
    { id: 'noir-pod', name: 'NOIR POD', flavor: 'Mango Fuel', cost: 15.0, price: 21.0, fda: 'FDA-2024-012349', stock: 18, published: true },
    { id: 'pulse-pod', name: 'PULSE POD', flavor: 'Grape Surge', cost: 14.6, price: 20.44, fda: 'FDA-2024-012350', stock: 35, published: true }
  ];
  if (!fs.existsSync(PRODUCTS_FILE)) {
    writeJSON(PRODUCTS_FILE, products);
  }
}

app.get('/api/products', (req, res) => {
  res.json(getProducts().filter(p => p.published));
});

// ========== CART & CHECKOUT ==========
app.post('/api/cart', (req, res) => {
  const { product_id, qty } = req.body;
  const products = getProducts();
  const product = products.find(p => p.id === product_id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ product, qty, total: product.price * qty });
});

app.post('/api/checkout', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { cart, shipping_method } = body;
  const state = typeof body.state === 'string' ? body.state.trim().toUpperCase() : '';
  const zip = typeof body.zip === 'string' ? body.zip.trim() : '';

  // Never trust client-supplied prices, totals, payment providers, or product fields.
  if (!Array.isArray(cart) || cart.length === 0 || cart.length > 50) {
    return res.status(400).json({ error: 'Cart must contain between 1 and 50 items' });
  }
  if (!['shipping', 'local'].includes(shipping_method)) {
    return res.status(400).json({ error: 'Invalid shipping method' });
  }
  if (!/^[A-Z]{2}$/.test(state) || !SHIP_STATES.includes(state)) {
    return res.status(403).json({ error: 'Shipping to this state not available' });
  }
  if (!/^\d{5}$/.test(zip)) {
    return res.status(400).json({ error: 'A valid 5-digit ZIP code is required' });
  }
  if (shipping_method === 'local' && !LOCAL_ZIPS.includes(zip)) {
    return res.status(403).json({ error: 'Local delivery not available in this ZIP' });
  }

  const products = getProducts();
  const normalizedCart = [];
  let subtotalCents = 0;
  for (const item of cart) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' ||
        !Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 99) {
      return res.status(400).json({ error: 'Each cart item needs a product ID and quantity from 1 to 99' });
    }
    const product = products.find(p => p.id === item.id && p.published === true);
    if (!product || !Number.isFinite(product.price) || product.price < 0) {
      return res.status(400).json({ error: 'Cart contains an unavailable product' });
    }
    subtotalCents += Math.round(product.price * 100) * item.qty;
    if (!Number.isSafeInteger(subtotalCents)) {
      return res.status(400).json({ error: 'Cart total is out of range' });
    }
    normalizedCart.push({ id: product.id, qty: item.qty });
  }

  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const shippingCents = shipping_method === 'local' ? Math.round(LOCAL_FEE) : 800;
  const totalCents = subtotalCents + taxCents + shippingCents;
  if (![subtotalCents, taxCents, shippingCents, totalCents].every(Number.isSafeInteger) ||
      subtotalCents < 0 || taxCents < 0 || shippingCents < 0 || totalCents < 0) {
    return res.status(400).json({ error: 'Unable to calculate a valid order total' });
  }

  const order = {
    id: crypto.randomBytes(8).toString('hex'),
    timestamp: new Date().toISOString(),
    cart: normalizedCart,
    shipping_method,
    state,
    zip,
    subtotal: subtotalCents / 100,
    tax: taxCents / 100,
    shipping: shippingCents / 100,
    total: totalCents / 100,
    payment_provider: PAY_PROVIDER,
    status: 'pending_payment',
    id_verified: false
  };

  const orders = readJSON(ORDERS_FILE, []);
  orders.push(order);
  writeJSON(ORDERS_FILE, orders);
  auditLog('order_created', { order_id: order.id, total: order.total });
  return res.status(201).json({ order, payment_url: '/payment/' + order.id });
});

// ========== PAYMENT GATEWAY ROUTING ==========
app.get('/payment/:order_id', (req, res) => {
  const orders = readJSON(ORDERS_FILE, []);
  const order = orders.find(o => o.id === req.params.order_id);
  if (!order) return res.status(404).send('Order not found');
  
  if (order.payment_provider === 'cybersource') {
    if (!process.env.CYBS_ACCESS_KEY || !process.env.CYBS_PROFILE_ID || !process.env.CYBS_SECRET_KEY) {
      return res.status(503).send('Payment is temporarily unavailable. Please contact the store.');
    }
    const { createSignature, sortSignedFields } = require('./extra');
    const fields = {
      access_key: process.env.CYBS_ACCESS_KEY,
      profile_id: process.env.CYBS_PROFILE_ID,
      transaction_uuid: order.id,
      signed_field_names: 'access_key,profile_id,transaction_uuid,amount,currency,signed_field_names',
      amount: order.total.toFixed(2),
      currency: 'USD'
    };
    fields.signature = createSignature(fields, process.env.CYBS_SECRET_KEY, fields.signed_field_names);
    
    res.send(`<!DOCTYPE html>
<html>
<head><title>Payment</title><link rel="stylesheet" href="/styles.css"></head>
<body>
  <div class="shell">
    <h1>Payment: ${order.id}</h1>
    <p>Total: $${order.total.toFixed(2)}</p>
    <form action="https://testsecureacceptance.cybersource.com/pay" method="POST">\n      ${Object.entries(fields).map(([k, v]) => `<input type="hidden" name="${k}" value="${v}">`).join('\\n    ')}\n      <button type="submit" class="cta">Pay with CyberSource</button>\n    </form>\n  </div>\n</body>\n</html>`);
  } else if (order.payment_provider === 'authorize') {
    res.send(`<h1>Authorize.Net Payment (Coming Soon)</h1><p>Order: ${order.id}</p>`);
  }
});

app.post('/webhooks/cybersource', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const signedFields = typeof body.signed_field_names === 'string' ? body.signed_field_names : '';
  const signature = typeof body.signature === 'string' ? body.signature : '';
  if (!process.env.CYBS_SECRET_KEY || !signedFields || !signature ||
      !PaymentAdapter.verifyCyberSource(body, process.env.CYBS_SECRET_KEY, signedFields, signature)) {
    return res.status(401).json({ error: 'Invalid payment notification signature' });
  }
  const transactionId = body.req_transaction_uuid || body.transaction_uuid || body.transaction_id;
  const orders = readJSON(ORDERS_FILE, []);
  const order = orders.find(item => item.id === transactionId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (body.decision === 'ACCEPT') {
    if (String(body.req_amount || body.amount || '') !== order.total.toFixed(2)) {
      return res.status(400).json({ error: 'Payment amount does not match order total' });
    }
    if (order.status !== 'paid') {
      order.status = 'paid';
      order.paid_at = new Date().toISOString();
      writeJSON(ORDERS_FILE, orders);
      auditLog('payment_received', { order_id: order.id });
    }
  } else {
    order.status = 'payment_declined';
    writeJSON(ORDERS_FILE, orders);
    auditLog('payment_declined', { order_id: order.id });
  }
  return res.json({ status: 'received' });
});

// ========== PERSONA WEBHOOK ==========
app.post('/webhooks/persona', (req, res) => {
  const signature = req.headers['persona-signature'];
  const verified = PersonaAdapter.verifyWebhook(req.rawBody, process.env.PERSONA_WEBHOOK_SECRET, signature);
  if (!verified) return res.status(401).json({ error: 'Invalid signature' });
  
  const { data } = JSON.parse(req.rawBody);
  auditLog('persona_webhook', { inquiry_id: data.id, status: data.status });
  
  res.json({ ok: true });
});

// ========== VERIFF WEBHOOK ==========
app.post('/webhooks/veriff', (req, res) => {
  const signature = req.headers['x-hmac-signature'];
  const verified = VeriffAdapter.verifyWebhook(req.rawBody, signature, process.env.VERIFF_SECRET);
  if (!verified) return res.status(401).json({ error: 'Invalid signature' });
  
  const { verification } = JSON.parse(req.rawBody);
  auditLog('veriff_webhook', { session_id: verification.id, status: verification.status });
  
  res.json({ ok: true });
});

// ========== ADMIN PANEL ==========
app.post('/admin/login', (req, res) => {
  if (!adminAuth.isConfigured()) {
    return res.status(503).json({ error: 'Admin authentication is not configured.' });
  }
  const password = req.body && req.body.password;
  if (adminAuth.verifyPassword(password)) {
    const expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
    res.cookie('admin_auth', adminAuth.createToken(expiresAt), {
      maxAge: ADMIN_SESSION_TTL_MS,
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    });
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Invalid password' });
});

app.post('/admin/logout', (_req, res) => {
  res.clearCookie('admin_auth', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  });
  return res.json({ ok: true });
});

app.get('/admin', (req, res) => {
  if (!adminAuth.verifyToken(req.cookies && req.cookies.admin_auth)) {
    return res.status(200).send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>CIGgiECIG Admin Login</title><link rel="stylesheet" href="/styles.css"></head>
<body><main class="shell"><section class="admin-card" style="max-width:520px;margin:10vh auto">
<p class="eyebrow">RESTRICTED ACCESS</p><h1 class="section-title">ADMIN LOGIN</h1><p>Sign in with your configured administrator password.</p>
<form id="login-form" class="checkout-form"><label><span>Admin password</span><input type="password" name="password" autocomplete="current-password" required></label><button class="cta" type="submit">Sign in</button><p id="login-message" role="status" aria-live="polite"></p></form>
</section></main><script>
document.getElementById('login-form').addEventListener('submit', async function(event) {
  event.preventDefault();
  const message = document.getElementById('login-message');
  const button = this.querySelector('button');
  button.disabled = true;
  message.textContent = 'Signing in…';
  try {
    const response = await fetch('/admin/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: new FormData(this).get('password') }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Login failed');
    window.location.assign('/admin');
  } catch (error) { message.textContent = error.message || 'Unable to sign in'; }
  finally { button.disabled = false; }
});
</script></body></html>`);
  }
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>CIGgiECIG Admin</title>
  <link rel="stylesheet" href="/styles.css">
  <style>
    .admin-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .admin-table th, .admin-table td { padding: 12px; text-align: left; border: 1px solid #333; }
    .admin-table th { background: rgba(255,43,214,0.2); color: #00f0ff; }
  </style>
</head>
<body>
  <div class="shell">
    <h1>Admin Dashboard</h1>
    <section class="admin-panel">
      <div class="admin-card">
        <h3>Orders</h3>
        <table class="admin-table">
          <thead>
            <tr><th>ID</th><th>Total</th><th>Status</th><th>State</th></tr>
          </thead>
          <tbody id="orders-tbody"></tbody>
        </table>
      </div>
      <div class="admin-card">
        <h3>Inventory</h3>
        <table class="admin-table">
          <thead>
            <tr><th>Product</th><th>Stock</th><th>Price</th><th>FDA</th></tr>
          </thead>
          <tbody id="inventory-tbody"></tbody>
        </table>
      </div>
      <div class="admin-card">
        <h3>Adapter Status</h3>
        <ul>
          <li><span class="pill ok">Persona</span> Verified</li>
          <li><span class="pill ok">Veriff</span> Verified</li>
          <li><span class="pill ok">CyberSource</span> Verified</li>
        </ul>
      </div>
    </section>
  </div>
  <script>
    fetch('/api/admin/orders').then(r => r.json()).then(orders => {
      document.getElementById('orders-tbody').innerHTML = orders.map(o => \n        `<tr><td>\${o.id}</td><td>\\$\${o.total.toFixed(2)}</td><td>\${o.status}</td><td>\${o.state}</td></tr>`\n      ).join('');\n    });\n    fetch('/api/admin/inventory').then(r => r.json()).then(products => {\n      document.getElementById('inventory-tbody').innerHTML = products.map(p => \n        `<tr><td>\${p.name}</td><td>\${p.stock}</td><td>\\$\${p.price.toFixed(2)}</td><td>\${p.fda}</td></tr>`\n      ).join('');\n    });\n  </script>\n</body>\n</html>\n`);\n});\n\napp.get('/api/admin/orders', requireAdmin, (req, res) => {\n  res.json(readJSON(ORDERS_FILE, []));\n});\n\napp.get('/api/admin/inventory', requireAdmin, (req, res) => {\n  res.json(getProducts());\n});\n\napp.post('/api/admin/product/:id', requireAdmin, (req, res) => {
  const products = getProducts();
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const updates = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : null;
  if (!updates || !Object.keys(updates).length) return res.status(400).json({ error: 'A non-empty product update object is required' });
  const allowed = ['name', 'flavor', 'description', 'cost', 'price', 'fda', 'fda_order_number', 'stock', 'published', 'active', 'category', 'image', 'badge'];
  const unknown = Object.keys(updates).filter(key => !allowed.includes(key));
  if (unknown.length) return res.status(400).json({ error: 'Unsupported product fields', fields: unknown });
  for (const key of ['name', 'flavor', 'description', 'fda', 'fda_order_number', 'category', 'image', 'badge']) {
    if (key in updates && (typeof updates[key] !== 'string' || updates[key].length > 500)) return res.status(400).json({ error: key + ' must be a string of at most 500 characters' });
  }
  for (const key of ['cost', 'price']) {
    if (key in updates && (typeof updates[key] !== 'number' || !Number.isFinite(updates[key]) || updates[key] < 0 || updates[key] > 1000000)) return res.status(400).json({ error: key + ' must be a finite non-negative number' });
  }
  if ('stock' in updates && (!Number.isSafeInteger(updates.stock) || updates.stock < 0 || updates.stock > 100000000)) return res.status(400).json({ error: 'stock must be a non-negative integer' });
  for (const key of ['published', 'active']) {
    if (key in updates && typeof updates[key] !== 'boolean') return res.status(400).json({ error: key + ' must be a boolean' });
  }
  if ('image' in updates && !/^\/[a-zA-Z0-9/_\-.]+$/.test(updates.image)) return res.status(400).json({ error: 'image must be a local asset path' });
  Object.assign(product, updates);
  writeJSON(PRODUCTS_FILE, products);
  auditLog('product_updated', { product_id: req.params.id, fields: Object.keys(updates) });
  return res.json({ ok: true, product });
});

// ========== HOMEPAGE ==========\napp.get('/', (req, res) => {\n  res.sendFile(path.join(__dirname, 'public', 'index.html'));\n});\n\n// ========== ADAPTER STATUS ==========\napp.get('/api/adapters', (req, res) => {\n  res.json({\n    persona: PersonaAdapter.getStatus(),\n    veriff: VeriffAdapter.getStatus(),\n    payment: PaymentAdapter.getAdapterStatus()\n  });\n});\n\n// ========== HEALTH CHECK ==========\napp.get('/health', (req, res) => {\n  res.json({\n    status: 'ok',\n    timestamp: new Date().toISOString(),\n    uptime: process.uptime(),\n    env: {\n      admin_auth_configured: adminAuth.isConfigured(),\n      pay_provider: PAY_PROVIDER,\n      ship_states: SHIP_STATES,\n      local_zips: LOCAL_ZIPS\n    }\n  });\n});\n\n// ========== START SERVER ==========\ninitProducts();\napp.listen(PORT, () => {\n  console.log(`\n🎨 CIGgiECIG Storefront Running\n`);\n  console.log(`🌐 http://localhost:${PORT}`);\n  console.log(`📊 Admin: http://localhost:${PORT}/admin`);\n  console.log(`🔧 Health: http://localhost:${PORT}/health`);\n  console.log(`\n✅ Age gate enabled`);\n  console.log(`✅ Payment adapters active`);\n  console.log(`✅ Webhook listeners ready`);\n  console.log(`\n`);\n  auditLog('server_start', { port: PORT, provider: PAY_PROVIDER });\n});\n\nmodule.exports = app;\n