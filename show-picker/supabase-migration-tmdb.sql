-- Run once in the PRODUCTION project's SQL Editor.
-- Adds columns to hold a TMDB (The Movie Database) match for a show, so
-- the wheel can render its poster as the wedge itself instead of a plain
-- color. Both columns stay null until a title is matched via search —
-- existing rows keep working exactly as before, they just fall back to
-- the solid-color wedge until someone runs "🎬 Art" on them.

alter table hometools_shows add column if not exists tmdb_id integer;
alter table hometools_shows add column if not exists poster_path text;
