'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const {
  PROGRAM_SUBJECTS,
  actingButton,
  switchTo,
} = require('../support/shell');

/**
 * #81 — where a switch leaves the person standing.
 *
 * Putting on another hat redrew the sidebar and left the address alone, so the
 * person stood on a route their new grant has no menu entry for. The walk of
 * `docs/acceptance/12-role-grants.md` row 4 caught it by its symptom: a
 * breadcrumb reading *ข้อมูลหลัก / รายวิชาที่รับผิดชอบ* — the heading of one
 * menu over the page of another.
 *
 * **The ticket's own reason why it did not hurt yet has expired.** It says both
 * addresses in the walk were `NotBuiltYet`, so whoever landed on one saw
 * *หน้านี้กำลังพัฒนา* whatever hat they wore. Both are real screens now —
 * `AppRoutes.js` draws `<Rubrics />` at `/main/rubrics` and `<TeacherDashboard />`
 * at `/teacher/teacherDashboard` — so the state the ticket predicted is the
 * state today: the stranded screen asks for its data under the new grant, is
 * refused, and the refusal reads as the *consequence of switching* rather than
 * of standing somewhere the new hat cannot go.
 *
 * What the fix reuses rather than invents is `landingPath` — the rule
 * `GuestRoute` has used since #66 to put a freshly signed-in caller on the
 * first entry of their own menu. A switch is the same question asked again, so
 * it gets the same answer, and #120's reason for the rule living in `menus.js`
 * rather than in a component is what makes it available here at all.
 *
 * **Two candidates, and the second was declined on a measurement of what it
 * would have to know.** The ticket offers *always land on the new grant's home*
 * or, at least, *move only when the current route is not in the new menu*. The
 * second needs a predicate for *is this path in this menu*, and `menus.js`'
 * own docstring says why that predicate is not a lookup: the teacher's second
 * group is about one open ตอนเรียน and is sliced out of the menu until one is
 * open, so for every teacher sub-page the honest answer is *it depends what is
 * open* — the predicate would hold a copy of `SidebarItem`'s slicing rule, and
 * a copy of a rule holds none of the rule's letters. The first candidate needs
 * no predicate, and it is the one the ticket names first.
 *
 * What it costs is the case the second would have kept: two grants that both
 * reach the screen someone is standing on — a department administrator and a
 * committee member both reach Rubric กลาง — are moved anyway. That is a
 * consequence and not a defect, and it is written here rather than left for
 * somebody to find.
 *
 * The rows below read the landing **off the sidebar** rather than against a
 * path written here, which is `66a`'s idiom and for its reason: a menu
 * reordered by another ticket moves the landing with it, and a row comparing
 * against a constant would then be asserting yesterday's table.
 *
 * ## Why this is a file of its own, when the ticket asked for a line in `10a`
 *
 * #81's §หมายเหตุเรื่อง seam says *ถ้าแก้ ควรเพิ่ม assert เรื่อง URL หลังสลับลงในแถวนั้น* -
 * into row 4 of `10a-shell.spec.js`. It is here instead, and the deviation is
 * written down rather than left to be noticed.
 *
 * That row's claim is *what the server permits changes*, and it proves it by
 * asking for one address twice and reading two different answers. A URL
 * assertion inside it would give the row two subjects, and then no mutant could
 * fail one without failing the other: `staysput` has to be able to kill the
 * landing and leave row 4 standing, which is how the mark on the landing row is
 * earned rather than inherited. So the claim went to its own file, and row 4
 * changed only in the way the fix forced - it used to reach its second answer by
 * reloading, which worked only while a switch left the address alone.
 *
 * ## What this fix does not reach, which was #155's - closed 10 October 2569
 *
 * #155 is the *data* half of the same press: the screen standing open goes on
 * showing what the old grant fetched. It predicted that navigating would carry
 * most of it away, leaving the case of *a screen the new grant also reaches*,
 * where it expected no navigation at all. That is not the residue, because this
 * navigates unconditionally: a shared screen is left too. What survived is the
 * narrower case where the address does not change - the person is already
 * standing on `landingPath` of the grant they are putting on, so `navigate` goes
 * where the router already is and nothing remounts. Its structural sibling is
 * two grants of the same role code at different scopes, since `landingPath` is
 * keyed by `role_id` alone.
 *
 * **The three sentences that used to stand here have all expired, and they are
 * the reason this paragraph is rewritten rather than deleted.** They said the
 * shape *no seeded account has* could not be a row; that nothing re-reads; and
 * that what a screen should do when the grant under it changes was still the
 * owner's to settle. Measured and answered on 10 October 2569: #12's grants
 * route builds the shape at runtime, so `155a` is the row and the seed was not
 * touched; the owner settled it - *re-read, but only where the address does not
 * change*; and `frontend/src/pages/Mainpage.js` keys the outlet on a number
 * that `RoleDropdown` raises in exactly that case. A claim that a situation has
 * no fixture is a claim about the seed, and this file is where that claim was
 * written (`CLAUDE.md` §Tests and fixtures, #155).
 *
 * #155's own option 2 - *navigate, and let the mount do it* - is in effect
 * everywhere else, as a consequence of #81 rather than as an answer to #155,
 * and `155a`'s second row is what holds it there: the screen a moving switch is
 * leaving is not re-read on its way out. `staysput` below kills that row too,
 * because the navigation it removes is the situation that row is about.
 */

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

