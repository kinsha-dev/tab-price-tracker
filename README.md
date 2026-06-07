# Tab Price Tracker 📊

Hourly price tracker for tablets across Indian and UAE online stores. Deployed as a static dashboard on Netlify, with prices updated every hour via GitHub Actions.

## Tracked Tablets
| Tablet | Color |
|--------|-------|
| Lenovo IdeaTab | Blue |
| Lenovo Legion Tab | Red |
| Xiaomi Pad 7 | Orange |
| iPad 11 | Green |

## Tracked Stores
**India (INR):** Amazon.in, Flipkart, Croma, Reliance Digital, Vijay Sales  
**UAE (AED):** Amazon.ae, Noon, Sharaf DG, Emax

## Deploy to Netlify

1. Push this repo to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import from Git**
3. Set **Publish directory** to `public`
4. Deploy — no build command needed (pure static)
5. In Netlify: **Site settings → Build hooks** → create a hook → copy the URL
6. In GitHub repo: **Settings → Secrets → Actions** → add `NETLIFY_HOOK_URL` = the hook URL

## GitHub Actions (hourly cron)

The workflow at `.github/workflows/scrape.yml` runs every hour:
1. Runs `node scraper/index.js` — scrapes all stores
2. Commits updated `public/data/prices.json` to the repo
3. POSTs to Netlify build hook → triggers redeploy

**Required GitHub repo settings:**
- Settings → Actions → General → Workflow permissions → set to **Read and write**

## Run locally

```bash
npm install
npx playwright install chromium

# Run scraper once
npm run scrape

# Preview dashboard
npm run dev
# → http://localhost:3000
```

## Dashboard features
- **Summary cards** — best price per tablet per region with clickable store link
- **Timeline chart** — 7-day price history, all tablets, toggle by region
- **Bar chart** — current store comparison for selected tablet, click bar to open store
- **Deals table** — all stores ranked by price, cheapest highlighted with 🏆
- **Range selector** — 24h / 48h / 3d / 7d
- **Demo data** — shown automatically until real scrape data exists
