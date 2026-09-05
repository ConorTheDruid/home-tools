# Daily Values

A nutrition-facts-styled dashboard for logging what you eat and seeing daily
totals — calories, protein, carbs, fat, fiber, sugar, sodium. Browse by day
with the arrows on the label card.

No build step, no backend — static HTML/CSS/JS.

## Data

- **Imported history** — `history.js` is a one-time snapshot generated from
  the original [`calorie-tracker`](https://github.com/ConorTheDruid/calorie-tracker)
  repo's `data/log.csv` (the chat-driven CLI logger). It's baked into the
  page at commit time, so it won't reflect new entries logged there unless
  someone regenerates it (see below). Removing an imported entry here only
  hides it in this browser — the source CSV is untouched.
- **Entries you add here** are saved to this browser's `localStorage` only —
  they don't sync to the CLI's CSV or to any other device/browser.

### Regenerating `history.js` from a fresh CSV export

```bash
python3 -c "
import csv, json
with open('data/log.csv', newline='') as f:
    rows = list(csv.DictReader(f))
for r in rows:
    for k in ('calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg'):
        r[k] = float(r[k])
with open('history.js', 'w') as out:
    out.write('const HISTORICAL_ENTRIES = ')
    json.dump(rows, out, indent=2)
    out.write(';\n')
"
```

## Running it

Open `index.html` directly, or serve the folder locally:

```
python3 -m http.server 8000
```
