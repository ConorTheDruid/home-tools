-- Marquee Night: run this once in Supabase's SQL Editor
-- (Project → SQL Editor → New query → paste → Run)

create table if not exists hometools_shows (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('movies', 'tv')),
  title text not null,
  weight double precision not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists hometools_show_history (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('movies', 'tv')),
  event text not null check (event in ('watched', 'finished')),
  at timestamptz not null default now()
);

alter table hometools_shows enable row level security;
alter table hometools_show_history enable row level security;

-- Permissive policies: anyone with the project's public anon key can
-- read/write these two tables. There's no login for this app — the two
-- of you are the only ones who'll ever have the URL/key, same trust
-- model as the public GitHub Pages site itself.
create policy "anon full access" on hometools_shows
  for all using (true) with check (true);

create policy "anon full access" on hometools_show_history
  for all using (true) with check (true);

-- Live sync: lets both browsers see changes the moment the other person
-- makes them, without refreshing.
alter publication supabase_realtime add table hometools_shows;
alter publication supabase_realtime add table hometools_show_history;

-- Confirming a pick halves its weight and splits the lost half equally
-- across the rest of its category. Doing this as one database function
-- (rather than separate update calls from the browser) keeps it atomic —
-- if both of you confirm picks around the same moment, the math can't
-- interleave and corrupt the weights.
create or replace function confirm_pick(winner_id uuid)
returns void
language plpgsql
as $$
declare
  winner_category text;
  winner_weight double precision;
  other_count int;
  share double precision;
begin
  select category, weight into winner_category, winner_weight
  from hometools_shows where id = winner_id;

  if winner_weight is null then
    return;
  end if;

  select count(*) into other_count
  from hometools_shows
  where category = winner_category and id != winner_id;

  if other_count = 0 then
    return;
  end if;

  share := (winner_weight / 2) / other_count;

  update hometools_shows set weight = weight / 2 where id = winner_id;
  update hometools_shows set weight = weight + share
  where category = winner_category and id != winner_id;
end;
$$;

grant execute on function confirm_pick(uuid) to anon;
