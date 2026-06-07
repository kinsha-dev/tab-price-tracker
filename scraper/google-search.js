/**
 * Finds store product links for a query using:
 *  1. Brave Search API (free tier: 2000 req/month) — set BRAVE_API_KEY env var
 *  2. Fallback: curated per-product search URLs on each known store
 *
 * Get a free Brave Search API key at: https://brave.com/search/api/
 * Then: export BRAVE_API_KEY=your_key_here
 */

const axios = require('axios');

const SKIP_DOMAINS = [
  'google.com', 'bing.com', 'youtube.com', 'wikipedia.org', 'reddit.com',
  'gsmarena.com', 'techradar.com', 'theverge.com', 'engadget.com',
  'smartprix.com', '91mobiles.com', 'cashify.in', 'pricekart.com',
  'mysmartprice.com', 'gadgets360.com', 'ndtv.com', 'timesofindia.com',
  'pricehistory.app', 'pricena.com', 'electrorates.com', 'phoneaqua.com',
  'beebom.com', 'bgr.in', 'digit.in', 'gizmochina.com', 'cashkr.com',
];

const STORE_DOMAINS_IN = [
  'amazon.in', 'flipkart.com', 'croma.com', 'reliancedigital.in',
  'vijaysales.com', 'jiomart.com', 'lenovo.com', 'mi.com',
  'apple.com', 'tatacliq.com',
];
const STORE_DOMAINS_AE = [
  'amazon.ae', 'noon.com', 'sharafdg.com', 'emaxuae.com',
  'jumbo.ae', 'istyle.ae', 'apple.com', 'carrefouruae.com',
  'luluhypermarket.com', 'xcite.com',
];

// Fallback: direct store search URLs per product (used when no API key)
const FALLBACK_STORE_SEARCHES = {
  'lenovo-idea-tab': {
    IN: [
      'https://www.amazon.in/s?k=Lenovo+IdeaTab&i=electronics',
      'https://www.flipkart.com/search?q=Lenovo+IdeaTab',
      'https://www.croma.com/searchB?q=Lenovo+IdeaTab',
      'https://www.reliancedigital.in/search?q=Lenovo+IdeaTab',
      'https://www.jiomart.com/catalogsearch/result/?q=Lenovo+IdeaTab',
      'https://www.lenovo.com/in/en/search?q=IdeaTab&type=products',
    ],
    AE: [
      'https://www.amazon.ae/s?k=Lenovo+IdeaTab&i=electronics',
      'https://www.noon.com/uae-en/search/?q=Lenovo+IdeaTab',
      'https://uae.sharafdg.com/search/?q=Lenovo+IdeaTab',
      'https://www.jumbo.ae/search?q=Lenovo+IdeaTab',
      'https://istyle.ae/search?type=product&q=Lenovo+IdeaTab',
    ],
  },
  'lenovo-legion-tab': {
    IN: [
      'https://www.amazon.in/s?k=Lenovo+Legion+Tab&i=electronics',
      'https://www.flipkart.com/search?q=Lenovo+Legion+Tab',
      'https://www.croma.com/searchB?q=Lenovo+Legion+Tab',
      'https://www.lenovo.com/in/en/search?q=Legion+Tab&type=products',
      'https://www.jiomart.com/catalogsearch/result/?q=Lenovo+Legion+Tab',
    ],
    AE: [
      'https://www.amazon.ae/s?k=Lenovo+Legion+Tab&i=electronics',
      'https://www.noon.com/uae-en/search/?q=Lenovo+Legion+Tab',
      'https://uae.sharafdg.com/search/?q=Lenovo+Legion+Tab',
      'https://www.jumbo.ae/search?q=Lenovo+Legion+Tab',
    ],
  },
  'xiaomi-pad-7': {
    IN: [
      'https://www.amazon.in/s?k=Xiaomi+Pad+7&i=electronics',
      'https://www.flipkart.com/search?q=Xiaomi+Pad+7',
      'https://www.croma.com/searchB?q=Xiaomi+Pad+7',
      'https://www.mi.com/in/product/xiaomi-pad-7/',
      'https://www.jiomart.com/catalogsearch/result/?q=Xiaomi+Pad+7',
      'https://www.reliancedigital.in/search?q=Xiaomi+Pad+7',
    ],
    AE: [
      'https://www.amazon.ae/s?k=Xiaomi+Pad+7&i=electronics',
      'https://www.noon.com/uae-en/search/?q=Xiaomi+Pad+7',
      'https://uae.sharafdg.com/search/?q=Xiaomi+Pad+7',
      'https://www.jumbo.ae/search?q=Xiaomi+Pad+7',
      'https://www.mi.com/ae-en/product/xiaomi-pad-7/',
    ],
  },
  'ipad-10': {
    IN: [
      'https://www.amazon.in/s?k=Apple+iPad+10th+generation+64GB&i=electronics',
      'https://www.flipkart.com/search?q=Apple+iPad+10th+generation+64GB',
      'https://www.croma.com/searchB?q=Apple+iPad+10th+generation',
      'https://www.jiomart.com/catalogsearch/result/?q=Apple+iPad+10th+generation',
      'https://www.reliancedigital.in/search?q=Apple+iPad+10th+generation',
      'https://www.apple.com/in/shop/buy-ipad/ipad',
    ],
    AE: [
      'https://www.amazon.ae/s?k=Apple+iPad+10th+generation&i=electronics',
      'https://www.noon.com/uae-en/search/?q=Apple+iPad+10th+generation',
      'https://uae.sharafdg.com/search/?q=Apple+iPad+10th+generation',
      'https://www.jumbo.ae/search?q=Apple+iPad+10',
      'https://istyle.ae/search?type=product&q=iPad+10th+generation',
    ],
  },
  'ipad-11-2025': {
    IN: [
      'https://www.amazon.in/s?k=Apple+iPad+11th+generation+2025+A16&i=electronics',
      'https://www.flipkart.com/search?q=Apple+iPad+A16+2025',
      'https://www.croma.com/searchB?q=Apple+iPad+A16+2025',
      'https://www.jiomart.com/catalogsearch/result/?q=Apple+iPad+A16+2025',
      'https://www.apple.com/in/shop/buy-ipad/ipad',
      'https://www.reliancedigital.in/search?q=Apple+iPad+2025',
    ],
    AE: [
      'https://www.amazon.ae/s?k=Apple+iPad+11th+generation+2025+A16&i=electronics',
      'https://www.noon.com/uae-en/search/?q=Apple+iPad+A16+2025',
      'https://uae.sharafdg.com/ipad-11/',
      'https://www.jumbo.ae/ipad-11-2025',
      'https://istyle.ae/collections/apple-ipad-a16-2025',
      'https://www.apple.com/ae/shop/buy-ipad/ipad',
    ],
  },
};

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function shouldSkip(domain) {
  return SKIP_DOMAINS.some(s => domain === s || domain.endsWith('.' + s));
}

