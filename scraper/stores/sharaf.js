const STORE = { id: 'sharaf', name: 'Sharaf DG', region: 'AE', currency: 'AED', icon: '🏪', baseUrl: 'https://uae.sharafdg.com' };

async function scrape(page, query) {
  const url = `https://uae.sharafdg.com/search/?q=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);

  const result = await page.evaluate(() => {
    const cards = document.querySelectorAll('.product-item, .item, [class*="product"]');
    for (const card of cards) {
      const priceEl = card.querySelector('.price, [class*="price"], .special-price');
      const titleEl = card.querySelector('.product-name, h2, h3, [class*="name"]');
      const linkEl = card.querySelector('a');
      if (!priceEl) continue;
      const price = parseFloat(priceEl.textContent.replace(/[^\d.]/g, ''));
      if (isNaN(price) || price < 200) continue;
      const href = linkEl ? linkEl.getAttribute('href') : null;
      return {
        price,
        title: titleEl ? titleEl.textContent.trim().slice(0, 80) : query,
        url: href ? (href.startsWith('http') ? href : 'https://uae.sharafdg.com' + href) : null
      };
    }
    return null;
  });

  return result ? { ...STORE, ...result } : null;
}

module.exports = { STORE, scrape };
