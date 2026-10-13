// Run from this repository. Uses installed Chrome, no downloaded runtime or assets.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const html = fs.readFileSync('lens.html');
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const url = `http://127.0.0.1:${server.address().port}/lens.html`;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(8000);
    await page.goto(url);
    assert.equal(await page.locator('.screen').getAttribute('data-mode'), 'overview');
    assert.equal(await page.locator('.dock').evaluate(el => el.inert), true);
    await page.evaluate(() => scrollTo(0, 900));
    assert.equal(await page.evaluate(() => scrollY), 0);
    await page.getByRole('button', { name: '看看本月城事' }).tap();
    await page.waitForFunction(() => document.querySelector('.screen').dataset.mode === 'journey');
    assert.equal(await page.locator('#b-book .model').evaluate(el => el.style.transform), 'translateY(0px) scaleY(1)');
    assert.equal(await page.locator('.dock').evaluate(el => el.inert), false);

    // Angular drag previews only, then commits a snapped range on release.
    const b = await page.locator('#time-dial').boundingBox();
    const cx = b.x + b.width / 2, cy = b.y + b.width / 2, r = b.width / 2 - 20;
    await page.mouse.move(cx, cy - r);
    await page.mouse.down();
    for (let degrees = 8; degrees <= 64; degrees += 8) {
      const radians = degrees * Math.PI / 180;
      await page.mouse.move(cx + Math.sin(radians) * r, cy - Math.cos(radians) * r);
    }
    assert.equal(await page.locator('.screen').getAttribute('data-range'), 'month');
    await page.mouse.up();
    assert.equal(await page.locator('.screen').getAttribute('data-range'), 'week');
    assert.equal(await page.locator('#period').innerText(), '26.10.02 — 26.10.08');
    assert.equal(await page.locator('.screen').getAttribute('data-node'), 'spa');
    await page.getByRole('button', { name: '近半年', exact: true }).tap();
    assert.equal(await page.locator('.screen').getAttribute('data-node'), 'spa');
    await page.getByRole('button', { name: '近一个月', exact: true }).tap();
    await page.getByRole('button', { name: '看全貌' }).tap();
    await page.waitForFunction(() => +document.querySelector('.screen').dataset.progress > .999);
    assert.match(await page.locator('#benefit').innerText(), /4 次 · 实际节省 ¥23/);
    await page.getByRole('button', { name: '近半年', exact: true }).tap();
    assert.match(await page.locator('#benefit').innerText(), /11 次 · 实际节省 ¥70/);
    await page.getByRole('button', { name: '近一周', exact: true }).tap();
    assert.match(await page.locator('#benefit').innerText(), /1 次 · 实际节省 ¥10/);

    // Fresh page for a real browser touch gesture, not a synthesized scroll handler.
    await page.reload();
    await page.getByRole('button', { name: '看看本月城事' }).tap();
    await page.waitForFunction(() => document.querySelector('.screen').dataset.mode === 'journey');
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 185, y: 545 }] });
    for (let y = 515; y >= 245; y -= 30) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 185, y }] });
      await page.waitForTimeout(24);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(() => +document.querySelector('.screen').dataset.progress > .02);
    await page.evaluate(() => scrollTo({ top: (document.querySelector('.track').offsetHeight - document.querySelector('.screen').offsetHeight) * .4, behavior: 'instant' }));
    await page.waitForFunction(() => Math.abs(+document.querySelector('.screen').dataset.progress - .4) < .003);
    await page.getByRole('button', { name: '近一周', exact: true }).tap();
    assert.equal(await page.locator('.screen').getAttribute('data-node'), 'coffee');
    assert.match(await page.locator('#stat').innerText(), /1 次/);
    await page.locator('#time-dial').focus();
    await page.keyboard.press('End');
    assert.equal(await page.locator('.screen').getAttribute('data-range'), 'half');

    await page.setViewportSize({ width: 320, height: 568 });
    await page.reload();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.getByRole('button', { name: '看看本月城事' }).tap();
    await page.waitForFunction(() => document.querySelector('.screen').dataset.mode === 'journey');
    const layout = await page.evaluate(() => ({ text: document.querySelector('.detail-label').getBoundingClientRect().bottom, dock: document.querySelector('.dock').getBoundingClientRect().top }));
    assert.ok(layout.text < layout.dock, 'Details must not sit underneath the wheel');

    const quiet = await browser.newContext({ viewport: { width: 375, height: 667 }, reducedMotion: 'reduce' });
    const q = await quiet.newPage();
    await q.goto(url);
    await q.getByRole('button', { name: '看看本月城事' }).click();
    await q.waitForFunction(() => document.querySelector('.screen').dataset.mode === 'journey');
    await q.getByRole('button', { name: '看全貌' }).click();
    assert.equal(await q.locator('.screen').getAttribute('data-progress'), '1.0000');
    assert.deepEqual(errors, []);
    console.log('PASS: overview, entry continuity, arc wheel, all range totals, preserved node, touch scroll, keyboard, small screen, reduced motion, no browser errors.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
