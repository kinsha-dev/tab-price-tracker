const STORE = { id: 'amazon-ae', name: 'Amazon.ae', region: 'AE', currency: 'AED', icon: '📦', baseUrl: 'https://www.amazon.ae' };

async function scrape(page, query) {
  const url = `https://www.amazon.ae/s?k=${encodeURIComponent(query)}&i=electronics`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    const items = document.querySelectorAll('[data-component-type="s-search-result"]');
    for (const item of items) {
      const priceEl = item.querySelector('.a-price .a-offscreen');
      const titleEl = item.querySelector('h2 a span');
      const linkEl = item.querySelector('h2 a');
      if (!priceEl || !titleEl) continue;
      const price = parseFloat(priceEl.textContent.replace(/[^\d.]/g, ''));
      if (isNaN(price) || price < 200) continue;
      return {
        price,
        title: titleEl.textContent.trim().slice(0, 80),
        url: linkEl ? 'https://www.amazon.ae' + linkEl.getAttribute('href') : null
      };
    }
    return null;
  });

  return result ? { ...STORE, ...result } : null;
}

module.exports = { STORE, scrape };
