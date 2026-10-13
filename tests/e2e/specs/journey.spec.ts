import { expect, test, type Page } from '@playwright/test';
import postgres from 'postgres';
import { ADMIN_E2E_URL } from '../src/config';

const OTP = '123456';

/** Numéro mobile sénégalais unique par test (77 + 7 chiffres). */
function uniquePhone(): { local: string; e164: string; display: string } {
  const n = String(Math.floor(Math.random() * 9_000_000) + 1_000_000);
  return { local: `77${n}`, e164: `+22177${n}`, display: `77 ${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5)}` };
}

async function login(page: Page, phone: { local: string }) {
  await page.getByLabel('Numéro de téléphone').fill(phone.local);
  await page.getByRole('button', { name: 'Recevoir le code' }).click();
  await page.getByLabel('Code à 6 chiffres').fill(OTP);
  await page.getByRole('button', { name: 'Valider' }).click();
}

test('un nouveau gérant crée sa quincaillerie, se déconnecte et se reconnecte', async ({ page }) => {
  const phone = uniquePhone();
  const requested: string[] = [];
  page.on('request', (r) => requested.push(r.url()));

  // 1. Sans session : redirection vers la connexion, page non indexée.
  await page.goto('/');
  await expect(page).toHaveURL(/\/connexion$/);
  // Toutes les balises robots présentes (Next peut en laisser deux après une redirection côté client) sont en noindex.
  const robots = await page.locator('head meta[name="robots"]').evaluateAll((els) => els.map((e) => e.getAttribute('content')));
  expect(robots.length).toBeGreaterThan(0);
  expect(robots.every((c) => c?.includes('noindex'))).toBe(true);
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();

  // 2. Connexion par téléphone + code, puis inscription.
  await login(page, phone);
  await expect(page).toHaveURL(/\/inscription$/);
  await page.getByLabel('Nom de la quincaillerie').fill('Quincaillerie Ndiaye');
  await page.getByLabel(/Votre nom/).fill('Moussa Ndiaye');
  await page.getByRole('button', { name: 'Créer ma quincaillerie' }).click();

  // 3. Espace gérant.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Quincaillerie Ndiaye' })).toBeVisible();
  await expect(page.getByText('Votre rôle : Propriétaire')).toBeVisible();

  // Les données sont bien dans la vraie base, avec l'audit.
  const db = postgres(ADMIN_E2E_URL, { max: 1, onnotice: () => {} });
  try {
    const rows = await db`
      SELECT t.name, m.role, (SELECT count(*)::int FROM audit_logs a WHERE a.tenant_id = t.id AND a.action = 'tenant.created') AS audits
      FROM tenants t JOIN memberships m ON m.tenant_id = t.id JOIN users u ON u.id = m.user_id WHERE u.phone = ${phone.e164}`;
    expect(rows).toEqual([{ name: 'Quincaillerie Ndiaye', role: 'owner', audits: 1 }]);
  } finally {
    await db.end();
  }

  // 4. Déconnexion, puis reconnexion : pas de nouvelle inscription.
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/connexion$/);
  await page.goto('/');
  await expect(page).toHaveURL(/\/connexion$/);
  await login(page, phone);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Quincaillerie Ndiaye' })).toBeVisible();

  // La session survit à un rechargement.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Quincaillerie Ndiaye' })).toBeVisible();

  // Règle S1 : le navigateur ne lit jamais les tables via l'API de données Supabase, et n'a aucune clé service_role.
  expect(requested.filter((u) => u.includes('/rest/v1/'))).toEqual([]);
  expect(requested.join('\n')).not.toMatch(/service_role/i);
});

test('un code incorrect est refusé puis le bon code fonctionne', async ({ page }) => {
  const phone = uniquePhone();
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill(phone.display);
  await page.getByRole('button', { name: 'Recevoir le code' }).click();
  await expect(page.getByText(`Code envoyé au ${phone.display}.`)).toBeVisible();
  await page.getByLabel('Code à 6 chiffres').fill('000000');
  await page.getByRole('button', { name: 'Valider' }).click();
  await expect(page.locator('main [role="alert"]')).toContainText('Code incorrect ou expiré');
  await page.getByLabel('Code à 6 chiffres').fill(OTP);
  await page.getByRole('button', { name: 'Valider' }).click();
  await expect(page).toHaveURL(/\/inscription$/);
});

