'use strict';

const { expect } = require('@playwright/test');

/**
 * The shell itself - #10. The role picker, the user menu and the two dialogs
 * that appear over the top of whatever screen is open.
 *
 * Everything here is located by what a person reads on it rather than by a
 * class name, with one exception that is worth saying out loud: the avatar
 * button carries no text at all, only an icon, so it is found as the one
 * button in the navigation bar with no text. That is a discriminator rather
 * than a description, and if a second textless button ever joins the bar this
 * is the line that will need a real one.
 *
 * The role picker's trigger and its list items are both buttons showing a role
 * name, so they cannot be told apart by the name alone. The list renders each
 * option as `• name` and the trigger as `name`, so the anchored pattern below
 * matches only the trigger - which matters, because the picker has to be
 * clicked open before the options exist.
 */

const PROGRAMS = '/main/programs';
const PROGRAM_SUBJECTS = '/main/course-in-program';
const USERS_MENU = 'ผู้ใช้งานระบบ';

/** The list call the Program Subjects screen makes on the way in. */
const PROGRAM_SUBJECTS_API = '/api/program-subjects';

const ROLE_NAMES = [
  'ผู้ดูแลระบบกลาง',
  'ผู้ดูแลระบบระดับคณะ',
  'ผู้ดูแลระบบระดับภาควิชา',
  'กรรมการหลักสูตร',
  'อาจารย์ผู้สอน',
  'ผู้ประเมินภายนอก',
];

/** The picker's trigger, which shows the grant the server says is being worn. */
const actingButton = page =>
  page.getByRole('button', { name: new RegExp(`^(${ROLE_NAMES.join('|')})`) });

/** One of the grants offered in the open picker. */
const roleOption = (page, label) =>
  page.getByRole('button', { name: `• ${label}` });

/**
 * Puts on another grant and hands back the server's own answer.
 *
 * The response is returned rather than swallowed because #10's third criterion
 * is that a switch is a request the server decides, not a redraw of the menu -
 * a helper that only clicked and waited for the label to change would pass
 * against the inherited localStorage version this replaced.
 */
async function switchTo(page, label) {
  await actingButton(page).click();
  const [answer] = await Promise.all([
    page.waitForResponse(
      response => new URL(response.url()).pathname === '/api/me/acting-role',
    ),
    roleOption(page, label).click(),
  ]);
  return answer;
}

/** The shell's expiry dialog, by its heading. */
const expiryDialog = page => page.getByText('Session หมดอายุ');

/** The avatar menu: the one button in the navigation bar carrying no text. */
const avatarButton = page =>
  page.locator('nav').getByRole('button').filter({ hasNotText: /\S/ });

async function openUserMenu(page) {
  await avatarButton(page).click();
}

/**
 * Opens the change-password modal from the user menu.
 *
 * The menu item and the modal's heading read the same words; the item is a
 * button and the heading is not, which is what keeps the two apart here.
 */
async function openChangePassword(page) {
  await openUserMenu(page);
  await page.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน' }).click();
  await expect(page.getByRole('heading', { name: 'เปลี่ยนรหัสผ่าน' })).toBeVisible();
}

const passwordFields = page =>
  page.locator('form').locator('input[type="password"]');

/**
 * Fills the open modal and submits it, handing back the server's answer.
 *
 * The three fields are addressed by position rather than by label because the
 * inherited markup's labels are not associated with their inputs - the same
 * reason `signIn` gives for the sign-in screen.
 */
async function submitPasswordChange(page, current, next) {
  const fields = passwordFields(page);
  await fields.nth(0).fill(current);
  await fields.nth(1).fill(next);
  await fields.nth(2).fill(next);

  const [answer] = await Promise.all([
    page.waitForResponse(
      response => new URL(response.url()).pathname === '/api/me/password',
    ),
    page.getByRole('button', { name: 'บันทึกรหัสใหม่' }).click(),
  ]);
  return answer;
}

/** Signs out through the sidebar's own button and waits for the sign-in screen. */
async function signOut(page) {
  await page.getByRole('button', { name: 'ออกจากระบบ' }).click();
  await page.waitForURL(url => url.pathname === '/');
}

module.exports = {
  PROGRAMS,
  PROGRAM_SUBJECTS,
  PROGRAM_SUBJECTS_API,
  USERS_MENU,
  actingButton,
  roleOption,
  switchTo,
  expiryDialog,
  avatarButton,
  openUserMenu,
  openChangePassword,
  submitPasswordChange,
  signOut,
};
