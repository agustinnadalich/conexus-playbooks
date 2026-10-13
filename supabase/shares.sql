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
