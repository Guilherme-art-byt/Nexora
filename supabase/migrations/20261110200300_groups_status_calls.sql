-- Convites de grupo, atualizações (status) e chamadas.

create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  code text not null unique
    default substr(replace(gen_random_uuid()::text, '-', ''), 1, 22),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- Um único convite ativo por grupo; redefinir revoga o anterior.
create unique index group_invites_active
  on public.group_invites (conversation_id) where revoked_at is null;

create table public.group_join_requests (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  primary key (conversation_id, user_id)
);

create table public.statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('text', 'image', 'video')),
  content text check (char_length(content) <= 700),
  background text,
  media_path text,
  blur_preview text,
  duration_ms integer,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  check (
    (type = 'text' and content is not null and media_path is null)
    or (type in ('image', 'video') and media_path is not null)
  )
);

create index statuses_user on public.statuses (user_id, expires_at);
create index statuses_expires_at on public.statuses (expires_at);

-- Listas de "exceto..." e "somente..." da privacidade de status.
create table public.status_privacy_lists (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('except', 'only')),
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (owner_id, kind, user_id)
);

-- Quem pode ver cada status, fixado no momento da publicação.
create table public.status_recipients (
  status_id uuid not null references public.statuses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (status_id, user_id)
);

create index status_recipients_user on public.status_recipients (user_id);

create table public.status_views (
  status_id uuid not null references public.statuses (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (status_id, viewer_id)
);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  caller_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('voice', 'video')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  end_reason text check (
    end_reason in ('completed', 'missed', 'declined', 'cancelled', 'failed', 'busy')
  )
);

create index calls_conversation on public.calls (conversation_id, created_at desc);

create table public.call_participants (
  call_id uuid not null references public.calls (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  state text not null default 'ringing'
    check (state in ('ringing', 'joined', 'declined', 'missed', 'left')),
  joined_at timestamptz,
  left_at timestamptz,
  primary key (call_id, user_id)
);

create index call_participants_user on public.call_participants (user_id);

-- ---------------------------------------------------------------------------
-- Funções
-- ---------------------------------------------------------------------------

create function private.can_view_status(p_status uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.statuses s
    where s.id = p_status
      and (
        s.user_id = (select auth.uid())
        or (
          s.expires_at > now()
          and not private.is_blocked_by(s.user_id, (select auth.uid()))
          and exists (
            select 1 from public.status_recipients r
            where r.status_id = s.id and r.user_id = (select auth.uid())
          )
        )
      )
  );
$$;

create function private.is_status_owner(p_status uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.statuses
    where id = p_status and user_id = (select auth.uid())
  );
$$;

create function private.is_call_participant(p_call uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.call_participants
    where call_id = p_call and user_id = (select auth.uid())
  );
$$;

grant execute on function private.can_view_status(uuid) to authenticated;
grant execute on function private.is_status_owner(uuid) to authenticated;
grant execute on function private.is_call_participant(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.group_invites enable row level security;
alter table public.group_join_requests enable row level security;
alter table public.statuses enable row level security;
alter table public.status_privacy_lists enable row level security;
alter table public.status_recipients enable row level security;
alter table public.status_views enable row level security;
alter table public.calls enable row level security;
alter table public.call_participants enable row level security;

revoke insert, update, delete on
  public.group_invites,
  public.group_join_requests,
  public.statuses,
  public.status_recipients,
  public.calls,
  public.call_participants
from authenticated;

create policy "group_invites: leitura por participantes" on public.group_invites
  for select to authenticated
  using (private.is_member(conversation_id));

create policy "group_join_requests: leitura pelo solicitante ou administrador"
  on public.group_join_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin(conversation_id));

create policy "statuses: leitura pelo dono ou destinatários" on public.statuses
  for select to authenticated
  using (private.can_view_status(id));

create policy "status_privacy_lists: leitura das próprias" on public.status_privacy_lists
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "status_privacy_lists: criação das próprias" on public.status_privacy_lists
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "status_privacy_lists: remoção das próprias" on public.status_privacy_lists
  for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke update on public.status_privacy_lists from authenticated;

create policy "status_recipients: leitura pelo dono do status" on public.status_recipients
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_status_owner(status_id));

create policy "status_views: leitura pelo dono ou por quem viu" on public.status_views
  for select to authenticated
  using (viewer_id = (select auth.uid()) or private.is_status_owner(status_id));

create policy "status_views: registro da própria visualização" on public.status_views
  for insert to authenticated
  with check (
    viewer_id = (select auth.uid())
    and private.can_view_status(status_id)
    and not private.is_status_owner(status_id)
  );

revoke update, delete on public.status_views from authenticated;

create policy "calls: leitura por participantes" on public.calls
  for select to authenticated
  using (private.is_call_participant(id));

create policy "call_participants: leitura por participantes" on public.call_participants
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_call_participant(call_id));
