-- Buckets privados. Todo acesso é por URL assinada, autorizada pelas políticas abaixo.
--
-- Caminhos:
--   avatars/{user_id}/{arquivo}                     foto de perfil
--   avatars/group/{conversation_id}/{arquivo}       foto de grupo
--   media/{conversation_id}/{message_id}/{arquivo}  anexos de mensagens
--   status/{user_id}/{arquivo}                      mídia de atualizações
--   wallpapers/{user_id}/{arquivo}                  papéis de parede

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('media', 'media', false, 52428800, null),
  ('status', 'status', false, 52428800,
    array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']),
  ('wallpapers', 'wallpapers', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create function private.path_uuid(p_name text, p_index integer)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_part text := (storage.foldername(p_name))[p_index];
begin
  return v_part::uuid;
exception when others then
  return null;
end;
$$;

grant execute on function private.path_uuid(text, integer) to authenticated;

-- avatars ------------------------------------------------------------------

create policy "avatars: leitura conforme privacidade" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (
      private.can_view_avatar(private.path_uuid(name, 1))
      or (
        (storage.foldername(name))[1] = 'group'
        and private.was_member(private.path_uuid(name, 2))
      )
    )
  );

create policy "avatars: envio na própria pasta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and private.path_uuid(name, 1) = (select auth.uid())
  );

create policy "avatars: substituição na própria pasta" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and private.path_uuid(name, 1) = (select auth.uid()))
  with check (bucket_id = 'avatars' and private.path_uuid(name, 1) = (select auth.uid()));

create policy "avatars: remoção na própria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and private.path_uuid(name, 1) = (select auth.uid()));

-- media --------------------------------------------------------------------

create policy "media: leitura por participantes" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and private.was_member(private.path_uuid(name, 1)));

create policy "media: envio por participantes ativos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and private.is_member(private.path_uuid(name, 1))
    and owner_id = (select auth.uid())::text
  );

create policy "media: remoção pelo autor" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and owner_id = (select auth.uid())::text);

-- status -------------------------------------------------------------------

create policy "status: leitura pelo dono ou destinatários" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'status'
    and (
      private.path_uuid(name, 1) = (select auth.uid())
      or exists (
        select 1 from public.statuses s
        where s.media_path = name and private.can_view_status(s.id)
      )
    )
  );

create policy "status: envio na própria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'status' and private.path_uuid(name, 1) = (select auth.uid()));

create policy "status: remoção na própria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'status' and private.path_uuid(name, 1) = (select auth.uid()));

-- wallpapers ---------------------------------------------------------------

create policy "wallpapers: leitura na própria pasta" on storage.objects
  for select to authenticated
  using (bucket_id = 'wallpapers' and private.path_uuid(name, 1) = (select auth.uid()));

create policy "wallpapers: envio na própria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'wallpapers' and private.path_uuid(name, 1) = (select auth.uid()));

create policy "wallpapers: remoção na própria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'wallpapers' and private.path_uuid(name, 1) = (select auth.uid()));
