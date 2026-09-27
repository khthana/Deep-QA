'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const {
  avatarButton,
  avatarImage,
  openProfilePhoto,
  savePhoto,
} = require('../support/shell');

/**
 * docs/acceptance/47-profile-photo.md — the half a browser can prove.
 *
 * `backend/test/profile-photo.test.js` owns the rules: the signature check, the
 * size limit, the three answers a retrieval can give, and that one account
 * cannot be handed another's photo. Repeating any of them here would be the same
 * claim asserted twice, in the place that goes stale.
 *
 * Three things exist only in front of the screen and are here:
 *
 * - the **round trip through a real file input**, `35a`'s reason: every backend
 *   row builds its own multipart body, so nothing in that suite says the form on
 *   the screen sends what the route reads;
 * - the **avatar drawn from bytes the server was asked for**. This is the
 *   inherited defect turned round. What was delivered put a Google address in
 *   the profile answer and pointed an `<img>` at it, so the photograph anybody
 *   saw was hosted at another company and blank for everybody who signs in with
 *   a password — and the copy the system did keep was served out of
 *   `express.static` with no guard at all. That a photo survives a **reload** is
 *   what says the navbar is drawing what the account has and not the `File` the
 *   chooser happened to be holding a moment ago;
 * - the **refusal arriving as words on the screen**, for the file that is named
 *   `.png`, declared `image/png`, and is a PDF.
 *
 * Nothing here asserts the avatar's *appearance* — that it is round, that it
 * sits where the placeholder sat. Those are hand-walked rows on the sheet.
 */

/** PNG's magic number, which is the whole of what the server reads. */
const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 7),
]);

/** JPEG's own, so *which* photo is on the screen is a question with an answer. */
const JPEG_BYTES = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(64, 3),
]);

/** The file that will claim to be a PNG, as `35a` has one. */
const PDF_BYTES = Buffer.from('%PDF-1.7\n1 0 obj\n<< >>\nendobj\ntrailer\n%%EOF\n', 'latin1');

/**
 * The first row writes a `user_image` row, so the schema is put back — #134.
 * The files themselves are the run's to clear (`support/uploads.js`), which
 * happens beside the reseed at the start of the next one.
 */
let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

test('a photo chosen in the dialog is drawn in the navbar, and is still there after a reload', async ({
  page,
}) => {
  // Criteria 1 and 2. The account starts on the placeholder, which is what makes
  // the change measurable rather than assumed: the placeholder is an icon, so
  // *no image in the button* is the precondition.
  await signIn(page, ACCOUNTS.teacherTwo);
  // The button first, then what is in it — #164. A count of nought is also what
  // a navbar that has not been drawn yet answers, so the row would pass on a
  // screen with no avatar at all if it asked only the second question.
  await expect(avatarButton(page)).toBeVisible();
  await expect(avatarImage(page)).toHaveCount(0);

  await openProfilePhoto(page);
  const { upload, redraw } = await savePhoto(page, {
    bytes: PNG_BYTES,
    name: 'หน้าของฉัน.png',
  });

  expect(upload.status(), JSON.stringify(await upload.json())).toBe(200);
  expect(redraw.status()).toBe(200);
  expect(redraw.headers()['content-type']).toBe('image/png');

  // There is no success message to look for, and the comment on `photoSaved`
  // says why: the reload that tells the shell there is a photo now takes the
  // snackbar's own state down with it. The photo arriving is the confirmation.
  const photo = avatarImage(page);
  await expect(photo).toBeVisible();
  // A blob URL, which is the point of the whole retrieval half: the bytes were
  // fetched by this client with its cookie and handed to the `<img>`. An `src`
  // pointing at the API — or at anybody else — would be the defect back.
  await expect(photo).toHaveAttribute('src', /^blob:/);

  // And after a reload, when nothing in this tab holds the file any more. The
  // request is waited for rather than the image, because *that* is the claim:
  // the navbar asks the server for the photo of whoever the cookie names.
  const refetched = page.waitForResponse(
    response =>
      new URL(response.url()).pathname === '/api/me/photo' &&
      response.request().method() === 'GET',
  );
  await page.reload();
  expect((await refetched).status()).toBe(200);
  await expect(avatarImage(page)).toBeVisible();
});

test('a PDF named .png is refused in words, and the avatar is left alone', async ({ page }) => {
  // Criterion 3 as a person meets it. The bytes disagree with both the name and
  // the declared type, so a screen that read either one would accept this.
  await signIn(page, ACCOUNTS.facultyAdmin);
  await expect(avatarButton(page)).toBeVisible();
  await openProfilePhoto(page);

  const { upload } = await savePhoto(page, { bytes: PDF_BYTES, name: 'photo.png' });
  expect(upload.status()).toBe(400);

  await expect(page.getByRole('alert')).toHaveText(REFUSALS.photoNotImage);
  // The dialog stays open on a refusal — a box that closed would leave the
  // sentence nowhere and the choice to make again from the menu.
  await expect(page.getByRole('heading', { name: 'รูปโปรไฟล์' })).toBeVisible();
  await expect(avatarImage(page)).toHaveCount(0);
});

test('a replacement is fetched again, without the shell reloading around it', async ({ page }) => {
  // Criterion 4 in front of a screen. The backend suite owns the disk half — the
  // bytes the old file held are gone — and what is only here is that the navbar
  // notices: `has_photo` was true before this upload and is true after it, so
  // nothing the shell holds has changed and no answer the navbar re-reads would
  // tell it anything. Something has to say *ask again*.
  await signIn(page, ACCOUNTS.teacherOne);
  await expect(avatarButton(page)).toBeVisible();

  await openProfilePhoto(page);
  const first = await savePhoto(page, { bytes: PNG_BYTES, name: 'first.png' });
  expect(first.upload.status(), JSON.stringify(await first.upload.json())).toBe(200);
  expect(first.redraw.headers()['content-type']).toBe('image/png');
  const before = await avatarImage(page).getAttribute('src');

  await openProfilePhoto(page);
  const second = await savePhoto(page, {
    bytes: JPEG_BYTES,
    name: 'second.jpg',
    mimeType: 'image/jpeg',
  });
  expect(second.upload.status()).toBe(200);
  // The second answer is the new photo, fetched with the session like the first
  // one — not the `File` the chooser was holding, which is what would still be
  // on the screen if nothing asked.
  expect(second.redraw, 'the navbar never asked for the replacement').not.toBe(null);
  expect(second.redraw.headers()['content-type']).toBe('image/jpeg');
  await expect.poll(() => avatarImage(page).getAttribute('src')).not.toBe(before);
});
