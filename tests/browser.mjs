// Optional integration check. Pass an installed Playwright module path as argument 2.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = process.env.DUGOUT_TEST_URL || 'http://127.0.0.1:5174';
const errors = [];
async function setup(options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { if (!localStorage.getItem("dugout-settings-v1")) localStorage.setItem("dugout-settings-v1", JSON.stringify({ autoPlay: false, timedDecisions: false })); });
  await page.goto(base);
  await page.getByRole('button', { name: 'Create Manager', exact: true }).click();
  await page.getByLabel('Manager name', { exact: true }).fill('Test Manager');
  await page.getByRole('button', { name: 'Begin Career', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Starting XI', exact: true }).click();
  return { page, context };
}
async function finishManual(page) {
  let turns = 0;
  while ((await page.locator('.score-center small').innerText()) !== 'FULL TIME') {
    assert.ok(++turns < 50);
    if (await page.getByRole('button', { name: 'Start second half', exact: true }).count()) {
      await page.getByRole('button', { name: 'Start second half', exact: true }).click();
      continue;
    }
    if (await page.locator('.choice-button').count()) await page.locator('.choice-button').first().click();
    await page.getByRole('button', { name: 'Continue Match', exact: true }).click();
  }
}
async function noHorizontalOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
}
try {
  const { page, context } = await setup({ viewport: { width: 1366, height: 768 } });
  assert.equal(await page.locator('.player-marker').count(), 11);
  assert.equal(await page.locator('.player-name').count(), 0);
  // A bench player replaces a starter, and the XI remains unique.
  await page.locator('.ticket-squad-player').filter({ hasText: 'Camavinga' }).click();
  await page.locator('.player-marker').nth(6).click();
  assert.match(await page.locator('.player-marker').nth(6).getAttribute('title'), /Camavinga/);
  assert.equal(await page.locator('.ticket-squad-player.in-xi').count(), 11);
  // Swap two starters using the ticket, then verify desktop dragging.
  await page.locator('.ticket-squad-player').filter({ hasText: 'Valverde' }).click();
  await page.locator('.player-marker').nth(3).click();
  assert.match(await page.locator('.player-marker').nth(3).getAttribute('title'), /Valverde/);
  await page.locator('.ticket-squad-player').filter({ hasText: 'Rodrygo' }).dragTo(page.locator('.player-marker').nth(9));
  assert.match(await page.locator('.player-marker').nth(9).getAttribute('title'), /Rodrygo/);
  await page.locator('#formation').selectOption('4-3-3');
  assert.equal(await page.locator('.ticket-squad-player.in-xi').count(), 11);
  // Search results must be visible without manually scrolling after typing.
  await page.locator('.player-marker').nth(10).click();
  await page.locator('#database-search').fill(' Haaland ');
  await page.locator('.database-result').first().waitFor();
  assert.equal(await page.locator('.database-result').count(), 6);
  const resultBox = await page.locator('.database-result').first().boundingBox();
  const panelBox = await page.locator('.decision-panel').boundingBox();
  assert.ok(resultBox.y >= panelBox.y && resultBox.y + resultBox.height < panelBox.y + panelBox.height);
  await page.locator('.database-result').filter({ hasText: '2022/23' }).click();
  assert.match(await page.locator('.player-marker').nth(10).getAttribute('title'), /Haaland/);
  assert.equal(await page.locator('.ticket-squad-player.in-xi').count(), 11);
  await page.locator('.player-marker').nth(10).click();
  assert.match(await page.locator('.pitch-player-card').innerText(), /2022\/23/);
  assert.match(await page.locator('.pitch-player-card').innerText(), /36 goals/);
  await page.getByRole('button', { name: 'Close player details' }).click();
  await page.locator('#database-search').fill('Haaland 2023/24');
  await page.locator('.database-result').first().click();
  assert.equal(await page.locator('.ticket-squad-player').filter({ hasText: 'Haaland' }).count(), 1);
  await page.locator('.player-marker').nth(10).click();
  assert.match(await page.locator('.pitch-player-card').innerText(), /27 goals/);
  await page.getByRole('button', { name: 'Close player details' }).click();
  await page.locator('#database-search').fill('no-such-player-123');
  await page.getByText('No matching players found.', { exact: true }).waitFor();
  await page.locator('.prematch-panel .primary-button').click();
  const benchLayout = await page.locator('.ticket-match-bench .bench-list').evaluate(el => ({
    fits: el.scrollWidth <= el.clientWidth,
    centered: getComputedStyle(el).justifyContent === 'center',
    wraps: getComputedStyle(el).flexWrap === 'wrap',
  }));
  assert.deepEqual(benchLayout, { fits: true, centered: true, wraps: true });
  await finishManual(page);
  await page.getByText('FULL TIME', { exact: true }).waitFor();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dugout-career-v1')));
  assert.equal(saved.matches.length, 1);
  assert.equal(saved.matches[0].events.at(-1).text, 'Full time!');
  const score = await page.locator('.score-center strong').innerText();
  assert.equal(score, `${saved.matches[0].goalsFor} - ${saved.matches[0].goalsAgainst}`);
  assert.equal(saved.matches[0].startingXI.length, 11);
  assert.equal(saved.matches[0].opponentXI.length, 11);
  assert.equal(saved.matches[0].matchStats.homeShots, saved.matches[0].events.filter(event => event.side === 'home' && ['shot', 'goal'].includes(event.kind)).length);
  await noHorizontalOverflow(page);
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight));
  for (const [name, title] of [['Matches', 'Match Calendar'], ['Competitions', 'Managerial Record'], ['Squad', 'Squad'], ['Settings', 'Settings']]) {
    await page.getByRole('button', { name, exact: true }).click();
    await page.getByRole('heading', { name: title, exact: true }).waitFor();
    if (name === 'Matches') {
      await page.locator('.history-row').click();
      await page.getByRole('heading', { name: 'Match timeline', exact: true }).waitFor();
    }
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  }
  await page.reload();
  await page.getByRole('button', { name: 'Continue Career', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Starting XI', exact: true }).click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('dugout-career-v1')).matches.length), 1);
  await page.getByRole('button', { name: 'Manager Profile', exact: true }).click();
  assert.match(await page.locator('.manager-profile').innerText(), /Test Manager/);
  assert.match(await page.locator('.manager-profile').innerText(), /1 completed matches/);
  assert.equal(await page.locator('.career-modal input, .career-modal select, .career-modal textarea').count(), 0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await context.close();
  console.log('Desktop: clicks, swaps, drag/drop, formations, historical search, bench, completed-match saving and sidebar passed.');

  const mobile = await setup({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobile.page.locator('.ticket-squad-player').filter({ hasText: 'Camavinga' }).tap();
  await mobile.page.locator('.player-marker').nth(6).tap();
  assert.match(await mobile.page.locator('.player-marker').nth(6).getAttribute('title'), /Camavinga/);
  await mobile.page.locator('.player-marker').nth(10).tap();
  await mobile.page.locator('#database-search').fill('Haaland');
  await mobile.page.locator('.database-result').first().tap();
  assert.match(await mobile.page.locator('.player-marker').nth(10).getAttribute('title'), /Haaland/);
  await mobile.page.locator('.prematch-panel .primary-button').tap();
  await noHorizontalOverflow(mobile.page);
  assert.ok(await mobile.page.locator('.ticket-match-bench .bench-list').evaluate(el => el.scrollWidth <= el.clientWidth));
  await mobile.context.close();
  console.log('Mobile: touch replacement, database selection, and no horizontal overflow passed.');

  const failureContext = await browser.newContext();
  const failure = await failureContext.newPage();
  await failure.route('**/data/players.csv', route => route.fulfill({ status: 404, body: 'Missing' }));
  await failure.goto(base);
  await failure.getByRole('button', { name: 'Create Manager', exact: true }).click();
  await failure.getByLabel('Manager name', { exact: true }).fill('Error Test');
  await failure.getByRole('button', { name: 'Begin Career', exact: true }).click();
  await failure.getByRole('button', { name: 'Choose Starting XI' }).click();
  await failure.getByText('Could not load the player database. Please reload to try again.', { exact: true }).waitFor();
  await failureContext.close();
  console.log('Database error state passed.');

  // Existing unnamed careers gain an identity without losing their match archive.
  const legacyContext = await browser.newContext({ viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true });
  const legacy = await legacyContext.newPage();
  legacy.on('pageerror', error => errors.push(error.message));
  await legacy.goto(base);
  await noHorizontalOverflow(legacy);
  await legacy.evaluate(() => localStorage.setItem('dugout-career-v1', JSON.stringify({ managerName: '', matches: [{
    id: 'old-match', date: '2026-10-01T00:00:00Z', opponent: 'Barcelona', result: 'W',
    goalsFor: 3, goalsAgainst: 1, formation: '4-3-3', decisions: [], events: [],
  }] })));
  await legacy.reload();
  await legacy.getByRole('button', { name: 'Create Manager', exact: true }).tap();
  await legacy.getByLabel('Manager name', { exact: true }).fill('   ');
  assert.ok(await legacy.getByRole('button', { name: 'Begin Career', exact: true }).isDisabled());
  await legacy.getByLabel('Manager name', { exact: true }).fill('Alex');
  await legacy.getByRole('button', { name: 'Begin Career', exact: true }).tap();
  await legacy.getByRole('button', { name: 'Choose Starting XI', exact: true }).tap();
  await legacy.getByRole('button', { name: 'Manager Profile', exact: true }).tap();
  assert.equal(await legacy.locator('.manager-profile input, .manager-profile select').count(), 0);
  assert.match(await legacy.locator('.manager-profile').innerText(), /Alex/);
  assert.match(await legacy.locator('.manager-profile').innerText(), /3–1/);
  const legacySave = await legacy.evaluate(() => JSON.parse(localStorage.getItem('dugout-career-v1')));
  assert.equal(legacySave.matches[0].id, 'old-match');
  assert.equal(legacySave.managerName, 'Alex');
  await noHorizontalOverflow(legacy);
  await legacy.getByRole('button', { name: 'Close', exact: true }).tap();
  await legacy.getByRole('button', { name: 'Manager Profile', exact: true }).tap();
  assert.equal(await legacy.locator('.career-modal input, .career-modal select').count(), 0);
  await legacyContext.close();
  console.log('Opening screen, manager creation, read-only profile, reload, legacy save preservation, and 320px mobile layout passed.');
  const accountContext = await browser.newContext();
  const account = await accountContext.newPage();
  account.on('pageerror', error => errors.push(error.message));
  await account.route('https://identitytoolkit.googleapis.com/**', route => route.fulfill({
    status: 400, contentType: 'application/json',
    body: JSON.stringify({ error: { code: 400, message: 'OPERATION_NOT_ALLOWED' } }),
  }));
  await account.goto(base);
  await account.getByRole('button', { name: 'Account / Cloud saves', exact: true }).click();
  await account.getByRole('heading', { name: 'Sign in', exact: true }).waitFor();
  await account.getByRole('button', { name: 'New here? Create account', exact: true }).click();
  await account.getByLabel('Email', { exact: true }).fill('browser-test@example.com');
  await account.getByLabel('Password', { exact: true }).fill('test-password-123');
  await account.getByRole('button', { name: 'Create account', exact: true }).click();
  await account.getByRole('alert').filter({ hasText: 'Enable Email/Password' }).waitFor();
  assert.equal(await account.locator('button').filter({ hasText: 'Save browser career to cloud' }).count(), 0);
  await account.getByRole('button', { name: 'Close account', exact: true }).click();
  await account.getByRole('button', { name: 'Create Manager', exact: true }).waitFor();
  await accountContext.close();
  console.log('Account form and mocked disabled-provider error passed; no real Firebase account was created.');
  const remix = await setup({ viewport: { width: 1366, height: 768 } });
  await remix.page.locator('.prematch-panel .primary-button').click();
  await remix.page.getByRole('button', { name: 'Continue Match', exact: true }).click();
  await remix.page.getByRole('button', { name: 'Match setup', exact: true }).click();
  await remix.page.locator('#opponent').selectOption('Barcelona');
  await remix.page.locator('#opponent-season').selectOption('2014/15');
  await remix.page.locator('.opponent-preview').filter({ hasText: 'Luis Suárez' }).waitFor();
  await remix.page.getByRole('button', { name: 'Choose Starting XI', exact: true }).click();
  await remix.page.locator('.prematch-panel').waitFor();
  assert.equal(await remix.page.locator('.score-center small').innerText(), "0'");
  assert.equal(await remix.page.evaluate(() => JSON.parse(localStorage.getItem('dugout-career-v1')).matches.length), 0);
  await remix.page.getByRole('button', { name: 'Clear XI', exact: true }).click();
  assert.equal(await remix.page.locator('.empty-slot').count(), 11);
  assert.ok(await remix.page.locator('.prematch-panel .primary-button').isDisabled());
  const names = ['Courtois', 'Fran García', 'Huijsen', 'Militão', 'Valverde', 'Tchouaméni', 'Bellingham', 'Vini Jr.', 'Modrić', 'Güler', 'Mbappé'];
  for (const [index, name] of names.entries()) {
    await remix.page.locator('.ticket-squad-player').filter({ hasText: name }).click();
    await remix.page.locator('.player-marker').nth(index).click();
  }
  await remix.page.locator('.player-marker').nth(8).click();
  await remix.page.locator('#database-search').fill('Zinedine Zidane');
  await remix.page.locator('.database-result').filter({ hasText: 'Historical statistics are not available' }).click();
  assert.match(await remix.page.locator('.player-marker').nth(8).getAttribute('title'), /Zinedine Zidane/);
  assert.equal(await remix.page.locator('.ticket-squad-player.in-xi').count(), 11);
  await remix.page.locator('.prematch-panel .primary-button').click();
  await finishManual(remix.page);
  const fantasySave = await remix.page.evaluate(() => JSON.parse(localStorage.getItem('dugout-career-v1')).matches[0]);
  assert.equal(fantasySave.opponent, 'Barcelona');
  assert.equal(fantasySave.opponentSeason, '2014/15');
  assert.ok(fantasySave.startingXI.some(player => player.name === 'Zinedine Zidane'));
  assert.ok(fantasySave.opponentXI.some(player => player.name === 'Lionel Messi'));
  assert.equal(fantasySave.events.filter(event => event.kind === 'goal' && event.side === 'home').length, fantasySave.goalsFor);
  assert.equal(fantasySave.events.filter(event => event.kind === 'goal' && event.side === 'away').length, fantasySave.goalsAgainst);
  await remix.context.close();
  console.log('New-match XI editing, clear/rebuild, Zidane legend disclosure, MSN historical opponent, and saved lineups passed.');
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
