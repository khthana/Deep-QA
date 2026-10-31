'use strict';

const { test, expect } = require('@playwright/test');

const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isWrite } = require('../support/gate');
const { evidencePath } = require('../support/evidence-screen');
const {
  avatarButton,
  openProfilePhoto,
  photoInput,
} = require('../support/shell');

/**
 * #253 — the two buttons that still held a flag while their own form's save
 * was out.
 *
 * The owner's answer to #228 on 26 ตุลาคม 2569 has two halves: a form that
 * sends a save closes its own fields with a flag of its own, **and ยกเลิก holds
 * nothing**. #249 landed the first half on all fifteen forms on
 * 30 ตุลาคม 2569 and left the second in its own prose rather than in the
 * tracker, which is what the rule it cited forbids (#119). This is that half.
 *
 * ## The population, which is not the number the deferral carried
 *
 * That paragraph said *four*, and *four* was `202a`'s count of `save` sites
 * whose form's ยกเลิก was `disabled={busy}`: `Plos`, `Rubrics`,
 * `RubricCriteria` and `ProgramSubjects`. #242 freed all four on
 * 28 ตุลาคม 2569, two days before the paragraph naming them was written, and
 * `242a`'s second row is what holds each of them now. So the number was a
 * record left standing rather than work left undone, and the first move here
 * was a census by the **mechanism** (#174), which is now
 * `frontend/scripts/save-window-fields.js`' third question: *which button that
 * hands the form back holds a flag*. Measured on 31 ตุลาคม 2569 over the 27
 * forms that send something — 23 ways out, of which **two** held one, and
 * neither was one of the four:
 *
 * - `components/evidence/EvidenceForm.js`, on `busy`, the page's flag, whose
 *   screen is หลักฐานการประเมิน;
 * - `components/ProfilePhotoDialog.js`, on its own `busy`.
 *
 * Both are here, two rows each, because what the two screens do when the
 * answer lands on a form that has gone is not the same thing.
 *
 * ## What each pair claims
 *
 * **หลักฐานการประเมิน** already decided what happens, and the comment at its
 * `onCancel` says it: ยกเลิก writes nothing to `showing`, so a form closing is
 * nobody taking the screen and the save is still owed its sentence (#146).
 * That is a decision in the code, so these two rows make it reachable rather
 * than asking anybody: the first reads the banner and the second the refusal,
 * which are two claims in two clauses of that handler and so two rows (#88).
 *
 * **รูปโปรไฟล์** could not say the second half, and that was the owner's
 * question. Closing that box unmounts it, so a refusal reaches `setError` on a
 * component nobody is drawing; a success still reaches `onSaved`, so the shell
 * is told and the photo changes, which is the confirmation `47a` says this
 * screen has instead of a sentence. Answered on 31 ตุลาคม 2569, **option ก**:
 * nothing is said, as today. The third row therefore asserts a silence, which
 * a criterion answered *no* needs as much as one answered *yes* (#48), and it
 * asserts what is still on the screen as well, because a reader scoped to
 * something that was never drawn reads empty either way (#171).
 *
 * That silence is read **above** the box having gone, which is the other way up
 * from how the row was first written. The box going is what makes the silence
 * true, so the mutant that keeps the box open takes the silence away as well,
 * and read in the other order it would be credited for a kill at a line above
 * the claim it was written for (#233). The box-hidden read is therefore the
 * reading that follows, and it has no mutant of its own.
 *
 * The question was priced by what the person could already do (#217): the
 * backdrop at `ProfilePhotoDialog.js:153` has never held a flag, so leaving
 * mid-upload was reachable before this ticket and the button was only stopping
 * the keyboard. That is why one box needed an owner's answer and the other
 * twenty-two ways out did not.
 *
 * ## The frame this file cannot read
 *
 * `RetiringPresence` keeps the photo box mounted for its exit tween, about
 * 190ms (#169, measured 21 October 2569), so a refusal landing inside that
 * window is drawn in a box that is fading rather than drawn nowhere. The third
 * row waits past the tween before reading, which is a limit stated rather than
 * a settle point chosen for comfort (#209); #257 carries the measurement.
 *
 * ## What this file writes
 *
 * Nothing. Every write is held at the route and answered there, so neither the
 * evidence shelf nor `user_image` is touched, and the typing is never saved.
 *
 * Measured rather than assumed (#132), on 31 ตุลาคม 2569: `leftovers.js` reports
 * 34 tables checked and one moved, `user_log +4`, which is this file's four
 * sign-ins - one per row - and the one table nobody can clean, as `201a` and
 * `88a` say of their own. The file can be run twice.
 */

