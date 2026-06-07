/**
 * Visits a store URL and extracts the product price + title.
 * Works generically across any e-commerce site.
 */

const STORE_META = {
  'amazon.in':         { name: 'Amazon.in',        icon: '📦' },
  'flipkart.com':      { name: 'Flipkart',          icon: '🛒' },
  'croma.com':         { name: 'Croma',             icon: '⚡' },
  'reliancedigital.in':{ name: 'Reliance Digital',  icon: '📱' },
  'vijaysales.com':    { name: 'Vijay Sales',       icon: '🏬' },
  'jiomart.com':       { name: 'JioMart',           icon: '🛍️' },
  'lenovo.com':        { name: 'Lenovo.com',        icon: '🖥️' },
  'mi.com':            { name: 'Mi.com',            icon: '🔴' },
  'amazon.ae':         { name: 'Amazon.ae',         icon: '📦' },
  'noon.com':          { name: 'Noon',              icon: '🌙' },
  'sharafdg.com':      { name: 'Sharaf DG',         icon: '🏪' },
  'emaxuae.com':       { name: 'Emax',              icon: '🔌' },
  'jumbo.ae':          { name: 'Jumbo Electronics', icon: '🐘' },
  'istyle.ae':         { name: 'iSTYLE UAE',        icon: '🍏' },
  'apple.com':         { name: 'Apple Store',       icon: '🍎' },
  'tatacliq.com':      { name: 'Tata CLiQ',         icon: '🔷' },
  'carrefouruae.com':  { name: 'Carrefour UAE',     icon: '🛒' },
  'luluhypermarket.com':{ name: 'Lulu Hypermarket', icon: '🏪' },
  'xcite.com':         { name: 'Xcite',             icon: '⚡' },
};

function getStoreMeta(domain) {
  for (const [key, val] of Object.entries(STORE_META)) {
    if (domain === key || domain.endsWith('.' + key)) return { ...val, domain };
  }
  // fallback: capitalise domain
  const name = domain.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return { name, icon: '🏪', domain };
}

// Site-specific price selectors (fast path)
const SITE_SELECTORS = {
  'amazon':   { price: '.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice, .priceToPay .a-offscreen', title: '#productTitle' },
  'flipkart': { price: '._30jeq3, ._16Jk6d', title: '.B_NuCI, ._35KyD6' },
  'croma':    { price: '.amount, .offer-price', title: 'h1.product-title' },
  'reliancedigital': { price: 'span[class*="Price"], .price', title: 'h1' },
  'vijaysales': { price: '.product-price, .price', title: 'h1' },
  'jiomart':  { price: '[data-testid="product-price"], .final-price, .price', title: '[data-testid="product-title"], h1' },
  'noon':     { price: '[class*="priceNow"], [class*="price"]', title: '[class*="name"], h1' },
  'sharafdg': { price: '.special-price .price, .price', title: 'h1' },
  'emaxuae':  { price: '.special-price .price, .price', title: 'h1' },
  'jumbo':    { price: '[class*="price"], .price', title: 'h1' },
  'istyle':   { price: '.price, .product__price', title: 'h1' },
  'apple':    { price: '[class*="price"], .rc-prices-fullprice', title: 'h1' },
  'lenovo':   { price: '[class*="price"]', title: 'h1' },
  'mi.com':   { price: '[class*="price"]', title: 'h1' },
};

function getSiteKey(domain) {
  for (const key of Object.keys(SITE_SELECTORS)) {
    if (domain.includes(key)) return key;
  }
  return null;
}

async function extractPrice(page, url, region) {
  let domain;
  try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }

  const meta = getStoreMeta(domain);
  const currency = region === 'AE' ? 'AED' : 'INR';
  const minPrice = region === 'AE' ? 200 : 5000;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2500);

    // Dismiss popups
    try {
      const closeBtn = page.locator('button[aria-label*="close" i], button[aria-label*="dismiss" i], ._2KpZ6l._2doB4z');
      if (await closeBtn.count() > 0) await closeBtn.first().click({ timeout: 2000 });
    } catch {}

    const siteKey = getSiteKey(domain);
    const selectors = siteKey ? SITE_SELECTORS[siteKey] : null;

    const result = await page.evaluate(({ selectors, minPrice }) => {
      function tryPrice(selector) {
        if (!selector) return null;
        for (const sel of selector.split(',').map(s => s.trim())) {
          const els = document.querySelectorAll(sel);
          for (const el of els) {
            const txt = el.getAttribute('aria-label') || el.textContent;
            const p = parseFloat(txt.replace(/[^\d.]/g, ''));
            if (!isNaN(p) && p >= minPrice && p < 10000000) return p;
          }
        }
        return null;
      }

      function tryTitle(selector) {
        if (!selector) return null;
        for (const sel of selector.split(',').map(s => s.trim())) {
          const el = document.querySelector(sel);
          if (el) return el.textContent.trim().slice(0, 100);
        }
        return null;
      }

      // 1. Try site-specific selectors
      if (selectors) {
        const price = tryPrice(selectors.price);
        const title = tryTitle(selectors.title);
        if (price) return { price, title };
      }

      // 2. Generic fallback — find any element with ₹ or AED
      const allEls = document.querySelectorAll('*');
      for (const el of allEls) {
        if (el.children.length > 0) continue; // leaf nodes only
        const txt = el.textContent.trim();
        if (!txt.match(/[₹][\d,]+|AED\s?[\d,]+/)) continue;
        const p = parseFloat(txt.replace(/[^\d.]/g, ''));
        if (!isNaN(p) && p >= minPrice && p < 10000000) {
          return { price: p, title: document.title.slice(0, 100) };
        }
      }

      // 3. JSON-LD structured data
      const jsonLds = document.querySelectorAll('script[type="application/ld+json"]');
      for (const ld of jsonLds) {
        try {
          const data = JSON.parse(ld.textContent);
          const offers = data.offers || (data['@graph'] || []).find(x => x.offers)?.offers;
          if (offers) {
            const price = parseFloat((Array.isArray(offers) ? offers[0] : offers).price);
            if (!isNaN(price) && price >= minPrice) {
              return { price, title: data.name || document.title.slice(0, 100) };
            }
          }
        } catch {}
      }

      return null;
    }, { selectors, minPrice });

    if (!result) return null;

    return {
      id: domain.split('.')[0],
      name: meta.name,
      icon: meta.icon,
      domain,
      region,
      currency,
      price: result.price,
      title: result.title || meta.name,
      url,
    };
  } catch (err) {
    return null;
  }
}

module.exports = { extractPrice, getStoreMeta };
