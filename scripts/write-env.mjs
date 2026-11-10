// Gera o .env.local a partir do Supabase local em execução (npm run db:start).
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const raw = execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
});
const status = JSON.parse(raw.slice(raw.indexOf('{')));

writeFileSync(
  '.env.local',
  [
    `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}`,
    `SUPABASE_SECRET_KEY=${status.SECRET_KEY}`,
    '',
  ].join('\n'),
);
console.log('.env.local gerado para o Supabase local.');