const db = createPool({ schema: E2E_SCHEMA });
test.afterAll(async () => {
  await db.end();
});

/** The answer a held write is given: a body both of these screens ignore. */
const SAVED = {};

/** Worded so neither screen could say it by itself (#93). */
const REFUSED = 'ไม่อนุญาตให้บันทึกรายการนี้ (แถวของ #253)';

/** The sentence หลักฐานการประเมิน says when a save it sent lands. */
const SAID = 'บันทึกหลักฐานการประเมินแล้ว';

/** PDF is a magic number; these bytes are the whole of what the server reads. */
const PDF_BYTES = Buffer.from('%PDF-1.7\n1 0 obj\n<< >>\nendobj\ntrailer\n%%EOF\n', 'latin1');

/** PNG's own, for the photo box. */
const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 7),
]);

/** The shelf's own path, held as a write and waited for as a read. */
const EVIDENCE = /\/activities\/\d+\/evidence$/;

/** The photo endpoint, which both of this box's rows hold. */
const PHOTO = '/api/me/photo';
const PHOTO_ROUTE = /^\/api\/me\/photo$/;

/** The shell's own read of the caller, which `photoSaved` reaches through `reload`. */
const PROFILE = '/api/me';

/**
 * How long the photo box is given to go before the silence is read.
 *
 * Longer than the exit tween on purpose: the claim is about a box that has left
 * the document, and inside the tween the component is still mounted. It can
 * decide (#52), and what stands behind it is the sweep.
 *
 * It is this suite's settle point for *this sentence is not said*, not a number
 * chosen here: `152a`, `203a` and `205a` each wait a `SETTLE_MS` before reading
 * a silence, and their rows are ⚙ on it. The alternative - waiting for the box
 * to detach and reading after - is worse rather than better, because under
 * `253:photoboxstays` that wait never resolves and the row dies at a timeout
 * instead of at the claim, with the numbers it was showing (#139, #209). What
 * no wait of any length can answer is whether the sentence was on the screen
 * inside the tween; that needs a sample per frame (#164) and is #257.
 */
const GONE_MS = 400;

const button = (page, name) => page.getByRole('button', { name, exact: true });

/** The form's own way out — the control this ticket is about. */
const cancel = (page) => button(page, 'ยกเลิก');

/** The one field of the evidence form that names which file it is about. */
const describedAs = (page) => page.getByLabel('คำอธิบาย', { exact: true });

/** The Activity `teacher.one@` can attach a file to, and the shelf it hangs on. */
async function shelf() {
  const { rows } = await db.query(
    `SELECT a.id, a.section_id
       FROM activities a
       JOIN course_sections_teacher cst ON cst.section_id = a.section_id
       JOIN users u ON u.user_id = cst.user_id
      WHERE u.email = $1
      ORDER BY a.id ASC
      LIMIT 1`,
    [ACCOUNTS.teacherOne],
  );
  expect(rows, 'the seed should give teacher.one an Activity').toHaveLength(1);
  return rows[0];
}

/**
 * Opens the add form on the evidence screen, chooses a file, presses แนบหลักฐาน
 * and leaves that upload held at the route.
 *
 * The opener and the submit carry the same words, and only one of them is on
 * the screen at a time — the form is drawn *in place of* the button that opens
 * it — so both presses read the same way and the field between them is what
 * says which was which.
 */
async function attachAndHold(page, answer) {
  const activity = await shelf();
  await page.goto(evidencePath(activity.section_id, activity.id));
  await button(page, 'แนบหลักฐาน').click();
  await expect(describedAs(page)).toBeVisible();
  await describedAs(page).fill('แฟ้มของแถว #253');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'หลักฐาน-253.pdf',
    mimeType: 'application/pdf',
    buffer: PDF_BYTES,
  });

  const write = await gate(page, EVIDENCE, isWrite, answer);
  await button(page, 'แนบหลักฐาน').click();
  await write.sent;
  return write;
}

/** The shelf's own re-read, which the banner waits for (#203). */
function waitForReload(page) {
  return page.waitForResponse(
    (answer) =>
      EVIDENCE.test(new URL(answer.url()).pathname) && answer.request().method() === 'GET',
  );
}

