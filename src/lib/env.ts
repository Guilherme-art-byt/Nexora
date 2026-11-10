import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

// As variáveis NEXT_PUBLIC_* precisam ser lidas por nome literal para entrarem no bundle.
const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

if (!parsed.success) {
  throw new Error(
    `Variáveis de ambiente ausentes ou inválidas (veja .env.example): ${parsed.error.issues
      .map((issue) => issue.path.join('.'))
      .join(', ')}`,
  );
}

export const env = parsed.data;
