-- One-time correction: the confirm on 9/19 was logged against "Solar"
-- by mistake — the show actually watched that night was "Modern Family".
-- Run once in the PRODUCTION project's SQL Editor.
--
-- This undoes the halve-and-redistribute that confirm_pick wrongly
-- applied to Solar, then re-applies that same math to Modern Family
-- instead (including clearing its newcomer flag, since it really has
-- been picked now), and relabels the history entry. All done off
-- whatever Solar's weight currently is in the live table — no numbers
-- hardcoded — so it stays correct even if you don't run this right away.
--
-- Assumes no other TV confirm happened between the mistaken Solar pick
-- and now; if another spin was confirmed in between, the reversal won't
-- be exact.

do $$
declare
  solar_id uuid;
  solar_after double precision;
  solar_before double precision;
  other_count int;
  wrong_share double precision;
  mf_id uuid;
  mf_restored double precision;
  correct_share double precision;
begin
  select id, weight into solar_id, solar_after
  from hometools_shows where category = 'tv' and title = 'Solar';

  select count(*) into other_count
  from hometools_shows where category = 'tv' and id != solar_id;

  -- Reverse the wrong confirm_pick(Solar) call: give Solar back the half
  -- it lost, and claw back the share every other TV show was given.
  solar_before := solar_after * 2;
  wrong_share := solar_after / other_count;

  update hometools_shows set weight = solar_before where id = solar_id;
  update hometools_shows set weight = weight - wrong_share
  where category = 'tv' and id != solar_id;

  -- Re-apply the same halve-and-redistribute to Modern Family instead,
  -- and clear its newcomer flag since it's now actually been picked.
  select id, weight into mf_id, mf_restored
  from hometools_shows where category = 'tv' and title = 'Modern Family';

  correct_share := (mf_restored / 2) / other_count;

  update hometools_shows set weight = mf_restored / 2, is_newcomer = false
  where id = mf_id;

  update hometools_shows set weight = weight + correct_share
  where category = 'tv' and id != mf_id;
end $$;

-- Relabel the history entry itself.
update hometools_show_history
set title = 'Modern Family'
where category = 'tv' and title = 'Solar' and event = 'watched'
  and at = '2026-09-19T04:20:00Z';
