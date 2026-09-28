# Marquee Night — iOS app

Capacitor wrapper that bundles `../show-picker/` into a native iOS app.
`show-picker/` is still the source of truth; `npm run build` copies it into
`www/` (git-ignored) and swaps the CDN supabase-js for a local copy.

**Status:** step one only — the current web app running unchanged inside
an iOS shell. It still talks to the same shared Supabase tables as the
web version, so **don't ship it to strangers yet**: accounts and
per-household data come next.

## First-time setup (Mac)

Needs Node 22+ and the current Xcode from the App Store (open it once so
it installs its components).

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

## After changing show-picker/

```
npm run sync
```

then ▶ again in Xcode.

## Bundle ID

`com.conorthedruid.marqueenight` in `capacitor.config.json`. It becomes
permanent once an App Store Connect record uses it, so change it before
then if you want something else.
