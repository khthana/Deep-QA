'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { createPool } = require('../../db/pool');
const {
  MAX_GROUP_SIZE,
  UNGROUPED_TAIL,
  ACCOUNTS: SEEDED_ACCOUNTS,
} = require('../../db/seed');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const {
  downloadTemplate,
  headerOf,
  csv,
  importCsv,
  reportedLines,
  reportedReason,
} = require('../support/import-panel');
const { mySectionIds } = require('../support/enrolment-screen');
const {
  path,
  openGroups,
  card,
  groupNames,
  fullness,
  membersOn,
  ungroupedOn,
  createGroup,
  place,
  takeOut,
  disband,
  openHistory,
  historyLines,
} = require('../support/groups-screen');

/**
 * docs/acceptance/26-work-groups.md — the half a browser can prove.
 *
 * The backend suite proves both business rules at the routes, which is the
 * stronger seam for a rule: whether a group holds ten people is a fact about
 * rows. What is here is the part that is only true if a person in front of the
 * screen would find it true — that the refusal naming the other group reaches
 * the page instead of being swallowed, that the eleventh student is refused
 * from a group the browser itself filled to ten, that a move empties one card
 * and fills another rather than merely answering 200, and that cancelling the
 * deletion of a group deletes nothing.
 *
 * ## Every row only ever adds
 *
 * This suite shares one schema, and the seeded groups are read by row 1 and by
 * the two ceiling rows. So no row here deletes or empties a *seeded* group:
 * the writing rows work in groups they made themselves, and the students they
 * place are the ones the seed leaves ungrouped on purpose. What is left behind
 * is therefore always removable, and the `afterEach` removes exactly that —
 * the groups named ทดสอบ…, the memberships of the ungrouped tail, and the
 * history lines both of those wrote.
 *
 * It cleans up through the schema rather than through the screen, for 25a's
 * reason: teardown that shares a defect with the subject cannot be evidence
 * about the subject. A mutant that stopped the deletion from deleting would
 * otherwise break every row after it and read as nine failures.
 *
 * ## What is deliberately not here
 *
 * The wording of the confirmation, the colours of the two banners, and the
 * `n/10` badge turning amber at the ceiling are appearance and stay hand-
 * walked. So does the menu entry that leads here: 24a row 3 already proves a
 * Section-specific entry carries the id rather than the token.
 */

const MARK = 'ทดสอบ';

/** The import endpoint, which `importCsv` waits on by its exact pathname. */
const IMPORT_PATH = () => `/api/teaching/sections/${section}/groups/import`;

const cleanUp = createPool({ schema: E2E_SCHEMA });

/** The ตอนเรียน every row works in, and the students the seed leaves loose in it. */
let section;
let tail;

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  if (section === undefined) {
    [section] = await mySectionIds(page);
    const { rows } = await cleanUp.query(
      `SELECT sc.student_id FROM student_course sc
        WHERE sc.section_id = $1
          AND NOT EXISTS (SELECT 1 FROM student_group_member m
                            JOIN student_group g ON g.group_id = m.group_id
                           WHERE g.section_id = sc.section_id AND m.student_id = sc.student_id)
        ORDER BY sc.student_id`,
      [section],
    );
    tail = rows.map(row => row.student_id);
    // Read once, before any row has written, so it stays the seed's answer
    // rather than the answer after whichever row ran first.
    expect(tail).toHaveLength(UNGROUPED_TAIL);
  }
});

test.afterEach(async () => {
  if (section === undefined) return;
  await cleanUp.query(
    `DELETE FROM student_group_member m
      USING student_group g
      WHERE g.group_id = m.group_id AND g.section_id = $1 AND m.student_id = ANY($2)`,
    [section, tail],
  );
  await cleanUp.query(
    `DELETE FROM student_group_change_log
      WHERE section_id = $1 AND (student_id = ANY($2) OR group_name LIKE $3)`,
    [section, tail, `${MARK}%`],
  );
  await cleanUp.query('DELETE FROM student_group WHERE section_id = $1 AND group_name LIKE $2', [
    section,
    `${MARK}%`,
  ]);
});

test.afterAll(async () => {
  await cleanUp.end();
});

