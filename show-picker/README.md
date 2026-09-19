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
