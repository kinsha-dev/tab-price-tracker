/* ─── Currency ───────────────────────────────────── */
const AED_TO_INR = 23.05; // 1 AED ≈ ₹23.05 (update periodically)
function aedToInr(aed) { return Math.round(aed * AED_TO_INR); }
function inrTag(aed) { return `<span class="inr-equiv">(≈ ₹${aedToInr(aed).toLocaleString('en-IN')})</span>`; }

/* ─── Config ─────────────────────────────────────── */
const PRODUCTS = [
  { id: 'lenovo-idea-tab',   name: 'Lenovo IdeaTab',   color: '#4F81BD', emoji: '💻' },
  { id: 'lenovo-legion-tab', name: 'Lenovo Legion Tab', color: '#C0504D', emoji: '🎮' },
  { id: 'xiaomi-pad-7',      name: 'Xiaomi Pad 7',      color: '#FF6B00', emoji: '📱' },
  { id: 'ipad-10',          name: 'iPad 10 (2022)',     color: '#70AD47', emoji: '🍎' },
  { id: 'ipad-11-2025',    name: 'iPad 11 (2025)',     color: '#9B59B6', emoji: '🍎' },
];

const STORE_META = {
  'amazon-in':  { name: 'Amazon.in',       icon: '📦', region: 'IN', flag: '🇮🇳' },
  'flipkart':   { name: 'Flipkart',        icon: '🛒', region: 'IN', flag: '🇮🇳' },
  'croma':      { name: 'Croma',           icon: '⚡', region: 'IN', flag: '🇮🇳' },
  'reliance':   { name: 'Reliance Digital',icon: '📱', region: 'IN', flag: '🇮🇳' },
  'vijay-sales':{ name: 'Vijay Sales',     icon: '🏬', region: 'IN', flag: '🇮🇳' },
  'jiomart':    { name: 'JioMart',         icon: '🛍️', region: 'IN', flag: '🇮🇳' },
  'lenovo-in':  { name: 'Lenovo.com',      icon: '🖥️', region: 'IN', flag: '🇮🇳' },
  'mi-in':      { name: 'Mi.com India',    icon: '🔴', region: 'IN', flag: '🇮🇳' },
  'amazon-ae':  { name: 'Amazon.ae',       icon: '📦', region: 'AE', flag: '🇦🇪' },
  'noon':       { name: 'Noon',            icon: '🌙', region: 'AE', flag: '🇦🇪' },
  'sharaf':     { name: 'Sharaf DG',       icon: '🏪', region: 'AE', flag: '🇦🇪' },
  'emax':       { name: 'Emax',            icon: '🔌', region: 'AE', flag: '🇦🇪' },
  'jumbo':      { name: 'Jumbo Electronics',icon: '🐘', region: 'AE', flag: '🇦🇪' },
  'istyle':     { name: 'iSTYLE UAE',      icon: '🍏', region: 'AE', flag: '🇦🇪' },
};

/* ─── State ──────────────────────────────────────── */
let DATA = null;
let activeRegion = 'IN';
let activeProduct = PRODUCTS[0].id;
let rangeHours = 168;
let timelineChart = null;
let barChart = null;

/* ─── Boot ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initControls();
  loadData();
  setInterval(loadData, 60 * 60 * 1000); // refresh every hour

  const btn = document.getElementById('refresh-btn');
  btn.addEventListener('click', async () => {
    btn.classList.add('spinning');
    btn.disabled = true;
    await loadData();
    btn.classList.remove('spinning');
    btn.disabled = false;
  });
});

async function loadData() {
  try {
    const res = await fetch(`data/prices.json?t=${Date.now()}`);
    if (!res.ok) throw new Error('Not found');
    DATA = await res.json();
    render();
  } catch {
    // Show demo data if no real data yet
    DATA = buildDemoData();
    render();
    document.getElementById('last-updated').textContent = 'Demo data (run scraper to populate)';
  }
}

/* ─── Controls ───────────────────────────────────── */
function initControls() {
  document.querySelectorAll('.region-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.region-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeRegion = btn.dataset.region;
      if (DATA) render();
    });
  });

  document.getElementById('range-select').addEventListener('change', e => {
    rangeHours = parseInt(e.target.value);
    if (DATA) renderTimelineChart();
  });
}

