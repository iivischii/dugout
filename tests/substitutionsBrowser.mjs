import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = process.env.DUGOUT_TEST_URL || 'http://127.0.0.1:5174';
async function start(options) {
  const context = await browser.newContext(options);
  await context.addInitScript(() => {
    localStorage.setItem('dugout-career-v1', JSON.stringify({ managerName: 'Sub Test', matches: [] }));
    localStorage.setItem('dugout-settings-v1', JSON.stringify({ autoPlay: false, timedDecisions: true, decisionSeconds: 20 }));
    Math.random = () => .01;
  });
  const page = await context.newPage();
  await page.goto(base);
  await page.getByRole('button', { name: 'Continue Career', exact: true }).click();
  await page.getByRole('button', { name: 'Match setup', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Starting XI', exact: true }).click();
  await page.locator('.prematch-panel .primary-button').click();
  return { page, context };
}
try {
  const { page, context } = await start({ viewport: { width: 1366, height: 768 } });
  const initialColor = await page.locator('.substitution-button').evaluate(button => getComputedStyle(button).backgroundColor);
  await page.clock.install({ time: new Date('2026-11-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-01T00:00:01Z'));
  let toDecision = 0;
  while (!(await page.locator('.choice-button').count())) { assert.ok(++toDecision < 5); await page.getByRole('button', { name: 'Continue Match', exact: true }).click(); }
  await page.clock.runFor(200);
  const deadline = await page.locator('.match-controls > .eyebrow').innerText();
  await page.locator('.substitution-button').click();
  assert.ok(await page.getByRole('button', { name: 'Confirm substitution', exact: true }).isDisabled());
  await page.clock.runFor(6000);
  assert.equal(await page.locator('.match-controls > .eyebrow').innerText(), deadline);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.match(await page.locator('.substitution-button').innerText(), /0\/5/);
  for (const off of ['rm-20', 'rm-24', 'rm-3', 'rm-8', 'rm-14']) {
    await page.locator('.substitution-button').click();
    await page.locator('#player-off').selectOption(off);
    assert.equal(await page.locator('#player-on option').filter({ has: page.locator(`[value="${off}"]`) }).count(), 0);
    await page.locator('#player-on').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Confirm substitution', exact: true }).click();
    assert.equal(await page.locator('.home-player').count(), 11);
  }
  const limited = page.locator('.substitution-button');
  assert.ok(await limited.isDisabled());
  assert.match(await limited.innerText(), /limit reached.*5\/5/i);
  assert.equal(await limited.evaluate(button => getComputedStyle(button).backgroundColor), 'rgb(69, 69, 73)');
  assert.notEqual(await limited.evaluate(button => getComputedStyle(button).backgroundColor), initialColor);
  assert.equal(await page.locator('.feed-event.substitution').count(), 5);
  assert.equal(await page.locator('.home-player').filter({ hasText: 'Camavinga' }).count(), 1);
  assert.equal(await page.locator('.home-player').filter({ hasText: 'Fran García' }).count(), 0);
  let steps = 0;
  while ((await page.locator('.score-center small').innerText()) !== 'FULL TIME') {
    assert.ok(++steps < 40);
    if (await page.getByRole('button', { name: 'Start second half', exact: true }).count()) {
      await page.getByRole('button', { name: 'Start second half', exact: true }).click();
      continue;
    }
    if (await page.locator('.choice-button').count()) await page.locator('.choice-button').first().click();
    await page.getByRole('button', { name: 'Continue Match', exact: true }).click();
  }
  const match = await page.evaluate(() => JSON.parse(localStorage.getItem('dugout-career-v1')).matches[0]);
  assert.equal(match.substitutions.length, 5);
  assert.ok(match.startingXI.some(player => player.id === 'rm-20'));
  assert.ok(!match.finalXI.some(player => player.id === 'rm-20'));
  assert.ok(match.finalXI.some(player => player.id === 'rm-6'));
  assert.equal(match.finalXI.length, 11);
  assert.equal(match.matchRules.substitutionLimit, 5);
  await page.getByRole('button', { name: 'Manager Career', exact: true }).click();
  assert.match(await page.locator('.career-modal').innerText(), /Camavinga/);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Match setup', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Starting XI', exact: true }).click();
  await page.locator('.prematch-panel .primary-button').click();
  assert.ok(await page.locator('.substitution-button').isEnabled());
  assert.match(await page.locator('.substitution-button').innerText(), /0\/5/);
  await context.close();
  console.log('Cancel, paused decision timer, five valid substitutions, grey disabled limit, active XI, preserved kickoff XI, saved changes, usage and new-match reset passed.');
  const touch = await start({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await touch.page.locator('.substitution-button').tap();
  await touch.page.locator('#player-off').selectOption('rm-20');
  await touch.page.locator('#player-on').selectOption('rm-6');
  await touch.page.getByRole('button', { name: 'Confirm substitution', exact: true }).tap();
  assert.match(await touch.page.locator('.substitution-button').innerText(), /1\/5/);
  assert.equal(await touch.page.locator('.home-player').filter({ hasText: 'Camavinga' }).count(), 1);
  assert.ok(await touch.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await touch.context.close();
  console.log('Mobile substitution flow passed.');
} finally { await browser.close(); }
