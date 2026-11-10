-- Pessoas: perfis, configurações, presença, contatos, bloqueios, denúncias e push.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (username ~ '^[a-z0-9_.]{3,20}$'),
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 50),
  about text not null default ''
    check (char_length(about) <= 140),
  avatar_path text,
  invite_code text not null unique
    default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_username_trgm on public.profiles
  using gin (username extensions.gin_trgm_ops);
create index profiles_display_name_trgm on public.profiles
  using gin (display_name extensions.gin_trgm_ops);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  privacy_last_seen text not null default 'everyone'
    check (privacy_last_seen in ('everyone', 'contacts', 'nobody')),
  privacy_avatar text not null default 'everyone'
    check (privacy_avatar in ('everyone', 'contacts', 'nobody')),
  privacy_about text not null default 'everyone'
    check (privacy_about in ('everyone', 'contacts', 'nobody')),
  privacy_status text not null default 'contacts'
    check (privacy_status in ('contacts', 'contacts_except', 'only')),
  privacy_groups text not null default 'everyone'
    check (privacy_groups in ('everyone', 'contacts')),
  read_receipts boolean not null default true,
  default_disappearing_seconds integer
    check (default_disappearing_seconds in (86400, 604800, 7776000)),
  notifications_enabled boolean not null default true,
  notification_sound boolean not null default true,
  notification_preview boolean not null default true,
  theme text not null default 'dark'
    check (theme in ('dark', 'light', 'system')),
  font_size text not null default 'medium'
    check (font_size in ('small', 'medium', 'large')),
  enter_sends boolean not null default true,
  wallpaper text,
  auto_download_images boolean not null default true,
  auto_download_audio boolean not null default true,
  auto_download_video boolean not null default false,
  auto_download_documents boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function private.set_updated_at();

-- Separada do perfil para ter política de privacidade própria.
create table public.user_presence (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

create function private.on_profile_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_settings (user_id) values (new.id);
  insert into public.user_presence (user_id) values (new.id);
  return new;
end;
$$;

create trigger profiles_after_insert
  after insert on public.profiles
  for each row execute function private.on_profile_created();

create table public.contacts (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  contact_id uuid not null references public.profiles (id) on delete cascade,
  nickname text check (char_length(nickname) <= 50),
  created_at timestamptz not null default now(),
  primary key (owner_id, contact_id),
  check (owner_id <> contact_id)
);

create index contacts_contact_id on public.contacts (contact_id);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_id on public.blocks (blocked_id);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index push_subscriptions_user_id on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- Funções de privacidade
-- ---------------------------------------------------------------------------

create function private.is_blocked_by(p_blocker uuid, p_blocked uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where blocker_id = p_blocker and blocked_id = p_blocked
  );
$$;

-- O usuário atual pode ver um dado de `p_owner` protegido pelo nível `p_level`?
create function private.can_view(p_owner uuid, p_level text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then false
    when p_owner = (select auth.uid()) then true
    when private.is_blocked_by(p_owner, (select auth.uid())) then false
    when p_level = 'everyone' then true
    when p_level = 'contacts' then exists (
      select 1 from public.contacts
      where owner_id = p_owner and contact_id = (select auth.uid())
    )
    else false
  end;
$$;

create function private.can_view_avatar(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_view(
    p_owner,
    (select privacy_avatar from public.user_settings where user_id = p_owner)
  );
$$;

-- Quem esconde o próprio "visto por último" também não vê o dos outros.
create function private.can_view_last_seen(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_owner = (select auth.uid())
    or (
      private.can_view(
        p_owner,
        (select privacy_last_seen from public.user_settings where user_id = p_owner)
      )
      and coalesce(
        (select privacy_last_seen <> 'nobody' from public.user_settings
          where user_id = (select auth.uid())),
        false
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_presence enable row level security;
alter table public.contacts enable row level security;
alter table public.blocks enable row level security;
alter table public.push_subscriptions enable row level security;

-- Perfil de terceiros é lido pela função get_profiles, que aplica a privacidade.
create policy "profiles: leitura do próprio" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: criação do próprio" on public.profiles
  for insert to authenticated
  with check (
    id = (select auth.uid())
    and (avatar_path is null or avatar_path like (select auth.uid())::text || '/%')
  );

create policy "profiles: edição do próprio" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and (avatar_path is null or avatar_path like (select auth.uid())::text || '/%')
  );

-- O código de convite e as datas não são editáveis pelo cliente.
revoke insert, update on public.profiles from authenticated;
grant insert (id, username, display_name, about, avatar_path) on public.profiles to authenticated;
grant update (username, display_name, about, avatar_path) on public.profiles to authenticated;

create policy "user_settings: leitura do próprio" on public.user_settings
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "user_settings: edição do próprio" on public.user_settings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke insert, delete on public.user_settings from authenticated;

create policy "user_presence: leitura conforme privacidade" on public.user_presence
  for select to authenticated
  using (private.can_view_last_seen(user_id));

create policy "user_presence: atualização do próprio" on public.user_presence
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke insert, delete on public.user_presence from authenticated;

create policy "contacts: leitura dos próprios" on public.contacts
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "contacts: criação dos próprios" on public.contacts
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "contacts: edição dos próprios" on public.contacts
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "contacts: remoção dos próprios" on public.contacts
  for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "blocks: leitura dos próprios" on public.blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy "blocks: criação dos próprios" on public.blocks
  for insert to authenticated
  with check (blocker_id = (select auth.uid()));

create policy "blocks: remoção dos próprios" on public.blocks
  for delete to authenticated
  using (blocker_id = (select auth.uid()));

revoke update on public.blocks from authenticated;

create policy "push_subscriptions: leitura das próprias" on public.push_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "push_subscriptions: criação das próprias" on public.push_subscriptions
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "push_subscriptions: edição das próprias" on public.push_subscriptions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "push_subscriptions: remoção das próprias" on public.push_subscriptions
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Funções expostas
-- ---------------------------------------------------------------------------

create function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles
    where username = lower(p_username) and id <> (select auth.uid())
  );
$$;

-- Perfis de outras pessoas, já com a privacidade aplicada.
create function public.get_profiles(p_ids uuid[])
returns table (
  id uuid,
  username text,
  display_name text,
  about text,
  avatar_path text,
  is_blocked_by_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.username,
    p.display_name,
    case when private.can_view(p.id, s.privacy_about) then p.about end,
    case when private.can_view(p.id, s.privacy_avatar) then p.avatar_path end,
    private.is_blocked_by((select auth.uid()), p.id)
  from public.profiles p
  join public.user_settings s on s.user_id = p.id
  where (select auth.uid()) is not null
    and p.id = any (p_ids)
    and cardinality(p_ids) <= 500;
$$;

grant execute on function public.is_username_available(text) to authenticated;
grant execute on function public.get_profiles(uuid[]) to authenticated;
grant execute on function private.is_blocked_by(uuid, uuid) to authenticated;
grant execute on function private.can_view(uuid, text) to authenticated;
grant execute on function private.can_view_avatar(uuid) to authenticated;
grant execute on function private.can_view_last_seen(uuid) to authenticated;