/* ─── Render ─────────────────────────────────────── */
function render() {
  if (!DATA) return;
  const latest = DATA.history[DATA.history.length - 1];
  if (!latest) return;

  if (DATA.lastUpdated) {
    const d = new Date(DATA.lastUpdated);
    document.getElementById('last-updated').textContent =
      `Updated: ${d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  }

  renderSummaryCards(latest);
  renderProductTabs();
  renderTimelineChart();
  renderBarChart();
  renderDealsTable(latest);
}

/* ─── Summary Cards ──────────────────────────────── */
function renderSummaryCards(latest) {
  const container = document.getElementById('summary-cards');
  container.innerHTML = '';

  for (const p of PRODUCTS) {
    const pd = latest.products[p.id];
    const card = document.createElement('div');
    card.className = 'summary-card';
    card.style.setProperty('--card-color', p.color);

    let inHtml = '', aeHtml = '';

    if (pd?.cheapestIN) {
      const c = pd.cheapestIN;
      inHtml = `
        <div class="card-region">🇮🇳 Best in India</div>
        <div class="card-price">₹${c.price.toLocaleString('en-IN')}</div>
        <div class="card-store">
          ${c.icon} <a href="${c.url || '#'}" target="_blank" rel="noopener">${c.storeName} ↗</a>
        </div>`;
    } else {
      inHtml = `<div class="card-na">🇮🇳 No Indian price</div>`;
    }

    if (pd?.cheapestAE) {
      const c = pd.cheapestAE;
      aeHtml = `
        <div class="card-region">🇦🇪 Best in UAE</div>
        <div class="card-price">AED ${c.price.toLocaleString()} ${inrTag(c.price)}</div>
        <div class="card-store">
          ${c.icon} <a href="${c.url || '#'}" target="_blank" rel="noopener">${c.storeName} ↗</a>
        </div>`;
    } else {
      aeHtml = `<div class="card-na">🇦🇪 No UAE price</div>`;
    }

    card.innerHTML = `
      <div class="card-product">${p.emoji} ${p.name}</div>
      ${inHtml}
      <hr class="card-divider">
      ${aeHtml}
    `;
    container.appendChild(card);
  }
}

/* ─── Product Tabs ───────────────────────────────── */
function renderProductTabs() {
  const container = document.getElementById('product-tabs');
  if (container.children.length) return; // already rendered

  for (const p of PRODUCTS) {
    const btn = document.createElement('button');
    btn.className = 'product-tab' + (p.id === activeProduct ? ' active' : '');
    btn.textContent = `${p.emoji} ${p.name}`;
    if (p.id === activeProduct) btn.style.background = p.color;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.product-tab').forEach(b => {
        b.classList.remove('active');
        b.style.background = '';
      });
      btn.classList.add('active');
      btn.style.background = p.color;
      activeProduct = p.id;
      renderBarChart();
    });
    container.appendChild(btn);
  }
}

/* ─── Timeline Chart ─────────────────────────────── */
function renderTimelineChart() {
  const cutoff = new Date(Date.now() - rangeHours * 3600 * 1000);
  const filtered = DATA.history.filter(h => new Date(h.timestamp) >= cutoff);

  const labels = filtered.map(h => {
    const d = new Date(h.timestamp);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  });

  const datasets = PRODUCTS.map(p => {
    const data = filtered.map(h => {
      const pd = h.products[p.id];
      if (!pd) return null;
      const stores = Object.values(pd.stores || {}).filter(s => s.region === activeRegion);
      if (!stores.length) return null;
      return Math.min(...stores.map(s => s.price));
    });

    return {
      label: p.name,
      data,
      borderColor: p.color,
      backgroundColor: p.color + '18',
      borderWidth: 2.5,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: p.color,
      tension: 0.35,
      fill: false,
      spanGaps: true,
    };
  });

  const ctx = document.getElementById('timeline-chart').getContext('2d');

  if (timelineChart) timelineChart.destroy();

  timelineChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e2436',
          borderColor: '#2a3150',
          borderWidth: 1,
          titleColor: '#8b93b0',
          bodyColor: '#e8eaf0',
          padding: 12,
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y;
              if (v == null) return `${ctx.dataset.label}: N/A`;
              if (activeRegion === 'AE') {
                return `${ctx.dataset.label}: AED ${v.toLocaleString()} (≈ ₹${aedToInr(v).toLocaleString('en-IN')})`;
              }
              return `${ctx.dataset.label}: ₹${v.toLocaleString('en-IN')}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#2a3150' },
          ticks: {
            color: '#8b93b0',
            maxRotation: 35,
            maxTicksLimit: 12,
            font: { size: 11 }
          }
        },
        y: {
          grid: { color: '#2a3150' },
          ticks: {
            color: '#8b93b0',
            font: { size: 11 },
            callback: v => activeRegion === 'IN' ? '₹' + v.toLocaleString('en-IN') : 'AED ' + v.toLocaleString()
          }
        }
      }
    }
  });

  // Legend
  const legend = document.getElementById('timeline-legend');
  legend.innerHTML = '';
  PRODUCTS.forEach((p, i) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<span class="legend-dot" style="background:${p.color}"></span>${p.emoji} ${p.name}`;
    item.addEventListener('click', () => {
      const meta = timelineChart.getDatasetMeta(i);
      meta.hidden = !meta.hidden;
      timelineChart.update();
      item.style.opacity = meta.hidden ? '0.4' : '1';
    });
    legend.appendChild(item);
  });
}

/* ─── Bar Chart ──────────────────────────────────── */
function renderBarChart() {
  const latest = DATA.history[DATA.history.length - 1];
  if (!latest) return;

  const p = PRODUCTS.find(x => x.id === activeProduct);
  const pd = latest.products[activeProduct];
  if (!pd) return;

  const storeEntries = Object.entries(pd.stores || {})
    .filter(([, s]) => s.region === activeRegion)
    .sort((a, b) => a[1].price - b[1].price);

  const labels = storeEntries.map(([id, s]) => {
    const m = STORE_META[id] || {};
    return `${m.icon || ''} ${s.name}`;
  });
  const prices = storeEntries.map(([, s]) => s.price);
  const urls = storeEntries.map(([, s]) => s.url);
  const minPrice = Math.min(...prices);

  const backgroundColors = prices.map(price =>
    price === minPrice ? p.color : p.color + '60'
  );
  const borderColors = prices.map(price =>
    price === minPrice ? p.color : p.color + 'a0'
  );

  const ctx = document.getElementById('bar-chart').getContext('2d');
  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: p.name,
        data: prices,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1.5,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e2436',
          borderColor: '#2a3150',
          borderWidth: 1,
          titleColor: '#8b93b0',
          bodyColor: '#e8eaf0',
          padding: 12,
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y;
              const cheapTag = v === minPrice ? ' 🏆 CHEAPEST' : '';
              if (activeRegion === 'AE') {
                return `AED ${v.toLocaleString()} (≈ ₹${aedToInr(v).toLocaleString('en-IN')})${cheapTag}`;
              }
              return `₹${v.toLocaleString('en-IN')}${cheapTag}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#8b93b0', font: { size: 12 } }
        },
        y: {
          grid: { color: '#2a3150' },
          ticks: {
            color: '#8b93b0',
            font: { size: 11 },
            callback: v => activeRegion === 'IN' ? '₹' + v.toLocaleString('en-IN') : 'AED ' + v.toLocaleString()
          }
        }
      },
      onClick: (event, elements) => {
        if (elements.length && urls[elements[0].index]) {
          window.open(urls[elements[0].index], '_blank');
        }
      },
      onHover: (event, elements) => {
        event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
      }
    }
  });
}

