# Market roastery data

| Path | Role |
|------|------|
| `market-roasteries.json` | Merged API payload for `/market-roasteries` (~21k) |
| `market-roasteries.meta.json` | Counts by market |
| `raw/` | Source scrapes (DiningCode + Google Places by region) |

## Rebuild merged file

```bash
# from apps/admin
node scripts/build-market-roasteries.mjs
```

## Re-scrape (optional)

```bash
# GOOGLE_MAPS_API_KEY in apps/admin/.env or monorepo env
python3 scripts/scrape-diningcode-roastery.py
python3 scripts/match-diningcode-google-maps.py
python3 scripts/scrape-google-japan-roastery.py
python3 scripts/scrape-google-us-roastery.py
python3 scripts/scrape-google-hk-tw-roastery.py
python3 scripts/scrape-google-europe-roastery.py
python3 scripts/scrape-google-australia-roastery.py
python3 scripts/scrape-google-seasia-roastery.py --with-local
node scripts/build-market-roasteries.mjs
```

Defaults write under `data/raw/`.
