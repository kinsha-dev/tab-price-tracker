const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const PRODUCTS = require('./products');
const { searchGoogle } = require('./google-search');
const { extractPrice } = require('./price-extractor');

const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'prices.json');
const MAX_HISTORY_ENTRIES = 168; // 7 days × 24 hrs

// Google search queries per product per region
const QUERIES = {
  'lenovo-idea-tab': {
    IN: 'Lenovo IdeaTab tablet buy online India price',
    AE: 'Lenovo IdeaTab tablet buy online UAE price',
  },
  'lenovo-legion-tab': {
    IN: 'Lenovo Legion Tab gaming tablet buy India price',
    AE: 'Lenovo Legion Tab gaming tablet buy UAE price',
  },
  'xiaomi-pad-7': {
    IN: 'Xiaomi Pad 7 tablet buy online India price',
    AE: 'Xiaomi Pad 7 tablet buy online UAE price',
  },
  'ipad-10': {
    IN: 'Apple iPad 10th generation 64GB buy online India price',
    AE: 'Apple iPad 10th generation 64GB buy online UAE price',
  },
  'ipad-11-2025': {
    IN: 'Apple iPad 11th generation 2025 A16 chip buy India price',
    AE: 'Apple iPad 11th generation 2025 A16 chip buy UAE price',
  },
};

function loadExisting() {
  try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); }
  catch { return { history: [] }; }
}

async function run() {
  console.log('🚀 Tab Shopping Scraper — Google AI Search mode\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
  });
  context.setDefaultTimeout(30000);
  const page = await context.newPage();

  const snapshot = { timestamp: new Date().toISOString(), products: {} };

  for (const product of PRODUCTS) {
    console.log(`\n📦 ${product.name}`);
    const productData = { id: product.id, name: product.name, stores: {} };

    for (const region of ['IN', 'AE']) {
      const query = QUERIES[product.id]?.[region];
      if (!query) continue;

      // Step 1 — Google Search → get store links
      let links = [];
      try {
        links = await searchGoogle(page, query, region, product.id);
      } catch (err) {
        console.log(`  ❌ Google search failed [${region}]: ${err.message.slice(0, 60)}`);
        continue;
      }

      // Step 2 — visit each link → extract price
      for (const link of links) {
        console.log(`  → [${region}] ${link.title?.slice(0, 40) || link.url.slice(0, 50)}`);
        const result = await extractPrice(page, link.url, region);
        if (result && result.price) {
          console.log(`    ✅ ${result.name}: ${result.currency} ${result.price}`);
          // Use domain as store key, avoid duplicates (keep cheapest)
          const key = result.domain.split('.')[0];
          if (!productData.stores[key] || result.price < productData.stores[key].price) {
            productData.stores[key] = result;
          }
        } else {
          console.log(`    ⚠️  No price found`);
        }
        await page.waitForTimeout(800); // gentle pacing
      }
    }

    // Find cheapest per region
    const inStores = Object.values(productData.stores).filter(s => s.region === 'IN');
    const aeStores = Object.values(productData.stores).filter(s => s.region === 'AE');

    if (inStores.length) {
      const c = inStores.reduce((a, b) => a.price < b.price ? a : b);
      productData.cheapestIN = { storeId: c.id, storeName: c.name, price: c.price, url: c.url, icon: c.icon };
    }
    if (aeStores.length) {
      const c = aeStores.reduce((a, b) => a.price < b.price ? a : b);
      productData.cheapestAE = { storeId: c.id, storeName: c.name, price: c.price, url: c.url, icon: c.icon };
    }

    snapshot.products[product.id] = productData;

    const totalStores = Object.keys(productData.stores).length;
    console.log(`  📊 ${totalStores} stores scraped for ${product.name}`);
  }

  await browser.close();

  // Persist
  const existing = loadExisting();
  const prevSnapshot = existing.history[existing.history.length - 1];

  // Detect price drops and send ntfy notifications
  await notifyPriceDrops(snapshot, prevSnapshot);

  existing.history.push(snapshot);
  if (existing.history.length > MAX_HISTORY_ENTRIES) {
    existing.history = existing.history.slice(-MAX_HISTORY_ENTRIES);
  }
  existing.lastUpdated = snapshot.timestamp;

  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(existing, null, 2));

  console.log(`\n✅ Done — ${existing.history.length} history entries saved`);
}

async function notifyPriceDrops(snapshot, prevSnapshot) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return; // NTFY_TOPIC not set — skip silently

  const AED_TO_INR = 23.05;
  const drops = [];

  for (const product of PRODUCTS) {
    const cur = snapshot.products[product.id];
    const prev = prevSnapshot?.products?.[product.id];
    if (!cur || !prev) continue;

    for (const region of ['IN', 'AE']) {
      const key = region === 'IN' ? 'cheapestIN' : 'cheapestAE';
      const curC = cur[key];
      const prevC = prev[key];
      if (!curC || !prevC) continue;

      if (curC.price < prevC.price) {
        const sym = region === 'IN' ? '₹' : 'AED ';
        const drop = prevC.price - curC.price;
        const pct = ((drop / prevC.price) * 100).toFixed(1);
        let msg = `${product.name} (${region}): ${sym}${curC.price.toLocaleString()} at ${curC.storeName} — down ${sym}${Math.round(drop).toLocaleString()} (${pct}%)`;
        if (region === 'AE') {
          msg += ` ≈ ₹${Math.round(curC.price * AED_TO_INR).toLocaleString('en-IN')}`;
        }
        drops.push({ msg, url: curC.url, pct: parseFloat(pct) });
      }
    }
  }

  if (!drops.length) {
    console.log('  📲 ntfy: no price drops this run');
    return;
  }

  // Sort biggest drop first
  drops.sort((a, b) => b.pct - a.pct);

  for (const d of drops) {
    try {
      await axios.post(`https://ntfy.sh/${topic}`, d.msg, {
        headers: {
          Title: '🏷️ Tab Price Drop!',
          Priority: d.pct >= 5 ? 'high' : 'default',
          Tags: 'chart_with_downwards_trend,iphone',
          Click: d.url || '',
        },
        timeout: 10000,
      });
      console.log(`  📲 ntfy sent: ${d.msg}`);
    } catch (err) {
      console.log(`  ⚠️  ntfy failed: ${err.message.slice(0, 60)}`);
    }
  }
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
