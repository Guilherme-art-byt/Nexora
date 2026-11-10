import { expect, test } from '@playwright/test';
import { login, requestLoginCode, seedUsers, typeCode, uniqueSuffix } from './helpers/auth';

test.describe('conta e perfil', () => {
  test('sem sessão, telas internas levam para as boas-vindas', async ({ page }) => {
    await page.goto('/conversas');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Boas-vindas ao NEXORA' })).toBeVisible();
  });

  test('e-mail inválido e código errado mostram erro', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Começar' }).click();
    await page.getByLabel('E-mail').fill('nao-e-email');
    await page.getByRole('button', { name: 'Enviar código' }).click();
    await expect(page.getByText('Digite um e-mail válido.')).toBeVisible();

    const email = `erro.${uniqueSuffix()}@nexora.test`;
    const code = await requestLoginCode(page, email);
    const wrong = code === '000000' ? '111111' : '000000';
    await typeCode(page, wrong);
    await expect(page.getByText('Código incorreto ou vencido.')).toBeVisible();
    await expect(page).toHaveURL('/entrar');
  });

  test('pessoa nova entra, cria perfil com foto, edita, troca o tema e sai', async ({ page }) => {
    const suffix = uniqueSuffix();
    const email = `novo.${suffix}@nexora.test`;
    const username = `novo_${suffix}`.slice(0, 20);

    await login(page, email);
    await expect(page).toHaveURL('/perfil/criar');
    await expect(page.getByRole('heading', { name: 'Crie seu perfil' })).toBeVisible();

    // Validação: nome obrigatório e nome de usuário já usado pelo seed.
    await page.getByRole('button', { name: 'Concluir' }).click();
    await expect(page.getByText('Digite seu nome.')).toBeVisible();
    await page.getByLabel('Nome de usuário').fill(seedUsers.ana.username);
    await expect(page.getByText('Esse nome de usuário já está em uso.')).toBeVisible();

    // Foto com recorte.
    const picture = await page.screenshot();
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: picture });
    const cropDialog = page.getByRole('dialog', { name: 'Ajustar foto' });
    await expect(cropDialog).toBeVisible();
    await cropDialog.getByLabel('Aproximação').fill('1.5');
    await cropDialog.getByRole('button', { name: 'Usar foto' }).click();
    await expect(cropDialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Trocar foto' })).toBeVisible();

    await page.getByLabel('Nome', { exact: true }).fill('Pessoa Nova');
    await page.getByLabel('Nome de usuário').fill(username);
    await expect(page.getByText('Nome de usuário disponível.')).toBeVisible();
    await page.getByLabel(/Recado/).fill('Testando o NEXORA');
    await page.getByRole('button', { name: 'Concluir' }).click();

    await expect(page).toHaveURL('/conversas');
    await expect(page.getByRole('heading', { name: 'Conversas', level: 1 })).toBeVisible();
    await expect(page.getByText('Nenhuma conversa ainda')).toBeVisible();

    // Sessão persiste ao recarregar.
    await page.reload();
    await expect(page).toHaveURL('/conversas');

    // Navegação entre as quatro seções.
    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    await nav.getByRole('link', { name: 'Atualizações' }).click();
    await expect(page.getByRole('heading', { name: 'Atualizações', level: 1 })).toBeVisible();
    await nav.getByRole('link', { name: 'Chamadas' }).click();
    await expect(page.getByRole('heading', { name: 'Chamadas', level: 1 })).toBeVisible();
    await nav.getByRole('link', { name: 'Configurações' }).click();
    await expect(page.getByRole('heading', { name: 'Configurações', level: 1 })).toBeVisible();

    // Perfil salvo, com foto.
    await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Pessoa Nova');
    await expect(page.getByLabel('Nome de usuário')).toHaveValue(username);
    await expect(page.getByRole('img', { name: 'Foto de Pessoa Nova' })).toHaveJSProperty(
      'complete',
      true,
    );
    await expect(page.getByText(email)).toBeVisible();

    // Edição do perfil.
    await page.getByLabel('Nome', { exact: true }).fill('Pessoa Editada');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Alterações salvas')).toBeVisible();

    // Tema claro: aplica na hora e continua após recarregar.
    await page.getByRole('radio', { name: 'Claro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('radio', { name: 'Claro' })).toBeChecked();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Pessoa Editada');
    await expect(page.getByRole('radio', { name: 'Claro' })).toBeChecked();

    // Sair.
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL('/');
    await page.goto('/configuracoes');
    await expect(page).toHaveURL('/');
  });

  test('pessoa com perfil entra direto nas conversas', async ({ page }) => {
    await login(page, seedUsers.bruno.email);
    await expect(page).toHaveURL('/conversas');
    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Configurações' })
      .click();
    await expect(page.getByLabel('Nome', { exact: true })).toHaveValue(seedUsers.bruno.name);
  });

  test('duas pessoas ao mesmo tempo veem cada uma o próprio perfil', async ({ browser }) => {
    const anaContext = await browser.newContext();
    const carlaContext = await browser.newContext();
    const ana = await anaContext.newPage();
    const carla = await carlaContext.newPage();

    await Promise.all([login(ana, seedUsers.ana.email), login(carla, seedUsers.carla.email)]);
    await Promise.all([ana.goto('/configuracoes'), carla.goto('/configuracoes')]);

    await expect(ana.getByLabel('Nome de usuário')).toHaveValue(seedUsers.ana.username);
    await expect(carla.getByLabel('Nome de usuário')).toHaveValue(seedUsers.carla.username);
    await expect(ana.getByText(seedUsers.ana.email)).toBeVisible();
    await expect(carla.getByText(seedUsers.carla.email)).toBeVisible();

    await anaContext.close();
    await carlaContext.close();
  });
});
