(function () {
  'use strict';
  const root = document.getElementById('app-content');
  const state = { products: [], cart: new Map(), busy: false, notice: null, orderResult: '' };
  const money = v => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v) || 0);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const imagePath = v => typeof v === 'string' && /^\/[a-zA-Z0-9/_\-.]+$/.test(v) ? v : '/hero.svg';
  async function api(url, options) {
    const response = await fetch(url, Object.assign({ credentials: 'same-origin' }, options || {}));
    const type = response.headers.get('content-type') || '';
    const data = type.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) throw new Error(data && data.error ? data.error : 'Request failed (' + response.status + ')');
    return data;
  }
  function items() {
    return Array.from(state.cart.entries()).map(([id, qty]) => ({ product: state.products.find(p => p.id === id), qty })).filter(x => x.product);
  }
  function render() {
    if (!root) return;
    const cart = items();
    const count = cart.reduce((n, x) => n + x.qty, 0);
    root.innerHTML =
      '<section class="hero-panel neon-box"><div class="hero-art"><img src="/hero.svg" alt="CIGgiECIG graffiti mural"></div>' +
      '<div class="hero-copy"><p class="eyebrow">21+ ONLY // STREETCRAFTED</p><h1 class="hero-title">3AM CYPHER</h1>' +
      '<p class="hero-subtitle">Neon graffiti culture, live catalog data, a working cart, and server-calculated order totals.</p>' +
      '<div class="cta-row"><a class="cta" href="#shop">Explore catalog</a><a class="ghost" href="#checkout">Checkout · ' + count + '</a></div>' +
      '<div class="mini-stats"><div><strong>21+</strong><span>Age gate</span></div><div><strong>' + state.products.length + '</strong><span>Live products</span></div><div><strong>' + count + '</strong><span>Cart items</span></div></div></div></section>' +
      '<section id="shop" class="shop-section"><div class="section-header"><div><p class="eyebrow">LIVE CATALOG</p><h2 class="section-title">THE COLLECTION</h2></div><p>' + state.products.length + ' published items</p></div><div class="product-grid">' +
      state.products.map(p => '<article class="card neon-box"><div class="card-top"><span class="tag">AVAILABLE</span><span class="meta-badge">' + esc(p.category || 'DROP') + '</span></div>' +
      '<img src="' + esc(imagePath(p.image)) + '" alt="' + esc(p.name) + '" loading="lazy"><div class="card-body"><h3>' + esc(p.name) + '</h3><p class="flavor">' + esc(p.flavor || p.description || '') + '</p>' +
      '<p class="card-copy">' + esc(p.description || 'Details available from the store team.') + '</p><div class="card-bottom"><div class="price">' + money(p.price) + '</div>' +
      '<button type="button" data-add="' + esc(p.id) + '"' + (Number(p.stock) === 0 ? ' disabled' : '') + '>' + (Number(p.stock) === 0 ? 'Out of stock' : 'Add to cart') + '</button></div>' +
      '<p class="card-copy">' + (Number.isFinite(Number(p.stock)) ? Number(p.stock) + ' in stock' : '') + '</p></div></article>').join('') +
      '</div>' + (state.products.length ? '' : '<p role="status">No published products are available right now.</p>') + '</section>' +
      '<section id="checkout" class="spotlight checkout-shell"><div class="checkout-copy"><p class="eyebrow">YOUR ORDER</p><h2 class="section-title">CHECKOUT</h2>' +
      '<p>Prices and totals are confirmed by the server. Orders remain pending until payment is verified.</p><div id="checkout-message" role="status" aria-live="polite">' + (state.notice ? esc(state.notice.text) : '') + '</div><div id="order-result">' + state.orderResult + '</div></div><div>' +
      '<div class="admin-card"><h3>Cart · ' + count + ' items</h3>' + (cart.length ? '<ul class="cart-list">' + cart.map(x =>
      '<li class="cart-line"><div><strong>' + esc(x.product.name) + '</strong><br><span>' + money(x.product.price) + ' each</span></div><div class="cart-controls">' +
      '<button type="button" data-dec="' + esc(x.product.id) + '" aria-label="Remove one">−</button><span>' + x.qty + '</span><button type="button" data-inc="' + esc(x.product.id) + '" aria-label="Add one">+</button></div></li>').join('') +
      '</ul>' : '<p>Your cart is empty. Add an item to begin.</p>') + '<p class="price">Catalog subtotal: ' + money(cart.reduce((n, x) => n + Number(x.product.price) * x.qty, 0)) + '</p></div>' +
      '<form id="checkout-form" class="checkout-form"><label><span>Fulfillment</span><select name="shipping_method" required><option value="shipping">Ship to address</option><option value="local">Local delivery</option></select></label>' +
      '<label><span>State</span><select name="state" required><option value="WA">Washington</option><option value="OR">Oregon</option></select></label>' +
      '<label><span>ZIP code</span><input name="zip" inputmode="numeric" autocomplete="postal-code" pattern="[0-9]{5}" maxlength="5" placeholder="99201" required></label>' +
      '<button type="submit" class="cta"' + (!cart.length || state.busy ? ' disabled' : '') + '>' + (state.busy ? 'Creating order…' : 'Create order') + '</button>' +
      '<p class="card-copy">Creating an order does not mean payment has been received.</p></form></div></section>';
  }
  function message(text, error) {
    const node = document.getElementById('checkout-message');
    state.notice = { text, error };
    if (node) { node.textContent = text; node.style.color = error ? 'var(--danger)' : 'var(--success)'; }
  }
  root.addEventListener('click', event => {
    const b = event.target.closest('button');
    if (!b) return;
    const id = b.dataset.add || b.dataset.inc || b.dataset.dec;
    if (!id) return;
    const product = state.products.find(p => p.id === id);
    if (!product) return;
    if (b.dataset.dec) {
      const next = (state.cart.get(id) || 0) - 1;
      if (next <= 0) state.cart.delete(id); else state.cart.set(id, next);
    } else {
      const next = (state.cart.get(id) || 0) + 1;
      if (Number.isFinite(Number(product.stock)) && next > Number(product.stock)) { message('Quantity exceeds available stock.', true); return; }
      state.cart.set(id, next);
    }
    render();
  });
  root.addEventListener('submit', async event => {
    if (event.target.id !== 'checkout-form') return;
    event.preventDefault();
    if (state.busy || !state.cart.size) return;
    const form = new FormData(event.target);
    state.busy = true; render(); message('Validating cart and creating order…', false);
    try {
      const result = await api('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: Array.from(state.cart, ([id, qty]) => ({ id, qty })),
          shipping_method: form.get('shipping_method'), state: form.get('state'), zip: form.get('zip') }) });
      state.cart.clear();
      state.orderResult = '<p><strong>Order created:</strong> ' + esc(result.order.id) + '</p><p>Total: ' + money(result.order.total) + '</p><a class="cta" href="' + esc(result.payment_url) + '">Continue to payment</a>';
      message('Order created and awaiting payment confirmation.', false);
      render();
    } catch (err) { message(err.message || 'Unable to create order. Please try again.', true); }
    finally { state.busy = false; render(); }
  });
  async function init() {
    try { const data = await api('/api/products'); state.products = Array.isArray(data) ? data : []; render(); }
    catch (err) { root.innerHTML = '<section class="admin-card"><h1>Store temporarily unavailable</h1><p>' + esc(err.message) + '</p><p>Refresh in a moment. If this continues, contact the store team.</p></section>'; }
  }
  document.addEventListener('DOMContentLoaded', init);
})();