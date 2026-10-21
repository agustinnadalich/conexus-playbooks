-- Conexus · Plan de juego — esquema para Supabase
-- Pegar COMPLETO en Supabase > SQL Editor > New query > Run. Se puede ejecutar más de una vez sin romper nada.

create table if not exists public.access (
  hash text primary key,            -- SHA-256 de 'conexus-play|<clave>'
  ws   text not null check (ws in ('sanluis','pescara','tucuman')),
  role text not null check (role in ('viewer','editor'))
);
create table if not exists public.plans (
  ws text primary key,
  data jsonb not null default '{}'::jsonb,
  version int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text
);
create table if not exists public.presence (
  ws text not null, who text not null, scene text,
  seen_at timestamptz not null default now(),
  primary key (ws, who)
);

create table if not exists public.plan_history (
  ws text not null, version int not null, data jsonb not null,
  saved_at timestamptz not null default now(), saved_by text,
  primary key (ws, version)
);
alter table public.plan_history enable row level security;

-- Nadie puede leer ni escribir las tablas directamente: solo a través de las funciones de abajo.
alter table public.access   enable row level security;
alter table public.plans    enable row level security;
alter table public.presence enable row level security;

insert into public.access (hash, ws, role) values
  ('6a7dfe9fb6ed06d7bfc4467cdeb6ebe36df5393449e1f8d51ab24bd669d8c686','sanluis','viewer'),
  ('b76052c5d9c3498d37ba7d8c528a26808e77b2597c287815955f266511d5874b','sanluis','editor'),
  ('bfebcdac08cef423b21f758882fb1b67f7bc4ad829dbe8b3ae135cf30a2d4b54','pescara','viewer'),
  ('593d219f5519bf6761c066968848a49650680a02d4cc1cf3e9116c9611e9f09a','pescara','editor')
  ,('8af18789b2916d58022f6f228e0bd7424da4259a0c0861b7ef3d899bd3774598','tucuman','viewer'),
  ('b069569841150995f8048d5a8bfe055d03d8495afc1a950b8ed1ce871d0e52a6','tucuman','editor')
on conflict (hash) do nothing;
insert into public.plans (ws) values ('sanluis'),('pescara'),('tucuman') on conflict (ws) do nothing;

