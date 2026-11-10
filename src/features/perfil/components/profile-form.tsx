'use client';

import { useQueryClient } from '@tanstack/react-query';
import { AtSign, Check } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { TextAreaField, TextField } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { useCurrentUser } from '@/features/auth/session';
import { t } from '@/i18n';
import {
  createProfile,
  deleteAvatarFile,
  updateProfile,
  uploadAvatar,
  UsernameTakenError,
  type Profile,
} from '../api';
import { profileKeys, useAvatarUrl, useUsernameStatus } from '../hooks';
import { ABOUT_MAX, NAME_MAX, profileFormSchema } from '../schemas';
import { AvatarPicker } from './avatar-picker';

type ProfileFormProps = {
  /** Perfil existente (edição) ou `null` (criação). */
  profile: Profile | null;
  onSaved?: (profile: Profile) => void;
};

type FieldErrors = Partial<Record<'displayName' | 'username' | 'about' | 'form', string>>;

export function ProfileForm({ profile, onSaved }: ProfileFormProps) {
  const user = useCurrentUser();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [about, setAbout] = useState(profile?.about ?? '');
  const [newAvatar, setNewAvatar] = useState<Blob | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  const savedAvatarUrl = useAvatarUrl(avatarRemoved ? null : profile?.avatar_path);
  const newAvatarUrl = useMemo(
    () => (newAvatar ? URL.createObjectURL(newAvatar) : null),
    [newAvatar],
  );
  useEffect(() => {
    return () => {
      if (newAvatarUrl) URL.revokeObjectURL(newAvatarUrl);
    };
  }, [newAvatarUrl]);

  const usernameStatus = useUsernameStatus(username, profile?.username);
  const isCreate = profile === null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const parsed = profileFormSchema.safeParse({ displayName, username, about });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'displayName' || field === 'username' || field === 'about') {
          next[field] ??= issue.message;
        }
      }
      setErrors(next);
      return;
    }
    if (usernameStatus === 'taken') {
      setErrors({ username: t.profile.validation.usernameTaken });
      return;
    }

    setErrors({});
    setSaved(false);
    setPending(true);
    let uploadedPath: string | null = null;
    try {
      const previousPath = profile?.avatar_path ?? null;
      if (newAvatar) uploadedPath = await uploadAvatar(user.id, newAvatar);
      const avatarPath = uploadedPath ?? (avatarRemoved ? null : previousPath);

      const input = { ...parsed.data, avatarPath };
      const result = isCreate
        ? await createProfile(user.id, input)
        : await updateProfile(user.id, input);

      if (previousPath && previousPath !== avatarPath) {
        // A foto antiga deixa de ser referenciada; falha na limpeza não invalida o salvamento.
        await deleteAvatarFile(previousPath).catch(() => undefined);
      }

      queryClient.setQueryData(profileKeys.mine(user.id), result);
      setNewAvatar(null);
      setAvatarRemoved(false);
      setSaved(true);
      onSaved?.(result);
    } catch (caught) {
      if (uploadedPath) await deleteAvatarFile(uploadedPath).catch(() => undefined);
      if (caught instanceof UsernameTakenError) {
        setErrors({ username: caught.message });
      } else if (newAvatar && !uploadedPath) {
        setErrors({ form: t.profile.avatar.uploadFailed });
      } else {
        setErrors({ form: t.errors.generic });
      }
    } finally {
      setPending(false);
    }
  };

  const usernameIndicator =
    usernameStatus === 'checking' ? (
      <Spinner className="size-4 text-muted" />
    ) : usernameStatus === 'available' ? (
      <Check className="size-5 text-success" aria-hidden="true" />
    ) : null;

  const usernameMessage =
    usernameStatus === 'checking'
      ? t.profile.validation.usernameChecking
      : usernameStatus === 'available'
        ? t.profile.validation.usernameAvailable
        : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <AvatarPicker
        previewUrl={newAvatarUrl ?? savedAvatarUrl}
        name={displayName}
        disabled={pending}
        onPick={(image) => {
          setNewAvatar(image);
          setAvatarRemoved(false);
          setSaved(false);
        }}
        onRemove={() => {
          setNewAvatar(null);
          setAvatarRemoved(true);
          setSaved(false);
        }}
      />
      <TextField
        label={t.profile.fields.name}
        name="displayName"
        autoComplete="name"
        placeholder={t.profile.fields.namePlaceholder}
        maxLength={NAME_MAX}
        value={displayName}
        onChange={(event) => {
          setDisplayName(event.target.value);
          setSaved(false);
        }}
        error={errors.displayName}
      />
      <TextField
        label={t.profile.fields.username}
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder={t.profile.fields.usernamePlaceholder}
        maxLength={20}
        leading={<AtSign className="size-4" aria-hidden="true" />}
        trailing={usernameIndicator}
        value={username}
        onChange={(event) => {
          setUsername(event.target.value.toLowerCase().replace(/\s/g, ''));
          setErrors((current) => ({ ...current, username: undefined }));
          setSaved(false);
        }}
        hint={t.profile.fields.usernameHint}
        error={
          errors.username ??
          (usernameStatus === 'taken' ? t.profile.validation.usernameTaken : null)
        }
        status={usernameMessage}
      />
      <TextAreaField
        label={`${t.profile.fields.about} (${t.common.optional})`}
        name="about"
        placeholder={t.profile.fields.aboutPlaceholder}
        maxLength={ABOUT_MAX}
        rows={2}
        value={about}
        onChange={(event) => {
          setAbout(event.target.value);
          setSaved(false);
        }}
        error={errors.about}
        hint={t.profile.fields.aboutCount(about.length, ABOUT_MAX)}
      />
      {errors.form ? (
        <p role="alert" className="text-sm text-danger">
          {errors.form}
        </p>
      ) : null}
      <div className="flex items-center gap-4">
        <Button type="submit" size="lg" loading={pending} className={isCreate ? 'w-full' : ''}>
          {isCreate
            ? pending
              ? t.profile.create.submitting
              : t.profile.create.submit
            : pending
              ? t.common.saving
              : t.common.save}
        </Button>
        <p aria-live="polite" className="text-sm text-success empty:hidden">
          {saved && !isCreate ? t.common.saved : null}
        </p>
      </div>
    </form>
  );
}
