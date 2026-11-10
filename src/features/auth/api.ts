import { isAuthApiError } from '@supabase/supabase-js';
import { t } from '@/i18n';
import { getSupabase } from '@/lib/supabase/client';
import type { AuthIdentifier } from './schemas';

/** Erro com mensagem já pronta para mostrar na tela. */
export class AuthFlowError extends Error {}

function toFlowError(error: unknown, fallback: string): AuthFlowError {
  if (isAuthApiError(error)) {
    if (error.status === 429) return new AuthFlowError(t.errors.rateLimited);
    if (error.status >= 500) return new AuthFlowError(t.errors.generic);
    return new AuthFlowError(fallback);
  }
  return new AuthFlowError(t.errors.network);
}

export async function requestCode(identifier: AuthIdentifier): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithOtp(
    identifier.kind === 'email'
      ? { email: identifier.value, options: { shouldCreateUser: true } }
      : { phone: identifier.value, options: { shouldCreateUser: true } },
  );
  if (error) throw toFlowError(error, t.errors.generic);
}

export async function verifyCode(identifier: AuthIdentifier, token: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.verifyOtp(
    identifier.kind === 'email'
      ? { email: identifier.value, token, type: 'email' }
      : { phone: identifier.value, token, type: 'sms' },
  );
  if (error) throw toFlowError(error, t.auth.code.invalid);
}

export async function signOut(): Promise<void> {
  // `local`: encerra só a sessão deste aparelho.
  const { error } = await getSupabase().auth.signOut({ scope: 'local' });
  if (error) throw toFlowError(error, t.errors.generic);
}
