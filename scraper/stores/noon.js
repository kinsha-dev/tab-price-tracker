const STORE = { id: 'noon', name: 'Noon', region: 'AE', currency: 'AED', icon: '🌙', baseUrl: 'https://www.noon.com' };

async function scrape(page, query) {
  const url = `https://www.noon.com/uae-en/search/?q=${encodeURIComponent(query)}&sort%5Bby%5D=popularity&sort%5Bdir%5D=desc`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const result = await page.evaluate(() => {
    const cards = document.querySelectorAll('[class*="productContainer"], [class*="product-card"], article');
    for (const card of cards) {
      const priceEl = card.querySelector('[class*="priceNow"], [class*="price"], strong');
      const titleEl = card.querySelector('[class*="name"], [class*="title"], h2, h3');
      const linkEl = card.querySelector('a');
      if (!priceEl) continue;
      const price = parseFloat(priceEl.textContent.replace(/[^\d.]/g, ''));
      if (isNaN(price) || price < 200) continue;
      const href = linkEl ? linkEl.getAttribute('href') : null;
      return {
        price,
        title: titleEl ? titleEl.textContent.trim().slice(0, 80) : query,
        url: href ? (href.startsWith('http') ? href : 'https://www.noon.com' + href) : null
      };
    }
    return null;
  });

  return result ? { ...STORE, ...result } : null;
}

module.exports = { STORE, scrape };