test.describe('หลักฐานการประเมิน (EvidenceForm.js)', () => {
  test('ยกเลิก is pressable while this form’s own save is out, and the save still says so', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const write = await attachAndHold(page, { success: SAVED });

    await expect(cancel(page), 'ยกเลิก while this form’s own save is out').toBeEnabled();
    await cancel(page).click();
    await expect(describedAs(page), 'the form this save was sent from').toBeHidden();

    const reloaded = waitForReload(page);
    write.open();
    await write.answered;
    await reloaded;

    // ยกเลิก writes nothing to `showing`, so the answer is still this screen's
    // own: a form closing is nobody taking the screen (#146), and the sentence
    // is read over the list the form was drawn beside rather than over nothing.
    await expect(page.getByText(SAID), 'the banner of the save the person left').toBeVisible();
  });

  test('a refusal that lands after ยกเลิก is said too', async ({ page }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const write = await attachAndHold(page, { refusal: REFUSED });

    await expect(cancel(page), 'ยกเลิก while this form’s own save is out').toBeEnabled();
    await cancel(page).click();
    await expect(describedAs(page), 'the form this save was sent from').toBeHidden();

    write.open();
    await write.answered;

    // The other clause of the same handler, and the half that costs the person
    // something: what they chose is gone from the screen and the refusal names
    // a file they would have to pick again. That is the price of the way out
    // being theirs to take (#249), and it is the reason this is a row of its own
    // rather than a second assertion under the one above (#88).
    await expect(page.getByText(REFUSED), 'the refusal of the save the person left').toBeVisible();
  });
});

test.describe('รูปโปรไฟล์ (ProfilePhotoDialog.js)', () => {
  /**
   * Opens the box, chooses a photo, presses บันทึกรูปโปรไฟล์ and leaves the
   * upload held at the route.
   */
  async function chooseAndHold(page, answer) {
    await openProfilePhoto(page);
    await photoInput(page).setInputFiles({
      name: 'หน้าของฉัน-253.png',
      mimeType: 'image/png',
      buffer: PNG_BYTES,
    });
    const upload = await gate(page, PHOTO_ROUTE, isWrite, answer);
    await button(page, 'บันทึกรูปโปรไฟล์').click();
    await upload.sent;
    return upload;
  }

  test('ยกเลิก is pressable while the upload is out, and a refusal is then said nowhere', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const upload = await chooseAndHold(page, { refusal: REFUSED });

    await expect(cancel(page), 'ยกเลิก while this box’s own upload is out').toBeEnabled();
    await cancel(page).click();

    upload.open();
    await upload.answered;
    // Past the exit tween, which is the only window in which this component is
    // still mounted to draw anything (#169, #257).
    await page.waitForTimeout(GONE_MS);

    // The screen first, then what is not on it — #164, #171: a page that never
    // drew answers nought to the second question as well.
    await expect(avatarButton(page), 'the navbar the person came back to').toBeVisible();
    expect(await page.getByText(REFUSED).count(), 'the refusal of a box that has gone').toBe(0);

    // Below the claim on purpose. The box having gone is what makes the silence
    // true, so a mutant that keeps the box open fails the line above this one
    // first; read in the other order that mutant would be credited for a kill
    // and the row's own claim never read at all (#233). This is here as the
    // reading that follows, not as a second claim, and so has no mutant.
    await expect(
      page.getByRole('heading', { name: 'รูปโปรไฟล์', exact: true }),
      'the box the upload was sent from',
    ).toBeHidden();
  });

  test('the upload the person walked away from still reaches the shell', async ({ page }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const upload = await chooseAndHold(page, { success: SAVED });

    await expect(cancel(page), 'ยกเลิก while this box’s own upload is out').toBeEnabled();
    await cancel(page).click();

    // `onSaved` is what the person's confirmation is made of on this screen:
    // the shell re-reads the caller, the navbar draws whatever photo the account
    // now has, and there is no sentence to look for (`47a` carries that half).
    // Either request is that read — which of the two depends on whether the
    // account had a photo already, and `photoSaved` branches on it.
    const told = page.waitForResponse(
      (answer) =>
        [PROFILE, PHOTO].includes(new URL(answer.url()).pathname) &&
        answer.request().method() === 'GET',
    );
    upload.open();
    await upload.answered;
    expect((await told).status(), 'the shell being told the upload landed').toBe(200);
  });
});