function isStoreDomain(domain, region) {
  const stores = region === 'AE' ? STORE_DOMAINS_AE : STORE_DOMAINS_IN;
  return stores.some(s => domain === s || domain.endsWith('.' + s));
}

async function searchWithBraveAPI(query, region, apiKey) {
  const country = region === 'AE' ? 'ae' : 'in';
  const resp = await axios.get('https://api.search.brave.com/res/v1/web/search', {
    params: { q: query, count: 10, country, search_lang: 'en', result_filter: 'web' },
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
    timeout: 15000,
  });

  const results = [];
  const seen = new Set();
  const webResults = resp.data?.web?.results || [];

  for (const r of webResults) {
    const domain = getDomain(r.url);
    if (!domain || shouldSkip(domain) || seen.has(domain)) continue;
    seen.add(domain);
    const priceMatch = (r.description || '').match(/[₹]\s?[\d,]+|AED\s?[\d,.]+/);
    const price = priceMatch ? parseFloat(priceMatch[0].replace(/[^\d.]/g, '')) : null;
    results.push({ title: r.title, url: r.url, domain, price, snippet: r.description?.slice(0, 150), source: 'brave' });
  }

  // Sort: known store domains first
  return results.sort((a, b) => (isStoreDomain(a.domain, region) ? 0 : 1) - (isStoreDomain(b.domain, region) ? 0 : 1));
}

async function searchGoogle(page, query, region, productId) {
  const apiKey = process.env.BRAVE_API_KEY;

  if (apiKey) {
    console.log(`  🔍 Brave API [${region}]: "${query}"`);
    try {
      const results = await searchWithBraveAPI(query, region, apiKey);
      console.log(`    → ${results.length} results: ${results.map(r => r.domain).join(', ')}`);
      return results.slice(0, 8);
    } catch (err) {
      console.log(`    ⚠️  Brave API error: ${err.message.slice(0, 60)} — falling back to direct store URLs`);
    }
  } else {
    console.log(`  🔍 Direct store search [${region}] (no BRAVE_API_KEY set)`);
  }

  // Fallback: return curated store search URLs as link objects
  const fallbackUrls = FALLBACK_STORE_SEARCHES[productId]?.[region] || [];
  const results = fallbackUrls.map(url => ({
    title: getDomain(url),
    url,
    domain: getDomain(url),
    price: null,
    source: 'fallback',
  }));
  console.log(`    → ${results.length} store URLs: ${results.map(r => r.domain).join(', ')}`);
  return results;
}

module.exports = { searchGoogle, getDomain, isStoreDomain, FALLBACK_STORE_SEARCHES };
