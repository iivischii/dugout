import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [360, 390, 1366]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    await context.addInitScript(() => {
      localStorage.setItem('dugout-career-v1', JSON.stringify({ managerName: 'Mobile Manager', matches: [] }));
      localStorage.setItem('dugout-settings-v1', JSON.stringify({ autoPlay: false, timedDecisions: false }));
      Math.random = () => .8;
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.DUGOUT_TEST_URL || 'http://127.0.0.1:5174');
    await page.getByRole('button', { name: 'Continue Career', exact: true }).click();
    await page.getByRole('button', { name: 'Choose Starting XI', exact: true }).click();
    await page.getByRole('button', { name: 'Start Match', exact: true }).click();
    assert.ok(await page.locator('.manager-bar').innerText().then(text => text.includes('Mobile Manager')));
    assert.equal(await page.locator('.ticket-match-bench .bench-player').count(), 0);
    if (width < 851) {
      assert.equal(await page.locator('.main-content').isVisible(), false);
      await page.getByRole('button', { name: 'Pitch', exact: true }).click();
      assert.equal(await page.locator('.pitch').isVisible(), true);
      await page.getByRole('button', { name: /^Live feed/ }).click();
      assert.ok(await page.locator('.match-feed').evaluate(el => el.clientHeight) > 150);
    }
    await page.getByRole('button', { name: 'Give instructions', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.locator('.match-dialog .choice-button').count(), 3);
    await page.locator('.match-dialog .choice-button').first().click();
    await page.getByRole('button', { name: /Make substitution/ }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Close substitutions' }).click();
    let turns = 0;
    while (await page.locator('.score-center small').innerText() !== 'FULL TIME') {
      assert.ok(++turns < 70);
      if (await page.getByRole('button', { name: 'Start second half', exact: true }).count()) await page.getByRole('button', { name: 'Start second half', exact: true }).click();
      else if (await page.locator('.match-dialog .choice-button').count()) await page.locator('.match-dialog .choice-button').last().click();
      else await page.getByRole('button', { name: 'Continue Match', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Review match', exact: true }).waitFor();
    assert.ok(await page.locator('.result-score').isVisible());
    await page.getByRole('button', { name: 'Review match', exact: true }).click();
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    console.log('Passed match UI at width ' + width);
    await context.close();
  }
} finally { await browser.close(); }
