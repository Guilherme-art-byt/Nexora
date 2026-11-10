import { z } from 'zod';
import { t } from '@/i18n';

export const NAME_MAX = 50;
export const ABOUT_MAX = 140;
export const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/;

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_PATTERN, { error: t.profile.validation.usernameInvalid });

export const profileFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, { error: t.profile.validation.nameRequired })
    .max(NAME_MAX, { error: t.profile.validation.nameTooLong }),
  username: usernameSchema,
  about: z.string().trim().max(ABOUT_MAX, { error: t.profile.validation.aboutTooLong }),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const AVATAR_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** Limite do arquivo original; o recorte enviado é sempre pequeno (512 px). */
export const AVATAR_SOURCE_MAX_BYTES = 10 * 1024 * 1024;
export const AVATAR_OUTPUT_SIZE = 512;
