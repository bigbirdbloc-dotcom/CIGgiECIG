const fs = require('fs');
const path = require('path');
const { seedProducts } = require('./extra');

const seedPath = path.join(__dirname, 'data', 'products.json');

function ensureSeed() {
  fs.mkdirSync(path.dirname(seedPath), { recursive: true });
  const products = seedProducts();
  fs.writeFileSync(seedPath, JSON.stringify(products, null, 2));
  return products;
}

if (require.main === module) {
  ensureSeed();
  console.log(`Seed data written to ${seedPath}`);
}

module.exports = { ensureSeed };
