const { chromium } = require('playwright');

const STORE = { id: 'amazon-in', name: 'Amazon.in', region: 'IN', currency: 'INR', icon: '📦', baseUrl: 'https://www.amazon.in' };

async function scrape(page, query) {
  const url = `https://www.amazon.in/s?k=${encodeURIComponent(query)}&i=electronics`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    const items = document.querySelectorAll('[data-component-type="s-search-result"]');
    for (const item of items) {
      const priceEl = item.querySelector('.a-price .a-offscreen');
      const titleEl = item.querySelector('h2 a span');
      const linkEl = item.querySelector('h2 a');
      if (!priceEl || !titleEl) continue;

      const priceText = priceEl.textContent.replace(/[^\d.]/g, '');
      const price = parseFloat(priceText);
      if (isNaN(price) || price < 5000) continue;

      const href = linkEl ? linkEl.getAttribute('href') : null;
      return {
        price,
        title: titleEl.textContent.trim().slice(0, 80),
        url: href ? 'https://www.amazon.in' + href : null
      };
    }
    return null;
  });

  return result ? { ...STORE, ...result } : null;
}

module.exports = { STORE, scrape };
