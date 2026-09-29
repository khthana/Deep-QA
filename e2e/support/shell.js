'use strict';

const { expect } = require('@playwright/test');

/**
 * The shell itself - #10. The role picker, the user menu and the two dialogs
 * that appear over the top of whatever screen is open.
 *
 * Everything here is located by what a person reads on it rather than by a
 * class name, with one exception that is worth saying out loud: the avatar
 * button carries no text at all, only an icon or a photo, so it is found as the
 * one button in the navigation bar with no text. That is a discriminator rather
 * than a description, and if a second textless button ever joins the bar this
 * is the line that will need a real one. A photo is an `<img>` with an `alt`
 * (#47), which is an accessible name and not text content, so it does not
 * disturb the filter — and `avatarImage` below is how a row asks which of the
 * two the button is showing.
 *
 * The role picker's trigger and its list items are both buttons showing a role
 * name, so they cannot be told apart by the name alone. The list renders each
 * option as `• name` and the trigger as `name`, so the anchored pattern below
 * matches only the trigger - which matters, because the picker has to be
 * clicked open before the options exist.
 */

const PROGRAMS = '/main/programs';
const PROGRAM_SUBJECTS = '/main/course-in-program';
const USERS_MENU = 'ข้อมูลผู้ใช้งาน';

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
 *
 * ## Since #81 a switch also navigates, and this deliberately does not wait
 *
 * Putting on a hat now moves the person to that grant's own landing, so the
 * moment this returns there is a client-side navigation on its way and the
 * shell is asking for the landing's data. Nothing here waits for it, for two
 * measured reasons.
 *
 * The callers are not racing it, and the property that says so is the **document
 * commit**, not any one helper. Every caller that then reads a screen asks for
 * that screen itself, and the calls this switch sets off were made by the
 * document being replaced. Where the caller goes through `openAt` that is
 * enforced rather than argued - its fence collects only what the new document
 * asked for, so an answer to the old document's question is refused however late
 * it arrives (#160, #168). Two callers instead hold their own waiter across a
 * bare `page.goto` - `10a-shell.spec.js` row 4 and `51a-renewal-across-a-switch`
 * - and for them the argument is the narrower one #160 describes: their
 * predicates name a path this switch's navigation does not fetch. The remaining
 * callers read the API through `page.request`, which no page navigation touches.
 * The list is `grep -rn 'switchTo(' e2e/tests`, not a number written here.
 *
 * And a wait here would take the claim away from the row that makes it. Where
 * a switch lands is `81a`'s subject, asserted there with `expect.poll`; if this
 * helper waited for it, the landing would become a premise of every call site
 * instead - `81-a-switch-lands-in-the-new-role.py`'s one mutant would kill every
 * switching row in the suite by timing out in here, and the two rows written to
 * prove it would prove nothing of their own. The sweep is the evidence: with the
 * navigation removed, `81a` lost both rows and all eleven of `10a` stood.
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

/**
 * The shell's three navigations, by name.
 *
 * There are three: the bar across the top, the menu down the side and the
 * breadcrumb. The menu and the breadcrumb hold links of the *same name*
 * whenever you are on a screen the menu can reach — which is what #109 turned
 * out to be, after a row that asked the page for such a link matched two
 * things about one run in three and read that as the menu having closed.
 *
 * So nothing here asks the page for a link the menu holds. It asks the menu.
 */
const navbar = page => page.getByRole('navigation', { name: 'แถบด้านบน' });
const menu = page => page.getByRole('navigation', { name: 'เมนูหลัก' });
const breadcrumb = page => page.getByRole('navigation', { name: 'Breadcrumb' });

/**
 * One entry of the side menu, by its exact name.
 *
 * `exact` because the accessible-name match is a substring by default, and the
 * names in this shell nest: ข้อมูลผู้ใช้งาน is inside แก้ไขข้อมูลผู้ใช้งาน, and
 * ข้อมูลหลัก is inside ข้อมูลหลักสูตร. A row that matched loosely would pass
 * until somebody stood on the longer screen.
 */
const menuLink = (page, name) =>
  menu(page).getByRole('link', { name, exact: true });

/**
 * Every entry the side menu is showing, with the drawing each one carries.
 *
 * The drawing is the outline of the paths inside the entry's `svg`, joined.
 * That is the only handle on *which* icon an entry is showing that does not
 * reach into the icon pack's internals, and it is enough for the two questions
 * a browser is allowed to ask here: whether an entry draws anything at all,
 * and whether two entries draw the same thing. Whether the drawing is the
 * right picture for the entry - a pair of scales beside สัดส่วนคะแนน - is a
 * thing only a person can say, and stays a hand-walked row on
 * docs/acceptance/30, 31 and 32.
 *
 * Asked of the menu's links rather than of a CSS descent into its sub-lists,
 * so that this reads the same way as everything else here: a group header is a
 * link, and so is each entry under it.
 */
async function menuEntries(page) {
  const links = await menu(page).getByRole('link').all();
  return Promise.all(
    links.map(async link => ({
      label: (await link.textContent()).trim(),
      drawing: await link.evaluate(
        entry =>
          Array.from(entry.querySelectorAll('svg path'))
            .map(path => path.getAttribute('d'))
            .join(' ') || null,
      ),
    })),
  );
}

/**
 * The photo in the avatar button, when there is one — #47.
 *
 * Located inside the button rather than as *an image on the page*, because the
 * dialog draws one too and the question a row asks is about the navbar. The
 * count is the assertion when the question is whether a photo is being shown at
 * all: the placeholder is an `<svg>` and the photo an `<img>`, so nothing to
 * read means nothing was drawn.
 *
 * By the element and not by the `img` role, which is the distinction this
 * measured the hard way: Playwright answers `getByRole('img')` with the
 * placeholder icon as well, because an `<svg>` carries that role. A row that
 * asked for the role would be told *there is a picture* in both states, which is
 * exactly the question it is trying to ask.
 */
const avatarImage = page => avatarButton(page).locator('img');

/**
 * The avatar menu: the one `<button>` in the navigation bar carrying no text.
 *
 * By the element rather than by the role, for `avatarImage`'s reason one layer
 * out. A file input answers to the button role and carries no text either, and
 * the navbar has one in it: the profile-photo dialog is mounted there, and a
 * closed dialog is still in the document — the `AnimatePresence` around it fades
 * it to `opacity: 0` and removes nothing. So after any row has opened and closed
 * that box, `getByRole('button')` here resolves to two elements and every lookup
 * built on this helper fails in strict mode.
 */
const avatarButton = page =>
  navbar(page).locator('button').filter({ hasNotText: /\S/ });

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

/**
 * Opens the profile-photo dialog from the user menu — #47.
 *
 * The menu item and the dialog's heading do not read the same words, so unlike
 * `openChangePassword` there is nothing here to keep apart; the heading is still
 * what is waited for, because the press has to have opened something before a
 * row attaches a file to it.
 */
async function openProfilePhoto(page) {
  await openUserMenu(page);
  await page.getByRole('button', { name: 'เปลี่ยนรูปโปรไฟล์' }).click();
  await expect(page.getByRole('heading', { name: 'รูปโปรไฟล์' })).toBeVisible();
}

/** The dialog's file input, by the name it carries for a reader. */
const photoInput = page => page.getByLabel('ไฟล์รูปภาพ');

/**
 * Chooses a file in the open dialog and saves it, handing back both answers.
 *
 * Both, because the upload and the redraw are two requests and the row is about
 * the pair: the POST says the bytes arrived, and the GET is the navbar fetching
 * the photo back with the session rather than drawing the `File` it already
 * holds. A helper that waited for the POST alone would pass on a screen that
 * showed the chosen file and nothing the server kept.
 *
 * The name and the bytes are given separately, for `evidence-screen.js`' reason:
 * the row that matters most sends bytes that disagree with the name.
 */
async function savePhoto(page, { bytes, name, mimeType = 'image/png' }) {
  await photoInput(page).setInputFiles({ name, mimeType, buffer: bytes });

  const posted = page.waitForResponse(
    response =>
      new URL(response.url()).pathname === '/api/me/photo' &&
      response.request().method() === 'POST',
  );
  // Caught rather than left to reject: a refused upload draws nothing, so this
  // waiter is still out when the row ends and an unhandled timeout would fail
  // the row that was proving the refusal.
  const fetched = page
    .waitForResponse(
      response =>
        new URL(response.url()).pathname === '/api/me/photo' &&
        response.request().method() === 'GET',
    )
    .catch(() => null);
  await page.getByRole('button', { name: 'บันทึกรูปโปรไฟล์' }).click();

  const upload = await posted;
  // A refused upload draws no photo, so there is no second request to wait for
  // and waiting would spend the timeout saying so.
  return { upload, redraw: upload.ok() ? await fetched : null };
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
  breadcrumb,
  menuLink,
  menuEntries,
  PROGRAMS,
  PROGRAM_SUBJECTS,
  PROGRAM_SUBJECTS_API,
  USERS_MENU,
  actingButton,
  roleOption,
  switchTo,
  expiryDialog,
  avatarButton,
  avatarImage,
  openUserMenu,
  openChangePassword,
  openProfilePhoto,
  photoInput,
  savePhoto,
  passwordFields,
  submitPasswordChange,
  signOut,
};
