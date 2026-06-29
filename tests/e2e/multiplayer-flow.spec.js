const { test, expect } = require('@playwright/test');

test('two players can create, join, start, and advance a turn', async ({ page, browser }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: 'http://127.0.0.1:5173',
  });
  await page.goto('/');

  await page.locator('#create-name').fill('Host');
  await page.getByRole('button', { name: 'Create room' }).click();
  await expect(page.getByText('Room created')).toBeVisible();

  const roomCode = (await page.locator('.room-code-value').textContent()).trim();
  expect(roomCode).toMatch(/^[A-Z0-9]{5}$/);
  await page.getByRole('button', { name: 'Copy room code' }).click();
  await expect(page.getByRole('button', { name: 'Copy room code' })).toHaveText('Copied');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(roomCode);

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();

  await guest.goto('/');
  await guest.locator('#join-name').fill('Guest');
  await guest.locator('#join-code').fill(roomCode);
  await guest.getByRole('button', { name: 'Join room' }).click();
  await expect(guest.getByText('Joined room')).toBeVisible();
  await expect(guest.locator('.player-list').getByText('Host', { exact: true }).first()).toBeVisible();

  await expect(page.locator('.player-list').getByText('Guest', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start game' })).toBeEnabled();
  await page.getByRole('button', { name: 'Start game' }).click();

  await expect(page.getByRole('heading', { name: 'Marketplace' })).toBeVisible();
  await expect(guest.getByRole('heading', { name: 'Marketplace' })).toBeVisible();
  await expect(page.locator('.header-turn')).toContainText('Your turn');
  await expect(page.getByText('Setup buying')).toBeVisible();
  await expect(page.getByRole('button', { name: /Roll/ })).toHaveCount(0);

  const setupTurns = [page, guest, page, guest, page, guest];
  for (const activePage of setupTurns) {
    await completeSetupPurchase(activePage);
  }

  await expect(page.locator('.header-turn')).toContainText('Your turn');
  await expect(page.getByText('Roll dice')).toBeVisible();

  await page.getByRole('button', { name: /Roll/ }).click();
  await expect(page.getByText(/Resolving/)).toBeVisible();
  await expect(guest.getByText(/Resolving/)).toBeVisible();

  await page.getByRole('button', { name: 'Resolve income' }).click();
  await expect(page.getByText('Build phase')).toBeVisible();

  await page.getByRole('button', { name: 'Skip / End turn' }).click();
  await expect(page.locator('.header-turn')).toContainText("Guest's turn");
  await expect(guest.locator('.header-turn')).toContainText('Your turn');

  await guestContext.close();
});

async function completeSetupPurchase(activePage) {
  await expect(activePage.locator('.header-turn')).toContainText('Your turn');

  const buyButton = activePage.getByRole('button', { name: 'Buy' }).first();
  const takeCoinButton = activePage.getByRole('button', { name: /Take 1 coin/ });

  for (let attempts = 0; attempts < 10; attempts++) {
    await activePage.waitForFunction(() => (
      Array.from(document.querySelectorAll('button')).some((button) => {
        const label = button.textContent.trim();
        return label === 'Buy' || label.includes('Take 1 coin');
      })
    ));

    if (await buyButton.isVisible().catch(() => false)) {
      await buyButton.click();
      return;
    }

    await expect(takeCoinButton).toBeVisible();
    await takeCoinButton.click();
  }

  await expect(buyButton).toBeVisible();
  await buyButton.click();
}
