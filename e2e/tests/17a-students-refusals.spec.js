'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');

const STUDENT_DATA = '/main/student-data';

/**
 * docs/acceptance/17-students.md, rows 19-22.
 *
 * The rule each row states is not "the menu entry is missing". It is that an
 * account without the grant is *refused at the server* when it types the path
 * in anyway. A test that only looked for the red banner would still pass if
 * the frontend had decided by itself and never called the API, which is
 * docs/06's own disqualification - a test that survives the deletion of the
 * rule it names is not testing that rule - and is precisely the appearance of
 * authorisation this project exists to remove. So each case waits for the
 * answer to `GET /api/students` and asserts its status.
 *
 * The half of rows 19-20 about the sidebar entry being absent is a matter of
 * what is drawn, and stays a hand-walked row.
 *
 * Row 20 left this list on 20 พ.ย. 2569: #292 gave the committee the register
 * back for its own หลักสูตร, and its row is below the control's.
 */
const REFUSED = [
  { row: 19, who: 'faculty.admin@', email: ACCOUNTS.facultyAdmin },
  { row: 21, who: 'admin@', email: ACCOUNTS.systemAdmin },
  { row: 22, who: 'teacher.one@', email: ACCOUNTS.teacherOne },
];

for (const { row, who, email } of REFUSED) {
  test(`row ${row}: ${who} typing ${STUDENT_DATA} is refused by the server`, async ({
    page,
  }) => {
    await signIn(page, email);

    const [response] = await Promise.all([
      page.waitForResponse(
        answer =>
          new URL(answer.url()).pathname === '/api/students' &&
          answer.request().method() === 'GET',
      ),
      page.goto(STUDENT_DATA),
    ]);

    expect(response.status()).toBe(403);
    await expect(page.getByText(REFUSALS.forbidden)).toBeVisible();
  });
}

/**
 * The account that does hold the grant, as the control the four refusals need:
 * without it they would all pass equally well against a route that refused
 * everybody, or that did not exist.
 *
 * The count is also this suite's proof that it is on its own schema. The
 * seeded register holds 173 students; a development database that has been
 * walked through row 5 of this document holds more, and the servers this suite
 * starts would be that database if `reuseExistingServer` were left at its
 * default.
 *
 * It therefore has to see the register as the seed left it, which is why this
 * file is named to sort before the import one: those rows add students. The
 * `a`/`b` in the two filenames is that ordering and nothing else.
 */
test('row 1 (control): dept.admin.05@ reaches the register and sees the seeded 173', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);

  const [response] = await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === '/api/students' &&
        answer.request().method() === 'GET',
    ),
    page.goto(STUDENT_DATA),
  ]);

  expect(response.status()).toBe(200);
  expect((await response.json()).total).toBe(173);
  await expect(page.getByText(REFUSALS.forbidden)).toHaveCount(0);
});

/**
 * Row 20 as #292 rewrote it (20 พ.ย. 2569): the committee reaches the register
 * of its own หลักสูตร.
 *
 * Read in the order a mutant takes the claims away. The answer first - a
 * route that still refused the role answers 403, and one that still asked
 * `department_id` alone answers this grant an empty register. Then the two
 * things the screen draws out of the server's answers for this grant: the one
 * หลักสูตร it may file under as the filter's only choice, and the department
 * behind it stated by name, which a committee grant reached no department for
 * until #292 added the departments its programmes sit in.
 *
 * Every seeded student is in `0501`, so 173 is this committee's whole register
 * and also the department's. What tells the two apart - a student of `0503` in
 * department `05` - is asserted at the HTTP seam, in `backend/test/students.test.js`
 * (#292's three rows), and not here. Reading only, so the control above still
 * sees the seed.
 */
test('row 20: prog.manager@ reaches the register of its own หลักสูตร', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);

  const [response] = await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === '/api/students' &&
        answer.request().method() === 'GET',
    ),
    page.goto(STUDENT_DATA),
  ]);

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.total).toBe(173);
  expect(body.students.every(student => student.program_id === '0501')).toBe(true);

  const filter = page.getByRole('combobox', { name: 'หลักสูตร', exact: true });
  await expect(filter.locator('option')).toHaveText(['ทุกหลักสูตร', 'วิศวกรรมคอมพิวเตอร์']);

  // The statement - the word and the name inside one element (#93).
  const stated = page
    .locator('span', { has: page.locator('span') })
    .filter({ hasText: /^ภาควิชา/ });
  await expect(stated).toHaveText('ภาควิชาวิศวกรรมคอมพิวเตอร์');
  await expect(page.getByText(REFUSALS.forbidden)).toHaveCount(0);
});
