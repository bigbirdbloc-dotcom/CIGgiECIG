// CIGgiECIG — Graffiti storefront UI
(function () {
  const products = [
    { id: 'aurora', name: 'AURORA 7000', flavor: 'Blueberry Burst', price: 16.8, badge: 'new', image: '/tiles/tile-1.svg', status: 'FDA AUTH', description: 'Sparked with mint chill and neon purple haze.' },
    { id: 'midnight', name: 'MIDNIGHT 7000', flavor: 'Mango Riot', price: 18.4, badge: 'top', image: '/tiles/tile-2.svg', status: 'FDA AUTH', description: 'Dark fruit energy with a smooth exhale.' },
    { id: 'cinder', name: 'CINDER 7000', flavor: 'Citrus Dusk', price: 17.2, badge: 'hot', image: '/tiles/tile-3.svg', status: 'FDA AUTH', description: 'A bitter-sweet finish built for after-hours.' },
    { id: 'volt', name: 'VOLT POD', flavor: 'Berry Crash', price: 19.9, badge: 'drop', image: '/tiles/tile-4.svg', status: 'FDA AUTH', description: 'Dense clouds and a clean finish.' },
    { id: 'noir', name: 'NOIR POD', flavor: 'Mango Fuel', price: 21.0, badge: 'ltd', image: '/tiles/tile-5.svg', status: 'FDA AUTH', description: 'Razor cool vapor with neon heat.' },
    { id: 'pulse', name: 'PULSE POD', flavor: 'Grape Surge', price: 20.5, badge: 'elite', image: '/tiles/tile-6.svg', status: 'FDA AUTH', description: 'High-output draw with a clean throat hit.' }
  ];

  const formatMoney = (value) => `$${Number(value).toFixed(2)}`;

  function renderHero() {
    return `
      <section class="hero-panel neon-box">
        <div class="hero-art">
          <img src="/hero.svg" alt="CIGgiECIG hero graffiti mural" />
        </div>
        <div class="hero-copy">
          <p class="eyebrow">21+ ONLY // streetcrafted</p>
          <h1 class="hero-title glitch-text" data-text="3AM CYPHER">3AM CYPHER</h1>
          <p class="hero-subtitle">Neon vapor culture built for late-night runs, backed by strict age-gating and real vendor adapter hooks.</p>
          <div class="cta-row">
            <a class="cta" href="#shop">Shop the drop</a>
            <a class="ghost" href="/admin">Admin</a>
          </div>
          <div class="mini-stats">
            <div><strong>48</strong><span>Authorized SKUs</span></div>
            <div><strong>21+</strong><span>Age gate required</span></div>
            <div><strong>24/7</strong><span>Street-ready flow</span></div>
          </div>
        </div>
      </section>
    `;
  }

  function renderProducts() {
    return `
      <section id="shop" class="shop-section">
        <div class="section-header">
          <p class="eyebrow">AUTHORIZED DROP</p>
          <h2 class="section-title">WALL MEAT COLLECTION</h2>
        </div>
        <div class="product-grid">
          ${products.map(product => `
            <article class="card neon-box" data-product-id="${product.id}">
              <div class="card-top">
                <span class="tag">${product.badge}</span>
                <span class="meta-badge">${product.status}</span>
              </div>
              <img src="${product.image}" alt="${product.name}">
              <div class="card-body">
                <h3>${product.name}</h3>
                <p class="flavor">${product.flavor}</p>
                <p class="card-copy">${product.description}</p>
                <div class="card-bottom">
                  <div class="price">${formatMoney(product.price)}</div>
                  <form method="POST" action="/add-to-cart">
                    <input type="hidden" name="product_id" value="${product.id}" />
                    <button type="submit">Add to cart</button>
                  </form>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderCheckoutPreview() {
    return `
      <section class="spotlight checkout-shell">
        <div class="checkout-copy">
          <p class="eyebrow">CHECKOUT</p>
          <h2 class="section-title">GET IT BEFORE DAWN</h2>
          <p>Age verified, shipment gated, local delivery restricted to approved ZIP codes, and payment adapter ready for vendor approval.</p>
        </div>
        <form method="POST" action="/checkout" class="checkout-form">
          <label>
            <span>Shipping method</span>
            <select name="shipping_method">
              <option value="ship">Ship</option>
              <option value="local">Local delivery</option>
              <option value="pickup">Pickup</option>
            </select>
          </label>
          <label>
            <span>State</span>
            <select name="buyer_state">
              <option value="WA">Washington</option>
              <option value="OR">Oregon</option>
              <option value="CA">California</option>
            </select>
          </label>
          <label>
            <span>ZIP</span>
            <input name="zip" value="99201" />
          </label>
          <button type="submit" class="cta">Place order</button>
        </form>
      </section>
    `;
  }

  function renderAdminStatus() {
    return `
      <section class="admin-panel">
        <div class="admin-card">
          <p class="eyebrow">SYSTEM</p>
          <h3>Adapter health</h3>
          <ul>
            <li><span class="pill ok">Persona</span> Verified</li>
            <li><span class="pill ok">Veriff</span> Verified</li>
            <li><span class="pill ok">CyberSource</span> Verified</li>
            <li><span class="pill warn">AgeChecker.Net</span> Partial</li>
          </ul>
        </div>
        <div class="admin-card">
          <p class="eyebrow">OPS</p>
          <h3>Latest status</h3>
          <p>Product publishing stays blocked until FDA order number and cost are added for each SKU.</p>
          <a href="/admin" class="ghost">Open admin</a>
        </div>
      </section>
    `;
  }

  function renderApp() {
    const app = document.getElementById('app-content');
    if (!app) return;
    app.innerHTML = `
      ${renderHero()}
      ${renderProducts()}
      ${renderCheckoutPreview()}
      ${renderAdminStatus()}
    `;
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderApp();
  });
})();
