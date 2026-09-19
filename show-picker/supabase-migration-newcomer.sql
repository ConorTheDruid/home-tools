-- Run once in the PRODUCTION project's SQL Editor.
-- Adds the "newcomer bonus" feature: a new show/movie starts at double
-- the category's average weight (better odds early on, and it still
-- lands roughly at average even after its first pick, instead of
-- starting behind established shows). is_newcomer also drives a glow/
-- particle effect on the wheel that disappears the first time it's
-- confirmed.

alter table hometools_shows add column if not exists is_newcomer boolean not null default true;

-- Backfill: anything that already has a real watch in its history has
-- effectively already "been chosen" — don't show the newcomer glow for
-- shows you were already partway through before this feature existed.
update hometools_shows s
set is_newcomer = false
where exists (
  select 1 from hometools_show_history h
  where h.title = s.title and h.category = s.category and h.event = 'watched'
);

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

  update hometools_shows set is_newcomer = false where id = winner_id;

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
