const STORE = { id: 'istyle', name: 'iSTYLE UAE', region: 'AE', currency: 'AED', icon: '🍏', baseUrl: 'https://istyle.ae' };

async function scrape(page, query) {
  const url = `https://istyle.ae/search?type=product&q=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const result = await page.evaluate(() => {
    const cards = document.querySelectorAll('.product-item, .grid__item, [class*="product"]');
    for (const card of cards) {
      const priceEl = card.querySelector('.price, [class*="price"], .product__price');
      const titleEl = card.querySelector('.product-item__title, [class*="title"], [class*="name"], h2, h3');
      const linkEl = card.querySelector('a');
      if (!priceEl) continue;
      const price = parseFloat(priceEl.textContent.replace(/[^\d.]/g, ''));
      if (isNaN(price) || price < 200) continue;
      const href = linkEl ? linkEl.getAttribute('href') : null;
      return {
        price,
        title: titleEl ? titleEl.textContent.trim().slice(0, 80) : query,
        url: href ? (href.startsWith('http') ? href : 'https://istyle.ae' + href) : null
      };
    }
    return null;
  });

  return result ? { ...STORE, ...result } : null;
}

module.exports = { STORE, scrape };
