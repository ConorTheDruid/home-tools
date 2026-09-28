# Pick For Me — iOS app

Capacitor app whose web code lives in `src/`. It started as a copy of
`../show-picker/` (the household web version on GitHub Pages) but is its
own codebase now: design and feature changes here don't touch the web
version, and changes there don't carry over here — port them by hand if
both should have them.

Data (watchlist, history, rankings) stays on the device via
`src/store-local.js` and Capacitor Preferences — no account, no server.
`npm run build` just copies `src/` into `www/` (git-ignored) for
Capacitor to bundle.

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

## After changing src/

```
npm run sync
```

then ▶ again in Xcode.

## Testing in a browser

`npm run build && python3 -m http.server 8000 -d www` runs the app
version in a desktop browser; it falls back to `localStorage` there
instead of Capacitor Preferences.
