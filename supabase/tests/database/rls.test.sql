-- Testes de segurança do banco (pgTAP). Rodar com: npm run test:db
begin;
create extension if not exists pgtap with schema extensions;

select plan(46);

-- ---------------------------------------------------------------------------
-- Preparação: três pessoas. Ana e Bruno conversam; Carla está de fora.
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@rls.test'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bruno@rls.test'),
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carla@rls.test'),
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'davi@rls.test');

insert into public.profiles (id, username, display_name, about, avatar_path) values
  ('00000000-0000-0000-0000-00000000000a', 'rls.ana', 'Ana', 'Recado da Ana', '00000000-0000-0000-0000-00000000000a/foto.webp'),
  ('00000000-0000-0000-0000-00000000000b', 'rls.bruno', 'Bruno', 'Recado do Bruno', null),
  ('00000000-0000-0000-0000-00000000000c', 'rls.carla', 'Carla', '', null);

insert into public.conversations (id, type, direct_key) values
  ('10000000-0000-0000-0000-000000000001', 'direct',
   '00000000-0000-0000-0000-00000000000a:00000000-0000-0000-0000-00000000000b');
insert into public.conversations (id, type, name) values
  ('10000000-0000-0000-0000-000000000002', 'group', 'Grupo de teste');

insert into public.conversation_members (conversation_id, user_id, role, joined_at) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'member', now() - interval '2 days'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'member', now() - interval '2 days'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'admin', now() - interval '2 days'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'member', now() - interval '2 days'),
  -- Carla entrou no grupo só agora: não pode ler o que veio antes.
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c', 'member', now());

insert into public.conversation_states (conversation_id, user_id)
select conversation_id, user_id from public.conversation_members
where conversation_id::text like '10000000-%';

insert into public.messages (id, conversation_id, sender_id, type, content, created_at, hidden_from_recipient) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'text', 'Oi, Bruno', now() - interval '1 day', false),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'text', 'Mensagem de bloqueado', now() - interval '1 hour', true),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'text', 'Antes da Carla', now() - interval '1 day', false),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'text', 'Depois da Carla', now() + interval '1 second', false);

insert into public.message_attachments (message_id, path, mime_type, size_bytes) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001/a.jpg', 'image/jpeg', 10);
insert into public.message_receipts (message_id, user_id, delivered_at) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', now());
insert into public.message_reactions (message_id, user_id, emoji) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', '👍');

insert into storage.objects (bucket_id, name, owner_id) values
  ('avatars', '00000000-0000-0000-0000-00000000000a/foto.webp', '00000000-0000-0000-0000-00000000000a'),
  ('media', '10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001/a.jpg', '00000000-0000-0000-0000-00000000000a');

create function pg_temp.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end;
$$;

create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Estrutura
-- ---------------------------------------------------------------------------
select is(
  (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity),
  0::bigint,
  'toda tabela pública tem RLS ligada'
);

select is(
  (select count(*) from pg_tables t where schemaname = 'public'
    and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename)
    and t.tablename <> 'rate_limits'),
  0::bigint,
  'toda tabela pública (exceto rate_limits, só do servidor) tem ao menos uma política'
);

