const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const accessCode = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'private-config.json'), 'utf8')
).accessCode;

test.use({
  launchOptions: {
    channel: 'msedge'
  }
});

async function login(page, name) {
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await expect(page.locator('#authScreen')).toBeVisible();
  await page.locator('#loginName').fill(name);
  await page.locator('#loginCode').fill(accessCode);
  await page.locator('#loginForm button[type="submit"]').click();
  await expect(page.locator('#authScreen')).toBeHidden();
  await expect(page.locator('.hero h1')).toContainText('两个人的');
}

test('两个人登录后可以共享心愿、留言和心情', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  const errors = [];
  for (const page of [pageA, pageB]) {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      const text = message.text();
      if (message.type() === 'error' && !text.includes('401')) errors.push(text);
    });
  }

  await login(pageA, '小夏');
  await login(pageB, '阿远');

  await pageA.locator('#resetWishes').click();
  await expect(pageA.locator('#wishDone')).toHaveText('0');
  await pageA.locator('.wish-item').first().click();
  await expect(pageA.locator('#wishDone')).toHaveText('1');
  await pageB.reload({ waitUntil: 'networkidle' });
  await expect(pageB.locator('#wishDone')).toHaveText('1');

  await pageA.locator('#noteText').fill('来自小夏的共享留言，阿远也能看到。');
  await pageA.locator('#noteForm button[type="submit"]').click();
  await pageB.reload({ waitUntil: 'networkidle' });
  await expect(pageB.locator('.note-item').first()).toContainText('来自小夏的共享留言');

  await pageB.locator('#moodOptions button').nth(1).click();
  await expect(pageB.locator('#moodResult')).toContainText('元气满满');
  await pageA.reload({ waitUntil: 'networkidle' });
  await expect(pageA.locator('#partnerMood')).toContainText('阿远 今天是：元气满满');

  await pageA.locator('#ventText').fill('上课有点累，但想到下课就还好。');
  await pageA.locator('#ventForm button[type="submit"]').click();
  await pageB.reload({ waitUntil: 'networkidle' });
  await expect(pageB.locator('#ventList')).toContainText('上课有点累');

  await pageA.locator('#openCoupon').click();
  await pageA.locator('#couponTitle').fill('认真拥抱一次');
  await pageA.locator('#couponNote').fill('随时都可以兑换');
  await pageA.locator('#couponForm button[type="submit"]').click();
  await expect(pageA.locator('.coupon-card')).toContainText('认真拥抱一次');
  await pageA.locator('.coupon-card .coupon-actions button').first().click();
  await expect(pageA.locator('.coupon-card').first()).toHaveClass(/used/);

  await pageB.reload({ waitUntil: 'networkidle' });
  await expect(pageB.locator('.coupon-card').first()).toContainText('使用日志');

  await pageA.locator('#openSettings').click();
  const downloadPromise = pageA.waitForEvent('download');
  await pageA.locator('#exportData').click();
  await downloadPromise;
  await pageA.locator('#settingsDialog .icon-button').click();

  await pageA.locator('#openMemory').click();
  await pageA.locator('#memoryTitle').fill('10月22日的第一张照片');
  await pageA.locator('#memoryCaption').fill('从今天开始，把故事好好保存。');
  await pageA.locator('#memoryImage').fill('http://127.0.0.1:4173/assets/hero.jpg');
  await pageA.locator('#memoryForm button[type="submit"]').click();
  await expect(pageA.locator('#memoryGrid img')).toHaveAttribute('src', 'http://127.0.0.1:4173/assets/hero.jpg');

  await pageA.locator('#stationButton').click();
  await expect(pageA.locator('#stationDialog')).toBeVisible();
  await pageA.locator('#stationName').click();
  await expect(pageA.locator('#stationQuote')).not.toHaveText('点击屏幕，收一句今天的暖心话');

  const brokenImages = await pageA.locator('img').evaluateAll(images =>
    images.filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src)
  );
  expect(brokenImages).toEqual([]);
  expect(errors).toEqual([]);

  await contextA.close();
  await contextB.close();
});

test('第三个昵称无法进入，移动端没有横向溢出', async ({ browser }) => {
  const thirdContext = await browser.newContext();
  const thirdPage = await thirdContext.newPage();
  await thirdPage.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await thirdPage.locator('#loginName').fill('朋友');
  await thirdPage.locator('#loginCode').fill(accessCode);
  await thirdPage.locator('#loginForm button[type="submit"]').click();
  await expect(thirdPage.locator('#authError')).toContainText('两位成员');
  await thirdContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const mobilePage = await mobileContext.newPage();
  await login(mobilePage, '小夏');

  const metrics = await mobilePage.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  await expect(mobilePage.locator('.hero-actions .primary-button')).toBeVisible();
  await mobileContext.close();
});



