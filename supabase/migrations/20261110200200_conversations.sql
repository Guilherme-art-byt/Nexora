-- Conversas e mensagens.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('direct', 'group')),
  -- Par ordenado "menor:maior" dos dois participantes; garante uma única conversa direta.
  direct_key text unique,
  name text check (char_length(btrim(name)) between 1 and 100),
  description text check (char_length(description) <= 512),
  avatar_path text,
  created_by uuid references public.profiles (id) on delete set null,
  send_policy text not null default 'all' check (send_policy in ('all', 'admins')),
  edit_policy text not null default 'all' check (edit_policy in ('all', 'admins')),
  join_approval boolean not null default false,
  disappearing_seconds integer
    check (disappearing_seconds in (86400, 604800, 7776000)),
  last_message_id uuid,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (type = 'direct' and direct_key is not null and name is null)
    or (type = 'group' and direct_key is null and name is not null)
  )
);

create index conversations_last_message_at
  on public.conversations (last_message_at desc nulls last);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function private.set_updated_at();

-- Participação: visível para os demais participantes.
create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  added_by uuid references public.profiles (id) on delete set null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (conversation_id, user_id)
);

create index conversation_members_user
  on public.conversation_members (user_id) where left_at is null;
create index conversation_members_active
  on public.conversation_members (conversation_id) where left_at is null;

-- Estado pessoal de cada conversa: só o dono enxerga.
create table public.conversation_states (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  muted_until timestamptz,
  archived boolean not null default false,
  pinned_at timestamptz,
  favorite boolean not null default false,
  marked_unread boolean not null default false,
  last_read_at timestamptz,
  unread_count integer not null default 0 check (unread_count >= 0),
  unread_mentions integer not null default 0 check (unread_mentions >= 0),
  cleared_at timestamptz,
  -- Conversa apagada da lista; volta a aparecer quando chega mensagem nova.
  hidden boolean not null default false,
  wallpaper text,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_states_list
  on public.conversation_states (user_id, archived, pinned_at desc nulls last);

create trigger conversation_states_set_updated_at
  before update on public.conversation_states
  for each row execute function private.set_updated_at();

create function private.enforce_pin_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.pinned_at is not null and (tg_op = 'INSERT' or old.pinned_at is null) then
    if (
      select count(*) from public.conversation_states
      where user_id = new.user_id and pinned_at is not null
        and conversation_id <> new.conversation_id
    ) >= private.config_int('max_pinned_conversations') then
      raise exception 'pin_limit_reached' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger conversation_states_pin_limit
  before insert or update of pinned_at on public.conversation_states
  for each row execute function private.enforce_pin_limit();

create table public.messages (
  -- Gerado no cliente: reenviar a mesma mensagem nunca duplica.
  id uuid primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  type text not null check (
    type in ('text', 'image', 'video', 'audio', 'document', 'location', 'contact', 'poll', 'system')
  ),
  content text check (char_length(content) <= 4096),
  metadata jsonb not null default '{}'::jsonb,
  reply_to_id uuid references public.messages (id) on delete set null,
  forwarded boolean not null default false,
  view_once boolean not null default false,
  -- Verdadeiro quando o destinatário bloqueou o remetente: quem bloqueou nunca lê.
  hidden_from_recipient boolean not null default false,
  edited_at timestamptz,
  deleted_at timestamptz,
  expires_at timestamptz,
  delivered_all_at timestamptz,
  read_all_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('portuguese', coalesce(content, ''))
  ) stored
);

create index messages_history
  on public.messages (conversation_id, created_at desc, id desc);
create index messages_sync
  on public.messages (conversation_id, updated_at);
create index messages_search on public.messages using gin (search);
create index messages_expires_at
  on public.messages (expires_at) where expires_at is not null;
create index messages_reply_to
  on public.messages (reply_to_id) where reply_to_id is not null;

create trigger messages_set_updated_at
  before update on public.messages
  for each row execute function private.set_updated_at();

alter table public.conversations
  add constraint conversations_last_message_fk
  foreign key (last_message_id) references public.messages (id) on delete set null;

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  path text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  file_name text,
  width integer,
  height integer,
  duration_ms integer,
  blur_preview text,
  waveform jsonb,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index message_attachments_message on public.message_attachments (message_id);

create table public.message_receipts (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  played_at timestamptz,
  viewed_at timestamptz,
  primary key (message_id, user_id)
);

create index message_receipts_user on public.message_receipts (user_id);

create table public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table public.message_mentions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (message_id, user_id)
);

create index message_mentions_user on public.message_mentions (user_id);

-- "Apagar para mim".
create table public.message_deletions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index message_deletions_user on public.message_deletions (user_id);

create table public.starred_messages (
  user_id uuid not null references public.profiles (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);

create index starred_messages_list
  on public.starred_messages (user_id, created_at desc);

create table public.pinned_messages (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  pinned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (conversation_id, message_id)
);

create table public.polls (
  message_id uuid primary key references public.messages (id) on delete cascade,
  question text not null check (char_length(btrim(question)) between 1 and 255),
  allow_multiple boolean not null default false
);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.polls (message_id) on delete cascade,
  position smallint not null,
  text text not null check (char_length(btrim(text)) between 1 and 100),
  unique (message_id, position)
);

