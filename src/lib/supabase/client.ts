import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from './database.types';

export type AppSupabaseClient = SupabaseClient<Database>;

let client: AppSupabaseClient | undefined;

/** Cliente único do navegador. A sessão fica em cookies, renovados pelo proxy. */
export function getSupabase(): AppSupabaseClient {
  client ??= createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  return client;
}
