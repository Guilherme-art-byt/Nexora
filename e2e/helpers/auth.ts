import { expect, type Page } from '@playwright/test';
import { readLoginCode } from './mailpit';

export const seedUsers = {
  ana: { email: 'ana@nexora.test', name: 'Ana Souza', username: 'ana' },
  bruno: { email: 'bruno@nexora.test', name: 'Bruno Lima', username: 'bruno' },
  carla: { email: 'carla@nexora.test', name: 'Carla Dias', username: 'carla' },
} as const;

export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Pede o código para o e-mail e para na tela de digitação. Devolve o código recebido. */
export async function requestLoginCode(page: Page, email: string): Promise<string> {
  // Margem para diferença de relógio entre o teste e o servidor de e-mail.
  const since = new Date(Date.now() - 2_000);
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByRole('button', { name: 'Enviar código' }).click();
  await expect(page.getByRole('heading', { name: 'Digite o código' })).toBeVisible();
  return readLoginCode(email, since);
}

export async function typeCode(page: Page, code: string): Promise<void> {
  await page.getByLabel('Dígito 1 de 6').click();
  await page.keyboard.type(code);
}

/** Login completo pelo fluxo real (e-mail + código de 6 dígitos). */
export async function login(page: Page, email: string): Promise<void> {
  const code = await requestLoginCode(page, email);
  await typeCode(page, code);
  await page.waitForURL(/\/(conversas|perfil\/criar)$/);
}
