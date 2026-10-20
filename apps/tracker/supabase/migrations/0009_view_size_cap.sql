-- Abuse guard: publish_view accepted a view of any size, and create_session is open to anyone holding the
-- public anon key, so a script could fill the database with large views. Cap what one publish can store.
-- A real view is a few KB (a handful of players and actors with short names), so 100 KB leaves ample room.
--
-- Signature and return type are unchanged, so `create or replace` keeps the existing grants. The deployed
-- client does not need to change at the same time, but a client older than this repo's matching change
-- would retry an oversized publish forever instead of reporting it. Apply this, then deploy.
-- Otherwise identical to the 0004 definition.

create or replace function public.publish_view(p_code text, p_secret text, p_view jsonb, p_revision bigint)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  sess   sessions;
  stored bigint;
begin
  if p_secret is null or p_revision is null then
    raise exception 'invalid session or secret';
  end if;
  select * into sess from sessions where code = upper(p_code) for update;
  if not found or sess.dm_secret_hash is distinct from crypt(p_secret, sess.dm_secret_hash) then
    raise exception 'invalid session or secret';
  end if;
  if sess.closed_at is not null then
    raise exception 'session closed';
  end if;
  if p_view is null or octet_length(p_view::text) > 100000 then
    raise exception 'view too large';
  end if;
  update session_views
    set view = p_view, revision = p_revision, updated_at = now()
    where session_id = sess.id and revision < p_revision;
  select revision into stored from session_views where session_id = sess.id;
  return stored;
end;
$$;