/* ─── Deals Table ────────────────────────────────── */
function renderDealsTable(latest) {
  const container = document.getElementById('deals-table');
  const rows = [];

  for (const p of PRODUCTS) {
    const pd = latest.products[p.id];
    if (!pd) continue;

    const cheapest = activeRegion === 'IN' ? pd.cheapestIN : pd.cheapestAE;
    const allStores = Object.entries(pd.stores || {})
      .filter(([, s]) => s.region === activeRegion)
      .sort((a, b) => a[1].price - b[1].price);

    allStores.forEach(([storeId, store], idx) => {
      const isCheapest = idx === 0;
      const sym = activeRegion === 'IN' ? '₹' : 'AED ';
      rows.push(`
        <tr>
          <td>
            <div class="product-label">
              <span class="product-dot" style="background:${p.color}"></span>
              ${p.emoji} ${p.name}
            </div>
          </td>
          <td>
            <a class="store-link" href="${store.url || '#'}" target="_blank" rel="noopener">
              ${store.icon || STORE_META[storeId]?.icon || '🏪'} ${store.name}
              <span style="opacity:0.5;font-size:10px">↗</span>
            </a>
            ${isCheapest ? '<span class="cheapest-badge">🏆 Cheapest</span>' : ''}
          </td>
          <td class="price-cell" style="color:${isCheapest ? '#22c55e' : '#e8eaf0'}">
            ${sym}${store.price.toLocaleString()}
            ${activeRegion === 'AE' ? `<br><span class="inr-equiv">(≈ ₹${aedToInr(store.price).toLocaleString('en-IN')})</span>` : ''}
          </td>
        </tr>
      `);
    });
  }

  if (!rows.length) {
    container.innerHTML = '<div class="loading">No data for selected region yet. Run the scraper first.</div>';
    return;
  }

  container.innerHTML = `
    <table class="deals-table">
      <thead>
        <tr>
          <th>Tablet</th>
          <th>Store</th>
          <th>Price (${activeRegion === 'IN' ? 'INR' : 'AED / ≈INR'})</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  `;
}

