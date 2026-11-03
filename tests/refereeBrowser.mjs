import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = process.env.DUGOUT_TEST_URL || 'http://127.0.0.1:5174';
async function start(mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 768 }, isMobile: mobile, hasTouch: mobile });
  await context.addInitScript(() => {
    localStorage.setItem('dugout-career-v1', JSON.stringify({ managerName: 'Ref Test', matches: [] }));
    localStorage.setItem('dugout-settings-v1', JSON.stringify({ autoPlay: false, timedDecisions: false }));
    window.__refRolls = [];
    Math.random = () => window.__refRolls.length ? window.__refRolls.shift() : .01;
  });
  const page = await context.newPage();
  page.on('pageerror', error => { throw error; });
  await page.goto(base);
  await page.getByRole('button', { name: 'Continue Career', exact: true }).click();
  await page.getByRole('button', { name: 'Match setup', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Starting XI', exact: true }).click();
  await page.locator('.prematch-panel .primary-button').click();
  return { context, page };
}
async function roll(page, values) { await page.evaluate(values => { window.__refRolls = values; }, values); }
async function resolve(page) {
  if (await page.locator('.choice-button').count()) await page.locator('.choice-button').last().click();
}
try {
  const { context, page } = await start();
  await roll(page, [.99, 0, 0, .9, 0, 0]);
  await page.getByRole('button', { name: 'Continue Match', exact: true }).click();
  assert.equal(await page.locator('.home-player .pitch-yellow-card').count(), 1);
  await page.getByRole('button', { name: /Review a substitution for Fran/ }).click();
  assert.equal(await page.locator('#player-off').inputValue(), 'rm-20');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await roll(page, [.99, 0, 0, .9, 0, 0]);
  await page.getByRole('button', { name: 'Continue Match', exact: true }).click();
  assert.equal(await page.locator('.home-player').count(), 10);
  assert.match(await page.locator('.disciplinary-status').innerText(), /Y 2.*R 1.*10 players/);
  assert.equal(await page.locator('.home-player').filter({ hasText: 'Fran García' }).count(), 0);
  await page.locator('.substitution-button').click();
  assert.equal(await page.locator('#player-off option[value="rm-20"]').count(), 0);
  assert.equal(await page.locator('#player-on option[value="rm-20"]').count(), 0);
  await page.locator('#player-off').selectOption('rm-24');
  await page.locator('#player-on').selectOption('rm-6');
  await page.getByRole('button', { name: 'Confirm substitution', exact: true }).click();
  assert.equal(await page.locator('.home-player').count(), 10);
  let turns = 0;
  while ((await page.locator('.score-center small').innerText()) !== 'FULL TIME') {
    assert.ok(++turns < 40);
    if (await page.getByRole('button', { name: 'Start second half', exact: true }).count()) {
      await page.getByRole('button', { name: 'Start second half', exact: true }).click(); continue;
    }
    await resolve(page);
    await page.getByRole('button', { name: 'Continue Match', exact: true }).click();
  }
  const match = await page.evaluate(() => JSON.parse(localStorage.getItem('dugout-career-v1')).matches[0]);
  assert.equal(match.referee.home.yellows, 2);
  assert.equal(match.referee.home.reds, 1);
  assert.equal(match.finalXI.length, 10);
  assert.equal(match.startingXI.length, 11);
  assert.equal(match.opponentXI.length, 11);
  assert.ok(match.events.filter(event => event.side === 'home' && ['goal', 'shot'].includes(event.kind) && event.minute >= 6).every(event => event.playerId !== 'rm-20' && event.creatorId !== 'rm-20'));
  await page.getByRole('button', { name: 'Match setup', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Starting XI', exact: true }).click();
  await page.locator('.prematch-panel .primary-button').click();
  assert.equal(await page.locator('.home-player').count(), 11);
  assert.equal(await page.locator('.pitch-yellow-card').count(), 0);
  for (let red = 0; red < 5; red++) {
    await resolve(page);
    await roll(page, [.99, 0, 0, 0, 0]);
    await page.getByRole('button', { name: 'Continue Match', exact: true }).click();
  }
  assert.equal(await page.locator('.score-center small').innerText(), 'ABANDONED');
  assert.equal(await page.locator('.home-player').count(), 6);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('dugout-career-v1')).matches.length), 1);
  await context.close();
  console.log('Yellow, booked-player substitution prompt, second-yellow removal, no replacement, saved cards/XIs, reset and abandonment passed.');

  const touch = await start(true);
  // One opening goal for the home team without an opposition shot, then equal goal counts preserve the lead.
  await roll(touch.page, [0, 0, 0, 0, 0, 0, 0, 0, .99]);
  await touch.page.getByRole('button', { name: 'Continue Match', exact: true }).click();
  turns = 0;
  while (parseInt(await touch.page.locator('.score-center small').innerText(), 10) < 60 || (await touch.page.locator('.score-center small').innerText()).includes('+') || (await touch.page.locator('.score-center small').innerText()) === 'HALF TIME') {
    assert.ok(++turns < 25);
    if (await touch.page.getByRole('button', { name: 'Start second half', exact: true }).count()) {
      await touch.page.getByRole('button', { name: 'Start second half', exact: true }).click(); continue;
    }
    if ((await touch.page.locator('.score-center small').innerText()) === 'HALF TIME') continue;
    await resolve(touch.page);
    await touch.page.getByRole('button', { name: 'Continue Match', exact: true }).click();
  }
  await resolve(touch.page);
  await touch.page.getByRole('button', { name: 'Give instructions', exact: true }).tap();
  const waste = touch.page.getByRole('button', { name: /Slow the restarts and run down the clock/ });
  await waste.tap();
  await roll(touch.page, [0, .9, 0, 0, 0, 0]);
  await touch.page.getByRole('button', { name: 'Continue Match', exact: true }).click();
  assert.equal(await touch.page.locator('.feed-event.timewasting').count(), 1);
  await touch.page.getByRole('button', { name: /Review a substitution for Courtois/ }).tap();
  await touch.page.getByRole('button', { name: 'Cancel', exact: true }).tap();
  await roll(touch.page, [0, .9, 0, 0, 0, 0]);
  await touch.page.getByRole('button', { name: 'Continue Match', exact: true }).click();
  assert.equal(await touch.page.locator('.home-player').count(), 10);
  assert.equal(await touch.page.locator('.home-player.goalkeeper').count(), 1);
  assert.equal(await touch.page.locator('.feed-event.timewasting').count(), 2);
  assert.ok(await touch.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await touch.context.close();
  console.log('Mobile time-wasting choice, excessive-delay cautions, second-yellow keeper dismissal and emergency goalkeeper passed.');
} finally { await browser.close(); }
