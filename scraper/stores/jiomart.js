const STORE = { id: 'jiomart', name: 'JioMart', region: 'IN', currency: 'INR', icon: '🛍️', baseUrl: 'https://www.jiomart.com' };

async function scrape(page, query) {
  const url = `https://www.jiomart.com/catalogsearch/result/?q=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const result = await page.evaluate(() => {
    const cards = document.querySelectorAll('[data-testid="product-card"], .product-item, li.product-item-info, [class*="product"]');
    for (const card of cards) {
      const priceEl = card.querySelector('[data-testid="product-price"], .price, [class*="price"], span[id*="price"]');
      const titleEl = card.querySelector('[data-testid="product-title"], .product-name, a[class*="title"], h2, h3');
      const linkEl = card.querySelector('a');
      if (!priceEl) continue;
      const price = parseFloat(priceEl.textContent.replace(/[^\d.]/g, ''));
      if (isNaN(price) || price < 5000) continue;
      const href = linkEl ? linkEl.getAttribute('href') : null;
      return {
        price,
        title: titleEl ? titleEl.textContent.trim().slice(0, 80) : query,
        url: href ? (href.startsWith('http') ? href : 'https://www.jiomart.com' + href) : null
      };
    }
    return null;
  });

  return result ? { ...STORE, ...result } : null;
}

module.exports = { STORE, scrape };
