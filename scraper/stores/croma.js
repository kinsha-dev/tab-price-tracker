const STORE = { id: 'croma', name: 'Croma', region: 'IN', currency: 'INR', icon: '⚡', baseUrl: 'https://www.croma.com' };

async function scrape(page, query) {
  const url = `https://www.croma.com/searchB?q=${encodeURIComponent(query)}%3Arelevance&text=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);

  const result = await page.evaluate(() => {
    const cards = document.querySelectorAll('.product-item, li.product-item, .cp-product');
    for (const card of cards) {
      const priceEl = card.querySelector('.amount, .price, [class*="price"]');
      const titleEl = card.querySelector('h3, h4, .product-title, [class*="title"]');
      const linkEl = card.querySelector('a');
      if (!priceEl || !titleEl) continue;
      const price = parseFloat(priceEl.textContent.replace(/[^\d.]/g, ''));
      if (isNaN(price) || price < 5000) continue;
      return {
        price,
        title: titleEl.textContent.trim().slice(0, 80),
        url: linkEl ? 'https://www.croma.com' + linkEl.getAttribute('href') : null
      };
    }
    return null;
  });

  return result ? { ...STORE, ...result } : null;
}

module.exports = { STORE, scrape };
