-- Run this in the STAGING project's SQL Editor (juuxsyfcvmhorbafbnbq)
-- and paste me the results. Just the table list for now — if a
-- follow-up query errors because a table doesn't exist, Supabase's
-- editor can abort the whole script, so let's see what's actually
-- there before querying specific tables.

select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
