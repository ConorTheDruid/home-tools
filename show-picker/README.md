# Marquee Night

Spinner wheel for picking a movie or TV show, backed by Supabase so you and
whoever else has the link see the same list, weights, and history live —
no per-browser localStorage.

## One-time Supabase setup

1. Open the Supabase project → **SQL Editor** → New query.
2. Paste in `supabase-setup.sql` and run it. It creates the two tables
   (`hometools_shows`, `hometools_show_history`), the `confirm_pick`
   function that does the weight-decay math atomically, RLS policies
   permissive enough for the anon key to read/write, and adds both
   tables to the realtime publication.
3. `supabase-config.js` already has the project URL + anon public key.
   That key is meant to be public client-side — see the comment in that
   file. If you ever point this at a different Supabase project, update
   both values there.

## Cover art

Adding a title debounce-searches [TMDB](https://www.themoviedb.org) as you
type; pick a result and its poster becomes the wedge itself (clipped to
the pie-slice shape, cover-fit so the full poster height stays visible).
Keep typing without picking, or add a title TMDB doesn't have, and it
falls back to the old plain-color wedge — nothing about adding a show is
required to change.

Existing titles that predate this feature show a small **🎬 Art** button
next to them in the list; click it to run the same search scoped to that
one show and attach art after the fact.

Only `tmdb_id` and `poster_path` (a tiny string like `/abc123.jpg`) ever
get written to Supabase — the actual poster images are fetched straight
from TMDB's own CDN into the browser, never stored or re-uploaded here.
That keeps this comfortably inside Supabase's free-tier row/storage
limits no matter how many places the art ends up rendering.

One-time setup: run `supabase-migration-tmdb.sql` once (adds the two
columns) in addition to `supabase-setup.sql`. `tmdb-config.js` already has
a TMDB API key — same public-by-design trust model as
`supabase-config.js`.

## How the wheel works

- Every show/movie has a **weight**, not just a title. Confirming a pick
  halves its weight and splits the lost half equally across everything
  else in that category (via the `confirm_pick` database function), so
  a show that just got picked is less likely to come up again right
  away — the wheel slice visibly shrinks, and the % badge next to each
  title in the list updates live.
- **Confirm** logs it to history and applies the weight decay, but
  leaves it in the wheel (a TV show is usually watched over many
  nights).
- **Not tonight — reroll** doesn't touch the database at all; it just
  re-spins locally, excluding the just-rejected title so you can't land
  on the same thing twice in a row.
- **Finished** logs it to history and deletes it from the wheel.
- **Newcomer bonus (TV only)**: a new show starts at double its
  category's average weight, so it gets a real shot early on instead of
  competing on equal footing with established shows — and even after
  its first pick halves that weight, it lands back around average
  instead of behind. New shows glow (a pulsing gold rim + drifting
  particles on their wedge, only while the wheel's at rest) until
  they've actually been confirmed once, driven by
  `hometools_shows.is_newcomer`. Movies skip this entirely — a movie is
  normally confirmed once and finished right away, so it would never
  actually lose the glow; every movie would just look permanently new.

## Live sync

Realtime subscriptions on both tables mean changes from one browser
(adding a show, spinning, confirming, finishing) show up in any other
open tab/device within a moment, no reload needed. If the small red
banner ever says live sync dropped, a reload reconnects it — the
underlying data is never at risk, that banner only means you might be
looking at a stale view.

## Running locally

Can't just open `index.html` from disk for testing — the anon key and
CORS both expect it served over http(s). Use:

```
python3 -m http.server 8000
```
