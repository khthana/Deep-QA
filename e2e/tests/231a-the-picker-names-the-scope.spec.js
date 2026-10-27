'use strict';

const { test, expect } = require('@playwright/test');
const { PROGRAMS, DEPARTMENTS } = require('../../db/seed');
const { ACCOUNTS, IDS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { BACKEND_URL } = require('../support/env');
const {
  committeeLabel,
  actingButton,
  roleOption,
  switchTo,
} = require('../support/shell');

/**
 * #231 — the role picker says which scope a grant is over, by name.
 *
 * The label read `กรรมการหลักสูตร 0501`: the role's name and a bare code. The
 * two administration screens that draw a scope for somebody to read were given
 * the picker's own words by #215, and this one could not have them, because
 * what it draws comes from `/api/me` and that answer carried no name — and
 * because the people who read this label are the ones
 * `GET /api/users/grantable` refuses, so the list the other two screens borrow
 * their names from arrives empty here.
 *
 * So the fix is on the server: `allRoles` now resolves each grant's scope in
 * the order `scopeChain` walks — curriculum, department, faculty — and sends
 * the name and the kind beside the code. The owner chose the wording on
 * 27 October 2569: **the name with the code after it, and no word for the
 * kind**, which is `scopeCoded` - the half of `scopeLabel` that the other two
 * screens also draw, without the `หลักสูตร ·` in front that those two need and
 * this one does not. `กรรมการหลักสูตร` already says what kind of thing the
 * grant is over.
 *
 * ## What each row is for
 *
 * Row 1 is the wording itself, read off the trigger and off the open option,
 * and the other half of the owner's choice beside it: a grant whose label
 * carries no scope still carries none. That half is worth asserting here
 * rather than taking on trust, because `multi01`'s two grants are over a
 * curriculum and a department which **carry the same name** in this
 * organisation - `วิศวกรรมคอมพิวเตอร์`, 0501 and 05 - so a label that named
 * the teacher's scope too would put the same words on the screen twice for two
 * different widths of authority. That is #90's reading in the picker.
 *
 * Row 2 is the reader the ticket is about: an external assessor, whom
 * `grantable` refuses. It asserts the refusal beside the label, because the
 * refusal is what makes the server the only place this name could have come
 * from (#226 - say the mechanism, not only the drawing).
 *
 * Row 3 is why the name rides in `allRoles` rather than in `/api/me` alone. A
 * grant given while the page is open reaches the picker on the next press
 * without a reload (#77, `12a` rows 8-9), and it reaches it through
 * `X-Deep-Grants`, which is `auth.roles` on every answer - the same rows. Had
 * the name been resolved in `me.js` instead, a grant arriving that way would
 * have been drawn as a bare code until the next full load, which is the defect
 * this ticket reports, surviving in the one place nobody would look for it.
 */

const FIRST_SCOPE = '0501';
const SECOND_SCOPE = '0503';
const TEACHER = 'อาจารย์ผู้สอน';
const ASSESSOR = 'ผู้ประเมินภายนอก';

/** The seeded names, read where they are decided rather than retyped (#118). */
const nameOf = (list, id) => list.find(entry => entry.id === id).th;
const SECOND_PROGRAM_NAME = nameOf(PROGRAMS, SECOND_SCOPE);
const TEACHER_SCOPE_NAME = nameOf(DEPARTMENTS, '05');

/** The assessor's label, which no helper builds: the picker's other scoped role. */
const assessorLabel = `${ASSESSOR} ${nameOf(PROGRAMS, FIRST_SCOPE)} (${FIRST_SCOPE})`;

let release;
let admin;
let granted = false;
let cleanupFailure = null;

test.beforeAll(async ({ playwright }) => {
  release = await hold();
  admin = await playwright.request.newContext();

  const inn = await admin.post(`${BACKEND_URL}/api/auth/login`, {
    data: { email: ACCOUNTS.systemAdmin, password: PASSWORD },
  });
  expect(inn.status(), 'the administrator row 3 makes its fixture as').toBe(200);
});

test.afterAll(async () => {
  // Below the seam the rows are about, and it says nothing over whatever a row
  // was failing at: its own failure is carried to the hook below (#181).
  if (granted) {
    try {
      const undone = await admin.delete(
        `${BACKEND_URL}/api/users/${IDS.multiRole}/roles/PROG_MANAGER/${SECOND_SCOPE}`,
      );
      if (undone.status() !== 200) {
        cleanupFailure = `row 3's grant was answered ${undone.status()} on the way out`;
      }
    } catch (error) {
      cleanupFailure = `row 3's grant could not be revoked: ${error.message}`;
    }
  }
  await admin.dispose();
  release();
});

// Last, so a fixture left behind fails this file rather than the next one.
test.afterAll(() => {
  if (cleanupFailure) throw new Error(cleanupFailure);
});

test('row 1 (#231): the picker names the curriculum a committee grant is over', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.multiRole);

  // The trigger. `toHaveText` and not a pattern: this row is the wording, so
  // what it reads is the whole of what the button says.
  await expect(actingButton(page)).toHaveText(committeeLabel(FIRST_SCOPE));

  await actingButton(page).click();

  await expect(roleOption(page, committeeLabel(FIRST_SCOPE))).toHaveText(
    `• ${committeeLabel(FIRST_SCOPE)}`,
  );

  // The other half of the owner's choice. This account's teacher grant is over
  // department 05, whose name is the same as curriculum 0501's, and the label
  // for it says the role and nothing else.
  expect(
    TEACHER_SCOPE_NAME,
    'the two scopes this account holds carry one name between them (#90)',
  ).toBe(nameOf(PROGRAMS, FIRST_SCOPE));
  await expect(roleOption(page, TEACHER)).toHaveText(`• ${TEACHER}`);
});

