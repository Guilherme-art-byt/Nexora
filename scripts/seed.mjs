// Cria 3 usuários de teste e 1 grupo. Pode rodar várias vezes sem duplicar.
//
// Local:   npm run db:seed            (usa os e-mails @nexora.test; códigos chegam no Mailpit)
// Remoto:  SEED_EMAILS="a@x.com,b@x.com,c@x.com" node --env-file=.env.local scripts/seed.mjs
//          (use e-mails reais para receber o código de login)
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY (veja .env.example).');
  process.exit(1);
}

const defaultEmails = ['ana@nexora.test', 'bruno@nexora.test', 'carla@nexora.test'];
const emails = (process.env.SEED_EMAILS?.split(',') ?? defaultEmails).map((email) =>
  email.trim().toLowerCase(),
);
if (emails.length !== 3 || emails.some((email) => !email.includes('@'))) {
  console.error('SEED_EMAILS precisa ter exatamente 3 e-mails separados por vírgula.');
  process.exit(1);
}

const people = [
  { username: 'ana', display_name: 'Ana Souza', about: 'Disponível' },
  { username: 'bruno', display_name: 'Bruno Lima', about: 'No trabalho' },
  { username: 'carla', display_name: 'Carla Dias', about: 'Só mensagens' },
].map((person, index) => ({ ...person, email: emails[index] }));

const GROUP_ID = '5eed0000-0000-4000-8000-000000000001';
const GROUP_MESSAGE_ID = '5eed0000-0000-4000-8000-000000000002';

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function fail(step, error) {
  console.error(`Falha em "${step}": ${error.message}`);
  process.exit(1);
}

async function findUserId(email) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail('listar usuários', error);
    const match = data.users.find((user) => user.email === email);
    if (match) return match.id;
    if (data.users.length < 200) return null;
  }
}

async function ensureUser(email) {
  const existing = await findUserId(email);
  if (existing) return existing;
  const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true });
  if (error) fail(`criar usuário ${email}`, error);
  return data.user.id;
}

const ids = [];
for (const person of people) {
  const id = await ensureUser(person.email);
  ids.push(id);
  const { error } = await supabase.from('profiles').upsert(
    {
      id,
      username: person.username,
      display_name: person.display_name,
      about: person.about,
    },
    { onConflict: 'id' },
  );
  if (error) fail(`perfil de ${person.email}`, error);
}

// Todos são contatos entre si.
const contacts = ids.flatMap((owner) =>
  ids.filter((other) => other !== owner).map((other) => ({ owner_id: owner, contact_id: other })),
);
{
  const { error } = await supabase
    .from('contacts')
    .upsert(contacts, { onConflict: 'owner_id,contact_id', ignoreDuplicates: true });
  if (error) fail('contatos', error);
}

// Grupo com os três; a primeira pessoa é administradora.
{
  const { error } = await supabase.from('conversations').upsert(
    {
      id: GROUP_ID,
      type: 'group',
      name: 'Equipe Nexora',
      description: 'Grupo de teste criado pelo seed.',
      created_by: ids[0],
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (error) fail('grupo', error);
}
{
  const { error } = await supabase.from('conversation_members').upsert(
    ids.map((userId, index) => ({
      conversation_id: GROUP_ID,
      user_id: userId,
      role: index === 0 ? 'admin' : 'member',
      added_by: ids[0],
    })),
    { onConflict: 'conversation_id,user_id', ignoreDuplicates: true },
  );
  if (error) fail('participantes do grupo', error);
}
{
  const { error } = await supabase.from('conversation_states').upsert(
    ids.map((userId) => ({ conversation_id: GROUP_ID, user_id: userId })),
    { onConflict: 'conversation_id,user_id', ignoreDuplicates: true },
  );
  if (error) fail('estado das conversas', error);
}
{
  const { error } = await supabase.from('messages').upsert(
    {
      id: GROUP_MESSAGE_ID,
      conversation_id: GROUP_ID,
      sender_id: ids[0],
      type: 'system',
      metadata: { event: 'group_created', name: 'Equipe Nexora' },
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (error) fail('mensagem de sistema', error);
  const { error: lastError } = await supabase
    .from('conversations')
    .update({ last_message_id: GROUP_MESSAGE_ID, last_message_at: new Date().toISOString() })
    .eq('id', GROUP_ID)
    .is('last_message_id', null);
  if (lastError) fail('última mensagem do grupo', lastError);
}
{
  const { data: active, error: readError } = await supabase
    .from('group_invites')
    .select('id')
    .eq('conversation_id', GROUP_ID)
    .is('revoked_at', null)
    .maybeSingle();
  if (readError) fail('ler convite do grupo', readError);
  if (!active) {
    const { error } = await supabase
      .from('group_invites')
      .insert({ conversation_id: GROUP_ID, created_by: ids[0] });
    if (error) fail('convite do grupo', error);
  }
}

console.log('Seed concluído. Usuários de teste:');
for (const person of people) console.log(`  @${person.username}  ${person.email}`);
console.log('Grupo: Equipe Nexora');
