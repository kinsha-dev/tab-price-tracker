const STORE = { id: 'lenovo-in', name: 'Lenovo.com', region: 'IN', currency: 'INR', icon: '🖥️', baseUrl: 'https://www.lenovo.com' };

async function scrape(page, query) {
  const url = `https://www.lenovo.com/in/en/search?q=${encodeURIComponent(query)}&type=products`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const result = await page.evaluate(() => {
    const cards = document.querySelectorAll('.product-card, [class*="product"], .faceted-results li');
    for (const card of cards) {
      const priceEl = card.querySelector('[class*="price"], .price-display, .price__current');
      const titleEl = card.querySelector('[class*="title"], [class*="name"], h3, h4');
      const linkEl = card.querySelector('a');
      if (!priceEl) continue;
      const price = parseFloat(priceEl.textContent.replace(/[^\d.]/g, ''));
      if (isNaN(price) || price < 5000) continue;
      const href = linkEl ? linkEl.getAttribute('href') : null;
      return {
        price,
        title: titleEl ? titleEl.textContent.trim().slice(0, 80) : query,
        url: href ? (href.startsWith('http') ? href : 'https://www.lenovo.com' + href) : null
      };
    }
    return null;
  });

  return result ? { ...STORE, ...result } : null;
}

module.exports = { STORE, scrape };
