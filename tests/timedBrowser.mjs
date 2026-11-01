import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import Papa from 'papaparse';
const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = process.env.DUGOUT_TEST_URL || 'http://127.0.0.1:5174';
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.addInitScript(() => {
    if (!localStorage.getItem('dugout-settings-v1')) localStorage.setItem('dugout-settings-v1', JSON.stringify({ autoPlay: false, timedDecisions: false }));
    Math.random = () => .01;
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.getByRole('button', { name: 'Create Manager', exact: true }).click();
  await page.getByLabel('Manager name', { exact: true }).fill('Timer Manager');
  await page.getByRole('button', { name: 'Begin Career', exact: true }).click();
  await page.locator('#opponent option').filter({ hasText: 'Milan' }).first().waitFor({ state: 'attached' });
  const csv = Papa.parse(await readFile(new URL('../public/data/players.csv', import.meta.url), 'utf8'), { header: true, skipEmptyLines: true }).data;
  const clubs = [...new Set(csv.flatMap(row => row.team_title.split(',').map(name => name.trim())).filter(Boolean))].sort();
  const options = (await page.locator('#opponent option').allTextContents()).sort();
  assert.deepEqual(options, clubs);
  assert.ok(!options.some(name => name.includes('MSN')));
  console.log(`All ${clubs.length} dataset clubs appear, without MSN presets.`);
  await page.locator('#opponent').selectOption('AC Milan');
  await page.locator('#opponent-season').selectOption('2014/15');
  await page.getByRole('button', { name: 'Choose Starting XI', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Dashboard', exact: true }).count(), 0);
  const homeStriker = await page.locator('.player-marker').nth(10).getAttribute('title');
  await page.getByRole('button', { name: 'Opponent XI', exact: true }).click();
  await page.locator('#formation').selectOption('4-4-2');
  const reserve = page.locator('.ticket-squad-player:not(.in-xi)').first();
  const reserveName = await reserve.locator('.ticket-squad-name').innerText();
  await reserve.click();
  await page.locator('.player-marker').nth(5).click();
  assert.ok(reserveName.startsWith((await page.locator('.player-marker').nth(5).getAttribute('title')).split(' · ')[0]));
  await page.locator('.player-marker').nth(10).click();
  await page.locator('#database-search').fill('Haaland 2022/23');
  await page.locator('.database-result').first().click();
  assert.match(await page.locator('.player-marker').nth(10).getAttribute('title'), /Haaland/);
  await page.getByRole('button', { name: 'Your XI', exact: true }).click();
  assert.equal(await page.locator('.player-marker').nth(10).getAttribute('title'), homeStriker);
  await page.locator('.prematch-panel .primary-button').click();
  let manualSteps = 0;
  while ((await page.locator('.score-center small').innerText()) !== 'FULL TIME') {
    assert.ok(++manualSteps < 50);
    if (await page.getByRole('button', { name: 'Start second half', exact: true }).count()) {
      await page.getByRole('button', { name: 'Start second half', exact: true }).click();
      continue;
    }
    if (await page.locator('.choice-button').count()) await page.locator('.choice-button').first().click();
    await page.getByRole('button', { name: 'Continue Match', exact: true }).click();
  }
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dugout-career-v1')).matches[0]);
  assert.equal(saved.opponent, 'AC Milan');
  assert.equal(saved.opponentSeason, '2014/15');
  assert.ok(saved.opponentXI.some(player => player.name === 'Erling Haaland'));
  await page.getByRole('button', { name: 'Squad', exact: true }).click();
  await page.getByRole('heading', { name: 'Your most-used players', exact: true }).waitFor();
  assert.match(await page.locator('.career-modal').innerText(), /Erling Haaland/);
  assert.match(await page.locator('.career-modal').innerText(), /Milan/);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  console.log('Independent opponent swaps, formation, database replacement, saved opponent XI, and usage lists passed.');

  async function configureAndRestart(duration) {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.locator('#match-duration').press('Home');
    for (let value = 3; value < duration; value++) await page.locator('#match-duration').press('ArrowRight');
    await page.getByLabel('Automatic match progression', { exact: true }).check();
    await page.getByLabel('Timed tactical decisions', { exact: true }).check();
    await page.locator('#decision-duration').press('Home');
    await page.getByRole('button', { name: 'Restart match / change lineups', exact: true }).click();
    await page.getByRole('button', { name: 'Choose Starting XI', exact: true }).click();
    await page.locator('.prematch-panel .primary-button').click();
  }
  await page.clock.install({ time: new Date('2026-11-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-01T00:00:01Z'));
  await configureAndRestart(3);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.clock.runFor(6000);
  assert.equal(await page.locator('.score-center small').innerText(), "0'");
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(2500);
  assert.equal(await page.locator('.score-center small').innerText(), "1'");
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.fastForward(60000);
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.runFor(200);
  assert.equal(await page.locator('.score-center small').innerText(), "1'");
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.clock.runFor(6000);
  assert.equal(await page.locator('.score-center small').innerText(), "1'");
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  let decisionWait = 0;
  while (!(await page.locator('.choice-button').count())) {
    assert.ok(++decisionWait < 25, `decision must appear; minute=${await page.locator('.score-center small').innerText()}`);
    await page.clock.runFor(2000);
    if (decisionWait % 5 === 0) console.log('Timer at', await page.locator('.score-center small').innerText(), await page.locator('.match-timer').innerText());
  }
  assert.ok(parseInt(await page.locator('.score-center small').innerText(), 10) <= 8);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.clock.runFor(10000);
  assert.equal(await page.locator('.choice-button').count(), 3);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(6000);
  await page.getByText('Time expired: keep current instructions', { exact: true }).first().waitFor();
  let safety = 0;
  while ((await page.locator('.score-center small').innerText()) !== 'FULL TIME') {
    assert.ok(++safety < 160, 'automatic match must finish');
    if (await page.getByRole('button', { name: 'Start second half', exact: true }).count()) {
      await page.clock.runFor(15000);
      assert.equal(await page.locator('.score-center small').innerText(), 'HALF TIME');
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('dugout-career-v1')).matches.length), 1);
      await page.locator('#halftime-tactic').selectOption('protect');
      await page.getByRole('button', { name: 'Start second half', exact: true }).click();
      assert.equal(await page.locator('.score-center small').innerText(), "45'");
      continue;
    }
    await page.clock.runFor((await page.locator('.choice-button').count()) ? 6000 : 2100);
    if (safety % 15 === 0) console.log('Automatic match at', await page.locator('.score-center small').innerText());
  }
  const completed = await page.evaluate(() => JSON.parse(localStorage.getItem('dugout-career-v1')).matches);
  assert.equal(completed.length, 2);
  assert.equal(completed[0].matchRules.durationMinutes, 3);
  assert.ok(completed[0].decisions.some(choice => choice.timedOut));
  assert.ok(completed[0].addedTime.firstHalf > 0);
  assert.ok(completed[0].addedTime.secondHalf > 0);
  assert.ok(completed[0].elapsedMinutes > 90);
  assert.ok(completed[0].events.some(event => event.clockLabel?.startsWith('45+')));
  assert.ok(completed[0].events.some(event => event.clockLabel?.startsWith('90+')));
  assert.ok(completed[0].decisions.some(choice => choice.tactic === 'protect' && choice.clockLabel === 'HALF TIME'));
  assert.equal(completed[0].events.filter(event => event.side === 'home' && event.kind === 'goal').length, completed[0].goalsFor);
  console.log('3-minute automatic completion, pause/menu pause, timed decision pause/expiry, and single career save passed.');
  for (const [duration, expectedMinute] of [[5, 3], [10, 1]]) {
    await configureAndRestart(duration);
    await page.clock.runFor(10500);
    assert.equal(await page.locator('.score-center small').innerText(), `${expectedMinute}'`);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('dugout-career-v1')).matches.length), 2);
  }
  console.log('5 and 10 minute pacing, restart timer resets, and no archive entries for unfinished matches passed.');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Return to opening screen', exact: true }).click();
  await page.getByRole('button', { name: 'Continue Career', exact: true }).waitFor();
  await page.reload();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('dugout-settings-v1')).durationMinutes), 10);
  await context.close();
  const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await touchContext.addInitScript(() => {
    localStorage.setItem('dugout-settings-v1', JSON.stringify({ autoPlay: false, timedDecisions: false }));
    localStorage.setItem('dugout-career-v1', JSON.stringify({ managerName: 'Touch Manager', matches: [] }));
  });
  const touch = await touchContext.newPage();
  touch.on('pageerror', error => errors.push(error.message));
  await touch.goto(base);
  await touch.getByRole('button', { name: 'Continue Career', exact: true }).tap();
  await touch.getByRole('button', { name: 'Choose Starting XI', exact: true }).tap();
  await touch.getByRole('button', { name: 'Opponent XI', exact: true }).tap();
  await touch.locator('.player-marker').nth(10).tap();
  await touch.locator('#database-search').fill('Haaland 2023/24');
  await touch.locator('.database-result').first().tap();
  assert.match(await touch.locator('.player-marker').nth(10).getAttribute('title'), /Haaland/);
  await touch.getByRole('button', { name: 'Clear XI', exact: true }).tap();
  assert.ok(await touch.locator('.prematch-panel .primary-button').isDisabled());
  await touch.getByRole('button', { name: 'Your XI', exact: true }).tap();
  assert.equal(await touch.locator('.player-marker.empty-slot').count(), 0);
  assert.ok(await touch.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await touchContext.close();
  console.log('Mobile opponent database selection, independent clearing, kickoff validation, and no horizontal overflow passed.');
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