create table public.poll_votes (
  option_id uuid not null references public.poll_options (id) on delete cascade,
  message_id uuid not null references public.polls (message_id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (option_id, user_id)
);

create index poll_votes_message on public.poll_votes (message_id);

create table public.link_previews (
  url_hash text primary key,
  url text not null,
  title text,
  description text,
  image_url text,
  site_name text,
  fetched_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  reason text not null check (
    reason in ('spam', 'abuse', 'inappropriate', 'impersonation', 'other')
  ),
  details text check (char_length(details) <= 1000),
  created_at timestamptz not null default now(),
  check (num_nonnulls(reported_user_id, conversation_id, message_id) >= 1)
);

create index reports_reporter on public.reports (reporter_id);

-- ---------------------------------------------------------------------------
-- Funções de participação
-- ---------------------------------------------------------------------------

-- Participante ativo (não saiu).
create function private.is_member(p_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation
      and user_id = (select auth.uid())
      and left_at is null
  );
$$;

-- Participa ou já participou: quem saiu continua lendo o histórico antigo.
create function private.was_member(p_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation and user_id = (select auth.uid())
  );
$$;

create function private.is_admin(p_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation
      and user_id = (select auth.uid())
      and left_at is null
      and role = 'admin'
  );
$$;

-- A mensagem é legível pelo usuário atual? Regra única usada por todas as tabelas filhas.
create function private.can_read_message(p_message uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.messages msg
    join public.conversation_members m
      on m.conversation_id = msg.conversation_id
      and m.user_id = (select auth.uid())
    where msg.id = p_message
      and msg.created_at >= m.joined_at
      and (m.left_at is null or msg.created_at <= m.left_at)
      and (not msg.hidden_from_recipient or msg.sender_id = (select auth.uid()))
  );
$$;

create function private.is_message_sender(p_message uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.messages
    where id = p_message and sender_id = (select auth.uid())
  );
$$;

grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.was_member(uuid) to authenticated;
grant execute on function private.is_admin(uuid) to authenticated;
grant execute on function private.can_read_message(uuid) to authenticated;
grant execute on function private.is_message_sender(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- Escritas com regra de negócio (enviar, editar, apagar, criar conversa, gerir grupo)
-- acontecem por funções; por isso quase não há políticas de escrita aqui.
-- ---------------------------------------------------------------------------

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.conversation_states enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.message_receipts enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_mentions enable row level security;
alter table public.message_deletions enable row level security;
alter table public.starred_messages enable row level security;
alter table public.pinned_messages enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.link_previews enable row level security;
alter table public.reports enable row level security;

revoke insert, update, delete on
  public.conversations,
  public.conversation_members,
  public.messages,
  public.message_attachments,
  public.message_receipts,
  public.message_reactions,
  public.message_mentions,
  public.pinned_messages,
  public.polls,
  public.poll_options,
  public.poll_votes,
  public.link_previews
from authenticated;

create policy "conversations: leitura por participantes" on public.conversations
  for select to authenticated
  using (private.was_member(id));

create policy "conversation_members: leitura por participantes" on public.conversation_members
  for select to authenticated
  using (user_id = (select auth.uid()) or private.was_member(conversation_id));

create policy "conversation_states: leitura do próprio" on public.conversation_states
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "conversation_states: edição do próprio" on public.conversation_states
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Contadores e marcas de leitura são mantidos pelo servidor.
revoke insert, update, delete on public.conversation_states from authenticated;
grant update (muted_until, archived, pinned_at, favorite, marked_unread, wallpaper)
  on public.conversation_states to authenticated;

create policy "messages: leitura por participantes" on public.messages
  for select to authenticated
  using (
    (not hidden_from_recipient or sender_id = (select auth.uid()))
    and exists (
      select 1 from public.conversation_members m
      where m.conversation_id = messages.conversation_id
        and m.user_id = (select auth.uid())
        and messages.created_at >= m.joined_at
        and (m.left_at is null or messages.created_at <= m.left_at)
    )
  );

create policy "message_attachments: leitura de mensagens visíveis" on public.message_attachments
  for select to authenticated
  using (private.can_read_message(message_id));

-- Cada pessoa vê os próprios recibos; o remetente vê os de todos.
create policy "message_receipts: leitura pelo dono ou remetente" on public.message_receipts
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_message_sender(message_id));

create policy "message_reactions: leitura de mensagens visíveis" on public.message_reactions
  for select to authenticated
  using (private.can_read_message(message_id));

create policy "message_mentions: leitura de mensagens visíveis" on public.message_mentions
  for select to authenticated
  using (private.can_read_message(message_id));

create policy "message_deletions: leitura das próprias" on public.message_deletions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "message_deletions: criação das próprias" on public.message_deletions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_read_message(message_id));

revoke update, delete on public.message_deletions from authenticated;

create policy "starred_messages: leitura das próprias" on public.starred_messages
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "starred_messages: criação das próprias" on public.starred_messages
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_read_message(message_id));

create policy "starred_messages: remoção das próprias" on public.starred_messages
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke update on public.starred_messages from authenticated;

create policy "pinned_messages: leitura por participantes" on public.pinned_messages
  for select to authenticated
  using (private.is_member(conversation_id));

create policy "polls: leitura de mensagens visíveis" on public.polls
  for select to authenticated
  using (private.can_read_message(message_id));

create policy "poll_options: leitura de mensagens visíveis" on public.poll_options
  for select to authenticated
  using (private.can_read_message(message_id));

create policy "poll_votes: leitura de mensagens visíveis" on public.poll_votes
  for select to authenticated
  using (private.can_read_message(message_id));

create policy "link_previews: leitura para usuários autenticados" on public.link_previews
  for select to authenticated
  using ((select auth.uid()) is not null);

create policy "reports: leitura das próprias" on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()));

create policy "reports: criação das próprias" on public.reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()));

revoke update, delete on public.reports from authenticated;