const PROGRAM_MANAGER_0501 = 'กรรมการหลักสูตร 0501';
const TEACHER = 'อาจารย์ผู้สอน';

/**
 * The first entry of the menu now drawn, read off the side navigation.
 *
 * Scoped to that `<nav>` by its accessible name, which is what `66a` had to
 * learn: the first `nav a[href]` on the page is the top bar's logo, pointing at
 * `/`, so a row written that way compares the landing against the sign-in page
 * and fails while the code is right.
 */
async function firstMenuHref(page) {
  const first = page
    .getByRole('navigation', { name: 'เมนูหลัก' })
    .getByRole('link')
    .first();
  await expect(first).toBeVisible();
  return new URL(await first.getAttribute('href'), page.url()).pathname;
}

/**
 * Puts on `label`, waits until the shell is wearing it, and hands back the
 * landing that grant's menu names.
 *
 * The wait is the point. `switchTo` hands back the server's answer to
 * `/api/me/acting-role`, and the sidebar is redrawn from the state that answer
 * sets — so reading the menu straight after the response can read the menu of
 * the hat being taken off (#170, one seam over).
 */
async function wearing(page, label) {
  const answer = await switchTo(page, label);
  expect(answer.status(), `the switch to ${label}`).toBe(200);
  await expect(actingButton(page)).toHaveText(new RegExp(label));
  return firstMenuHref(page);
}

test('a switch lands on the first entry of the new grant’s own menu', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.multiRole);
  await page.goto(PROGRAM_SUBJECTS);
  expect(
    new URL(page.url()).pathname,
    'the committee screen the switch begins on',
  ).toBe(PROGRAM_SUBJECTS);

  const landing = await wearing(page, TEACHER);

  // Asserted where it is used, not where it was arranged (#51): if the
  // teacher's landing were the screen we are standing on, the row below could
  // not fail, and a row that cannot fail is not evidence.
  expect(
    landing,
    'the teacher’s landing is not the screen the switch began on',
  ).not.toBe(PROGRAM_SUBJECTS);

  await expect
    .poll(() => new URL(page.url()).pathname, {
      message: 'where the browser stands once the switch has landed',
    })
    .toBe(landing);
});

test('and switching back lands on that grant’s menu, not on a remembered address', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.multiRole);

  // Out to the teacher and back. The second half is what says the landing is
  // resolved from whichever grant is being put on rather than from one path
  // written into the switch - a fix that always sent people to the teacher's
  // dashboard would pass the row above and die here.
  const teacherLanding = await wearing(page, TEACHER);
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(teacherLanding);

  const committeeLanding = await wearing(page, PROGRAM_MANAGER_0501);
  expect(
    committeeLanding,
    'the two grants do not share a landing, or this row proves nothing',
  ).not.toBe(teacherLanding);

  await expect
    .poll(() => new URL(page.url()).pathname, {
      message: 'where the browser stands after switching back',
    })
    .toBe(committeeLanding);
});
