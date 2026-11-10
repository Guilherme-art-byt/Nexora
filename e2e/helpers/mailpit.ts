import { expect } from '@playwright/test';

const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';

type MailpitSummary = { ID: string; Created: string };

/** Lê, na caixa de e-mails de teste do Supabase local, o código enviado após `since`. */
export async function readLoginCode(email: string, since: Date): Promise<string> {
  let code: string | null = null;

  await expect
    .poll(
      async () => {
        const search = await fetch(
          `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
        );
        const { messages } = (await search.json()) as { messages: MailpitSummary[] };
        const latest = messages.find((message) => new Date(message.Created) >= since);
        if (!latest) return null;

        const detail = await fetch(`${MAILPIT_URL}/api/v1/message/${latest.ID}`);
        const { HTML } = (await detail.json()) as { HTML: string };
        code = />\s*(\d{6})\s*</.exec(HTML)?.[1] ?? null;
        return code;
      },
      { message: `código de login para ${email}`, timeout: 15_000 },
    )
    .not.toBeNull();

  if (!code) throw new Error(`Código não encontrado para ${email}`);
  return code;
}
