'use strict';

const { test, expect } = require('@playwright/test');

const { createPool } = require('../../db/pool');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { E2E_SCHEMA } = require('../support/env');
const { hold } = require('../support/hold');
const { mySectionIds } = require('../support/enrolment-screen');
const { gate, isGet, isWrite } = require('../support/gate');
const { csv, chooseFile, uploading } = require('../support/import-panel');
const {
  API,
  openScores,
  activityPicker,
  chooseActivity,
  setMode,
  setEntry,
  gridHeading,
} = require('../support/scores-screen');
const { openUsers, userRow } = require('../support/users-screen');
const { openEditor, grantsTable } = require('../support/grants-panel');

/**
 * #141 — the premises under the last four *unreachable* sentences.
 *
 * Nineteen claims of the #133 family had no row of their own. Fifteen have one
 * now: `141a` walks four of them through the back button's history list and
 * `141b` eleven through the asymmetric way into a second Section. The four
 * left are the ones no sequence reaches, and each of them says so on its sheet
 * with a reason and a date: `GrantsPanel`'s `load`, `add` and `remove` on `12`,
 * and `ActivityScores`' `onImported` half on `34`.
 *
 * **A reason for being unreachable is a claim like a ticket's numbers** (#141's
 * own rule), and this ticket has already found two of them stale: *two
 * addresses of the same route shape are never adjacent in history* (wrong about
 * the word *adjacent*) and *`teacherOne` holds one Section* (wrong, and the
 * conclusion held for a different reason). What no row held either time was the
 * **premise** — the sentence the reason rests on. These rows hold the last two,
 * and the third of the two stale reasons is here: one of the last four is not
 * unreachable at all, and row 3 below is the sequence that reaches it.
 *
 * ## What each row is, and what it is not
 *
 * Three of the four are proof of a **premise** and not of a guard: what they
 * measure is the thing that stops the guard's situation being built, so the day
 * it goes, a row goes red rather than a paragraph going quietly out of date —
 * *a survivor can be a claim the harness cannot put at risk … leave the row as
 * a net that says it is one* (#47, whose row 4 is a net for the same reason and
 * is marked ☑ rather than ⚙).
 *
 * **Row 3 is the exception, and it is the finding.** The reason on `34`'s sheet
 * was read for what it could not reach and not for what it could: the comparison
 * is unreachable *through the picker*, because #179's `target` already refuses
 * there — but the sheet's own 1 October note said what the flag still answers
 * alone, the **re-read** `load` fires after a successful import. That is
 * reachable, nothing had walked it, and row 3 walks it. Its mutant kills row 3
 * and nothing else.
 *
 * ## Rows 1 to 3 — the guard a later guard masked
 *
 * `ActivityScores` asks `onScreen.current === activityId` before letting an
 * import's answer re-read the grid, and `34`'s sheet has said *ยังไม่ได้ทดสอบ*
 * about it since #133, on the ground that no row can build the situation without
 * writing a class's marks. **That ground is no longer true**: #179 built exactly
 * such rows — `179a` sends a file to one กิจกรรม and moves the picker to another,
 * with `gate`'s `success` answering so nothing is written. What makes the
 * comparison unreachable today is #179 itself. The panel was given a `target` of
 * `${sectionId}/${activityId}` and refuses an answer whose target has moved, so
 * `onImported` is never called with anything to refuse, and the comparison below
 * it is reached only when it is already true.
 *
 * *A new guard upstream rewrites what a downstream guard's untested claim is —
 * it does not prove it* (#179). So the three below read the halves apart:
 *
 * - **Row 1** is the green control. Nothing of row 2's is a measurement until the
 *   same reads have been seen say *yes* (#171): an import that is still about the
 *   กิจกรรม on screen re-reads that one grid, exactly once.
 * - **Row 2** is the net, and it asserts **both** halves, because the two guards
 *   hold one each: nothing is asked for at all (the panel's `target`), and the
 *   grid on screen is still the กิจกรรม the picker is on (`onImported`'s own
 *   comparison, if ever the first half stops holding).
 * - **Row 3** is the claim. The import is *not* superseded, so the panel's guard
 *   lets it through and `onImported` fires; what is superseded is the re-read it
 *   fires, and there `onScreen.current === activityId` is the only thing
 *   standing. Break it and the picker says one กิจกรรม while the grid above
 *   it is drawn from another — #133's shape exactly.
 *
 * `mutation/141-the-guard-a-later-guard-masked.py` carries the measurement of
 * which mutant reaches which half, including the one written for the comparison
 * itself that **survived while row 3 did not exist** — *a mutant that survives
 * where its own file predicted a kill has found a row that does not exist yet*
 * (#118). Row 3 is that row, and the same mutant now kills it alone.
 *
 * ## Row 4 — the sentence `12`'s three claims rest on
 *
 * `GrantsPanel` is handed the account it is about in a prop, and a prop can
 * change without the component coming down. Its own comment says why it cannot
 * today: *the form replaces the table on #12's screen, so a second account can
 * only be opened after this one is closed and this panel unmounted*. That is a
 * claim about `Users.js`, which nothing asserts — `e2e/support/grants-panel.js`
 * writes it down in a comment too, and a comment is not a row.
 *
 * Row 4 counts the controls rather than reading one (#164): while an account's
 * editor is up, the list is not on screen, so there is no แก้ไข to press and no
 * row of the list to press it in. Counted after the panel's own read has landed,
 * which `openEditor` waits for, so the count is read at a settle point (#50) —
 * and read **green** first, in the list the editor was opened from, so a locator
 * that could never find anything would fail here instead of passing (#171).
 *
 * ## Which sheet carries which row
 *
 * Row 3 is cited by `34`'s ⚙ row and row 4 inside `12`'s ☐ cell. **Rows 1 and 2
 * are cited by no sheet, on purpose**: row 1 is the control that makes the other
 * three readable (#171) and row 2 is the net under the panel's own guard, whose
 * claim `179a` item 4 already holds. They are instruments of this file rather
 * than claims of a screen, so no sheet has a row for them to be marked in.
 *
 * ## What is written
 *
 * Nothing. Rows 1 to 3 are answered at the route by `gate`'s `success`, which
 * stops the import before the server sees it, and row 4 opens an editor and
 * presses nothing. `hold` is the net under that rather than a cleanup these rows
 * need (#179's file says the same).
 */

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

