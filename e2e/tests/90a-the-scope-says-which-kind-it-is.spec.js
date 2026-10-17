'use strict';

const { test, expect } = require('@playwright/test');
const { DEPARTMENTS, FACULTY, PROGRAMS } = require('../../db/seed');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { openUsers } = require('../support/users-screen');
const { openEditor } = require('../support/grants-panel');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');

/**
 * docs/acceptance/11-user-accounts.md §#90 - the scope picker says whether an
 * entry is a faculty, a department or a programme, in words.
 *
 * Found walking *ให้บทบาทสูงกว่าตัวเองไม่ได้* on 21 August 2569 and left open
 * as #90 because the owner decides wording (`docs/06` §Out of Scope); answered
 * *บอกชนิดด้วยคำ* on 17 October 2569.
 *
 * What makes this a defect rather than a decoration is that the field does not
 * record where a person belongs - it decides **how wide their authority is**.
 * `scope_id` is what `scopeChain` resolves, so one line too far down the list
 * is a department's worth of authority handed out instead of one programme's,
 * and nothing anywhere refuses it: both values are legal, and the digit count
 * is the only thing that told them apart.
 *
 * The claim is about `GrantPicker`, which two screens draw: the add-account
 * form (#11) and the grants panel (#12). A mutant in shared code cannot tell
 * the two apart, so what rows 1 and 2 each add is that their own way in
 * arrives there (#191).
 *
 * Five rows for five claims: the two colliding kinds, the faculty saying its
 * word once, the entry deliberately left without a word, and the faculty
 * renamed so that the word is owed. Each is one mutant's target, which is why
 * they are not one row with five assertions in it (#88).
 *
 * The owner answered a second question on 17 October 2569. The seed names the
 * faculty `คณะวิศวกรรมศาสตร์`, so a word in front of it said `คณะ` twice,
 * and the answer was to drop the duplicate. That generalises the rule the
 * unconfined grant was given - *no word where the label already says it* -
 * which had been written as a condition drawn from one case while a sibling
 * was already outside it (#113).
 *
 * Row 5 exists because the generalisation makes the `faculty` entry of the map
 * invisible: with the seed's own name, suppressing the word and never having
 * it are the same string, so a mutant that drops the entry proves nothing
 * (#117). Renaming the faculty is the situation where the two disagree, and a
 * claim that no fixture can build it is a claim about the seed (#155) - this
 * one is built by writing to the database and putting the name back in
 * `finally`, below the seam the row is measuring (#181, #134).
 */

/** The kind words, in `CONTEXT.md`'s own vocabulary. */
const KIND = { faculty: 'คณะ', department: 'ภาควิชา', program: 'หลักสูตร' };

/**
 * The collision, computed from the seed rather than typed out.
 *
 * `วิศวกรรมคอมพิวเตอร์` is both department `05` and programme `0501`, and
 * `วิศวกรรมโยธา` is both `01` and `0101` - two pairs, where #90 reported one.
 * The pair is asserted here rather than in a row, because it is the
 * precondition of two rows and a precondition is asserted where it is used
 * (#51): without a name held by two kinds there is nothing for a word to
 * disambiguate, and a row that stopped meeting it would pass by reading one
 * entry twice (#129). A seed that lost the collision then fails as a refuted
 * precondition rather than throwing on `undefined`.
 */
function collidingPair() {
  const department = DEPARTMENTS.find(dept => PROGRAMS.some(prog => prog.th === dept.th));
  expect(department, 'the seed holds no name shared by a department and a programme')
    .toBeDefined();
  const program = PROGRAMS.find(prog => prog.th === department.th);
  expect(program.th).toBe(department.th);
  expect(program.id).not.toBe(department.id);
  return { department, program };
}

const scopePicker = page => page.getByRole('combobox', { name: 'ขอบเขตของบทบาท' });

/** What the picker offers, as a person reads it. */
const offered = page => scopePicker(page).locator('option').allTextContents();

/** The entry for one scope, as the screen writes it. */
const entry = (kind, scope) => `${kind} · ${scope.th} (${scope.id})`;

const ADD = 'เพิ่มผู้ใช้งาน';

