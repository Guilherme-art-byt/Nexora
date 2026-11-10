-- Base: extensões, esquema interno e funções utilitárias.

create extension if not exists pg_trgm with schema extensions;

-- Funções internas ficam fora do esquema exposto pela API.
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- O app não tem acesso anônimo a dados: tudo exige sessão.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
-- TRUNCATE não passa por RLS; usuários comuns nunca precisam dele.
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;
alter default privileges for role postgres in schema private revoke execute on functions from public, anon;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Limites configuráveis sem novo deploy.
create table public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

create policy "app_config: leitura para usuários autenticados"
  on public.app_config for select to authenticated
  using ((select auth.uid()) is not null);

insert into public.app_config (key, value) values
  ('max_group_members', '256'),
  ('max_pinned_conversations', '3'),
  ('max_pinned_messages', '3'),
  ('edit_window_seconds', '900'),
  ('max_avatar_bytes', '2097152'),
  ('max_image_bytes', '16777216'),
  ('max_video_bytes', '52428800'),
  ('max_video_seconds', '180'),
  ('max_audio_bytes', '16777216'),
  ('max_document_bytes', '52428800'),
  ('max_message_length', '4096'),
  ('max_forward_targets', '5');

create function private.config_int(p_key text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (value #>> '{}')::integer from public.app_config where key = p_key;
$$;

-- Limitador de requisições (usado pelas Edge Functions). Sem políticas: só o servidor acessa.
create table public.rate_limits (
  user_id uuid not null,
  action text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  primary key (user_id, action, window_start)
);

alter table public.rate_limits enable row level security;

create function public.check_rate_limit(
  p_user_id uuid,
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.rate_limits as r (user_id, action, window_start)
  values (p_user_id, p_action, v_window)
  on conflict (user_id, action, window_start) do update set count = r.count + 1
  returning r.count into v_count;

  delete from public.rate_limits
  where user_id = p_user_id and action = p_action and window_start < v_window;

  return v_count <= p_limit;
end;
$$;

revoke execute on function public.check_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(uuid, text, integer, integer) to service_role;
