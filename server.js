'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createAdminAuth, ADMIN_SESSION_TTL_MS } = require('./admin-auth');
const { registerAIRoutes } = require('./ai-integration');
const { ageFromDob, createCyberSourceSignature } = require('./extra');
const PersonaAdapter = require('./adapters/persona');
const VeriffAdapter = require('./adapters/veriff');
const PaymentAdapter = require('./adapters/payment');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASS = process.env.ADMIN_PASS || '';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || '';
const adminAuth = createAdminAuth({ password: ADMIN_PASS, sessionSecret: ADMIN_SESSION_SECRET });
const SHIP_STATES = (process.env.SHIP_STATES || 'WA,OR').split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
const LOCAL_ZIPS = (process.env.LOCAL_ZIPS || '99201,99202,99203,99204,99208').split(',').map(x => x.trim()).filter(Boolean);
const LOCAL_FEE = Number(process.env.LOCAL_FEE || 800); // cents
const TAX_RATE = Number(process.env.TAX_RATE || 0.1065);
const PAY_PROVIDER = process.env.PAY_PROVIDER || 'cybersource';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.json');

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
function readJSON(file, fallback) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed;
  } catch (_) {
    return fallback;
  }
}
function writeJSON(file, value) {
  ensureDataDir();
  const temp = file + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temp, file);
}
function auditLog(action, details) {
  const entries = readJSON(AUDIT_FILE, []);
  entries.push({ timestamp: new Date().toISOString(), action, details });
  writeJSON(AUDIT_FILE, entries.slice(-10000));
}
function htmlEscape(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
}
function getProducts() {
  const products = readJSON(PRODUCTS_FILE, []);
  return Array.isArray(products) ? products : [];
}
function initProducts() {
  ensureDataDir();
  if (fs.existsSync(PRODUCTS_FILE)) return;
  const demoProducts = [
    { id: 'aurora-7k', name: 'AURORA 7000', flavor: 'Blueberry Burst', description: 'Demo catalog item', cost: 12, price: 16.8, fda_order_number: '', stock: 45, published: false, active: false, category: 'disposable', image: '/tiles/tile-1.svg' },
    { id: 'midnight-7k', name: 'MIDNIGHT 7000', flavor: 'Mango Riot', description: 'Demo catalog item', cost: 13, price: 18.2, fda_order_number: '', stock: 38, published: false, active: false, category: 'disposable', image: '/tiles/tile-2.svg' }
  ];
  writeJSON(PRODUCTS_FILE, process.env.NODE_ENV === 'production' && process.env.SEED_DEMO_PRODUCTS !== 'true' ? [] : demoProducts);
}
function requireAdult(req, res, next) {
  if (req.path === '/verify' || req.path === '/health' || req.path.startsWith('/admin') || req.path.startsWith('/api/admin') || req.path.startsWith('/webhooks/')) return next();
  if (req.cookies && req.cookies.age_verified === 'yes') return next();
  if (req.path.startsWith('/api/')) return res.status(403).json({ error: 'Age verification required' });
  return res.redirect('/verify');
}

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
app.use(express.json({ limit: '32kb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false, limit: '32kb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'deny', index: false, maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
app.use(requireAdult);
registerAIRoutes(app, { requireAdmin: (req, res, next) => adminAuth.verifyToken(req.cookies && req.cookies.admin_auth) ? next() : res.status(401).json({ error: 'Unauthorized' }) });

app.get('/verify', (req, res) => {
  res.type('html').send('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Age verification · CIGgiECIG</title><link rel="stylesheet" href="/styles.css"></head><body><main class="shell"><section class="admin-card" style="max-width:520px;margin:10vh auto"><p class="eyebrow">RESTRICTED STOREFRONT</p><h1 class="section-title">21+ ONLY</h1><p>Enter your date of birth to verify that you are at least 21.</p><form method="post" action="/verify" class="checkout-form"><label><span>Date of birth</span><input type="date" name="dob" required></label><button class="cta" type="submit">Verify age</button></form></section></main></body></html>');
});
app.post('/verify', (req, res) => {
  const dob = req.body && typeof req.body.dob === 'string' ? req.body.dob : '';
  const age = ageFromDob(dob);
  if (age === null || age < 21 || dob > new Date().toISOString().slice(0, 10)) return res.status(403).send('Age verification failed.');
  res.cookie('age_verified', 'yes', { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  auditLog('age_verified', { age });
  return res.redirect('/');
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/api/products', (req, res) => res.json(getProducts().filter(p => p && p.published === true && Number(p.stock) > 0)));
app.post('/api/cart', (req, res) => {
  const body = req.body || {};
  if (typeof body.product_id !== 'string' || !Number.isSafeInteger(body.qty) || body.qty < 1 || body.qty > 99) return res.status(400).json({ error: 'A product ID and quantity from 1 to 99 are required' });
  const product = getProducts().find(p => p.id === body.product_id && p.published === true);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (body.qty > product.stock) return res.status(409).json({ error: 'Quantity exceeds available stock' });
  return res.json({ product: { id: product.id, name: product.name, price: product.price }, qty: body.qty, total: Math.round(product.price * 100) * body.qty / 100 });
});

app.post('/api/checkout', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const cart = body.cart;
  const shippingMethod = body.shipping_method;
  const state = typeof body.state === 'string' ? body.state.trim().toUpperCase() : '';
  const zip = typeof body.zip === 'string' ? body.zip.trim() : '';
  if (!Array.isArray(cart) || cart.length < 1 || cart.length > 50) return res.status(400).json({ error: 'Cart must contain between 1 and 50 items' });
  if (!['shipping', 'local'].includes(shippingMethod)) return res.status(400).json({ error: 'Invalid shipping method' });
  if (!SHIP_STATES.includes(state)) return res.status(403).json({ error: 'Shipping to this state is not available' });
  if (!/^\d{5}$/.test(zip)) return res.status(400).json({ error: 'A valid 5-digit ZIP code is required' });
  if (shippingMethod === 'local' && !LOCAL_ZIPS.includes(zip)) return res.status(403).json({ error: 'Local delivery is not available in this ZIP code' });
  const products = getProducts();
  const normalizedCart = [];
  let subtotalCents = 0;
  for (const item of cart) {
    if (!item || typeof item.id !== 'string' || !Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 99) return res.status(400).json({ error: 'Each cart item needs a product ID and quantity from 1 to 99' });
    const product = products.find(p => p.id === item.id && p.published === true);
    if (!product || !Number.isSafeInteger(product.stock) || product.stock < item.qty || !Number.isFinite(product.price) || product.price < 0) return res.status(400).json({ error: 'Cart contains an unavailable product or quantity' });
    subtotalCents += Math.round(product.price * 100) * item.qty;
    if (!Number.isSafeInteger(subtotalCents)) return res.status(400).json({ error: 'Cart total is out of range' });
    normalizedCart.push({ id: product.id, qty: item.qty });
  }
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const shippingCents = shippingMethod === 'local' ? Math.round(LOCAL_FEE) : 800;
  const totalCents = subtotalCents + taxCents + shippingCents;
  if (![taxCents, shippingCents, totalCents].every(Number.isSafeInteger) || taxCents < 0 || shippingCents < 0 || totalCents < 0) return res.status(400).json({ error: 'Unable to calculate a valid order total' });
  const order = {
    id: crypto.randomBytes(12).toString('hex'),
    timestamp: new Date().toISOString(),
    cart: normalizedCart,
    shipping_method: shippingMethod,
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
  if (!Array.isArray(orders)) return res.status(500).json({ error: 'Order storage is unavailable' });
  orders.push(order);
  writeJSON(ORDERS_FILE, orders);
  auditLog('order_created', { order_id: order.id, total: order.total });
  return res.status(201).json({ order, payment_url: '/payment/' + order.id });
});

app.get('/payment/:order_id', (req, res) => {
  const orders = readJSON(ORDERS_FILE, []);
  const order = Array.isArray(orders) ? orders.find(item => item.id === req.params.order_id) : null;
  if (!order) return res.status(404).send('Order not found');
  if (order.status === 'paid') return res.status(409).send('This order has already been paid.');
  if (order.payment_provider !== 'cybersource') return res.status(503).send('The configured payment provider is not available.');
  if (!process.env.CYBS_ACCESS_KEY || !process.env.CYBS_PROFILE_ID || !process.env.CYBS_SECRET_KEY) return res.status(503).send('Payment is temporarily unavailable. Please contact the store.');
  const paymentUrl = process.env.CYBS_PAYMENT_URL || 'https://testsecureacceptance.cybersource.com/pay';
  let parsed;
  try { parsed = new URL(paymentUrl); } catch (_) { return res.status(503).send('Payment configuration is invalid.'); }
  if (parsed.protocol !== 'https:' || parsed.pathname !== '/pay' || !['testsecureacceptance.cybersource.com', 'secureacceptance.cybersource.com'].includes(parsed.hostname)) return res.status(503).send('Payment configuration is invalid.');
  const fields = {
    access_key: process.env.CYBS_ACCESS_KEY,
    profile_id: process.env.CYBS_PROFILE_ID,
    transaction_uuid: order.id,
    signed_field_names: 'access_key,profile_id,transaction_uuid,amount,currency,signed_field_names',
    amount: order.total.toFixed(2),
    currency: 'USD'
  };
  fields.signature = createCyberSourceSignature(fields, process.env.CYBS_SECRET_KEY, fields.signed_field_names);
  const inputs = Object.entries(fields).map(([key, value]) => '<input type="hidden" name="' + key + '" value="' + htmlEscape(value) + '">').join('');
  return res.type('html').send('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Secure payment</title><link rel="stylesheet" href="/styles.css"></head><body><main class="shell"><section class="admin-card"><h1>Secure payment</h1><p>Order ' + htmlEscape(order.id) + '</p><p>Total: $' + order.total.toFixed(2) + '</p><form action="' + paymentUrl + '" method="POST">' + inputs + '<button type="submit" class="cta">Continue to CyberSource</button></form></section></main></body></html>');
});

app.post('/webhooks/cybersource', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const signedFields = typeof body.signed_field_names === 'string' ? body.signed_field_names : '';
  const signature = typeof body.signature === 'string' ? body.signature : '';
  if (!process.env.CYBS_SECRET_KEY || !signedFields || !signature || !PaymentAdapter.verifyCyberSource(body, process.env.CYBS_SECRET_KEY, signedFields, signature)) return res.status(401).json({ error: 'Invalid payment notification signature' });
  const transactionId = body.req_transaction_uuid || body.transaction_uuid || body.transaction_id;
  const orders = readJSON(ORDERS_FILE, []);
  const order = Array.isArray(orders) ? orders.find(item => item.id === transactionId) : null;
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status === 'paid') return res.json({ status: 'received' });
  if (body.decision === 'ACCEPT') {
    if (String(body.req_amount || body.amount || '') !== order.total.toFixed(2)) return res.status(400).json({ error: 'Payment amount does not match order total' });
    order.status = 'paid';
    order.paid_at = new Date().toISOString();
    writeJSON(ORDERS_FILE, orders);
    auditLog('payment_received', { order_id: order.id });
  } else {
    order.status = 'payment_declined';
    writeJSON(ORDERS_FILE, orders);
    auditLog('payment_declined', { order_id: order.id });
  }
  return res.json({ status: 'received' });
});

app.post('/webhooks/persona', (req, res) => {
  const signature = req.headers['persona-signature'];
  if (!PersonaAdapter.verifyWebhook(req.rawBody, process.env.PERSONA_WEBHOOK_SECRET, signature)) return res.status(401).json({ error: 'Invalid signature' });
  const payload = req.body || {};
  const data = payload.data || {};
  auditLog('persona_webhook', { inquiry_id: data.id || null, status: data.status || null });
  return res.json({ ok: true });
});
app.post('/webhooks/veriff', (req, res) => {
  const signature = req.headers['x-hmac-signature'];
  if (!VeriffAdapter.verifyWebhook(req.rawBody, signature, process.env.VERIFF_SECRET)) return res.status(401).json({ error: 'Invalid signature' });
  const payload = req.body || {};
  const verification = payload.verification || {};
  auditLog('veriff_webhook', { session_id: verification.id || null, status: verification.status || null });
  return res.json({ ok: true });
});

app.post('/admin/login', (req, res) => {
  if (!adminAuth.isConfigured()) return res.status(503).json({ error: 'Admin authentication is not configured.' });
  if (!adminAuth.verifyPassword(req.body && req.body.password)) return res.status(401).json({ error: 'Invalid password' });
  const expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
  res.cookie('admin_auth', adminAuth.createToken(expiresAt), { maxAge: ADMIN_SESSION_TTL_MS, httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  return res.json({ ok: true });
});
app.post('/admin/logout', (req, res) => {
  res.clearCookie('admin_auth', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  return res.json({ ok: true });
});

app.get('/admin', (req, res) => {
  if (!adminAuth.verifyToken(req.cookies && req.cookies.admin_auth)) {
    return res.type('html').send('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin login</title><link rel="stylesheet" href="/styles.css"></head><body><main class="shell"><section class="admin-card" style="max-width:520px;margin:10vh auto"><p class="eyebrow">RESTRICTED ACCESS</p><h1 class="section-title">ADMIN LOGIN</h1><form id="login-form" class="checkout-form"><label><span>Admin password</span><input type="password" name="password" autocomplete="current-password" required></label><button class="cta" type="submit">Sign in</button><p id="message" role="status"></p></form></section></main><script>document.getElementById("login-form").addEventListener("submit",async function(e){e.preventDefault();var m=document.getElementById("message");var b=this.querySelector("button");b.disabled=true;try{var r=await fetch("/admin/login",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:new FormData(this).get("password")})});var d=await r.json();if(!r.ok)throw new Error(d.error||"Login failed");location.assign("/admin")}catch(x){m.textContent=x.message||"Login failed"}finally{b.disabled=false}})</script></body></html>');
  }
  return res.type('html').send('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CIGgiECIG Admin</title><link rel="stylesheet" href="/styles.css"><style>.admin-table{width:100%;border-collapse:collapse}.admin-table td,.admin-table th{padding:8px;border:1px solid #333;text-align:left}.admin-section{overflow-x:auto}</style></head><body><main class="shell"><header class="topbar"><div class="brand">CIGgiECIG / ADMIN</div><button id="logout" type="button" class="ghost">Sign out</button></header><section class="admin-panel"><article class="admin-card admin-section"><h2>Orders</h2><table class="admin-table"><thead><tr><th>Order</th><th>Total</th><th>Status</th><th>State</th></tr></thead><tbody id="orders"></tbody></table></article><article class="admin-card admin-section"><h2>Inventory</h2><form id="product-form" class="checkout-form"><label><span>Name</span><input name="name" maxlength="120" required></label><label><span>Flavor / variant</span><input name="flavor" maxlength="120"></label><label><span>Description</span><input name="description" maxlength="500"></label><label><span>Price (USD)</span><input name="price" type="number" min="0" step="0.01" required></label><label><span>Cost (USD)</span><input name="cost" type="number" min="0" step="0.01" required></label><label><span>Stock</span><input name="stock" type="number" min="0" step="1" required></label><label><span>Category</span><input name="category" value="vape" maxlength="80"></label><label><span>Product authorization/order reference</span><input name="fda_order_number" maxlength="200" required></label><button class="cta" type="submit">Create draft product</button></form><p id="product-message" role="status"></p><table class="admin-table"><thead><tr><th>Product</th><th>Stock</th><th>Price</th><th>Published</th><th>Action</th></tr></thead><tbody id="inventory"></tbody></table></article></section><p id="admin-message" role="status"></p></main><script>' +
  'function cell(row,value){var td=document.createElement("td");td.textContent=value==null?"":String(value);row.appendChild(td)}' +
  'async function loadOrders(){var r=await fetch("/api/admin/orders");if(!r.ok)throw new Error("Unable to load orders");var rows=await r.json();var body=document.getElementById("orders");body.replaceChildren();rows.forEach(function(o){var tr=document.createElement("tr");[o.id,"$"+Number(o.total).toFixed(2),o.status,o.state].forEach(function(v){cell(tr,v)});body.appendChild(tr)})}' +
  'async function loadInventory(){var r=await fetch("/api/admin/inventory");if(!r.ok)throw new Error("Unable to load inventory");var rows=await r.json();var body=document.getElementById("inventory");body.replaceChildren();rows.forEach(function(p){var tr=document.createElement("tr");[p.name,p.stock,"$"+Number(p.price).toFixed(2),p.published===true?"Yes":"No"].forEach(function(v){cell(tr,v)});var td=document.createElement("td");var b=document.createElement("button");b.type="button";b.textContent=p.published===true?"Unpublish":"Publish";b.addEventListener("click",async function(){try{var u=await fetch("/api/admin/product/"+encodeURIComponent(p.id),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({published:p.published!==true})});var d=await u.json();if(!u.ok)throw new Error(d.error||"Update failed");await loadInventory()}catch(e){document.getElementById("admin-message").textContent=e.message}});td.appendChild(b);tr.appendChild(td);body.appendChild(tr)})}' +
  'document.getElementById("product-form").addEventListener("submit",async function(e){e.preventDefault();var d=new FormData(this);var payload={name:d.get("name"),flavor:d.get("flavor"),description:d.get("description"),price:Number(d.get("price")),cost:Number(d.get("cost")),stock:Number(d.get("stock")),category:d.get("category"),fda_order_number:d.get("fda_order_number")};try{var r=await fetch("/api/admin/product",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});var x=await r.json();if(!r.ok)throw new Error(x.error||"Unable to create product");this.reset();document.getElementById("product-message").textContent="Draft product created. Review before publishing.";await loadInventory()}catch(x){document.getElementById("product-message").textContent=x.message}});' +
  'Promise.all([loadOrders(),loadInventory()]).catch(function(e){document.getElementById("admin-message").textContent=e.message});document.getElementById("logout").addEventListener("click",async function(){await fetch("/admin/logout",{method:"POST"});location.assign("/admin")});</script></body></html>');
});

app.get('/api/admin/orders', (req, res, next) => adminAuth.verifyToken(req.cookies && req.cookies.admin_auth) ? next() : res.status(401).json({ error: 'Unauthorized' }), (req, res) => res.json(readJSON(ORDERS_FILE, [])));
app.get('/api/admin/inventory', (req, res, next) => adminAuth.verifyToken(req.cookies && req.cookies.admin_auth) ? next() : res.status(401).json({ error: 'Unauthorized' }), (req, res) => res.json(getProducts()));

function requireAdmin(req, res, next) {
  if (!adminAuth.verifyToken(req.cookies && req.cookies.admin_auth)) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
app.post('/api/admin/product', requireAdmin, (req, res) => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 120) return res.status(400).json({ error: 'Product name is required and must be at most 120 characters' });
  if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0 || body.price > 1000000) return res.status(400).json({ error: 'Price must be a valid non-negative number' });
  if (typeof body.cost !== 'number' || !Number.isFinite(body.cost) || body.cost < 0 || body.cost > 1000000) return res.status(400).json({ error: 'Cost must be a valid non-negative number' });
  if (!Number.isSafeInteger(body.stock) || body.stock < 0 || body.stock > 100000000) return res.status(400).json({ error: 'Stock must be a non-negative integer' });
  for (const key of ['flavor', 'description', 'category', 'fda_order_number']) if (body[key] !== undefined && (typeof body[key] !== 'string' || body[key].length > 500)) return res.status(400).json({ error: key + ' must be a string of at most 500 characters' });
  const products = getProducts();
  const product = { id: 'sku-' + crypto.randomBytes(6).toString('hex'), name, flavor: body.flavor || '', description: body.description || '', price: body.price, cost: body.cost, stock: body.stock, category: body.category || 'vape', fda_order_number: body.fda_order_number || '', image: '/tiles/tile-1.svg', published: false, active: false };
  products.push(product);
  writeJSON(PRODUCTS_FILE, products);
  auditLog('product_created', { product_id: product.id });
  return res.status(201).json({ ok: true, product });
});
app.post('/api/admin/product/:id', requireAdmin, (req, res) => {
  const products = getProducts();
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const updates = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : null;
  if (!updates || !Object.keys(updates).length) return res.status(400).json({ error: 'A non-empty product update object is required' });
  const allowed = ['name', 'flavor', 'description', 'cost', 'price', 'fda', 'fda_order_number', 'stock', 'published', 'active', 'category', 'image', 'badge'];
  const unknown = Object.keys(updates).filter(key => !allowed.includes(key));
  if (unknown.length) return res.status(400).json({ error: 'Unsupported product fields', fields: unknown });
  for (const key of ['name', 'flavor', 'description', 'fda', 'fda_order_number', 'category', 'image', 'badge']) if (key in updates && (typeof updates[key] !== 'string' || updates[key].length > 500)) return res.status(400).json({ error: key + ' must be a string of at most 500 characters' });
  for (const key of ['cost', 'price']) if (key in updates && (typeof updates[key] !== 'number' || !Number.isFinite(updates[key]) || updates[key] < 0 || updates[key] > 1000000)) return res.status(400).json({ error: key + ' must be a finite non-negative number' });
  if ('stock' in updates && (!Number.isSafeInteger(updates.stock) || updates.stock < 0 || updates.stock > 100000000)) return res.status(400).json({ error: 'Stock must be a non-negative integer' });
  for (const key of ['published', 'active']) if (key in updates && typeof updates[key] !== 'boolean') return res.status(400).json({ error: key + ' must be a boolean' });
  if ('image' in updates && !/^\/[a-zA-Z0-9/_\-.]+$/.test(updates.image)) return res.status(400).json({ error: 'image must be a local asset path' });
  if (updates.published === true && !String(updates.fda_order_number || product.fda_order_number || '').trim()) return res.status(400).json({ error: 'A product authorization/order reference is required before publishing' });
  Object.assign(product, updates);
  writeJSON(PRODUCTS_FILE, products);
  auditLog('product_updated', { product_id: product.id, fields: Object.keys(updates) });
  return res.json({ ok: true, product });
});

app.get('/api/adapters', (req, res) => res.json({ persona: PersonaAdapter.getStatus(), veriff: VeriffAdapter.getStatus(), payment: PaymentAdapter.getAdapterStatus() }));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime(), checks: { admin_auth_configured: adminAuth.isConfigured() } }));

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) return res.status(400).json({ error: 'Invalid JSON body' });
  console.error('Request failed:', err && err.message ? err.message : 'unknown error');
  return res.status(500).json({ error: 'Internal server error' });
});

initProducts();
const server = app.listen(PORT, () => {
  console.log('CIGgiECIG storefront listening on port ' + PORT);
  auditLog('server_start', { port: PORT, provider: PAY_PROVIDER });
});
server.requestTimeout = 30000;
server.headersTimeout = 35000;
server.keepAliveTimeout = 5000;
module.exports = app;
