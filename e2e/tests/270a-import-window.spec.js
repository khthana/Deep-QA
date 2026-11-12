'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { gate, isWrite } = require('../support/gate');
const {
  downloadTemplate,
  headerOf,
  csv,
  total,
  reportedLines,
  importWindow,
  importButton,
  sendButton,
  openImport,
  pickFile,
  fileInput,
  importedLine,
} = require('../support/import-panel');
const { openDepartments, departmentRow } = require('../support/departments-screen');

/**
 * docs/acceptance/270-import-window.md - the import as a window (#270).
 *
 * The owner's answer of 10 November 2569 put the delivered shape back: a bar at
 * the top of the screen with นำเข้า… and เพิ่ม…, and a window that holds the
 * template, the file and the two buttons, in place of the box at the foot of
 * the page. The ten screens mount one `ImportPanel` and one `PageHeader`, so the
 * window's own behaviour is read here on one screen - Departments, the census's
 * choice for the import since `14b` (#68, #171) - and what each screen adds is
 * that its own rows still import through it, which they do through
 * `support/import-panel.js`.
 *
 * Every write the window is asked to make here is either stopped at the route
 * (`gate`) or is a code in this file's own range, taken out again at the end.
 */
test.describe.configure({ mode: 'serial' });

const IMPORT = /^\/api\/departments\/import$/;

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await openDepartments(page);
});

/** Every POST to the import endpoint, from here on. */
function watchImports(page) {
  const posts = [];
  page.on('request', request => {
    if (IMPORT.test(new URL(request.url()).pathname) && request.method() === 'POST') {
      posts.push(request);
    }
  });
  return posts;
}

test('the bar holds นำเข้า… and เพิ่ม…, and no file input until the window is opened', async ({
  page,
}) => {
  await expect(importButton(page), 'the bar names the import by its register').toHaveText(
    'นำเข้าภาควิชา',
  );
  await expect(page.getByRole('button', { name: 'เพิ่มภาควิชา' })).toBeVisible();
  // The box at the foot of the page is gone: no file input anywhere until the
  // window is open, which is what made the box a box.
  await expect(page.locator('input[type="file"]')).toHaveCount(0);

  await importButton(page).click();

  await expect(importWindow(page)).toBeVisible();
  await expect(fileInput(page)).toHaveCount(1);
});

test('choosing a file sends nothing; นำเข้า does', async ({ page }) => {
  const header = headerOf(await downloadTemplate(page));
  const posts = watchImports(page);
  const name = 'departments-chosen.csv';

  await pickFile(page, { text: csv(header, 'Z1,เลือกแล้วยังไม่ส่ง,Chosen Not Sent'), name });

  await expect(importWindow(page).getByText(name, { exact: true }), 'the file is named').toBeVisible();
  await expect(sendButton(page), 'and นำเข้า is there to press').toBeEnabled();
  // A round trip to the server before the count, so that a request the choice
  // had sent would have been seen leaving (#170).
  await page.evaluate(() => fetch('/api/me').then(r => r.status));
  expect(posts, 'choosing a file is not sending it').toEqual([]);

  const held = await gate(page, IMPORT, isWrite, { success: { created: 1 } });
  await sendButton(page).click();
  await held.sent;
  expect(posts, 'นำเข้า sends it, once').toHaveLength(1);
  held.open();
  await held.answered;
});

test('นำเข้า is not pressable before a file is chosen', async ({ page }) => {
  await openImport(page);
  await expect(sendButton(page)).toBeDisabled();
});

test('while the file is out, นำเข้า, ยกเลิก and Escape do nothing', async ({ page }) => {
  const header = headerOf(await downloadTemplate(page));
  const held = await gate(page, IMPORT, isWrite, { success: { created: 1 } });
  await pickFile(page, { text: csv(header, 'Z2,ระหว่างส่ง,While Sending'), name: 'z2.csv' });

  await sendButton(page).click();
  await held.sent;

  const window = importWindow(page);
  await expect(window.getByRole('button', { name: 'กำลังนำเข้า…' })).toBeDisabled();
  await expect(window.getByRole('button', { name: 'ยกเลิก', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  // The press has had its turn before the read (#170).
  await page.evaluate(() => fetch('/api/me').then(r => r.status));
  await expect(window, 'Escape does not take the window away from its own answer').toBeVisible();

  held.open();
  await held.answered;
});

test('a success closes the window, says how many, and draws them in the list', async ({
  page,
}) => {
  const header = headerOf(await downloadTemplate(page));
  const before = await total(page);

  await pickFile(page, {
    text: csv(header, 'Z3,นำเข้าจากหน้าต่าง,Imported From The Window'),
    name: 'z3.csv',
  });
  await sendButton(page).click();

  await expect(importWindow(page), 'the window has gone').toHaveCount(0);
  await expect(importedLine(page)).toHaveText('นำเข้าสำเร็จ 1 รายการ');
  await expect.poll(() => total(page), 'the list was read again').toBe(before + 1);
  await expect(departmentRow(page, 'Z3')).toHaveCount(1);
});

test('a refused file keeps the window open, with every line and its reason', async ({
  page,
}) => {
  const header = headerOf(await downloadTemplate(page));
  const name = 'z-bad.csv';

  await pickFile(page, {
    text: csv(header, 'Z4,ดี,Good', ',ไม่มีรหัส,No Identifier', 'Z6,,No Thai Name'),
    name,
  });
  await sendButton(page).click();

  const report = importWindow(page).getByRole('alert');
  await expect(report, 'the report is in the window').toBeVisible();
  await expect.poll(() => reportedLines(page)).toEqual([3, 4]);
  await expect(importWindow(page), 'which is still open to read it in').toBeVisible();
  await expect(
    importWindow(page).getByText(name, { exact: true }),
    'and still names the file the report is about',
  ).toBeVisible();
  await expect(importedLine(page)).toHaveCount(0);
  await expect(departmentRow(page, 'Z4'), 'and wrote nothing').toHaveCount(0);
});

test('ยกเลิก closes the window and sends nothing', async ({ page }) => {
  const header = headerOf(await downloadTemplate(page));
  const posts = watchImports(page);
  await pickFile(page, { text: csv(header, 'Z7,ยกเลิก,Cancelled'), name: 'z7.csv' });

  await importWindow(page).getByRole('button', { name: 'ยกเลิก', exact: true }).click();

  await expect(importWindow(page)).toHaveCount(0);
  await page.evaluate(() => fetch('/api/me').then(r => r.status));
  expect(posts).toEqual([]);

  // And opened again it is empty: the file chosen before ยกเลิก is not waiting
  // in it to be sent by somebody who thinks they are starting afresh.
  await openImport(page);
  await expect(importWindow(page).getByText('z7.csv', { exact: true })).toHaveCount(0);
  await expect(sendButton(page)).toBeDisabled();
});

test('the focus goes into the window, and stays there', async ({ page }) => {
  // The trap ConfirmDialog has had since #217, shared through `useModalFocus`
  // rather than written twice - the issue's own condition. The control is read
  // before it is focused, so this cannot pass by its being absent (#164).
  await openImport(page);
  await expect(importWindow(page), 'the window has the focus').toBeFocused();

  const outside = page.getByRole('button', { name: 'เพิ่มภาควิชา' });
  await expect(outside, 'a control the cover is over').toBeVisible();
  await outside.focus();

  await expect(importWindow(page), 'the focus it took is back in the window').toBeFocused();
});

test('Escape closes the window when nothing is out', async ({ page }) => {
  await openImport(page);
  await page.keyboard.press('Escape');
  await expect(importWindow(page)).toHaveCount(0);
});
