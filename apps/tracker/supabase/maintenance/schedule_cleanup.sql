-- Run the session cleanup automatically, once a day, so test sessions and abandoned ones do not pile up.
-- Not a migration: run it by hand in the Supabase SQL editor, once. Safe to run again; the job is
-- replaced, not duplicated.
--
-- It needs the pg_cron extension. If the first statement fails, enable pg_cron under
-- Database > Extensions in the Supabase dashboard and run this file again.
--
-- The condition matches cleanup_sessions.sql (the manual version, which also has a preview query):
-- a session goes when it was closed more than 1 day ago, or nothing has been published to it for
-- 14 days. Deleting a session cascades to its views, players, declarations and Done taps.
-- The job runs at 04:17 UTC. To change the schedule or the intervals, edit them and run this again.

create extension if not exists pg_cron;

select cron.schedule(
  'cleanup-old-sessions',
  '17 4 * * *',
  $$
    delete from public.sessions
    where id in (
      select s.id
      from public.sessions s
      join public.session_views v on v.session_id = s.id
      where s.closed_at < now() - interval '1 day'
         or v.updated_at < now() - interval '14 days'
    )
  $$
);

-- Check it is registered, and see recent runs afterwards:
--   select jobname, schedule, active from cron.job where jobname = 'cleanup-old-sessions';
--   select status, start_time, return_message from cron.job_run_details order by start_time desc limit 5;
-- To switch it off:
--   select cron.unschedule('cleanup-old-sessions');
