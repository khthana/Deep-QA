'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isWrite } = require('../support/gate');
const { watchForTheSentence, neverSaid } = require('../support/frame-sampler');
const { avatarButton, openProfilePhoto, photoInput } = require('../support/shell');

/**
 * #257 — the frame `253a` could not read.
 *
 * The owner's answer of 31 ตุลาคม 2569 on #253 was **ข้อ ก, nothing is said**,
 * and its reason was that closing this box unmounts it, so a refusal reaches
 * `setError` on a component nobody is drawing. `253a`'s first row holds that
 * answer and reads it at `GONE_MS = 400`, which is past the exit tween on
 * purpose and says so on itself: what no wait of any length can answer is
 * whether the sentence was on the screen **inside** the tween, which needs a
 * sample per frame (#164).
 *
 * ## What the measurement found, 1 พฤศจิกายน 2569
 *
 * `e2e/probes/257-the-refusal-inside-the-tween.spec.js`, the four arms that vary
 * when the answer lands, over two runs (the fifth arm is the reopen one, which
 * was added after the owner's answer and prices the flag's shape, not this):
 *
 * | ปล่อยคำตอบเมื่อ | กล่องอยู่ในเอกสารถึง | ประโยคอยู่กี่เฟรม | เฟรมแรก / opacity |
 * |---|---|---|---|
 * | ไม่ปล่อย | 201 / 205 ms | 0 | — |
 * | 0 ms | 199 / 211 ms | 9 / 9 | 37 ms ที่ 0.966 · 40 ms ที่ 0.930 |
 * | 90 ms | 208 / 199 ms | 5 / 4 | 127 ms ที่ 0.092 |
 * | 400 ms (`GONE_MS`) | 195 / 227 ms | **0** | — |
 *
 * So the reason the answer rested on was false in its own words: the sentence
 * was **drawn**, at all but full opacity, and faded out with the box over about
 * 160ms. `PerformanceObserver` with `type: 'element'` reported a `renderTime`
 * for it, which is the browser's own answer and not an inference, and 60 to 62
 * frames ran after the last sighting, so the frames it was on were painted.
 * The control arm at `GONE_MS` read it on no frame, which is what says the two
 * arms that saw frames measured something rather than reading a page that never
 * took the sentence away (#164, #171).
 *
 * That went back to the owner rather than into a commit message (#228), because
 * the answer it contradicts was given on a reading that could not see the
 * frame, not because anybody decided otherwise. **Answered on
 * 1 พฤศจิกายน 2569: option ข — silent in that window too.** The sentence is not
 * said anywhere, which is what ข้อ ก's own wording described; the guard is in
 * `ProfilePhotoDialog.submit`'s `catch`, which asks whether the person has
 * already handed the box back.
 *
 * ## Why this is a row and `169`'s measurement is a probe
 *
 * #169's condition is a tab being given **no frames**, which Playwright
 * suppresses: a backgrounded page there still reports `visibilityState:
 * "visible"` and counts 60 frames a second, so that question needs a Chrome of
 * its own over raw CDP and can never be a row. This one is the opposite state —
 * the person is looking at the screen and the tween is running — which is the
 * only state the driver can give, so the seam holds the claim and the
 * instrument belongs in a row (#141, #169).
 *
 * The probe is kept all the same, for what this row does not read: the window's
 * length and the opacity the sentence was drawn at. Those are the numbers that
 * priced the owner's question, nothing else can read them again, and the defect
 * itself is reproducible from `mutation/257-the-refusal-inside-the-tween.py
 * saysitwhileitfades` rather than from an argument about what the code used to
 * do (#115, #203).
 *
 * ## The other direction of the guard, which is not this file's row
 *
 * A guard of the shape *stay quiet where X* is wrong in two directions (#108),
 * and the other one is a refusal that lands while the box is **still open**,
 * which must still be drawn. That claim is `47a`'s — *a PDF named .png is
 * refused in words, and the avatar is left alone* — and it is what kills
 * `257:quietalways`. A second row here would be that claim counted twice.
 *
 * The success path is `253a`'s second row: an upload the person walked away from
 * still reaches the shell, which this guard does not touch.
 *
 * ## What this file writes
 *
 * Nothing. The upload is held at the route and answered there, so `user_image`
 * is untouched and no file reaches the disk. One sign-in, so `user_log` gains
 * one row — the one table nobody can clean, as `201a`, `88a` and `253a` say of
 * their own. The file can be run twice.
 */