/** The banner, whichever half of the screen put it there. */
const said = (page, sentence) => expect(page.getByText(sentence, { exact: true })).toBeVisible();

test('row 1: the screen draws the seeded groups, and nobody is in two of them', async ({
  page,
}) => {
  expect((await openGroups(page, section)).status()).toBe(200);

  const names = await groupNames(page);
  expect(names.length).toBeGreaterThan(1);

  // Counted against the seed and never against the answer that drew the
  // screen: `UNGROUPED_TAIL` is a fact about the fixture that no query of this
  // screen's can move, where `students.filter(...)` would grow and shrink with
  // whatever the route returned and assert nothing at all. This is the trap
  // `weeksofanysection` walked into on #33.
  expect(await ungroupedOn(page)).toHaveLength(UNGROUPED_TAIL);

  const seen = new Set();
  for (const name of names) {
    const codes = await membersOn(page, name);
    const { members, ceiling } = await fullness(page, name);
    expect(ceiling).toBe(MAX_GROUP_SIZE);
    // The badge against the card's own list, and that is all this line claims:
    // both come from one answer, so it cannot fail on a server fault. What it
    // catches is the screen counting one thing and drawing another. The
    // server-side claims of this row are anchored on the seed above.
    expect(members).toBe(codes.length);
    expect(codes.length).toBeGreaterThan(0);
    expect(codes.length).toBeLessThanOrEqual(MAX_GROUP_SIZE);
    for (const code of codes) {
      expect(seen.has(code)).toBe(false);
      seen.add(code);
    }
  }

  // And the two halves of the screen are disjoint: a student on a card is not
  // also offered as ยังไม่มีกลุ่ม, which is the state BR-07 exists to keep.
  for (const loose of await ungroupedOn(page)) expect(seen.has(loose)).toBe(false);
});

test('row 2: a group is created, and a second of the same name is refused', async ({ page }) => {
  await openGroups(page, section);
  const before = (await groupNames(page)).length;

  expect((await createGroup(page, section, `${MARK} ก`)).status()).toBe(201);
  await expect(card(page, `${MARK} ก`)).toBeVisible();
  expect(await groupNames(page)).toHaveLength(before + 1);
  expect(await fullness(page, `${MARK} ก`)).toEqual({ members: 0, ceiling: MAX_GROUP_SIZE });

  const again = await createGroup(page, section, `${MARK} ก`);
  expect(again.status()).toBe(409);
  await said(page, REFUSALS.duplicateGroupName);
  expect(await groupNames(page)).toHaveLength(before + 1);
});

test('row 3: a student joins a group and leaves the ยังไม่มีกลุ่ม panel', async ({ page }) => {
  await openGroups(page, section);
  await createGroup(page, section, `${MARK} ข`);

  expect((await place(page, section, `${MARK} ข`, tail[0], 'add')).status()).toBe(201);
  expect(await membersOn(page, `${MARK} ข`)).toEqual([tail[0]]);
  expect(await fullness(page, `${MARK} ข`)).toEqual({ members: 1, ceiling: MAX_GROUP_SIZE });

  const loose = await ungroupedOn(page);
  expect(loose).toHaveLength(UNGROUPED_TAIL - 1);
  expect(loose).not.toContain(tail[0]);
});

test('row 4: somebody already in a group is refused, and the sentence names that group', async ({
  page,
}) => {
  await openGroups(page, section);
  await createGroup(page, section, `${MARK} ค`);

  // Somebody the seed placed, taken off the screen rather than written down:
  // which student is in which seeded group is the seed's arithmetic, and a row
  // that hard-coded one would fail the day that arithmetic changed for a
  // reason nothing to do with this screen.
  const [firstGroup] = await groupNames(page);
  const [member] = await membersOn(page, firstGroup);

  const refused = await place(page, section, `${MARK} ค`, member, 'add');
  expect(refused.status()).toBe(409);
  await said(page, REFUSALS.studentInAnotherGroup(firstGroup));

  expect(await membersOn(page, `${MARK} ค`)).toEqual([]);
  expect(await membersOn(page, firstGroup)).toContain(member);
});

