-- One-time import of ~2 weeks of real usage that was sitting in
-- localStorage on your phone before Marquee Night moved to Supabase.
-- Run this once in the PRODUCTION project's SQL Editor.
--
-- Weights assume all 6 shows were added to the wheel at the same time,
-- then replay the 8 real "confirm" events (from the history screenshot)
-- in exact chronological order through the same halve-and-redistribute
-- math the app itself uses. Watch-history timestamps are converted from
-- Eastern time (as shown on your phone) to UTC.

insert into hometools_shows (category, title, weight, created_at) values
  ('tv', 'Solar',          0.116331, '2026-09-05T00:00:00Z'),
  ('tv', 'Doro he Doro',   1.033514, '2026-09-05T00:00:01Z'),
  ('tv', 'Jujitsu Kaizen', 0.604514, '2026-09-05T00:00:02Z'),
  ('tv', 'Adults',         0.858614, '2026-09-05T00:00:03Z'),
  ('tv', 'Modern Family',  1.693514, '2026-09-05T00:00:04Z'),
  ('tv', 'Agatha',         1.693514, '2026-09-05T00:00:05Z');

insert into hometools_show_history (title, category, event, at) values
  ('Solar',          'tv', 'watched', '2026-09-06T04:55:00Z'),
  ('Doro he Doro',   'tv', 'watched', '2026-09-07T02:51:00Z'),
  ('Jujitsu Kaizen', 'tv', 'watched', '2026-09-13T03:14:00Z'),
  ('Jujitsu Kaizen', 'tv', 'watched', '2026-09-15T01:08:00Z'),
  ('Adults',         'tv', 'watched', '2026-09-15T03:00:00Z'),
  ('Solar',          'tv', 'watched', '2026-09-16T04:39:00Z'),
  ('Solar',          'tv', 'watched', '2026-09-18T02:39:00Z'),
  ('Solar',          'tv', 'watched', '2026-09-19T04:20:00Z');