select is(
  (select count(*) from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon'),
  0::bigint,
  'visitante anônimo não tem privilégio em nenhuma tabela'
);

select is(
  (select count(*) from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'authenticated' and privilege_type = 'TRUNCATE'),
  0::bigint,
  'usuário autenticado não pode usar TRUNCATE'
);

select is(
  (select count(*) from pg_policies where schemaname in ('public', 'storage') and (qual = 'true' or with_check = 'true')),
  0::bigint,
  'nenhuma política libera tudo (using true)'
);

select is(
  (select count(*) from storage.buckets where public),
  0::bigint,
  'nenhum bucket é público'
);

-- ---------------------------------------------------------------------------
-- Perfis e configurações
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000000c');

select is((select count(*) from public.profiles), 1::bigint, 'Carla lê só o próprio perfil direto na tabela');
select is((select count(*) from public.user_settings), 1::bigint, 'Carla lê só as próprias configurações');

select is(
  (select about from public.get_profiles(array['00000000-0000-0000-0000-00000000000a']::uuid[])),
  'Recado da Ana',
  'get_profiles mostra o recado quando a privacidade é "todos"'
);

update public.profiles set display_name = 'Invadido' where id = '00000000-0000-0000-0000-00000000000a';
update public.user_settings set theme = 'light' where user_id = '00000000-0000-0000-0000-00000000000a';

select pg_temp.logout();
select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'Ana',
  'Carla não consegue editar o perfil da Ana'
);
select is(
  (select theme from public.user_settings where user_id = '00000000-0000-0000-0000-00000000000a'),
  'dark',
  'Carla não consegue editar as configurações da Ana'
);

select pg_temp.login('00000000-0000-0000-0000-00000000000d');
select throws_ok(
  $$insert into public.profiles (id, username, display_name) values ('00000000-0000-0000-0000-00000000000c', 'rls.falso', 'Falso')$$,
  '42501', null,
  'não é possível criar perfil em nome de outra pessoa'
);
select throws_ok(
  $$insert into public.profiles (id, username, display_name, avatar_path) values ('00000000-0000-0000-0000-00000000000d', 'rls.davi', 'Davi', '00000000-0000-0000-0000-00000000000a/foto.webp')$$,
  '42501', null,
  'não é possível apontar a foto para a pasta de outra pessoa'
);
select lives_ok(
  $$insert into public.profiles (id, username, display_name) values ('00000000-0000-0000-0000-00000000000d', 'rls.davi', 'Davi')$$,
  'cada pessoa cria o próprio perfil'
);
select is((select count(*) from public.user_settings), 1::bigint, 'configurações são criadas junto com o perfil');
select throws_ok(
  $$update public.profiles set invite_code = 'x' where id = '00000000-0000-0000-0000-00000000000d'$$,
  '42501', null,
  'o código de convite não é editável pelo cliente'
);
select is(public.is_username_available('rls.ana'), false, 'nome de usuário em uso é informado como indisponível');
select is(public.is_username_available('rls.livre'), true, 'nome de usuário livre é informado como disponível');

-- Privacidade: Ana esconde recado e foto de quem não é contato.
select pg_temp.logout();
update public.user_settings set privacy_about = 'contacts', privacy_avatar = 'contacts', privacy_last_seen = 'contacts'
  where user_id = '00000000-0000-0000-0000-00000000000a';
insert into public.contacts (owner_id, contact_id) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');

select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select is(
  (select about from public.get_profiles(array['00000000-0000-0000-0000-00000000000a']::uuid[])),
  null,
  'recado fica oculto para quem não é contato'
);
select is(
  (select avatar_path from public.get_profiles(array['00000000-0000-0000-0000-00000000000a']::uuid[])),
  null,
  'foto fica oculta para quem não é contato'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'avatars' and name like '00000000-0000-0000-0000-00000000000a/%'),
  0::bigint,
  'arquivo da foto não é acessível para quem não é contato'
);
select is(
  (select count(*) from public.user_presence where user_id = '00000000-0000-0000-0000-00000000000a'),
  0::bigint,
  'visto por último fica oculto para quem não é contato'
);

select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select is(
  (select about from public.get_profiles(array['00000000-0000-0000-0000-00000000000a']::uuid[])),
  'Recado da Ana',
  'contato vê o recado'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'avatars' and name like '00000000-0000-0000-0000-00000000000a/%'),
  1::bigint,
  'contato acessa o arquivo da foto'
);
select is(
  (select count(*) from public.user_presence where user_id = '00000000-0000-0000-0000-00000000000a'),
  1::bigint,
  'contato vê o visto por último'
);

