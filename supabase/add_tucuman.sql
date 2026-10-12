-- Agrega el espacio Tucumán (se puede correr más de una vez)
alter table public.access drop constraint if exists access_ws_check;
alter table public.access add constraint access_ws_check check (ws in ('sanluis','pescara','tucuman'));
insert into public.access (hash, ws, role) values
  ('8af18789b2916d58022f6f228e0bd7424da4259a0c0861b7ef3d899bd3774598','tucuman','viewer'),
  ('b069569841150995f8048d5a8bfe055d03d8495afc1a950b8ed1ce871d0e52a6','tucuman','editor')
on conflict (hash) do nothing;
insert into public.plans (ws) values ('tucuman') on conflict (ws) do nothing;
