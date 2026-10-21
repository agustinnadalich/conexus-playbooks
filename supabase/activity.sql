-- Registro de actividad (quién entró y qué hizo). Se puede correr más de una vez.
create table if not exists public.activity (
  id bigserial primary key,
  at timestamptz not null default now(),
  ws text, who text, role text,
  action text not null, detail text, ua text
);
create index if not exists activity_at_idx on public.activity (at desc);
alter table public.activity enable row level security;

create table if not exists public.admins (hash text primary key, label text);
alter table public.admins enable row level security;
insert into public.admins (hash, label) values ('e4b4aebbe095a50dbbf5fc9d03a1943c07c75d495a347274a7fd5be3a1c071af', 'owner') on conflict (hash) do nothing;

create or replace function public._ua() returns text language sql stable as $$
  select left(coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'user-agent', ''), 180)
$$;

create or replace function public._log(p_ws text, p_who text, p_role text, p_action text, p_detail text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into activity (ws, who, role, action, detail, ua)
  values (p_ws, left(coalesce(p_who, ''), 40), p_role, left(p_action, 30), left(coalesce(p_detail, ''), 700), _ua());
  delete from activity where at < now() - interval '180 days';
end $$;

create or replace function public._lim(a text[]) returns text language sql immutable as $$
  select array_to_string(a[1:8], ', ') || case when coalesce(array_length(a, 1), 0) > 8 then ' y ' || (array_length(a, 1) - 8) || ' más' else '' end
$$;

-- Resume qué cambió entre dos versiones del plan
create or replace function public._plan_diff(o jsonb, n jsonb) returns text
language plpgsql stable as $$
declare ad text[]; rm text[]; ch text[]; res text[] := '{}';
begin
  select coalesce(array_agg(coalesce(nv.v ->> 'title', '(sin título)')), '{}') into ad
    from jsonb_array_elements(coalesce(n -> 'steps', '[]'::jsonb)) as nv(v)
    where not exists (select 1 from jsonb_array_elements(coalesce(o -> 'steps', '[]'::jsonb)) as ov(v) where ov.v ->> 'id' = nv.v ->> 'id');
  select coalesce(array_agg(coalesce(ov.v ->> 'title', '(sin título)')), '{}') into rm
    from jsonb_array_elements(coalesce(o -> 'steps', '[]'::jsonb)) as ov(v)
    where not exists (select 1 from jsonb_array_elements(coalesce(n -> 'steps', '[]'::jsonb)) as nv(v) where nv.v ->> 'id' = ov.v ->> 'id');
  select coalesce(array_agg(coalesce(nv.v ->> 'title', '(sin título)')), '{}') into ch
    from jsonb_array_elements(coalesce(n -> 'steps', '[]'::jsonb)) as nv(v)
    join jsonb_array_elements(coalesce(o -> 'steps', '[]'::jsonb)) as ov(v) on ov.v ->> 'id' = nv.v ->> 'id'
    where ov.v <> nv.v;
  if coalesce(array_length(ad, 1), 0) > 0 then res := res || ('creó: ' || _lim(ad)); end if;
  if coalesce(array_length(ch, 1), 0) > 0 then res := res || ('modificó: ' || _lim(ch)); end if;
  if coalesce(array_length(rm, 1), 0) > 0 then res := res || ('eliminó: ' || _lim(rm)); end if;
  if (o -> 'starts') is distinct from (n -> 'starts') then res := res || 'cambió los inicios'::text; end if;
  if (o -> 'layoutOff') is distinct from (n -> 'layoutOff') then res := res || 'movió cajas del mapa'::text; end if;
  return array_to_string(res, ' · ');
end $$;

-- Guardar el plan (ahora registra el resumen de cambios)
create or replace function public.cx_save(p_hash text, p_who text, p_base int, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a record; p record; d text;
begin
  select * into a from access where hash = p_hash;
  if not found then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if a.role <> 'editor' then return jsonb_build_object('ok', false, 'error', 'readonly'); end if;
  select * into p from plans where ws = a.ws for update;
  if p.version <> p_base then
    return jsonb_build_object('ok', false, 'conflict', true, 'version', p.version, 'data', p.data,
      'updated_at', p.updated_at, 'updated_by', p.updated_by);
  end if;
  update plans set data = p_data, version = p.version + 1, updated_at = now(), updated_by = left(p_who, 40) where ws = a.ws;
  insert into plan_history (ws, version, data, saved_by) values (a.ws, p.version + 1, p_data, left(p_who, 40));
  delete from plan_history where ws = a.ws and version <= p.version + 1 - 40;
  d := _plan_diff(p.data, p_data);
  if d <> '' then perform _log(a.ws, p_who, 'editor', 'save', 'v' || (p.version + 1) || ' · ' || d); end if;
  return jsonb_build_object('ok', true, 'version', p.version + 1);
end $$;

-- Entradas y otros eventos desde la app
create or replace function public.cx_log(p_hash text, p_who text, p_action text, p_detail text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select * into a from access where hash = p_hash;
  if not found then return jsonb_build_object('ok', false); end if;
  perform _log(a.ws, p_who, a.role, p_action, p_detail);
  return jsonb_build_object('ok', true);
end $$;

-- Links compartidos: ahora registran creación, cambios y visitas
create or replace function public.cx_share_create(p_hash text, p_who text, p_name text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare w text; t text;
begin
  w := _editor_ws(p_hash); if w is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  t := substr(replace(gen_random_uuid()::text, '-', ''), 1, 20);
  insert into shares (token, ws, name, data, created_by) values (t, w, left(p_name, 80), p_data, left(p_who, 40));
  perform _log(w, p_who, 'editor', 'share_create', left(p_name, 80));
  return jsonb_build_object('ok', true, 'token', t);
end $$;

create or replace function public.cx_share_update(p_hash text, p_token text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare w text; nm text;
begin
  w := _editor_ws(p_hash); if w is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  update shares set data = p_data, updated_at = now() where token = p_token and ws = w returning name into nm;
  if nm is not null then perform _log(w, '', 'editor', 'share_update', nm); end if;
  return jsonb_build_object('ok', nm is not null);
end $$;

create or replace function public.cx_share_delete(p_hash text, p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare w text; nm text;
begin
  w := _editor_ws(p_hash); if w is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  delete from shares where token = p_token and ws = w returning name into nm;
  if nm is not null then perform _log(w, '', 'editor', 'share_delete', nm); end if;
  return jsonb_build_object('ok', nm is not null);
end $$;

drop function if exists public.cx_share_get(text);
create or replace function public.cx_share_get(p_token text, p_log boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s record;
begin
  select * into s from shares where token = p_token;
  if not found then return jsonb_build_object('ok', false); end if;
  if p_log then perform _log(s.ws, '(link)', 'link', 'share_view', s.name); end if;
  return jsonb_build_object('ok', true, 'name', s.name, 'ws', s.ws, 'data', s.data, 'updated_at', s.updated_at);
end $$;

-- Lectura del registro: solo con la clave de administración
create or replace function public.cx_activity(p_hash text, p_limit int default 400) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from admins where hash = p_hash) then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'rows', (
    select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from (
      select id, at, ws, who, role, action, detail, ua from activity order by at desc limit least(coalesce(p_limit, 400), 3000)
    ) t));
end $$;

revoke all on function public._ua(), public._log(text,text,text,text,text), public._lim(text[]), public._plan_diff(jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.cx_save(text,text,int,jsonb), public.cx_log(text,text,text,text), public.cx_share_create(text,text,text,jsonb), public.cx_share_update(text,text,jsonb), public.cx_share_delete(text,text), public.cx_share_get(text,boolean), public.cx_activity(text,int) from public;
grant execute on function public.cx_save(text,text,int,jsonb), public.cx_log(text,text,text,text), public.cx_share_create(text,text,text,jsonb), public.cx_share_update(text,text,jsonb), public.cx_share_delete(text,text), public.cx_share_get(text,boolean), public.cx_activity(text,int) to anon, authenticated;
