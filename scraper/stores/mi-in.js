const STORE = { id: 'mi-in', name: 'Mi.com India', region: 'IN', currency: 'INR', icon: '🔴', baseUrl: 'https://www.mi.com' };

async function scrape(page, query) {
  const url = `https://www.mi.com/in/search#q=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const result = await page.evaluate(() => {
    const cards = document.querySelectorAll('.product-item, [class*="product"], .search-result-item');
    for (const card of cards) {
      const priceEl = card.querySelector('[class*="price"], .price');
      const titleEl = card.querySelector('[class*="name"], [class*="title"], h3, h4, p');
      const linkEl = card.querySelector('a');
      if (!priceEl) continue;
      const price = parseFloat(priceEl.textContent.replace(/[^\d.]/g, ''));
      if (isNaN(price) || price < 5000) continue;
      const href = linkEl ? linkEl.getAttribute('href') : null;
      return {
        price,
        title: titleEl ? titleEl.textContent.trim().slice(0, 80) : query,
        url: href ? (href.startsWith('http') ? href : 'https://www.mi.com' + href) : null
      };
    }
    return null;
  });

  return result ? { ...STORE, ...result } : null;
}

module.exports = { STORE, scrape };
