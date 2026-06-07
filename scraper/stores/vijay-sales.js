const STORE = { id: 'vijay-sales', name: 'Vijay Sales', region: 'IN', currency: 'INR', icon: '🏬', baseUrl: 'https://www.vijaysales.com' };

async function scrape(page, query) {
  const url = `https://www.vijaysales.com/search/${encodeURIComponent(query.toLowerCase().replace(/ /g, '-'))}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);

  const result = await page.evaluate(() => {
    const cards = document.querySelectorAll('.product-box, [class*="product"]');
    for (const card of cards) {
      const priceEl = card.querySelector('[class*="price"], .product-price');
      const titleEl = card.querySelector('[class*="title"], .product-name, h2, h3');
      const linkEl = card.querySelector('a');
      if (!priceEl) continue;
      const price = parseFloat(priceEl.textContent.replace(/[^\d.]/g, ''));
      if (isNaN(price) || price < 5000) continue;
      return {
        price,
        title: titleEl ? titleEl.textContent.trim().slice(0, 80) : query,
        url: linkEl ? linkEl.href : null
      };
    }
    return null;
  });

  return result ? { ...STORE, ...result } : null;
}

module.exports = { STORE, scrape };
