const STORE = { id: 'flipkart', name: 'Flipkart', region: 'IN', currency: 'INR', icon: '🛒', baseUrl: 'https://www.flipkart.com' };

async function scrape(page, query) {
  const url = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}&otracker=search&marketplace=FLIPKART`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Handle login popup
  try { await page.click('button._2KpZ6l._2doB4z', { timeout: 3000 }); } catch {}

  const result = await page.evaluate(() => {
    // Multiple possible selectors for Flipkart product cards
    const selectors = [
      { card: '._1AtVbE', price: '._30jeq3', title: '._4rR01T', link: '._1fQZEK' },
      { card: '._2kHMtA', price: '._30jeq3', title: 'div._4rR01T', link: 'a._1fQZEK' },
      { card: '.s1Q9rs', price: '._30jeq3', title: '._4rR01T', link: 'a._1fQZEK' },
    ];

    for (const sel of selectors) {
      const cards = document.querySelectorAll(sel.card);
      for (const card of cards) {
        const priceEl = card.querySelector(sel.price);
        const titleEl = card.querySelector(sel.title);
        const linkEl = card.querySelector(sel.link) || card.querySelector('a');
        if (!priceEl || !titleEl) continue;
        const price = parseFloat(priceEl.textContent.replace(/[^\d.]/g, ''));
        if (isNaN(price) || price < 5000) continue;
        return {
          price,
          title: titleEl.textContent.trim().slice(0, 80),
          url: linkEl ? 'https://www.flipkart.com' + linkEl.getAttribute('href') : null
        };
      }
    }

    // Fallback: grab any price element
    const priceEls = document.querySelectorAll('._30jeq3');
    const titleEls = document.querySelectorAll('._4rR01T, .IRpwTa');
    const linkEls = document.querySelectorAll('a._1fQZEK, a.IRpwTa');
    for (let i = 0; i < priceEls.length; i++) {
      const price = parseFloat(priceEls[i].textContent.replace(/[^\d.]/g, ''));
      if (isNaN(price) || price < 5000) continue;
      return {
        price,
        title: titleEls[i] ? titleEls[i].textContent.trim().slice(0, 80) : 'N/A',
        url: linkEls[i] ? 'https://www.flipkart.com' + linkEls[i].getAttribute('href') : null
      };
    }
    return null;
  });

  return result ? { ...STORE, ...result } : null;
}

module.exports = { STORE, scrape };
