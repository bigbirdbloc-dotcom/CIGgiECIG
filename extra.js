const crypto = require('crypto');

function money(value) {
  return Number(value || 0).toFixed(2);
}

function computePrice(cost) {
  return Number((Number(cost || 0) * 1.4).toFixed(2));
}

function ageFromDob(dateString) {
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - value.getFullYear();
  const monthDiff = now.getMonth() - value.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < value.getDate())) {
    age--;
  }
  return age;
}

function isAgeVerified(dateString) {
  const age = ageFromDob(dateString);
  return typeof age === 'number' && age >= 21;
}

function productStatus(product) {
  if (!product || !product.name) return 'draft';
  if (!product.fda_order_number || !String(product.fda_order_number).trim()) {
    return 'blocked';
  }
  return product.active ? 'active' : 'inactive';
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  return !!value;
}

function isAllowedZip(zip, allowedList) {
  if (!zip) return false;
  const normalized = String(zip).trim();
  return allowedList.includes(normalized);
}

function decodeFormPreservingPlus(rawBody) {
  const source = Buffer.isBuffer(rawBody) ? rawBody.toString() : String(rawBody || '');
  const pairs = source.split('&');
  const out = {};
  for (const pair of pairs) {
    if (!pair) continue;
    const idx = pair.indexOf('=');
    const key = idx === -1 ? pair : pair.slice(0, idx);
    const rawValue = idx === -1 ? '' : pair.slice(idx + 1);
    const decodedKey = decodeURIComponent(key.replace(/\+/g, '%2B'));
    const decodedValue = decodeURIComponent(rawValue.replace(/\+/g, '%2B'));
    out[decodedKey] = decodedValue;
  }
  return out;
}

function safeParseJson(raw) {
  try {
    if (!raw) return null;
    if (typeof raw === 'string') return JSON.parse(raw);
    return JSON.parse(raw.toString());
  } catch (err) {
    return null;
  }
}

function signHmac(secret, rawBody) {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

function verifyHmac(rawBody, signature, secret) {
  if (!secret || !signature) return false;
  const expected = signHmac(secret, rawBody);
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature.toLowerCase(), 'hex'));
}

function sortSignedFields(values, signedFields) {
  return (signedFields || '').split(',').map((item) => item.trim()).filter(Boolean).map((name) => {
    const value = values[name] ?? '';
    return `${name}=${value}`;
  }).join(',');
}

function createCyberSourceSignature(values, secret, signedFields) {
  const message = sortSignedFields(values, signedFields);
  return crypto.createHmac('sha256', secret).update(message).digest('base64');
}

function verifyCyberSourceSignature(values, secret, signedFields, providedSignature) {
  const expected = createCyberSourceSignature(values, secret, signedFields);
  return expected === providedSignature;
}

function verifyPersonaWebhook(rawBody, headers, secret) {
  const header = headers && (headers['persona-signature'] || headers['Persona-Signature'] || headers['persona-signature'] || headers['x-persona-signature']);
  if (!header) return false;
  const parts = String(header).split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});
  const ts = parts.t;
  const v1 = parts.v1;
  if (!ts || !v1 || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
}

function verifyVeriffWebhook(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature.toLowerCase()));
}

function buildProduct(product) {
  return {
    id: product.id || `sku-${Math.random().toString(36).slice(2, 9)}`,
    name: product.name,
    description: product.description,
    cost: Number(product.cost || 0),
    price: Number(product.price || computePrice(product.cost || 0)),
    fda_order_number: product.fda_order_number || '',
    active: parseBoolean(product.active),
    category: product.category || 'vape',
    image: product.image || '/tiles/tile-1.svg',
    badge: product.badge || 'drop'
  };
}

function seedProducts() {
  return [
    buildProduct({ id: 'sku-01', name: 'AURORA 7000', description: 'Ice-cool disposable with bright citrus tang.', cost: 12.00, fda_order_number: '', active: false, category: 'disposable', image: '/tiles/tile-1.svg', badge: 'new' }),
    buildProduct({ id: 'sku-02', name: 'MIDNIGHT 7000', description: 'Berry-forward performance in a midnight shell.', cost: 13.00, fda_order_number: '', active: false, category: 'disposable', image: '/tiles/tile-2.svg', badge: 'top' }),
    buildProduct({ id: 'sku-03', name: 'CINDER 7000', description: 'Dark fruit profile with a smooth iced finish.', cost: 14.00, fda_order_number: '', active: false, category: 'disposable', image: '/tiles/tile-3.svg', badge: 'sale' }),
    buildProduct({ id: 'sku-04', name: 'VOLT POD', description: 'Rechargeable pod kit for a dependable all-day draw.', cost: 16.00, fda_order_number: '', active: false, category: 'pod', image: '/tiles/tile-4.svg', badge: 'pro' }),
    buildProduct({ id: 'sku-05', name: 'NOIR POD', description: 'A balanced profile with crisp throat hit and rich vapor.', cost: 17.00, fda_order_number: '', active: false, category: 'pod', image: '/tiles/tile-5.svg', badge: 'new' }),
    buildProduct({ id: 'sku-06', name: 'PULSE POD', description: 'Nicotine-forward draw with enough edge to feel heavy.', cost: 18.00, fda_order_number: '', active: false, category: 'pod', image: '/tiles/tile-6.svg', badge: 'hot' }),
    buildProduct({ id: 'sku-07', name: 'GLITCH CARTRIDGE', description: 'Refill cartridge tuned for easy swap setups.', cost: 11.00, fda_order_number: '', active: false, category: 'cart', image: '/tiles/tile-1.svg', badge: 'drop' }),
    buildProduct({ id: 'sku-08', name: 'BRICK TANK', description: 'Chunky build with dense vapor and smooth cooling.', cost: 15.00, fda_order_number: '', active: false, category: 'tank', image: '/tiles/tile-2.svg', badge: 'top' }),
    buildProduct({ id: 'sku-09', name: 'JETLINE BATTERY', description: 'Long-life power for a reliable, charge-ready kit.', cost: 20.00, fda_order_number: '', active: false, category: 'battery', image: '/tiles/tile-3.svg', badge: 'elite' })
  ];
}

module.exports = {
  money,
  computePrice,
  isAgeVerified,
  ageFromDob,
  parseBoolean,
  productStatus,
  isAllowedZip,
  decodeFormPreservingPlus,
  safeParseJson,
  signHmac,
  verifyHmac,
  createCyberSourceSignature,
  verifyCyberSourceSignature,
  sortSignedFields,
  verifyPersonaWebhook,
  verifyVeriffWebhook,
  seedProducts,
  buildProduct
};