-- Bloqueio vale mais que ser contato.
select pg_temp.logout();
insert into public.blocks (blocker_id, blocked_id) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select is(
  (select avatar_path from public.get_profiles(array['00000000-0000-0000-0000-00000000000a']::uuid[])),
  null,
  'bloqueado não vê a foto de quem o bloqueou'
);
select is((select count(*) from public.blocks), 0::bigint, 'bloqueado não descobre que foi bloqueado');
select pg_temp.logout();
delete from public.blocks;

-- ---------------------------------------------------------------------------
-- Conversas e mensagens
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000000c');

select is(
  (select count(*) from public.conversations where id = '10000000-0000-0000-0000-000000000001'),
  0::bigint,
  'quem está de fora não vê a conversa'
);
select is(
  (select count(*) from public.conversation_members where conversation_id = '10000000-0000-0000-0000-000000000001'),
  0::bigint,
  'quem está de fora não vê os participantes'
);
select is(
  (select count(*) from public.messages where conversation_id = '10000000-0000-0000-0000-000000000001'),
  0::bigint,
  'quem está de fora não lê as mensagens'
);
select is((select count(*) from public.message_attachments), 0::bigint, 'quem está de fora não vê anexos');
select is((select count(*) from public.message_receipts), 0::bigint, 'quem está de fora não vê recibos');
select is((select count(*) from public.message_reactions), 0::bigint, 'quem está de fora não vê reações');
select is(
  (select count(*) from storage.objects where bucket_id = 'media' and name like '10000000-%'),
  0::bigint,
  'quem está de fora não acessa os arquivos da conversa'
);
select is(
  (select array_agg(content) from public.messages where conversation_id = '10000000-0000-0000-0000-000000000002'),
  array['Depois da Carla'],
  'quem entra no grupo não lê o que foi enviado antes'
);
select is((select count(*) from public.conversation_states), 1::bigint, 'estado pessoal da conversa é só do dono');
select throws_ok(
  $$insert into public.messages (id, conversation_id, sender_id, type, content) values (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'text', 'intruso')$$,
  '42501', null,
  'ninguém insere mensagem direto na tabela'
);
select throws_ok(
  $$insert into public.conversation_members (conversation_id, user_id) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c')$$,
  '42501', null,
  'ninguém se adiciona a uma conversa direto na tabela'
);
select throws_ok(
  $$update public.conversation_states set unread_count = 0$$,
  '42501', null,
  'contadores são mantidos só pelo servidor'
);
select throws_ok(
  $$insert into public.starred_messages (user_id, message_id) values ('00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000001')$$,
  '42501', null,
  'não é possível favoritar mensagem que não se pode ler'
);

select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select is(
  (select array_agg(content order by created_at) from public.messages where conversation_id = '10000000-0000-0000-0000-000000000001'),
  array['Oi, Bruno'],
  'quem bloqueou não lê a mensagem enviada pelo bloqueado'
);
select is(
  (select count(*) from public.message_receipts),
  1::bigint,
  'remetente vê os recibos da própria mensagem'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'media' and name like '10000000-%'),
  1::bigint,
  'participante acessa os arquivos da conversa'
);

select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select is(
  (select count(*) from public.messages where conversation_id = '10000000-0000-0000-0000-000000000001'),
  2::bigint,
  'o bloqueado continua vendo a própria mensagem'
);

-- Limite de conversas fixadas (3).
select pg_temp.logout();
insert into public.conversations (id, type, name) values
  ('10000000-0000-0000-0000-000000000003', 'group', 'G3'),
  ('10000000-0000-0000-0000-000000000004', 'group', 'G4');
insert into public.conversation_states (conversation_id, user_id) values
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000a');
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select lives_ok(
  $$update public.conversation_states set pinned_at = now() where conversation_id in ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003')$$,
  'é possível fixar até 3 conversas'
);
select throws_ok(
  $$update public.conversation_states set pinned_at = now() where conversation_id = '10000000-0000-0000-0000-000000000004'$$,
  'P0001', 'pin_limit_reached',
  'a quarta conversa fixada é recusada'
);

select pg_temp.logout();
select * from finish();
rollback;
