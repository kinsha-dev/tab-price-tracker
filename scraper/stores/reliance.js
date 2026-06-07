const STORE = { id: 'reliance', name: 'Reliance Digital', region: 'IN', currency: 'INR', icon: '📱', baseUrl: 'https://www.reliancedigital.in' };

async function scrape(page, query) {
  const url = `https://www.reliancedigital.in/search?q=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);

  const result = await page.evaluate(() => {
    const cards = document.querySelectorAll('.sp__product, .product-card, [class*="product"]');
    for (const card of cards) {
      const priceEl = card.querySelector('[class*="price"], .Text__BodyLarge, span[class*="Price"]');
      const titleEl = card.querySelector('[class*="title"], p[class*="Title"], h3');
      const linkEl = card.querySelector('a');
      if (!priceEl) continue;
      const price = parseFloat(priceEl.textContent.replace(/[^\d.]/g, ''));
      if (isNaN(price) || price < 5000) continue;
      return {
        price,
        title: titleEl ? titleEl.textContent.trim().slice(0, 80) : query,
        url: linkEl ? 'https://www.reliancedigital.in' + linkEl.getAttribute('href') : null
      };
    }
    return null;
  });

  return result ? { ...STORE, ...result } : null;
}

module.exports = { STORE, scrape };
