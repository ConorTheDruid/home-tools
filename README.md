# Home Tools

Small personal web tools, no backend, no build step — just static HTML/CSS/JS
per app, plus a landing page linking them together.

- **`show-picker/`** — Marquee Night: a spinner wheel for picking tonight's
  movie or TV show.
- **`calorie-tracker/`** — Daily Values: a nutrition dashboard for logging
  food and seeing daily totals.

Each app persists its own data in that browser's `localStorage`; see each
app's README for specifics.

## Running locally

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Hosting

Meant to be served with GitHub Pages: Settings → Pages → Build and
deployment → Source: **Deploy from a branch** → Branch: **main**, folder
**/ (root)**. No GitHub Actions workflow needed — Pages redeploys
automatically on every push to `main`.
