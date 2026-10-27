'use strict';

const { expect } = require('@playwright/test');

const { ACCOUNTS, PASSWORD } = require('./accounts');
const { BACKEND_URL } = require('./env');

/**
 * A retired parent, built over HTTP and put back — the situation the seed has
 * none of.
 *
 * `backend/lib/reach.js` answers the pickers with retired departments and
 * curricula too (*Retired ones come too*), and several tickets are about what a
 * screen does with one: #232 and #244 about the record that is filed in one,
 * #234 about the filter that is pointed at one. The seed has neither a retired
 * department nor a retired curriculum (measured 26 ตุลาคม 2569), so every one of
 * those rows makes its own.
 *
 * It lives here rather than in a spec because no row's claim lives in it: it is
 * an instrument, which is what makes it shareable at no cost to any proof
 * (#171). #244 wrote it inside its own file and #234 moved it here at the second
 * caller, which is where `e2e/support/rubrics-screen.js`'s own header says the
 * twin query in `reach.js` was extracted.
 *
 * It is built over HTTP and not through a screen for `233a` row 2's reason: a
 * mutant that has the frontend broken cannot stop a restore made below the seam
 * (#181), and `workers: 1` means nothing else is reading the record while a row
 * holds it switched off.
 *
 * **One `switchOff` per context.** The restore disposes the context it was given,
 * because a row that forgets to dispose leaks a request context for the rest of
 * the run and nothing says so. A row that needs two records switched off takes
 * two contexts, one per call — which is `facultyContext` being cheap on purpose.
 */

/**
 * Signs in the administrator who may switch a department or a curriculum off.
 *
 * `backend/routes/programs` and `backend/routes/departments` name
 * `FACULTY_ADMIN` and `DEPT_ADMIN` and answer anybody else 403, which is what
 * `198a` row 5 measured: the system administrator who makes other files'
 * fixtures may not make this one.
 */
async function facultyContext(playwright) {
  const faculty = await playwright.request.newContext();
  const inn = await faculty.post(`${BACKEND_URL}/api/auth/login`, {
    data: { email: ACCOUNTS.facultyAdmin, password: PASSWORD },
  });
  expect(inn.status(), 'the administrator who may switch a parent off').toBe(200);
  return faculty;
}

/**
 * Switches one record's `is_active` off and hands back what puts it on again.
 *
 * The whole record is read first and written back with one field changed,
 * because these are `PUT`s and not patches.
 *
 * The restore reports a refusal through `onFailure` rather than throwing: a
 * `finally` that throws replaces the body's error, so a sweep would name the
 * housekeeping and not the claim that had just failed (#181). The caller passes
 * a function that remembers the sentence for a later hook to fail the file with.
 *
 * `onFailure` is **required**, and that is the whole of #181's rule rather than
 * half of it: a restore whose failure goes nowhere leaves a retired record in a
 * schema the next file is handed, with nothing red to say so (#132, #89). So the
 * arrangement refuses to run without somewhere to report to — refusing here is
 * safe, because this is the row's arrange step and not its `finally`.
 *
 * And every way the restore can fail goes the same way, not only a non-200: a
 * transport error thrown out of `put` would land inside the caller's `finally`
 * and replace the row's own error, which is the exact failure #181 is about.
 */
async function switchOff(faculty, path, key, { onFailure } = {}) {
  if (typeof onFailure !== 'function') {
    throw new Error('switchOff needs an onFailure to report a failed restore to - #181');
  }

  const read = await faculty.get(`${BACKEND_URL}${path}`);
  expect(read.status(), `the ${key} this row switches off for a moment`).toBe(200);
  const body = await read.json();
  const record = body[key];

  const off = await faculty.put(`${BACKEND_URL}${path}`, {
    data: { ...record, is_active: false },
  });
  expect(off.status(), `switching the ${key} off`).toBe(200);
  const retired = await off.json();
  expect(retired[key].is_active, 'the situation this row is about').toBe(false);

  return async () => {
    try {
      const on = await faculty.put(`${BACKEND_URL}${path}`, {
        data: { ...record, is_active: true },
      });
      if (on.status() !== 200) {
        onFailure(`the ${key} was answered ${on.status()} when switched back on`);
      }
    } catch (error) {
      onFailure(`the ${key} could not be switched back on: ${error.message}`);
    } finally {
      await faculty.dispose().catch(() => {});
    }
  };
}

module.exports = { facultyContext, switchOff };
