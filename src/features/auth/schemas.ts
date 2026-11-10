import { z } from 'zod';
import { t } from '@/i18n';

/**
 * Identificador de login. Hoje só e-mail; o tipo `telefone` já existe para que ligar o
 * SMS no futuro seja ativar o provedor no Supabase e liberar o campo na tela.
 */
export const emailIdentifierSchema = z.object({
  kind: z.literal('email'),
  value: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: t.auth.login.invalidEmail }).max(254)),
});

export const phoneIdentifierSchema = z.object({
  kind: z.literal('phone'),
  value: z.string().regex(/^\+[1-9]\d{7,14}$/),
});

export const authIdentifierSchema = z.discriminatedUnion('kind', [
  emailIdentifierSchema,
  phoneIdentifierSchema,
]);

export type AuthIdentifier = z.infer<typeof authIdentifierSchema>;

export const OTP_LENGTH = 6;

export const otpSchema = z
  .string()
  .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), { error: t.auth.code.incomplete });
