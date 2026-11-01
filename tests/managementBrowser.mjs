import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = process.env.DUGOUT_TEST_URL || 'http://127.0.0.1:5174';
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 768 }, isMobile: mobile, hasTouch: mobile });
    await context.addInitScript(() => {
      localStorage.setItem('dugout-career-v1', JSON.stringify({ managerName: 'Management Test', matches: [] }));
      localStorage.setItem('dugout-settings-v1', JSON.stringify({ autoPlay: false, timedDecisions: false }));
      Math.random = () => .8;
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.getByRole('button', { name: 'Continue Career', exact: true }).click();
    await page.getByRole('button', { name: 'Choose Starting XI', exact: true }).click();
    await page.locator('.prematch-panel .primary-button').click();
    const command = page.getByRole('button', { name: 'Give instructions', exact: true });
    if (mobile) await command.tap(); else await command.click();
    await page.getByText('Your attack needs a new approach', { exact: true }).waitFor();
    assert.equal(await page.locator('.choice-button').count(), 3);
    assert.ok(await command.isDisabled());
    await page.locator('.choice-button').first().click();
    assert.ok(await command.isEnabled());
    await page.getByRole('button', { name: 'Continue Match', exact: true }).click();
    assert.ok((await page.locator('.feed-event.buildup').count()) > 0);
    assert.equal(await page.getByText('Neither Real Madrid nor Barcelona creates a shot in this spell.', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Continue Match', exact: true }).click();
    assert.equal(await page.locator('.choice-button').count(), 3);
    await page.locator('.choice-button').nth(1).click();
    if (!mobile) {
      let turns = 0;
      while ((await page.locator('.score-center small').innerText()) !== 'FULL TIME') {
        assert.ok(++turns < 40);
        if (await page.getByRole('button', { name: 'Start second half', exact: true }).count()) {
          await page.getByRole('button', { name: 'Start second half', exact: true }).click(); continue;
        }
        if (await page.locator('.choice-button').count()) await page.locator('.choice-button').first().click();
        await page.getByRole('button', { name: 'Continue Match', exact: true }).click();
      }
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dugout-career-v1')).matches[0]);
      assert.equal(saved.goalsFor + saved.goalsAgainst, 0);
      assert.equal(saved.matchStats.homeShots + saved.matchStats.awayShots, 0);
      assert.ok(saved.events.filter(event => event.kind === 'buildup').length >= 20);
      assert.ok(new Set(saved.events.filter(event => event.kind === 'buildup').map(event => event.text)).size >= 6);
      assert.ok(saved.decisions.length >= 8);
      assert.ok(saved.decisions.some(decision => decision.source === 'manual' && decision.tactic === 'playmaker'));
      assert.ok(saved.decisions.some(decision => decision.source === 'automatic'));
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('Desktop/mobile instructions, proactive quiet-play prompts, varied recorded buildups, saved decision sources, and accurate zero-shot counts passed.');
} finally { await browser.close(); }