test('un numéro invalide est signalé sans quitter la page', async ({ page }) => {
  await page.goto('/connexion');
  await page.getByLabel('Numéro de téléphone').fill('12 34');
  await page.getByRole('button', { name: 'Recevoir le code' }).click();
  await expect(page.getByText('Ce numéro n’est pas valide. Vérifiez-le.')).toBeVisible();
  await expect(page).toHaveURL(/\/connexion$/);
});

test('les pages privées répondent hors ligne avec un message clair', async ({ page, context }) => {
  const phone = uniquePhone();
  await page.goto('/connexion');
  await login(page, phone);
  await expect(page).toHaveURL(/\/inscription$/);
  await context.setOffline(true);
  await page.getByLabel('Nom de la quincaillerie').fill('Boutique hors ligne');
  await page.getByRole('button', { name: 'Créer ma quincaillerie' }).click();
  await expect(page.locator('main [role="alert"]')).toContainText('hors ligne');
  await context.setOffline(false);
});

test('Google : numéro vérifié obligatoire avant de créer la quincaillerie', async ({ page }) => {
  const phone = uniquePhone();
  await page.goto('/connexion');
  await page.getByRole('button', { name: 'Continuer avec Google' }).click();

  // Retour de Google : session sans numéro → écran de vérification, jamais l'inscription.
  await expect(page).toHaveURL(/\/telephone$/);
  await page.goto('/inscription');
  await expect(page).toHaveURL(/\/telephone$/);

  // Une création directe via l'API est refusée tant que le numéro n'est pas vérifié.
  const token = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'));
    return key ? (JSON.parse(localStorage.getItem(key)!) as { access_token: string }).access_token : null;
  });
  const refused = await page.request.post('http://localhost:3101/tenants', {
    headers: { authorization: `Bearer ${token}` },
    data: { name: 'Sans numéro' },
  });
  expect(refused.status()).toBe(400);
  expect((await refused.json()) as { error: { code: string } }).toMatchObject({ error: { code: 'PHONE_REQUIRED' } });

  // Numéro + code → inscription → espace gérant.
  await page.getByLabel('Numéro de téléphone').fill(phone.local);
  await page.getByRole('button', { name: 'Recevoir le code' }).click();
  await page.getByLabel('Code à 6 chiffres').fill(OTP);
  await page.getByRole('button', { name: 'Valider' }).click();
  await expect(page).toHaveURL(/\/inscription$/);
  await page.getByLabel('Nom de la quincaillerie').fill('Quincaillerie Google');
  await page.getByRole('button', { name: 'Créer ma quincaillerie' }).click();
  await expect(page.getByRole('heading', { name: 'Quincaillerie Google' })).toBeVisible();

  const db = postgres(ADMIN_E2E_URL, { max: 1, onnotice: () => {} });
  try {
    const rows = await db`SELECT u.phone FROM users u JOIN memberships m ON m.user_id = u.id WHERE u.phone = ${phone.e164}`;
    expect(rows).toHaveLength(1);
  } finally {
    await db.end();
  }
});

test('Google : un numéro déjà utilisé par un compte téléphone est refusé avec un message clair', async ({ page, browser }) => {
  const phone = uniquePhone();
  // Compte téléphone existant, dans un autre navigateur.
  const other = await browser.newContext();
  const existing = await other.newPage();
  await existing.goto('http://localhost:3100/connexion');
  await login(existing, phone);
  await expect(existing).toHaveURL(/\/inscription$/);
  await other.close();

  await page.goto('/connexion');
  await page.getByRole('button', { name: 'Continuer avec Google' }).click();
  await expect(page).toHaveURL(/\/telephone$/);
  await page.getByLabel('Numéro de téléphone').fill(phone.local);
  await page.getByRole('button', { name: 'Recevoir le code' }).click();
  await expect(page.locator('main [role="alert"]')).toContainText('déjà utilisé par un autre compte');
  await expect(page).toHaveURL(/\/telephone$/);
});
