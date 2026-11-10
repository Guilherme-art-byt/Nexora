import { t } from '@/i18n';
import { getSupabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';
import type { ProfileFormValues } from './schemas';

export type Profile = Tables<'profiles'>;

export class UsernameTakenError extends Error {
  constructor() {
    super(t.profile.validation.usernameTaken);
  }
}

const UNIQUE_VIOLATION = '23505';
const AVATAR_BUCKET = 'avatars';
const AVATAR_URL_TTL_SECONDS = 60 * 60;

export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('is_username_available', {
    p_username: username,
  });
  if (error) throw error;
  return data;
}

type ProfileInput = ProfileFormValues & { avatarPath: string | null };

export async function createProfile(userId: string, input: ProfileInput): Promise<Profile> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .insert({
      id: userId,
      username: input.username,
      display_name: input.displayName,
      about: input.about,
      avatar_path: input.avatarPath,
    })
    .select()
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new UsernameTakenError();
    throw error;
  }
  return data;
}

export async function updateProfile(userId: string, input: ProfileInput): Promise<Profile> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .update({
      username: input.username,
      display_name: input.displayName,
      about: input.about,
      avatar_path: input.avatarPath,
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new UsernameTakenError();
    throw error;
  }
  return data;
}

/** Envia a foto já recortada e devolve o caminho no bucket privado. */
export async function uploadAvatar(userId: string, image: Blob): Promise<string> {
  const extension = image.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await getSupabase()
    .storage.from(AVATAR_BUCKET)
    .upload(path, image, { contentType: image.type, cacheControl: '31536000' });
  if (error) throw error;
  return path;
}

export async function deleteAvatarFile(path: string): Promise<void> {
  const { error } = await getSupabase().storage.from(AVATAR_BUCKET).remove([path]);
  if (error) throw error;
}

export async function createAvatarUrl(path: string): Promise<string> {
  const { data, error } = await getSupabase()
    .storage.from(AVATAR_BUCKET)
    .createSignedUrl(path, AVATAR_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

export const AVATAR_URL_STALE_MS = (AVATAR_URL_TTL_SECONDS - 5 * 60) * 1000;