test('row 2 (#231): the assessor reads the name their own account may not ask for', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.externalAssessor);

  await expect(actingButton(page)).toHaveText(assessorLabel);

  await actingButton(page).click();
  await expect(roleOption(page, assessorLabel)).toHaveText(`• ${assessorLabel}`);

  // The mechanism, said out loud: the list the other two screens take their
  // names from is one this account is refused, so the name above came from
  // `/api/me` and could not have come from anywhere else.
  const refused = await page.request.get(`${BACKEND_URL}/api/users/grantable`);
  expect(refused.status(), 'the list this reader cannot borrow').toBe(403);
});

test('row 3 (#231): a grant given mid-session is named on the next press, with no reload', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.multiRole);

  // The precondition, read where it is used rather than assumed from the seed
  // (#129): the second curriculum is not on offer yet.
  await actingButton(page).click();
  await expect(roleOption(page, committeeLabel(SECOND_SCOPE))).toHaveCount(0);
  await actingButton(page).click();

  const made = await admin.post(`${BACKEND_URL}/api/users/${IDS.multiRole}/roles`, {
    data: { role_id: 'PROG_MANAGER', scope_id: SECOND_SCOPE },
  });
  expect(made.status(), 'the grant given while the page is open').toBe(201);
  granted = true;

  // Set on the document that is about to make the request. A reload replaces
  // the document and takes this with it, which is what tells a name carried on
  // an answer apart from one that arrived with a fresh `/api/me` (#12 row 8).
  await page.evaluate(() => {
    window.__pressedNotReloaded = true;
  });

  // The press, and it is a press the picker itself makes: the switch is a
  // request, and `X-Deep-Grants` rides on its answer like on every other.
  const answer = await switchTo(page, TEACHER);
  expect(answer.status(), 'the request the grants arrive on').toBe(200);

  await actingButton(page).click();
  await expect(roleOption(page, committeeLabel(SECOND_SCOPE))).toHaveText(
    `• ${committeeLabel(SECOND_SCOPE)}`,
  );

  // After the read and not before it: a round trip is a turn for the renderer,
  // and a probe in front of the thing it measures changes the answer (#170).
  expect(await page.evaluate(() => window.__pressedNotReloaded === true)).toBe(true);

  // And the name is the second curriculum's own, not the first one's repeated:
  // the two differ by name as well as by code, which is the property that makes
  // this row a reading of the resolver rather than of a string template.
  expect(SECOND_PROGRAM_NAME).not.toBe(nameOf(PROGRAMS, FIRST_SCOPE));
});