test('row 1: the add-account form tells the department from the programme in words', async ({
  page,
}) => {
  const { department, program } = collidingPair();

  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await page.getByRole('button', { name: ADD }).click();
  await expect(scopePicker(page)).toBeVisible();

  const options = await offered(page);
  expect(options).toContain(entry(KIND.department, department));
  expect(options).toContain(entry(KIND.program, program));

  // The claim is not only that the words are there: it is that they are what
  // tells the two apart. With the kind word removed, the two entries differ
  // by their code alone - which is the state #90 was opened about, and is
  // what this row fails on if the words go away.
  const sharing = options.filter(text => text.includes(department.th));
  expect(sharing.length).toBeGreaterThan(1);
  for (const text of sharing) {
    expect(text.split(' · ')).toHaveLength(2);
  }
  expect(new Set(sharing.map(text => text.split(' · ')[0])).size).toBeGreaterThan(1);
});

test('row 2: the grants panel says it the same way', async ({ page }) => {
  const { department, program } = collidingPair();

  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.teacherOne);
  await expect(scopePicker(page)).toBeVisible();

  const options = await offered(page);
  expect(options).toContain(entry(KIND.department, department));
  expect(options).toContain(entry(KIND.program, program));
});

/**
 * The Central Admin's own list, which is the only one that holds all four
 * kinds: their reach is unbounded, so `grantable` answers the sentinel
 * followed by every faculty, department and programme there is.
 */
async function offeredToTheCentralAdmin(page) {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await page.getByRole('button', { name: ADD }).click();
  await expect(scopePicker(page)).toBeVisible();
  return offered(page);
}

test('row 3: the faculty says its kind once, because its name already says it', async ({
  page,
}) => {
  // The precondition of the claim, and the reason the row exists: the seeded
  // name begins with the kind word. Read from the seed, not typed (#118).
  expect(FACULTY.th.startsWith(KIND.faculty)).toBe(true);

  const options = await offeredToTheCentralAdmin(page);

  // The owner's answer of 17 October 2569: the duplicate goes. The faculty's
  // code is `ENG` and not a number - on purpose, so that it cannot collide
  // with a department (`CONTEXT.md` §Scope) - so the digit count could never
  // have named this kind either way.
  expect(options).toContain(`${FACULTY.th} (${FACULTY.id})`);

  // And the wording that was declined is nowhere on the list, which is the
  // claim `90:saysthekindtwice` is aimed at.
  expect(options).not.toContain(entry(KIND.faculty, { th: FACULTY.th, id: FACULTY.id }));
});

test('row 4: the grant confined to nothing is left as it was', async ({ page }) => {
  const options = await offeredToTheCentralAdmin(page);

  // Its own label already names the whole of the organisation, so a word in
  // front would say that twice. A row of its own because row 3 would report
  // only its first dying assertion, and this claim is the one that would have
  // sat below the red line (#88).
  //
  // Measured on 17 October 2569. What would re-date it is a second unconfined
  // entry, which one `GLOBAL_SCOPE` sentinel makes impossible today.
  const unconfined = options.filter(text => text.includes('ทั้งมหาวิทยาลัย'));
  expect(unconfined).toHaveLength(1);
  expect(unconfined[0]).not.toContain(' · ');
});

/**
 * The faculty, renamed so that its name no longer says its kind. This is the
 * one situation where suppressing the word and never holding it disagree, so
 * it is where the `faculty` entry of the map can be put at risk (#117).
 *
 * The name is derived from the seed rather than typed (#118), and it is put
 * back in `finally` - below the seam, saying nothing about the screen, so a
 * failure there cannot speak over the row's own (#181).
 */
const db = createPool({ schema: E2E_SCHEMA });
test.afterAll(() => db.end());

test('row 5: a faculty whose name does not say its kind is given the word', async ({
  page,
}) => {
  const renamed = FACULTY.th.slice(KIND.faculty.length);
  expect(renamed.startsWith(KIND.faculty)).toBe(false);
  expect(renamed.length).toBeGreaterThan(0);

  await db.query(
    'UPDATE faculty SET faculty_name_th = $1 WHERE faculty_id = $2',
    [renamed, FACULTY.id],
  );
  try {
    const options = await offeredToTheCentralAdmin(page);
    expect(options).toContain(entry(KIND.faculty, { th: renamed, id: FACULTY.id }));
  } finally {
    await db.query(
      'UPDATE faculty SET faculty_name_th = $1 WHERE faculty_id = $2',
      [FACULTY.th, FACULTY.id],
    );
  }
});
