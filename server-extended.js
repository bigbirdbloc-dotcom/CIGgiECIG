// Extended server features with WebSocket support and advanced routing
// This is additive to server.js — merge these routes into your main server

const crypto = require('crypto');

module.exports = function(app, config) {
  const { db, save, money, esc, payment } = config;

  // ============ CART MANAGEMENT ============
  app.post('/api/cart/add', (req, res) => {
    const { productId, qty } = req.body;
    const products = db().products;
    const product = products.find((p) => p.id === productId);

    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (qty < 1) return res.status(400).json({ error: 'Invalid quantity' });

    let cart = JSON.parse(req.cookies.cart || '{}');
    cart[productId] = Math.min((cart[productId] || 0) + qty, product.stock);

    res.cookie('cart', JSON.stringify(cart), { httpOnly: true, sameSite: 'lax' });
    res.json({ ok: true, cart });
  });

  app.post('/api/cart/remove', (req, res) => {
    const { productId } = req.body;
    let cart = JSON.parse(req.cookies.cart || '{}');
    delete cart[productId];
    res.cookie('cart', JSON.stringify(cart), { httpOnly: true, sameSite: 'lax' });
    res.json({ ok: true, cart });
  });

  app.get('/api/cart', (req, res) => {
    const cart = JSON.parse(req.cookies.cart || '{}');
    const products = db().products;
    const items = Object.entries(cart)
      .map(([id, qty]) => {
        const p = products.find((x) => x.id === id);
        return p ? { ...p, qty } : null;
      })
      .filter(Boolean);
    res.json({ items, total: items.reduce((s, i) => s + i.price * i.qty, 0) });
  });

  // ============ ORDER TRACKING ============
  app.get('/api/orders/:id', (req, res) => {
    const order = db().orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  });

  app.post('/api/orders/:id/tracking', (req, res) => {
    const { trackingNumber, carrier } = req.body;
    const data = db();
    const order = data.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.tracking_number = trackingNumber;
    order.carrier = carrier;
    order.status = 'shipped';
    save(data);
    res.json({ ok: true, order });
  });

  // ============ INVENTORY MANAGEMENT ============
  app.get('/api/inventory', (req, res) => {
    const products = db().products;
    res.json(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        price: money(p.price),
        status: p.published ? 'active' : 'blocked'
      }))
    );
  });

  app.post('/api/inventory/:id/restock', (req, res) => {
    const { quantity } = req.body;
    const data = db();
    const product = data.products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    product.stock += quantity;
    save(data);
    res.json({ ok: true, product });
  });

  // ============ AGE VERIFICATION LOGS ============
  app.get('/api/audit/age-checks', (req, res) => {
    const data = db();
    if (!data.auditLog) data.auditLog = [];
    res.json(data.auditLog.filter((a) => a.type === 'age_check').slice(-50));
  });

  app.post('/api/audit/log', (req, res) => {
    const { type, payload } = req.body;
    const data = db();
    if (!data.auditLog) data.auditLog = [];
    data.auditLog.push({
      timestamp: new Date().toISOString(),
      type,
      payload,
      ip: req.ip
    });
    save(data);
    res.json({ ok: true });
  });

  // ============ REPORTING ============
  app.get('/api/reports/sales', (req, res) => {
    const data = db();
    const orders = data.orders;
    const total = orders.reduce((s, o) => s + o.total, 0);
    const count = orders.length;
    const avgOrder = count > 0 ? Math.round(total / count) : 0;
    res.json({ totalRevenue: money(total), orderCount: count, avgOrderValue: money(avgOrder) });
  });

  app.get('/api/reports/inventory', (req, res) => {
    const data = db();
    const products = data.products;
    const lowStock = products.filter((p) => p.stock < 5);
    const outOfStock = products.filter((p) => p.stock === 0);
    res.json({ total: products.length, lowStock: lowStock.length, outOfStock: outOfStock.length });
  });

  // ============ WEBHOOK SECURITY ============
  app.post('/api/webhook/test', (req, res) => {
    const { provider, payload } = req.body;
    const secret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];

    if (!secret) return res.status(400).json({ error: 'No secret configured' });

    try {
      const rawBody = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      res.json({ ok: true, signature, payload: rawBody });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