const db = createPool({ schema: E2E_SCHEMA });
test.afterAll(() => db.end());

/** The กิจกรรม a file is imported for, and the one the picker is moved to. */
const IMPORTED_FOR = 'สอบกลางภาค';
const MOVED_TO = 'สอบปลายภาค';

/** `34a` row 8's own spelling of the whole-Activity template's header. */
const HEADER = 'student_id,full_name_th,score';

/**
 * What `gate` answers an accepted file with — `179a`'s body, and `sendImport`'s.
 *
 * Its `created` says three where `acceptedFile` carries one row, because it is
 * that file's body unchanged, so the two specs put the same thing in front of
 * the screen. No row here reads it: what these rows are about is the read the
 * answer causes and the drawing that read feeds, not the report line.
 */
const ACCEPTED = { created: 3, marks: [], errors: [] };

/**
 * How long rows 2 and 3 wait for a drawing that must not arrive.
 *
 * There is no settle point behind it: the rows are about a read nobody wants,
 * and nothing is drawn when nothing is asked. What bounds it is the panel's own
 * turn at the answer, which every row waits for first (`uploading` going), so
 * this is the window after that in which the re-read of row 1 lands — measured
 * at well under it, every run. *Anything written for timing must not be able to
 * decide anything* (#52): row 1 is the one that says the read arrives inside it,
 * and rows 2 and 3 read their counts once, after it.
 *
 * **It is 500 where the other eleven specs of this family read 250**, and the
 * difference is what has to happen inside it. Theirs covers one drawing; this
 * one covers the panel's turn at the import's answer *and* the dispatch of the
 * re-read that answer causes, which is a second hop none of them has. Doubling
 * it costs two rows half a second each and takes the floor further from the
 * thing row 1 measures.
 */
const SETTLE_MS = 500;

