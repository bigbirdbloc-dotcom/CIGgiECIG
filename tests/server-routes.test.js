'use strict';

const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

async function main() {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ciggiecig-test-'));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: Object.assign({}, process.env, {
      NODE_ENV: 'test',
      PORT: String(port),
      DATA_DIR: dataDir,
      ADMIN_PASS: 'integration-test-password',
      ADMIN_SESSION_SECRET: 'integration-test-session-secret-not-production',
      SHIP_STATES: 'WA,OR',
      LOCAL_ZIPS: '99201',
      TAX_RATE: '0.1',
      LOCAL_FEE: '800'
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let logs = '';
  child.stdout.on('data', chunk => { logs += chunk.toString(); });
  child.stderr.on('data', chunk => { logs += chunk.toString(); });
  const base = 'http://127.0.0.1:' + port;
  async function request(route, options) {
    return fetch(base + route, options || {});
  }
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      if (child.exitCode !== null) throw new Error('Server exited early: ' + logs);
      try {
        const response = await request('/health');
        if (response.ok) { ready = true; break; }
      } catch (_) {}
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.strictEqual(ready, true, 'server should become healthy');

    const health = await request('/health');
    assert.strictEqual(health.status, 200, 'health endpoint should be public and age-gate independent');

    const gated = await request('/api/products');
    assert.strictEqual(gated.status, 403, 'product API should require age verification');

    const age = await request('/verify', {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'dob=2000-01-01'
    });
    assert.strictEqual(age.status, 302, 'adult DOB should complete age gate');
    const ageCookie = (age.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(ageCookie.startsWith('age_verified=yes'), 'age cookie should be issued');

    const login = await request('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'integration-test-password' })
    });
    assert.strictEqual(login.status, 200, 'admin login should succeed with configured credentials');
    const adminCookie = (login.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(adminCookie.startsWith('admin_auth='), 'admin session cookie should be issued');
    const cookies = ageCookie + '; ' + adminCookie;

    const create = await request('/api/admin/product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies },
      body: JSON.stringify({ name: 'Integration Test SKU', price: 10.25, cost: 5, stock: 5, fda_order_number: 'TEST-REFERENCE' })
    });
    assert.strictEqual(create.status, 201, 'admin should create a draft product');
    const created = await create.json();
    assert.strictEqual(created.product.published, false, 'new products should start unpublished');

    const publish = await request('/api/admin/product/' + created.product.id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies },
      body: JSON.stringify({ published: true })
    });
    assert.strictEqual(publish.status, 200, 'authorized product with reference should publish');
    const catalog = await request('/api/products', { headers: { Cookie: ageCookie } });
    assert.strictEqual(catalog.status, 200, 'age-verified catalog should load');
    const products = await catalog.json();
    assert.strictEqual(products.length, 1, 'published product should appear in catalog');

    const checkout = await request('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: ageCookie },
      body: JSON.stringify({
        cart: [{ id: created.product.id, qty: 1, price: 0.01 }],
        shipping_method: 'shipping',
        state: 'WA',
        zip: '99201',
        payment_provider: 'attacker-controlled'
      })
    });
    assert.strictEqual(checkout.status, 201, 'valid cart should create an order');
    const orderResult = await checkout.json();
    assert.strictEqual(orderResult.order.subtotal, 10.25, 'server catalog price must override client price');
    assert.strictEqual(orderResult.order.payment_provider, 'cybersource', 'client cannot choose payment provider');
    assert.strictEqual(orderResult.order.total, 19.28, 'tax and shipping should use integer-cent arithmetic');

    const payment = await request(orderResult.payment_url, { headers: { Cookie: ageCookie } });
    assert.strictEqual(payment.status, 503, 'payment route must fail closed when merchant credentials are absent');

    const badWebhook = await request('/webhooks/cybersource', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction_id: orderResult.order.id, decision: 'ACCEPT' })
    });
    assert.strictEqual(badWebhook.status, 401, 'unsigned payment callbacks must be rejected');

    const massAssignment = await request('/api/admin/product/' + created.product.id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies },
      body: JSON.stringify({ id: 'overwritten', unexpected_admin: true })
    });
    assert.strictEqual(massAssignment.status, 400, 'unsupported admin update fields must be rejected');

    console.log('server-routes.test.js: age gate, admin, catalog, checkout, payment fail-closed, and webhook checks passed');
  } finally {
    child.kill('SIGTERM');
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
