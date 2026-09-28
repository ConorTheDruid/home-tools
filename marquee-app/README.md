# Pick For Me — iOS app

Capacitor app built from `../show-picker/`. `npm run build` copies the
web app into `www/` (git-ignored) and swaps its Supabase storage
(`store-supabase.js`) for `src/store-local.js`, which keeps the watchlist,
history, and rankings on the device via Capacitor Preferences — no
account, no server. The web version on GitHub Pages is unaffected and
still uses the shared Supabase list.

Bundle ID: `com.manypetstudios.pickforme` (in `capacitor.config.json`).
It becomes permanent once an App Store Connect record uses it.

## First-time setup (Mac)

Needs Node 22+ (`node -v`) and the current Xcode from the App Store.

```
cd marquee-app
npm install
npm run build
npx cap add ios        # generates ios/ — commit it
npm run ios            # builds, syncs, opens Xcode
```

In Xcode: pick an iPhone simulator at the top and press ▶.

To run on your own phone: select the **App** target → Signing &
Capabilities → tick "Automatically manage signing" and pick your team,
then plug in the phone (enable Developer Mode on it when prompted) and
choose it as the run destination.

## After changing show-picker/ or src/

```
npm run sync
```

then ▶ again in Xcode.

## Testing in a browser

`npm run build && python3 -m http.server 8000 -d www` runs the app
version in a desktop browser; it falls back to `localStorage` there
instead of Capacitor Preferences.