-- Leer el plan (viewer o editor)
create or replace function public.cx_get(p_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a record; p record;
begin
  select * into a from access where hash = p_hash;
  if not found then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from plans where ws = a.ws;
  return jsonb_build_object('ok', true, 'ws', a.ws, 'role', a.role, 'version', p.version,
    'data', p.data, 'updated_at', p.updated_at, 'updated_by', p.updated_by);
end $$;

-- Solo el número de versión (para detectar cambios sin bajar todo el plan)
create or replace function public.cx_version(p_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a record; p record;
begin
  select * into a from access where hash = p_hash;
  if not found then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select version, updated_by, updated_at into p from plans where ws = a.ws;
  return jsonb_build_object('ok', true, 'version', p.version, 'updated_by', p.updated_by, 'updated_at', p.updated_at);
end $$;

-- Lista de versiones guardadas (solo editor)
create or replace function public.cx_history(p_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a record; r jsonb;
begin
  select * into a from access where hash = p_hash;
  if not found or a.role <> 'editor' then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object('version', version, 'saved_at', saved_at, 'saved_by', saved_by) order by version desc), '[]'::jsonb) into r from plan_history where ws = a.ws;
  return r;
end $$;

-- Una versión guardada (solo editor)
create or replace function public.cx_history_get(p_hash text, p_version int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a record; d jsonb;
begin
  select * into a from access where hash = p_hash;
  if not found or a.role <> 'editor' then return jsonb_build_object('ok', false); end if;
  select data into d from plan_history where ws = a.ws and version = p_version;
  return jsonb_build_object('ok', d is not null, 'data', d);
end $$;

-- Guardar el plan (solo editor). Si alguien guardó antes que vos (version distinta) devuelve conflict.
create or replace function public.cx_save(p_hash text, p_who text, p_base int, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a record; p record;
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
  return jsonb_build_object('ok', true, 'version', p.version + 1);
end $$;

-- Quién está en qué escena (se llama cada ~5 s mientras alguien edita)
create or replace function public.cx_presence(p_hash text, p_who text, p_scene text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a record; r jsonb;
begin
  select * into a from access where hash = p_hash;
  if not found then return '[]'::jsonb; end if;
  insert into presence (ws, who, scene, seen_at) values (a.ws, left(p_who, 40), p_scene, now())
    on conflict (ws, who) do update set scene = excluded.scene, seen_at = now();
  delete from presence where seen_at < now() - interval '1 hour';
  select coalesce(jsonb_agg(jsonb_build_object('who', who, 'scene', scene)), '[]'::jsonb) into r
    from presence where ws = a.ws and who <> left(p_who, 40) and seen_at > now() - interval '20 seconds';
  return r;
end $$;

revoke all on function public.cx_get(text), public.cx_version(text), public.cx_history(text), public.cx_history_get(text,int), public.cx_save(text,text,int,jsonb), public.cx_presence(text,text,text) from public;
grant execute on function public.cx_get(text), public.cx_version(text), public.cx_history(text), public.cx_history_get(text,int), public.cx_save(text,text,int,jsonb), public.cx_presence(text,text,text) to anon, authenticated;
-- Links para compartir una o más jugadas (ramas) en solo lectura. Se puede correr más de una vez.
create table if not exists public.shares (
  token text primary key,
  ws text not null,
  name text not null,
  data jsonb not null,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.shares enable row level security;

create or replace function public._editor_ws(p_hash text) returns text
language sql security definer set search_path = public as $$ select ws from access where hash = p_hash and role = 'editor' $$;

create or replace function public.cx_share_create(p_hash text, p_who text, p_name text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare w text; t text;
begin
  w := _editor_ws(p_hash); if w is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  t := substr(replace(gen_random_uuid()::text, '-', ''), 1, 20);
  insert into shares (token, ws, name, data, created_by) values (t, w, left(p_name, 80), p_data, left(p_who, 40));
  return jsonb_build_object('ok', true, 'token', t);
end $$;

create or replace function public.cx_share_update(p_hash text, p_token text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare w text;
begin
  w := _editor_ws(p_hash); if w is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  update shares set data = p_data, updated_at = now() where token = p_token and ws = w;
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.cx_share_list(p_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare w text; r jsonb;
begin
  w := _editor_ws(p_hash); if w is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object('token', token, 'name', name, 'created_at', created_at, 'updated_at', updated_at, 'roots', data->'__roots') order by created_at desc), '[]'::jsonb) into r from shares where ws = w;
  return r;
end $$;

create or replace function public.cx_share_delete(p_hash text, p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare w text;
begin
  w := _editor_ws(p_hash); if w is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  delete from shares where token = p_token and ws = w;
  return jsonb_build_object('ok', found);
end $$;

-- Lectura pública: quien tenga el token puede ver ESA rama (solo lectura)
create or replace function public.cx_share_get(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s record;
begin
  select * into s from shares where token = p_token;
  if not found then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'name', s.name, 'ws', s.ws, 'data', s.data, 'updated_at', s.updated_at);
end $$;

revoke all on function public._editor_ws(text) from public, anon, authenticated;
revoke all on function public.cx_share_create(text,text,text,jsonb), public.cx_share_update(text,text,jsonb), public.cx_share_list(text), public.cx_share_delete(text,text), public.cx_share_get(text) from public;
grant execute on function public.cx_share_create(text,text,text,jsonb), public.cx_share_update(text,text,jsonb), public.cx_share_list(text), public.cx_share_delete(text,text), public.cx_share_get(text) to anon, authenticated;
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
