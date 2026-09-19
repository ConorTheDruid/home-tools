-- Run once in the PRODUCTION project's SQL Editor.
-- Adds the Rankings tab: a letter grade (S/A/B/C/D/F, with a +/- modifier
-- on everything but F) per finished title, kept in its own table since a
-- finished show is often deleted from hometools_shows once it's off the
-- wheel, but should still keep its rank.

create table if not exists hometools_rankings (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('movies', 'tv')),
  title text not null,
  rating text not null check (rating in (
    'S+', 'S', 'S-', 'A+', 'A', 'A-', 'B+', 'B', 'B-',
    'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'
  )),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (category, title)
);

alter table hometools_rankings enable row level security;

create policy "anon full access" on hometools_rankings
  for all using (true) with check (true);

alter publication supabase_realtime add table hometools_rankings;