test('row 5: a group filled to ten refuses the eleventh, naming the limit', async ({ page }) => {
  await openGroups(page, section);

  // The fullest seeded group, filled the rest of the way by the screen itself.
  // Standing the group at ten by hand would prove that the server can count a
  // number somebody else wrote; filling it here proves the count is of what
  // this screen did.
  const names = await groupNames(page);
  const sizes = await Promise.all(names.map(name => membersOn(page, name)));
  const at = sizes.reduce((best, codes, index) => (codes.length > sizes[best].length ? index : best), 0);
  const biggest = names[at];
  const room = MAX_GROUP_SIZE - sizes[at].length;
  expect(room).toBeGreaterThan(0);
  expect(room).toBeLessThan(tail.length);

  for (const code of tail.slice(0, room)) {
    expect((await place(page, section, biggest, code, 'add')).status()).toBe(201);
  }
  expect(await fullness(page, biggest)).toEqual({
    members: MAX_GROUP_SIZE,
    ceiling: MAX_GROUP_SIZE,
  });

  const eleventh = await place(page, section, biggest, tail[room], 'add');
  expect(eleventh.status()).toBe(409);
  await said(page, REFUSALS.groupFull(biggest));
  expect(await membersOn(page, biggest)).toHaveLength(MAX_GROUP_SIZE);
  expect(await ungroupedOn(page)).toContain(tail[room]);
});

test('row 6: a move empties one card and fills the other, and reads as a move', async ({
  page,
}) => {
  await openGroups(page, section);
  await createGroup(page, section, `${MARK} ง`);
  await createGroup(page, section, `${MARK} จ`);
  await place(page, section, `${MARK} ง`, tail[0], 'add');

  const moved = await place(page, section, `${MARK} จ`, tail[0], 'move');
  expect(moved.status()).toBe(200);
  expect(await membersOn(page, `${MARK} ง`)).toEqual([]);
  expect(await membersOn(page, `${MARK} จ`)).toEqual([tail[0]]);
  // Still one person in one group: a move that had been a removal and an
  // addition would look the same here, which is why the next line reads the
  // history rather than the cards.
  expect(await ungroupedOn(page)).not.toContain(tail[0]);

  await openHistory(page, section);
  const [newest] = await historyLines(page);
  expect(newest).toContain('ย้าย');
  expect(newest).toContain(`${MARK} ง`);
  expect(newest).toContain(`${MARK} จ`);
});

test('row 7: a member taken out of a group goes back to ยังไม่มีกลุ่ม', async ({ page }) => {
  await openGroups(page, section);
  await createGroup(page, section, `${MARK} ฉ`);
  await place(page, section, `${MARK} ฉ`, tail[1], 'add');

  expect((await takeOut(page, section, `${MARK} ฉ`, tail[1])).status()).toBe(204);
  expect(await membersOn(page, `${MARK} ฉ`)).toEqual([]);
  expect(await ungroupedOn(page)).toContain(tail[1]);
});

test('row 8: cancelling the deletion deletes nothing; confirming returns the members', async ({
  page,
}) => {
  await openGroups(page, section);
  await createGroup(page, section, `${MARK} ช`);
  await place(page, section, `${MARK} ช`, tail[2], 'add');
  const before = (await groupNames(page)).length;

  // `[]` and not "the card is still there": a cancel wired to the deletion
  // leaves the card drawn for exactly as long as the round trip takes.
  expect(await disband(page, section, `${MARK} ช`, { confirm: false })).toEqual([]);
  await expect(card(page, `${MARK} ช`)).toBeVisible();

  expect((await disband(page, section, `${MARK} ช`)).status()).toBe(204);
  await expect(card(page, `${MARK} ช`)).toHaveCount(0);
  expect(await groupNames(page)).toHaveLength(before - 1);
  expect(await ungroupedOn(page)).toContain(tail[2]);

  // The two kinds of history line a deletion writes, which no other row can
  // reach: the deletion itself, and the exit of everybody it was holding. A
  // group that vanished leaving only ลบกลุ่ม would answer "which group was I
  // in" with silence for the people who were in it.
  await openHistory(page, section);
  const [newest, before_it] = await historyLines(page);
  expect(newest).toBe(`ลบกลุ่ม ${MARK} ช`);
  expect(before_it).toContain('ออกจากกลุ่ม');
  expect(before_it).toContain(`${MARK} ช`);
});

