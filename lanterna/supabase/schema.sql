-- =====================================================================
-- LANTERNA — esquema do banco (Supabase / PostgreSQL)
-- Execute inteiro no SQL Editor do Supabase. Pode ser reexecutado.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- contas
create table if not exists public.accounts (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  email       text not null,
  role        text not null default 'user' check (role in ('user','admin')),
  avatar_url  text,
  disabled    boolean not null default false,
  created_at  timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.accounts where id = auth.uid() and role = 'admin' and not disabled);
$$;

-- cria a conta ao cadastrar no Auth
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.accounts (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- impede que usuário comum altere o próprio papel ou status
create or replace function public.guard_account_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo = SQL Editor ou service role (permitido)
  if auth.uid() is not null and not public.is_admin() and (new.role is distinct from old.role or new.disabled is distinct from old.disabled) then
    raise exception 'Somente administradores podem alterar papel ou status';
  end if;
  if old.role = 'admin' and new.role <> 'admin'
     and (select count(*) from public.accounts where role = 'admin') <= 1 then
    raise exception 'A plataforma precisa de pelo menos uma conta administradora';
  end if;
  return new;
end $$;

drop trigger if exists accounts_guard on public.accounts;
create trigger accounts_guard before update on public.accounts
  for each row execute function public.guard_account_update();

-- ---------------------------------------------------------------- perfis (vários por conta)
create table if not exists public.viewer_profiles (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.accounts(id) on delete cascade,
  name        text not null,
  color       text not null default '#F0A83A',
  kids        boolean not null default false,
  avatar_url  text,
  preferences jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists viewer_profiles_account_idx on public.viewer_profiles(account_id);

create or replace function public.owns_profile(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.viewer_profiles where id = p and account_id = auth.uid());
$$;

-- ---------------------------------------------------------------- catálogo
create table if not exists public.video_sources (
  id          text primary key,
  name        text not null,
  kind        text not null default 'file' check (kind in ('file','hls','demo')),
  renditions  jsonb not null default '[]'::jsonb,
  audio       jsonb not null default '[]'::jsonb,
  subtitles   jsonb not null default '[]'::jsonb,
  license     text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.genres (
  id   serial primary key,
  name text not null unique
);

create table if not exists public.people (
  id   serial primary key,
  name text not null unique
);

create table if not exists public.titles (
  id                 text primary key,
  kind               text not null check (kind in ('movie','series')),
  title              text not null,
  original_title     text,
  tagline            text,
  synopsis           text not null default '',
  year               int not null,
  rating             text not null check (rating in ('L','10','12','14','16','18')),
  score              numeric(3,1) not null default 0,
  popularity         int not null default 50,
  duration_min       int,
  season_count       int,
  awards             text,
  country            text,
  languages          text[] not null default '{}',
  subtitles          text[] not null default '{}',
  keywords           text[] not null default '{}',
  poster_url         text,
  backdrop_url       text,
  source_id          text,  -- 'demo' é uma fonte embutida no app, por isso sem FK
  trailer_source_id  text,
  trailer_youtube_key text,
  original           boolean not null default false,
  awarded            boolean not null default false,
  origin             text not null default 'admin',
  tmdb_id            int,
  added_at           timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
-- para bancos criados com a versão anterior do esquema
alter table public.titles add column if not exists original_title text;
alter table public.titles add column if not exists season_count int;
alter table public.titles add column if not exists awards text;

create index if not exists titles_popularity_idx on public.titles(popularity desc);

create table if not exists public.title_genres (
  title_id text references public.titles(id) on delete cascade,
  genre_id int  references public.genres(id) on delete cascade,
  primary key (title_id, genre_id)
);

create table if not exists public.title_credits (
  id        serial primary key,
  title_id  text not null references public.titles(id) on delete cascade,
  person_id int  not null references public.people(id) on delete cascade,
  kind      text not null check (kind in ('cast','director')),
  character text,
  ord       int not null default 0
);
create index if not exists title_credits_title_idx on public.title_credits(title_id);

create table if not exists public.seasons (
  id       serial primary key,
  title_id text not null references public.titles(id) on delete cascade,
  number   int not null,
  year     int,
  unique (title_id, number)
);

create table if not exists public.episodes (
  id            text primary key,
  season_id     int  not null references public.seasons(id) on delete cascade,
  title_id      text not null references public.titles(id) on delete cascade,
  number        int not null,
  title         text not null,
  synopsis      text,
  duration_min  int not null default 45,
  thumbnail_url text,
  thumb_focus   int
);

-- ---------------------------------------------------------------- biblioteca do perfil
create table if not exists public.my_list (
  profile_id uuid not null references public.viewer_profiles(id) on delete cascade,
  title_id   text not null references public.titles(id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (profile_id, title_id)
);

create table if not exists public.watch_history (
  profile_id  uuid not null references public.viewer_profiles(id) on delete cascade,
  title_id    text not null references public.titles(id) on delete cascade,
  episode_key text not null default '',   -- id do episódio, ou '' para filmes
  episode_id  text,
  season      int,
  episode     int,
  position    numeric not null default 0,
  duration    numeric not null default 0,
  finished    boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (profile_id, title_id, episode_key)
);
create index if not exists watch_history_recent_idx on public.watch_history(profile_id, updated_at desc);

create table if not exists public.ratings (
  profile_id uuid not null references public.viewer_profiles(id) on delete cascade,
  title_id   text not null references public.titles(id) on delete cascade,
  value      smallint not null check (value in (-1, 1)),
  primary key (profile_id, title_id)
);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade, -- null = todos
  title      text not null,
  body       text not null,
  title_id   text references public.titles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_reads (
  profile_id      uuid not null references public.viewer_profiles(id) on delete cascade,
  notification_id text not null,
  primary key (profile_id, notification_id)
);

create table if not exists public.view_events (
  id         bigserial primary key,
  profile_id uuid references public.viewer_profiles(id) on delete set null,
  title_id   text references public.titles(id) on delete cascade,
  at         timestamptz not null default now()
);
create index if not exists view_events_at_idx on public.view_events(at desc);

-- popularidade real a partir das visualizações (útil para recomendações no servidor)
create or replace view public.title_view_counts as
  select title_id, count(*)::int as views, max(at) as last_view
  from public.view_events group by title_id;

-- avisa todos quando um título novo é publicado
create or replace function public.notify_new_title() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (title, body, title_id)
  values (case when new.kind = 'series' then 'Nova série no catálogo' else 'Novo filme no catálogo' end,
          new.title || ' já está disponível.', new.id);
  return new;
end $$;
drop trigger if exists titles_notify on public.titles;
create trigger titles_notify after insert on public.titles for each row execute function public.notify_new_title();

-- ---------------------------------------------------------------- salvar título completo (atômico)
create or replace function public.admin_save_title(payload jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  tid text := payload->>'id';
  g text; c jsonb; d text; s jsonb; e jsonb; sid int; pid int; i int := 0;
begin
  if not public.is_admin() then raise exception 'Somente administradores podem editar o catálogo'; end if;

  insert into public.titles as t (id, kind, title, original_title, season_count, awards, tagline, synopsis, year, rating, score, popularity, duration_min, country,
    languages, subtitles, keywords, poster_url, backdrop_url, source_id, trailer_source_id, trailer_youtube_key,
    original, awarded, origin, tmdb_id, added_at, updated_at)
  values (tid, payload->>'kind', payload->>'title', payload->>'original_title', nullif(payload->>'season_count','')::int,
    payload->>'awards', payload->>'tagline', coalesce(payload->>'synopsis',''),
    (payload->>'year')::int, payload->>'rating', (payload->>'score')::numeric, (payload->>'popularity')::int,
    nullif(payload->>'duration_min','')::int, payload->>'country',
    array(select jsonb_array_elements_text(coalesce(payload->'languages','[]'))),
    array(select jsonb_array_elements_text(coalesce(payload->'subtitles','[]'))),
    array(select jsonb_array_elements_text(coalesce(payload->'keywords','[]'))),
    payload->>'poster_url', payload->>'backdrop_url', payload->>'source_id', payload->>'trailer_source_id',
    payload->>'trailer_youtube_key', coalesce((payload->>'original')::boolean,false), coalesce((payload->>'awarded')::boolean,false),
    coalesce(payload->>'origin','admin'), nullif(payload->>'tmdb_id','')::int, coalesce((payload->>'added_at')::timestamptz, now()), now())
  on conflict (id) do update set
    kind = excluded.kind, title = excluded.title, original_title = excluded.original_title,
    season_count = excluded.season_count, awards = excluded.awards, tagline = excluded.tagline, synopsis = excluded.synopsis, year = excluded.year,
    rating = excluded.rating, score = excluded.score, popularity = excluded.popularity, duration_min = excluded.duration_min,
    country = excluded.country, languages = excluded.languages, subtitles = excluded.subtitles, keywords = excluded.keywords,
    poster_url = excluded.poster_url, backdrop_url = excluded.backdrop_url, source_id = excluded.source_id,
    trailer_source_id = excluded.trailer_source_id, trailer_youtube_key = excluded.trailer_youtube_key,
    original = excluded.original, awarded = excluded.awarded, origin = excluded.origin, tmdb_id = excluded.tmdb_id, updated_at = now();

  delete from public.title_genres where title_id = tid;
  for g in select jsonb_array_elements_text(coalesce(payload->'genres','[]')) loop
    insert into public.genres(name) values (g) on conflict (name) do nothing;
    insert into public.title_genres(title_id, genre_id) select tid, id from public.genres where name = g on conflict do nothing;
  end loop;

  delete from public.title_credits where title_id = tid;
  for c in select * from jsonb_array_elements(coalesce(payload->'cast','[]')) loop
    insert into public.people(name) values (c->>'name') on conflict (name) do nothing;
    select id into pid from public.people where name = c->>'name';
    insert into public.title_credits(title_id, person_id, kind, character, ord) values (tid, pid, 'cast', c->>'character', coalesce((c->>'ord')::int, 0));
  end loop;
  for d in select jsonb_array_elements_text(coalesce(payload->'directors','[]')) loop
    insert into public.people(name) values (d) on conflict (name) do nothing;
    select id into pid from public.people where name = d;
    i := i + 1;
    insert into public.title_credits(title_id, person_id, kind, ord) values (tid, pid, 'director', i);
  end loop;

  delete from public.seasons where title_id = tid; -- cascata remove episódios
  for s in select * from jsonb_array_elements(coalesce(payload->'seasons','[]')) loop
    insert into public.seasons(title_id, number, year) values (tid, (s->>'number')::int, nullif(s->>'year','')::int) returning id into sid;
    for e in select * from jsonb_array_elements(coalesce(s->'episodes','[]')) loop
      insert into public.episodes(id, season_id, title_id, number, title, synopsis, duration_min, thumbnail_url, thumb_focus)
      values (e->>'id', sid, tid, (e->>'number')::int, e->>'title', e->>'synopsis', coalesce((e->>'duration_min')::int, 45),
              e->>'thumbnail_url', nullif(e->>'thumb_focus','')::int);
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------- RLS
alter table public.accounts            enable row level security;
alter table public.viewer_profiles     enable row level security;
alter table public.video_sources       enable row level security;
alter table public.genres              enable row level security;
alter table public.people              enable row level security;
alter table public.titles              enable row level security;
alter table public.title_genres        enable row level security;
alter table public.title_credits       enable row level security;
alter table public.seasons             enable row level security;
alter table public.episodes            enable row level security;
alter table public.my_list             enable row level security;
alter table public.watch_history       enable row level security;
alter table public.ratings             enable row level security;
alter table public.notifications       enable row level security;
alter table public.notification_reads  enable row level security;
alter table public.view_events         enable row level security;

do $$
declare t text;
begin
  -- catálogo: leitura pública, escrita só de administradores
  foreach t in array array['video_sources','genres','people','titles','title_genres','title_credits','seasons','episodes'] loop
    execute format('drop policy if exists "%1$s_read" on public.%1$s', t);
    execute format('create policy "%1$s_read" on public.%1$s for select using (true)', t);
    execute format('drop policy if exists "%1$s_admin" on public.%1$s', t);
    execute format('create policy "%1$s_admin" on public.%1$s for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
  -- biblioteca: somente o dono do perfil
  foreach t in array array['my_list','watch_history','ratings','notification_reads'] loop
    execute format('drop policy if exists "%1$s_owner" on public.%1$s', t);
    execute format('create policy "%1$s_owner" on public.%1$s for all using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id))', t);
  end loop;
end $$;

drop policy if exists accounts_self_read on public.accounts;
create policy accounts_self_read on public.accounts for select using (id = auth.uid() or public.is_admin());
drop policy if exists accounts_self_update on public.accounts;
create policy accounts_self_update on public.accounts for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_owner on public.viewer_profiles;
create policy profiles_owner on public.viewer_profiles for all using (account_id = auth.uid()) with check (account_id = auth.uid());

drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select using (account_id is null or account_id = auth.uid() or public.is_admin());
drop policy if exists notifications_admin on public.notifications;
create policy notifications_admin on public.notifications for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists view_events_insert on public.view_events;
create policy view_events_insert on public.view_events for insert with check (public.owns_profile(profile_id));
drop policy if exists view_events_admin on public.view_events;
create policy view_events_admin on public.view_events for select using (public.is_admin());

-- ---------------------------------------------------------------- armazenamento de imagens
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;

drop policy if exists media_read on storage.objects;
create policy media_read on storage.objects for select using (bucket_id = 'media');
drop policy if exists media_admin_write on storage.objects;
create policy media_admin_write on storage.objects for all
  using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());
drop policy if exists media_avatar_write on storage.objects;
create policy media_avatar_write on storage.objects for insert
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text);

-- ---------------------------------------------------------------- primeiro administrador
-- Depois de criar sua conta pelo site, rode (trocando o e-mail):
-- update public.accounts set role = 'admin' where email = 'voce@exemplo.com';
