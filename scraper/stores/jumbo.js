const STORE = { id: 'jumbo', name: 'Jumbo Electronics', region: 'AE', currency: 'AED', icon: '🐘', baseUrl: 'https://www.jumbo.ae' };

async function scrape(page, query) {
  const url = `https://www.jumbo.ae/search?q=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const result = await page.evaluate(() => {
    const cards = document.querySelectorAll('.product-item, [class*="product-card"], article, [class*="product"]');
    for (const card of cards) {
      const priceEl = card.querySelector('[class*="price"], .price, .product-price');
      const titleEl = card.querySelector('[class*="title"], [class*="name"], h2, h3');
      const linkEl = card.querySelector('a');
      if (!priceEl) continue;
      const price = parseFloat(priceEl.textContent.replace(/[^\d.]/g, ''));
      if (isNaN(price) || price < 200) continue;
      const href = linkEl ? linkEl.getAttribute('href') : null;
      return {
        price,
        title: titleEl ? titleEl.textContent.trim().slice(0, 80) : query,
        url: href ? (href.startsWith('http') ? href : 'https://www.jumbo.ae' + href) : null
      };
    }
    return null;
  });

  return result ? { ...STORE, ...result } : null;
}

module.exports = { STORE, scrape };