let section;

/** One กิจกรรม of this ตอนเรียน, by the name the seed gave it. */
async function activityNamed(name) {
  const { rows } = await db.query(
    'SELECT id FROM activities WHERE section_id = $1 AND activity_name = $2',
    [section, name],
  );
  expect(rows, `the seed's ${name}`).toHaveLength(1);
  return rows[0];
}

/**
 * Where this screen's import posts, and the read of one กิจกรรม's grid.
 *
 * Both off `API(sectionId)`, which `scores-screen.js` exports for this, rather
 * than spelled out again here. The read is a **string** because rows 1 and 2
 * compare it by `===` against what was asked for, and the import a **RegExp**
 * because that is what `gate` tests a URL with; row 3 makes a RegExp of the read
 * for the same reason, anchored at both ends so it cannot also match the import.
 */
const importRoute = (activityId) =>
  new RegExp(`^${API(section)}/${activityId}/scores/import$`);

const scoresPath = (activityId) => `${API(section)}/${activityId}/scores`;

/** Opens the marks screen on the กิจกรรม a file is about to be sent for. */
async function openOn(page, activityId) {
  await openScores(page, section);
  await chooseActivity(page, section, activityId);
  await setEntry(page, 'student');
  await setMode(page, 'activity');
}

/**
 * Every read the page asks for from here on, so the ones after a point can be
 * counted. By path and not by response: a read that is asked for is what these
 * rows are about, and an answer the screen throws away is still an answer.
 */
function watchReads(page) {
  const asked = [];
  page.on('request', (request) => {
    if (request.method() === 'GET') asked.push(new URL(request.url()).pathname);
  });
  return asked;
}

/**
 * The accounts list, by the one column header only it carries.
 *
 * Not `users-screen.js`'s `listTable`, which is `table` `.first()`: the editor
 * draws two tables of its own and the first of them answers that locator, so a
 * count taken through it reads 1 on the screen row 4 is about. `อีเมล` is the
 * accounts list's and nothing else's - the grants panel's own four are
 * `COLUMNS` in `e2e/support/grants-panel.js`, and #13's history's are a third set.
 */
const accountsList = page =>
  page
    .getByRole('table')
    .filter({ has: page.getByRole('columnheader', { name: 'อีเมล', exact: true }) });

/** A file the server would accept, which `gate` answers for it. */
const acceptedFile = { name: 'marks.csv', text: csv(HEADER, '66010001,ทดสอบ,10') };

/**
 * The teacher's sign-in belongs to rows 1 to 3 and not to the file: row 4 is an
 * administrator's screen, and a `beforeEach` at the top level would hand it a
 * browser that is already signed in as somebody else - `signIn` then goes to `/`,
 * is redirected to `/main` and waits for a sign-in form that is not there.
 */
