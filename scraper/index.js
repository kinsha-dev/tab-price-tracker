const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const PRODUCTS = require('./products');

const IN_STORES = [
  require('./stores/amazon-in'),
  require('./stores/flipkart'),
  require('./stores/croma'),
  require('./stores/reliance'),
  require('./stores/vijay-sales'),
  require('./stores/jiomart'),
  require('./stores/lenovo-in'),
  require('./stores/mi-in'),
];

const AE_STORES = [
  require('./stores/amazon-ae'),
  require('./stores/noon'),
  require('./stores/sharaf'),
  require('./stores/emax'),
  require('./stores/jumbo'),
  require('./stores/istyle'),
];

const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'prices.json');
const MAX_HISTORY_ENTRIES = 168; // 7 days × 24 hrs

function loadExisting() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return { history: [] };
  }
}

async function scrapeStore(page, storeModule, query) {
  try {
    console.log(`  → ${storeModule.STORE.name}: "${query}"`);
    const result = await storeModule.scrape(page, query);
    if (result) {
      console.log(`    ✅ ${result.price} ${result.currency}`);
    } else {
      console.log(`    ⚠️  No result`);
    }
    return result;
  } catch (err) {
    console.log(`    ❌ Error: ${err.message.slice(0, 60)}`);
    return null;
  }
}

async function run() {
  console.log('🚀 Tab Shopping Scraper starting...\n');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'en-US',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  const snapshot = {
    timestamp: new Date().toISOString(),
    products: {}
  };

  for (const product of PRODUCTS) {
    console.log(`\n📦 Scraping: ${product.name}`);
    const productData = { id: product.id, name: product.name, stores: {} };

    for (const store of IN_STORES) {
      const result = await scrapeStore(page, store, product.queries.in);
      if (result) productData.stores[store.STORE.id] = result;
    }

    for (const store of AE_STORES) {
      const result = await scrapeStore(page, store, product.queries.ae);
      if (result) productData.stores[store.STORE.id] = result;
    }

    // Find cheapest per region
    const inPrices = Object.values(productData.stores).filter(s => s.region === 'IN');
    const aePrices = Object.values(productData.stores).filter(s => s.region === 'AE');

    if (inPrices.length) {
      const cheapest = inPrices.reduce((a, b) => a.price < b.price ? a : b);
      productData.cheapestIN = { storeId: cheapest.id, storeName: cheapest.name, price: cheapest.price, url: cheapest.url, icon: cheapest.icon };
    }
    if (aePrices.length) {
      const cheapest = aePrices.reduce((a, b) => a.price < b.price ? a : b);
      productData.cheapestAE = { storeId: cheapest.id, storeName: cheapest.name, price: cheapest.price, url: cheapest.url, icon: cheapest.icon };
    }

    snapshot.products[product.id] = productData;
  }

  await browser.close();

  // Merge with history
  const existing = loadExisting();
  existing.history.push(snapshot);
  if (existing.history.length > MAX_HISTORY_ENTRIES) {
    existing.history = existing.history.slice(-MAX_HISTORY_ENTRIES);
  }
  existing.lastUpdated = snapshot.timestamp;

  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(existing, null, 2));
  console.log(`\n✅ Data saved → ${DATA_PATH}`);
  console.log(`📊 History: ${existing.history.length} entries`);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
