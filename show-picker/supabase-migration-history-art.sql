-- Run once in the PRODUCTION project's SQL Editor.
-- Adds a poster_path column to the history log so watched/finished
-- entries keep their art. hometools_shows.poster_path disappears the
-- moment a show is finished (its row gets deleted), so the history views
-- need their own copy, written at log time — existing rows stay null and
-- just fall back to the solid-color treatment.

alter table hometools_show_history add column if not exists poster_path text;