test.describe('the guard a later guard masked', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    if (section === undefined) [section] = await mySectionIds(page);
  });

  test('row 1: an import that is still about the กิจกรรม on screen re-reads its grid', async ({
    page,
  }) => {
    const imported = await activityNamed(IMPORTED_FOR);

    await openOn(page, imported.id);
    const asked = watchReads(page);
    const held = await gate(page, importRoute(imported.id), isWrite, { success: ACCEPTED });
    await chooseFile(page, acceptedFile);
    await expect(uploading(page)).toBeVisible();

    const before = asked.length;
    held.open();
    await held.answered;
    await expect(uploading(page)).toHaveCount(0);
    await page.waitForTimeout(SETTLE_MS);

    const after = asked.slice(before);
    expect(
      after.filter((one) => one === scoresPath(imported.id)),
      'the re-read `onImported` asks for',
    ).toHaveLength(1);
    await expect(gridHeading(page)).toHaveText(IMPORTED_FOR);
  });

  test('row 2: an import whose picker has moved asks for nothing and draws nothing', async ({
    page,
  }) => {
    const imported = await activityNamed(IMPORTED_FOR);
    const movedTo = await activityNamed(MOVED_TO);

    await openOn(page, imported.id);
    const asked = watchReads(page);
    const held = await gate(page, importRoute(imported.id), isWrite, { success: ACCEPTED });
    await chooseFile(page, acceptedFile);
    await held.sent;
    await expect(uploading(page)).toBeVisible();

    // The picker is not disabled while an import is out, which is the whole of how
    // this situation is reached — #179, and `ActivityScores.js` lines 384-395.
    await chooseActivity(page, section, movedTo.id);
    await expect(gridHeading(page)).toHaveText(MOVED_TO);

    const before = asked.length;
    held.open();
    await held.answered;
    await expect(uploading(page)).toHaveCount(0);
    await page.waitForTimeout(SETTLE_MS);

    const after = asked.slice(before);
    expect(
      {
        superseded: after.filter((one) => one === scoresPath(imported.id)).length,
        onScreen: after.filter((one) => one === scoresPath(movedTo.id)).length,
        heading: await gridHeading(page).textContent(),
      },
      'what a superseded import asks for, and what is drawn after it',
    ).toEqual({ superseded: 0, onScreen: 0, heading: MOVED_TO });
  });

  test('row 3: the re-read an import asks for is drawn only if the picker has not moved', async ({
    page,
  }) => {
    const imported = await activityNamed(IMPORTED_FOR);
    const movedTo = await activityNamed(MOVED_TO);

    await openOn(page, imported.id);

    // Two answers are held and the one this row is about is the **second**. The
    // panel's own guard is satisfied here - the picker has not moved when the
    // import lands - so `onImported` is called and fires the re-read. What moves
    // while *that* is out is the picker, and there
    // `onScreen.current === activityId` is the only thing standing. It is the
    // sentence `34`'s sheet wrote on 1 October 2569 about what this flag still
    // answers alone, and nothing had walked it.
    //
    // The read is gated after `openOn`, so the open's own read is not the one
    // caught: `gate` holds the first request that matches from then on.
    const reread = await gate(page, new RegExp(`^${scoresPath(imported.id)}$`), isGet);
    const sent = await gate(page, importRoute(imported.id), isWrite, { success: ACCEPTED });

    await chooseFile(page, acceptedFile);
    await sent.sent;
    sent.open();
    await sent.answered;
    await expect(uploading(page)).toHaveCount(0);

    // The precondition, asserted where it is used (#51): the import's answer did
    // reach `onImported`, which is what this read being asked for means. Row 1
    // is where that is the claim; here it is what the row needs to be true.
    await reread.sent;

    await chooseActivity(page, section, movedTo.id);
    await expect(gridHeading(page)).toHaveText(MOVED_TO);

    reread.open();
    await reread.answered;
    await page.waitForTimeout(SETTLE_MS);

    // Read once, at that settle point, and the two halves in one `toEqual`:
    // where the picker is, and what the grid above it is drawn from. #133 is
    // the ticket about the moment those two disagree.
    expect(
      {
        picker: await activityPicker(page).inputValue(),
        heading: await gridHeading(page).textContent(),
      },
      'what the screen draws after a re-read it no longer wants',
    ).toEqual({ picker: String(movedTo.id), heading: MOVED_TO });
  });
});

test('row 4: one account\'s editor offers no way to open another', async ({ page }) => {
  // Not `teacherOne`, who the rows above sign in as: #12's screen is an
  // administrator's, and this is the account `12a` opens the panel with.
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);

  // Green first. Both counts below are of controls the list draws, so a list
  // that was never on screen would make row 4 pass saying nothing (#171).
  const opens = page.getByRole('button', { name: 'แก้ไข' });
  expect(await opens.count(), 'the controls that open an account').toBeGreaterThan(0);
  expect(await accountsList(page).count(), 'the accounts list').toBe(1);

  await openEditor(page, ACCOUNTS.teacherOne);
  await expect(grantsTable(page)).toBeVisible();

  expect(
    {
      opens: await opens.count(),
      list: await accountsList(page).count(),
      rowOfTheAccount: await userRow(page, ACCOUNTS.teacherOne).count(),
    },
    'what is left of the list while a panel is up',
  ).toEqual({ opens: 0, list: 0, rowOfTheAccount: 0 });
});