test('row 9: the history says what happened, to whom, and by whom', async ({ page }) => {
  await openGroups(page, section);
  await createGroup(page, section, `${MARK} ซ`);
  await place(page, section, `${MARK} ซ`, tail[3], 'add');

  await openHistory(page, section);
  const lines = await historyLines(page);
  expect(lines[0]).toContain('เพิ่ม');
  expect(lines[0]).toContain(`${MARK} ซ`);
  expect(lines[1]).toBe(`สร้างกลุ่ม ${MARK} ซ`);

  // Who did it, on the same row. The name is the acting account's and not the
  // student's, and it is read out of the seed rather than written down here so
  // that renaming the fixture cannot leave this row asserting a stale string.
  const teacher = SEEDED_ACCOUNTS.find(account => account.alias === 'U_TEACH').th.join(' ');
  const rows = page.locator('table').filter({ hasText: 'สิ่งที่เกิดขึ้น' }).locator('tbody tr');
  await expect(rows.first()).toContainText(teacher);
});

test('row 10: the template is this screen’s, a good file lands, a bad one is reported', async ({
  page,
}) => {
  await openGroups(page, section);

  const template = await downloadTemplate(page);
  expect(template.name).toBe('section-groups-template.csv');
  expect(headerOf(template)).toBe('group_name,student_id');

  const good = csv(
    'group_name,student_id',
    `${MARK} ฌ,${tail[4]}`,
    `${MARK} ฌ,${tail[5]}`,
  );
  await importCsv(page, { path: IMPORT_PATH(), text: good, name: 'groups.csv' });
  await expect(card(page, `${MARK} ฌ`)).toBeVisible();
  expect(await membersOn(page, `${MARK} ฌ`)).toEqual([tail[4], tail[5]]);

  const bad = csv('group_name,student_id', `${MARK} ญ,${tail[6]}`, `${MARK} ญ,99019999`);
  await importCsv(page, { path: IMPORT_PATH(), text: bad, name: 'groups-bad.csv' });
  expect(await reportedLines(page)).toEqual([3]);
  await expect(reportedReason(page, 3)).toContainText(REFUSALS.studentNotEnrolled);

  // Nothing of the rejected file was applied — not the good line above the bad
  // one, and not the group it would have made.
  await expect(card(page, `${MARK} ญ`)).toHaveCount(0);
  expect(await ungroupedOn(page)).toContain(tail[6]);
});

test('row 11: the groups of a ตอนเรียน that is not this account’s are refused', async ({
  page,
}) => {
  // Signed in over the top of `beforeEach`'s teacher.one, so the address being
  // typed is one that answers 200 for somebody — which is the only version of
  // this row that says anything. A Section id nobody teaches would be refused
  // for being absent rather than for being somebody else's.
  // `beforeEach` has already signed teacher.one in, and the sign-in screen is
  // behind a GuestRoute that redirects an account that has one. Dropping the
  // cookie is how a second account signs in inside one row.
  await page.context().clearCookies();
  await signIn(page, ACCOUNTS.teacherTwo);
  const [refused] = await Promise.all([
    page.waitForResponse(
      response =>
        new URL(response.url()).pathname === `/api/teaching/sections/${section}/groups` &&
        response.request().method() === 'GET',
    ),
    page.goto(path(section)),
  ]);
  expect(refused.status()).toBe(404);
  await said(page, REFUSALS.sectionNotFound);
  expect(await groupNames(page)).toEqual([]);
});

test('row 12: a change made while the history is open reaches it without reopening', async ({
  page,
}) => {
  await openGroups(page, section);
  await createGroup(page, section, `${MARK} ฎ`);

  await openHistory(page, section);
  expect((await historyLines(page))[0]).toBe(`สร้างกลุ่ม ${MARK} ฎ`);

  // The panel is not closed and reopened between the write and the read, and
  // that is the whole row. A history left open across a change and still
  // answering with the class as it stood before it is the one state a history
  // is not allowed to be in — and it is invisible to every other row here,
  // because they all open the panel after the act they ask about.
  await place(page, section, `${MARK} ฎ`, tail[7], 'add');
  await expect
    .poll(async () => (await historyLines(page))[0])
    .toMatch(new RegExp(`^เพิ่ม .+ เข้ากลุ่ม ${MARK} ฎ$`));
});
