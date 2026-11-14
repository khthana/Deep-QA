'use strict';

const { expect } = require('@playwright/test');
const { ACCOUNTS, IDS, PASSWORD } = require('./accounts');
const { BACKEND_URL, E2E_SCHEMA } = require('./env');
const { signIn } = require('./auth');
const { createPool } = require('../../db/pool');

/**
 * A กรรมการหลักสูตร of the whole of department 05 - #276, as an instrument.
 *
 * Until 14 พ.ย. 2569 the account that reached both 0501 and 0503 on
 * ข้อมูล Rubric กลาง was the ผู้ดูแลภาควิชา, and every row that needed the
 * screen's curriculum picker, or two curricula to move between, signed in as
 * `departmentAdmin05`. The owner's answer to #276 took the screen off that
 * role, and no seeded committee member holds two curricula, so the account is
 * built here: `deptadm05` given `PROG_MANAGER` over its own department, which
 * reaches both curricula, and wearing that hat.
 *
 * It is also the owner's other sentence made into a fixture - *ถ้า
 * ผู้ดูแลภาควิชา เป็นกรรมการหลักสูตร ก็จะเห็นตอนเปลี่ยน role*.
 *
 * **The grant is made and taken back over HTTP, and its row taken out below
 * the seam** - `233a`'s shape, for `233a`'s reasons: a mutant in the frontend
 * cannot stop a grant made this way being taken back (#181), and the revoke is
 * `UPDATE ... SET is_active = false` (`backend/routes/grants.js`), which leaves
 * a row behind for a key the seed never held (#132, #233). It is an instrument
 * and not a claim, so files share it (#171): no row's claim lives in here.
 *
 * **The hat is put on through `/api/me/acting-role`, not through the picker.**
 * The rows that use this are about the rubric screen; a switch through the
 * picker also navigates (#81), and that landing is `81a`'s claim, not theirs.
 * `page.request` shares the page's cookies, so the session the next `goto`
 * carries is the one the switch issued.
 */

const DEPARTMENT = '05';

/** Makes the grant once, for a file; returns what takes it back. */
async function departmentCommittee(playwright) {
  const admin = await playwright.request.newContext();
  // A setup that fails half-way hands back nothing to take it down, so it
  // takes down its own context here; the callers' `afterAll` then has no
  // `release` and says nothing over this error (#181).
  try {
    const inn = await admin.post(`${BACKEND_URL}/api/auth/login`, {
      data: { email: ACCOUNTS.systemAdmin, password: PASSWORD },
    });
    expect(inn.status(), 'the administrator who makes the fixture').toBe(200);
    const made = await admin.post(`${BACKEND_URL}/api/users/${IDS.departmentAdmin05}/roles`, {
      data: { role_id: 'PROG_MANAGER', scope_id: DEPARTMENT },
    });
    expect(made.status(), 'the committee grant over the department').toBe(201);
  } catch (error) {
    await admin.dispose();
    throw error;
  }

  /**
   * Takes the grant back and its row out, and answers what went wrong rather
   * than throwing: a teardown that throws replaces the error of the row that
   * just failed (#181), so the caller decides where to report it.
   */
  return async function release() {
    const failures = [];
    try {
      const undone = await admin.delete(
        `${BACKEND_URL}/api/users/${IDS.departmentAdmin05}/roles/PROG_MANAGER/${DEPARTMENT}`,
      );
      if (undone.status() !== 200) failures.push(`the grant was answered ${undone.status()}`);
    } catch (error) {
      failures.push(`the grant could not be revoked: ${error.message}`);
    }
    const pool = createPool({ schema: E2E_SCHEMA });
    try {
      await pool.query(
        `DELETE FROM user_roles
          WHERE user_id = $1 AND role_id = 'PROG_MANAGER' AND scope_id = $2 AND NOT is_active`,
        [IDS.departmentAdmin05, DEPARTMENT],
      );
    } catch (error) {
      failures.push(`the revoked grant's row could not be removed: ${error.message}`);
    }
    // Each closing step answers rather than throws, for the reason above.
    try {
      await pool.end();
    } catch (error) {
      failures.push(`the pool could not be closed: ${error.message}`);
    }
    try {
      await admin.dispose();
    } catch (error) {
      failures.push(`the request context could not be disposed: ${error.message}`);
    }
    return failures.length ? failures.join('; ') : null;
  };
}

/** Signs in as `deptadm05` and puts on the committee hat over the department. */
async function signInAsDepartmentCommittee(page) {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  const worn = await page.request.put(`${BACKEND_URL}/api/me/acting-role`, {
    data: { role_id: 'PROG_MANAGER', scope_id: DEPARTMENT },
  });
  expect(worn.status(), 'the committee hat over the department').toBe(200);
}

module.exports = { DEPARTMENT, departmentCommittee, signInAsDepartmentCommittee };