/* ─── Demo Data (fallback) ───────────────────────── */
function buildDemoData() {
  const now = Date.now();
  const history = [];

  // Per-product search URLs for each store so links actually land on results
  const SEARCH_URLS = {
    'lenovo-idea-tab': {
      'amazon-in':   'https://www.amazon.in/s?k=Lenovo+IdeaTab&i=electronics',
      'flipkart':    'https://www.flipkart.com/search?q=Lenovo+IdeaTab&otracker=search',
      'croma':       'https://www.croma.com/searchB?q=Lenovo+IdeaTab',
      'reliance':    'https://www.reliancedigital.in/search?q=Lenovo+IdeaTab',
      'vijay-sales': 'https://www.vijaysales.com/search/lenovo-ideatab',
      'jiomart':     'https://www.jiomart.com/catalogsearch/result/?q=Lenovo+IdeaTab',
      'lenovo-in':   'https://www.lenovo.com/in/en/search?q=IdeaTab&type=products',
      'mi-in':       'https://www.mi.com/in/search#q=tablet',
      'amazon-ae':   'https://www.amazon.ae/s?k=Lenovo+IdeaTab&i=electronics',
      'noon':        'https://www.noon.com/uae-en/search/?q=Lenovo+IdeaTab',
      'sharaf':      'https://uae.sharafdg.com/search/?q=Lenovo+IdeaTab',
      'emax':        'https://www.emaxuae.com/catalogsearch/result/?q=Lenovo+IdeaTab',
      'jumbo':       'https://www.jumbo.ae/search?q=Lenovo+IdeaTab',
      'istyle':      'https://istyle.ae/search?type=product&q=Lenovo+IdeaTab',
    },
    'lenovo-legion-tab': {
      'amazon-in':   'https://www.amazon.in/s?k=Lenovo+Legion+Tab&i=electronics',
      'flipkart':    'https://www.flipkart.com/search?q=Lenovo+Legion+Tab&otracker=search',
      'croma':       'https://www.croma.com/searchB?q=Lenovo+Legion+Tab',
      'reliance':    'https://www.reliancedigital.in/search?q=Lenovo+Legion+Tab',
      'vijay-sales': 'https://www.vijaysales.com/search/lenovo-legion-tab',
      'jiomart':     'https://www.jiomart.com/catalogsearch/result/?q=Lenovo+Legion+Tab',
      'lenovo-in':   'https://www.lenovo.com/in/en/search?q=Legion+Tab&type=products',
      'mi-in':       'https://www.mi.com/in/search#q=tablet',
      'amazon-ae':   'https://www.amazon.ae/s?k=Lenovo+Legion+Tab&i=electronics',
      'noon':        'https://www.noon.com/uae-en/search/?q=Lenovo+Legion+Tab',
      'sharaf':      'https://uae.sharafdg.com/search/?q=Lenovo+Legion+Tab',
      'emax':        'https://www.emaxuae.com/catalogsearch/result/?q=Lenovo+Legion+Tab',
      'jumbo':       'https://www.jumbo.ae/search?q=Lenovo+Legion+Tab',
      'istyle':      'https://istyle.ae/search?type=product&q=Lenovo+Legion+Tab',
    },
    'xiaomi-pad-7': {
      'amazon-in':   'https://www.amazon.in/s?k=Xiaomi+Pad+7&i=electronics',
      'flipkart':    'https://www.flipkart.com/search?q=Xiaomi+Pad+7&otracker=search',
      'croma':       'https://www.croma.com/searchB?q=Xiaomi+Pad+7',
      'reliance':    'https://www.reliancedigital.in/search?q=Xiaomi+Pad+7',
      'vijay-sales': 'https://www.vijaysales.com/search/xiaomi-pad-7',
      'jiomart':     'https://www.jiomart.com/catalogsearch/result/?q=Xiaomi+Pad+7',
      'lenovo-in':   'https://www.lenovo.com/in/en/search?q=tablet&type=products',
      'mi-in':       'https://www.mi.com/in/product/xiaomi-pad-7/',
      'amazon-ae':   'https://www.amazon.ae/s?k=Xiaomi+Pad+7&i=electronics',
      'noon':        'https://www.noon.com/uae-en/search/?q=Xiaomi+Pad+7',
      'sharaf':      'https://uae.sharafdg.com/search/?q=Xiaomi+Pad+7',
      'emax':        'https://www.emaxuae.com/catalogsearch/result/?q=Xiaomi+Pad+7',
      'jumbo':       'https://www.jumbo.ae/search?q=Xiaomi+Pad+7',
      'istyle':      'https://istyle.ae/search?type=product&q=Xiaomi+Pad+7',
    },
    'ipad-10': {
      'amazon-in':   'https://www.amazon.in/s?k=Apple+iPad+10th+generation&i=electronics',
      'flipkart':    'https://www.flipkart.com/search?q=Apple+iPad+10th+generation&otracker=search',
      'croma':       'https://www.croma.com/searchB?q=Apple+iPad+10th+generation',
      'reliance':    'https://www.reliancedigital.in/search?q=Apple+iPad+10th+generation',
      'vijay-sales': 'https://www.vijaysales.com/search/apple-ipad-10th-generation',
      'jiomart':     'https://www.jiomart.com/catalogsearch/result/?q=Apple+iPad+10th+generation',
      'lenovo-in':   'https://www.lenovo.com/in/en/search?q=tablet&type=products',
      'mi-in':       'https://www.mi.com/in/search#q=tablet',
      'amazon-ae':   'https://www.amazon.ae/s?k=Apple+iPad+10th+generation&i=electronics',
      'noon':        'https://www.noon.com/uae-en/search/?q=Apple+iPad+10th+generation',
      'sharaf':      'https://uae.sharafdg.com/search/?q=Apple+iPad+10th+generation',
      'emax':        'https://www.emaxuae.com/catalogsearch/result/?q=Apple+iPad+10th+generation',
      'jumbo':       'https://www.jumbo.ae/search?q=Apple+iPad+10th+generation',
      'istyle':      'https://istyle.ae/search?type=product&q=iPad+10th+generation',
    },
    'ipad-11-2025': {
      'amazon-in':   'https://www.amazon.in/s?k=Apple+iPad+11th+generation+2025+A16&i=electronics',
      'flipkart':    'https://www.flipkart.com/search?q=Apple+iPad+A16+2025&otracker=search',
      'croma':       'https://www.croma.com/searchB?q=Apple+iPad+A16+2025',
      'reliance':    'https://www.reliancedigital.in/search?q=Apple+iPad+2025',
      'vijay-sales': 'https://www.vijaysales.com/search/apple-ipad-2025',
      'jiomart':     'https://www.jiomart.com/catalogsearch/result/?q=Apple+iPad+A16+2025',
      'lenovo-in':   'https://www.lenovo.com/in/en/search?q=tablet&type=products',
      'mi-in':       'https://www.mi.com/in/search#q=tablet',
      'amazon-ae':   'https://www.amazon.ae/s?k=Apple+iPad+11th+generation+2025+A16&i=electronics',
      'noon':        'https://www.noon.com/uae-en/search/?q=Apple+iPad+A16+2025',
      'sharaf':      'https://uae.sharafdg.com/ipad-11/',
      'emax':        'https://www.emaxuae.com/catalogsearch/result/?q=Apple+iPad+2025',
      'jumbo':       'https://www.jumbo.ae/ipad-11-2025',
      'istyle':      'https://istyle.ae/collections/apple-ipad-a16-2025',
    },
  };

  for (let i = 167; i >= 0; i--) {
    const ts = new Date(now - i * 3600 * 1000).toISOString();
    const snapshot = { timestamp: ts, products: {} };

    const bases = {
      'lenovo-idea-tab':   { IN: 22000, AE: 900 },
      'lenovo-legion-tab': { IN: 55000, AE: 2200 },
      'xiaomi-pad-7':      { IN: 26000, AE: 1100 },
      'ipad-10':           { IN: 27400, AE: 1200 },
      'ipad-11-2025':      { IN: 65000, AE: 2800 },
    };

    for (const p of PRODUCTS) {
      const base = bases[p.id];
      const jitter = () => 1 + (Math.random() - 0.5) * 0.04;
      const urls = SEARCH_URLS[p.id] || {};

      const stores = {
        'amazon-in':   { price: Math.round(base.IN * jitter()),        region: 'IN', currency: 'INR', name: 'Amazon.in',         icon: '📦', url: urls['amazon-in'] },
        'flipkart':    { price: Math.round(base.IN * jitter() * 0.97), region: 'IN', currency: 'INR', name: 'Flipkart',           icon: '🛒', url: urls['flipkart'] },
        'croma':       { price: Math.round(base.IN * jitter() * 1.02), region: 'IN', currency: 'INR', name: 'Croma',              icon: '⚡', url: urls['croma'] },
        'reliance':    { price: Math.round(base.IN * jitter() * 1.01), region: 'IN', currency: 'INR', name: 'Reliance Digital',   icon: '📱', url: urls['reliance'] },
        'vijay-sales': { price: Math.round(base.IN * jitter() * 0.99), region: 'IN', currency: 'INR', name: 'Vijay Sales',        icon: '🏬', url: urls['vijay-sales'] },
        'jiomart':     { price: Math.round(base.IN * jitter() * 0.96), region: 'IN', currency: 'INR', name: 'JioMart',            icon: '🛍️', url: urls['jiomart'] },
        'lenovo-in':   { price: Math.round(base.IN * jitter() * 0.98), region: 'IN', currency: 'INR', name: 'Lenovo.com',         icon: '🖥️', url: urls['lenovo-in'] },
        'mi-in':       { price: Math.round(base.IN * jitter() * 0.97), region: 'IN', currency: 'INR', name: 'Mi.com India',       icon: '🔴', url: urls['mi-in'] },
        'amazon-ae':   { price: Math.round(base.AE * jitter()),        region: 'AE', currency: 'AED', name: 'Amazon.ae',          icon: '📦', url: urls['amazon-ae'] },
        'noon':        { price: Math.round(base.AE * jitter() * 0.97), region: 'AE', currency: 'AED', name: 'Noon',               icon: '🌙', url: urls['noon'] },
        'sharaf':      { price: Math.round(base.AE * jitter() * 1.02), region: 'AE', currency: 'AED', name: 'Sharaf DG',          icon: '🏪', url: urls['sharaf'] },
        'emax':        { price: Math.round(base.AE * jitter() * 1.01), region: 'AE', currency: 'AED', name: 'Emax',               icon: '🔌', url: urls['emax'] },
        'jumbo':       { price: Math.round(base.AE * jitter() * 0.98), region: 'AE', currency: 'AED', name: 'Jumbo Electronics',  icon: '🐘', url: urls['jumbo'] },
        'istyle':      { price: Math.round(base.AE * jitter() * 1.00), region: 'AE', currency: 'AED', name: 'iSTYLE UAE',         icon: '🍏', url: urls['istyle'] },
      };

      const inPrices = Object.entries(stores).filter(([,s]) => s.region === 'IN');
      const aePrices = Object.entries(stores).filter(([,s]) => s.region === 'AE');
      const cheapIN = inPrices.reduce((a, b) => a[1].price < b[1].price ? a : b);
      const cheapAE = aePrices.reduce((a, b) => a[1].price < b[1].price ? a : b);

      snapshot.products[p.id] = {
        id: p.id, name: p.name,
        stores,
        cheapestIN: { storeId: cheapIN[0], storeName: cheapIN[1].name, price: cheapIN[1].price, url: cheapIN[1].url, icon: cheapIN[1].icon },
        cheapestAE: { storeId: cheapAE[0], storeName: cheapAE[1].name, price: cheapAE[1].price, url: cheapAE[1].url, icon: cheapAE[1].icon },
      };
    }
    history.push(snapshot);
  }

  return { lastUpdated: new Date().toISOString(), history };
}
