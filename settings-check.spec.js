const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const accessCode = JSON.parse(fs.readFileSync(path.join(__dirname, 'private-config.json'), 'utf8')).accessCode;
test.use({ launchOptions: { channel: 'msedge' } });

test('settings persist after reopen and reload', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await page.locator('#loginName').fill('小夏');
  await page.locator('#loginCode').fill(accessCode);
  await page.locator('#loginForm button[type="submit"]').click();
  await expect(page.locator('#authScreen')).toBeHidden();

  await page.locator('#openSettings').click();
  await page.locator('#girlName').fill('测试女孩');
  await page.locator('#settingsClassTime').fill('18:30');
  await page.locator('#settingsForm button[type="submit"]').click();
  await expect(page.locator('#stationName')).toHaveText('测试女孩');

  await page.locator('#openSettings').click();
  await expect(page.locator('#girlName')).toHaveValue('测试女孩');
  await expect(page.locator('#settingsClassTime')).toHaveValue('18:30');
  await page.locator('#settingsDialog .icon-button').click();

  await page.reload({ waitUntil: 'domcontentloaded' }); await expect(page.locator('#authScreen')).toBeHidden();
  await page.locator('#openSettings').click();
  await expect(page.locator('#girlName')).toHaveValue('测试女孩');
  await expect(page.locator('#settingsClassTime')).toHaveValue('18:30');
});

