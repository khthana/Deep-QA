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
 */
const REFUSED = [
  { row: 19, who: 'faculty.admin@', email: ACCOUNTS.facultyAdmin },
  { row: 20, who: 'committee.0501@', email: ACCOUNTS.committee0501 },
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
