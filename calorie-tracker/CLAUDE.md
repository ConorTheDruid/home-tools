# Daily Values (calorie tracker)

This is now the source of truth for meal logging, replacing the older
[`calorie-tracker`](https://github.com/ConorTheDruid/calorie-tracker) CLI
repo — logging should happen here regardless of which session or device
you're in, so entries are visible everywhere without depending on any one
browser's `localStorage`.

## Workflow

When the user describes something they ate:

1. Estimate calories, protein, carbs, fat, fiber, sugar, and sodium using
   general nutrition knowledge. For a specific branded/restaurant item, use
   known published nutrition facts if you're confident of them; otherwise
   confirm via WebSearch/WebFetch rather than guessing.
2. For vague quantities, pick a reasonable typical portion, state the
   assumption back to the user in one line, and note it in the entry's
   `notes` field.
3. Append the entry to the `HISTORICAL_ENTRIES` array in `history.js`
   (fields: `date`, `time`, `description`, `calories`, `protein_g`,
   `carbs_g`, `fat_g`, `fiber_g`, `sugar_g`, `sodium_mg`, `confidence`,
   `notes` — confidence is `high`/`medium`/`low` per how well-documented
   the item is). Log each component of a meal as its own entry (burger,
   fries, sauce packet separately) rather than combining into one line.
4. Immediately commit and push: `git add calorie-tracker/history.js && git
   commit -m "Log <short description>" && git push`. Do this after every
   entry, not batched at the end of the session — this file is the only
   durable copy across sessions/devices.
5. Confirm back to the user in one short line: what got logged and the
   estimated calories/macros. Don't dump the full JS entry.
6. If the user asks how their day looks, sum the entries for that date
   from `history.js` rather than opening the page.

## Standing defaults

- "A Soylent" with no flavor specified means **Cafe Mocha**.

## Notes on the web page itself

- Entries added through the page's own form save to that browser's
  `localStorage` only (tagged `source: "logged"`) — they do NOT reach this
  file. Prefer editing `history.js` directly (as above) over the page's
  form so entries are visible on every device.
- Removing an imported entry through the page only hides it in that
  browser (`hiddenImportedIds` in `localStorage`); it doesn't delete it
  from `history.js`. To actually delete/correct an entry, edit
  `history.js` directly.
