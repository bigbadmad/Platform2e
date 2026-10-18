-- Milestone 3: players add their own initiative modifiers. A declaration can now carry the player's
-- Dexterity and other adjustments (the whole list, starting from what the DM entered) and whether the
-- character is hasted or slowed. The DM client applies them with the same calcInitiative as everything else.
--
-- The three new columns are null when a declaration did not carry them, which is how an older client's
-- declaration looks: the DM's own modifiers then stand. New arguments have defaults, so a client from
-- before this migration still works against it. Apply this before deploying the client that sends them.

alter table public.declarations
  add column adjustments jsonb check (
    adjustments is null or (jsonb_typeof(adjustments) = 'array' and jsonb_array_length(adjustments) <= 6)
  ),
  add column hasted boolean,
  add column slowed boolean;

-- The signature changes, so the old function has to go first.
drop function public.submit_declaration(uuid, text, text, int);

create function public.submit_declaration(
  p_session_id  uuid,
  p_kind        text,
  p_label       text,
  p_value       int,
  p_adjustments jsonb default null,
  p_hasted      boolean default null,
  p_slowed      boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me       players;
  sess     sessions;
  v        jsonb;
  pl       jsonb;
  enc      text;
  rnd      int;
  surprise boolean;
  roll     int;
  v_label  text;
  inserted int;
  adj      jsonb := null;
  item     jsonb;
  a_kind   text;
  a_label  text;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if p_kind is null or p_kind not in ('weapon_speed', 'spell_casting') then
    raise exception 'invalid action kind';
  end if;
  if p_value is null or p_value < 0 or p_value > 30 then
    raise exception 'invalid speed';
  end if;
  v_label := left(trim(coalesce(p_label, '')), 40);

  -- Adjustments: an array of at most 6 { kind, label, value } objects with whole values in -30..30.
  -- Rebuilt rather than stored as sent, so nothing else a client puts in the JSON is kept.
  if p_adjustments is not null then
    if jsonb_typeof(p_adjustments) <> 'array' or jsonb_array_length(p_adjustments) > 6 then
      raise exception 'invalid adjustments';
    end if;
    adj := '[]'::jsonb;
    for item in select * from jsonb_array_elements(p_adjustments) loop
      if jsonb_typeof(item) <> 'object' then
        raise exception 'invalid adjustments';
      end if;
      a_kind := item->>'kind';
      if a_kind is null or a_kind not in ('dex_reaction', 'other') then
        raise exception 'invalid adjustments';
      end if;
      -- Two separate checks: SQL does not promise to stop at the first failing operand of an OR, and
      -- the cast must only run on text already known to be a whole number.
      if jsonb_typeof(item->'value') is distinct from 'number'
         or (item->>'value') !~ '^-?[0-9]{1,2}$' then
        raise exception 'invalid adjustments';
      end if;
      if (item->>'value')::int not between -30 and 30 then
        raise exception 'invalid adjustments';
      end if;
      a_label := left(trim(coalesce(item->>'label', '')), 40);
      adj := adj || jsonb_build_array(jsonb_build_object(
        'kind', a_kind,
        'label', case when a_label = '' then (case when a_kind = 'dex_reaction' then 'Dex' else 'Other' end) else a_label end,
        'value', (item->>'value')::int
      ));
    end loop;
  end if;

  select * into me from players where session_id = p_session_id and auth_uid = auth.uid();
  if not found then
    raise exception 'not a member of this session';
  end if;
  if me.combatant_id is null then
    raise exception 'no character selected';
  end if;

  -- Share-lock the session so this runs strictly before or after a close_session / publish_view.
  select * into sess from sessions where id = p_session_id for share;
  if sess.closed_at is not null then
    raise exception 'session closed';
  end if;

  select view into v from session_views where session_id = p_session_id;
  enc := v->>'encounterId';
  rnd := (v->>'roundNumber')::int;
  surprise := coalesce((v->>'inSurprisePhase')::boolean, false);
  if v->>'phase' is distinct from 'initiative' or enc is null or rnd is null then
    raise exception 'declarations are not open';
  end if;

  select elem into pl
    from jsonb_array_elements(coalesce(v->'players', '[]'::jsonb)) elem
    where elem->>'id' = me.combatant_id
    limit 1;
  if pl is null then
    raise exception 'character is not in this encounter';
  end if;
  if not coalesce((pl->>'isActive')::boolean, false)
     or coalesce((pl->>'isHorsDeCombat')::boolean, false)
     or (surprise and coalesce((pl->>'isSurprised')::boolean, false)) then
    raise exception 'character cannot act this round';
  end if;
  if coalesce((pl->>'hasDeclared')::boolean, false) then
    raise exception 'already declared';
  end if;

  roll := 1 + floor(random() * 10)::int;
  insert into declarations (
      session_id, encounter_id, round, combatant_id, player_id, kind, label, value, d10,
      adjustments, hasted, slowed
    )
    values (
      p_session_id, enc, rnd, me.combatant_id, me.id, p_kind, v_label, p_value, roll,
      adj, p_hasted, p_slowed
    )
    on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    raise exception 'already declared';
  end if;

  return jsonb_build_object('encounterId', enc, 'round', rnd, 'd10', roll);
end;
$$;

-- DM: the declarations for one round, now with the adjustments and speed status they carry
-- (JSON null where a declaration did not carry them).
create or replace function public.get_declarations(p_code text, p_secret text, p_encounter_id text, p_round int)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  sess sessions;
begin
  if p_secret is null then
    raise exception 'invalid session or secret';
  end if;
  select * into sess from sessions where code = upper(p_code);
  if not found or sess.dm_secret_hash is distinct from crypt(p_secret, sess.dm_secret_hash) then
    raise exception 'invalid session or secret';
  end if;
  if sess.closed_at is not null then
    raise exception 'session closed';
  end if;
  return (
    select coalesce(
      jsonb_agg(jsonb_build_object(
        'combatantId', combatant_id, 'kind', kind, 'label', label, 'value', value, 'd10', d10,
        'adjustments', adjustments, 'hasted', hasted, 'slowed', slowed
      )),
      '[]'::jsonb
    )
    from declarations
    where session_id = sess.id and encounter_id = p_encounter_id and round = p_round
  );
end;
$$;

revoke all on function public.submit_declaration(uuid, text, text, int, jsonb, boolean, boolean) from public;
grant execute on function public.submit_declaration(uuid, text, text, int, jsonb, boolean, boolean) to authenticated;