/** Worded so no screen of the product could say it by itself (#93). */
const REFUSED = 'ไม่อนุญาตให้บันทึกรูปนี้ (แถวของ #257)';

/** The heading `ProfilePhotoDialog.js` draws, which is how the box is found. */
const HEADING = 'รูปโปรไฟล์';

/** PNG's magic number; these bytes are the whole of what the server reads. */
const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 7),
]);

const PHOTO_ROUTE = /^\/api\/me\/photo$/;

/**
 * How long the sampler runs after the press.
 *
 * `253a`'s `GONE_MS` is 400 and this is longer, for the opposite reason: there
 * the number had to be past the window, here it has to **contain** it with room
 * to spare, because what is being counted is every frame the box could have
 * drawn anything on. The window measured 195–227ms over eight arms on
 * 1 พฤศจิกายน 2569, so this is about four times it. It cannot decide anything
 * (#52): a sentence drawn on one frame fails the row at any length that holds
 * the window, and the frame count below is what says the sampler ran.
 */
const WATCH_MS = 800;

const button = (page, name) => page.getByRole('button', { name, exact: true });

/** The form's own way out — `253a`'s subject, and this row's way into the window. */
const cancel = (page) => button(page, 'ยกเลิก');

/**
 * What the sampler is asked for beside the sentence.
 *
 * `support/frame-sampler.js` answers *was it ever on the screen* for one
 * sentence; this row needs a second reading beside it - **was the box in the
 * document at all** while the sampler ran - or it passes on a screen that took
 * the box away instantly, having proved that nothing can be drawn in a window
 * that does not exist (#171). That reading is in the shared instrument rather
 * than copied in here, because no claim of this row lives in it (#171, #104):
 * #257 gave `watchForTheSentence` its optional `alsoShowing`, and what is local
 * is only which element this screen's window is read from. The richer copy -
 * opacity per frame, element timing - is the probe's, which measures rather than
 * claims.
 */
const THE_BOX = { selector: 'h3', text: HEADING };

test('a refusal that lands while the box is still fading is said on no frame', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherOne);

  await openProfilePhoto(page);
  await photoInput(page).setInputFiles({
    name: 'หน้าของฉัน-257.png',
    mimeType: 'image/png',
    buffer: PNG_BYTES,
  });
  const upload = await gate(page, PHOTO_ROUTE, isWrite, { refusal: REFUSED });
  await button(page, 'บันทึกรูปโปรไฟล์').click();
  await upload.sent;

  const watch = await watchForTheSentence(page, REFUSED, THE_BOX);
  await cancel(page).click();

  // Handed over with nothing waited for in between, so the answer lands at the
  // top of the window rather than at a moment a clock chose (#52). The probe's
  // arms measured 37 and 40ms from the press, against a window of 195–227.
  upload.open();
  await upload.answered;
  await page.waitForTimeout(WATCH_MS);

  // The claim, with the shared instrument's own reading that the sampler ran
  // above it: a sampler that never ran reports nothing said, which is the answer
  // this row wants and no evidence at all (#164).
  const seen = await neverSaid(
    watch,
    'frames drawing the refusal of a box being handed back',
  );

  // And the window it sampled existed. This one is read **below** the claim, so
  // that the mutant takes the claim away rather than a reading above it (#233).
  // Neither reading has a mutant of its own — nothing in `src/` can take the
  // window away, and the day something does, that is what they are here to say.
  expect(seen.alsoFrames, 'frames the fading box was in the document on').toBeGreaterThan(1);

  // The reading that follows, as in `253a`: the box has gone and the person is
  // back on the screen they were on, which is what makes the silence a silence
  // rather than a page that never drew (#171).
  await expect(avatarButton(page), 'the navbar the person came back to').toBeVisible();
  await expect(
    page.getByRole('heading', { name: HEADING, exact: true }),
    'the box the upload was sent from',
  ).toBeHidden();
});
