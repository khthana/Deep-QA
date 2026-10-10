'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { gate, isGet, isWrite } = require('../support/gate');
const { PDF_BYTES, attach, evidencePath } = require('../support/evidence-screen');
const improvement = require('../support/improvement-screen');
const { CARD_SCREENS, pencils, bins } = require('../support/card-screens');
const weights = require('../support/weights-screen');
const groups = require('../support/groups-screen');
const enrolment = require('../support/enrolment-screen');

/**
 * #152 - a save whose reload is refused says the refusal, not that it saved.
 *
 * `load` catches its own failure: it sets the refusal as the notice and returns
 * normally. Every handler that reloaded and then said its own บันทึก…แล้ว
 * therefore put that sentence on top of the refusal, so the person was told the
 * save had worked and nothing at all about the list in front of them.
 *
 * The owner chose on 10 October 2569, of the three options #152 put: **the
 * refusal wins**. The save did land, but the screen cannot show that it did,
 * so what it says is that the list could not be read back.
 *
 * ## Why the sentence did not simply move above the reload
 *
 * Moving it is what the other ten screens do - `Departments.js` and its
 * siblings set their sentence and then reload, so a refusal lands on top of it -
 * and it was the first thing tried here. Measured against `149a` it costs
 * fourteen rows, on all seven card screens and on both save and remove. #149
 * decided that a sentence belongs to the screen it was asked for, so a save
 * whose reload another pencil overtook says nothing over the form that pencil
 * opened; a sentence set *before* the reload is already drawn when the pencil
 * lands.
 *
 * So `load` reports whether it drew, and each handler asks both questions:
 *
 *   - the reload was refused   -> no sentence, and `load`'s own refusal is the
 *     banner. That is this file.
 *   - the reload was overtaken -> no sentence. That is `149a`, still green.
 *
 * Both halves of that `&&` are claims, and the sweep says which mutant holds
 * which: `mutation/152-the-refusal-wins.py`.
 *
 * ## Ten screens and eighteen sites, not seven and seven
 *
 * #152's table named seven teacher screens and seven saves. Counted by the
 * mechanism - *a handler awaits something that cannot throw and then says it
 * went right* - there are ten files and eighteen sites, and there is a row here
 * for each:
 *
 *   - the five card screens, `ActivityEvidence` and `ContinuousImprovement`,
 *     each with a save and a remove. The ticket wrote remove down as **not
 *     measured**; it has the same shape, and these rows are the measurement.
 *   - `GradingWeights.save`, which has no `showing.current === sent` guard at
 *     all. #152's escape clause - *the refusal survives when another form was
 *     opened* - never applied to it, nor to the next two: the sentence won on
 *     every refused reload, with nothing open.
 *   - `StudentGroups.after`, the one exit every write on that screen takes.
 *   - `SubjectStudents.add` and `.remove`. `add` reaches `load` through the
 *     `reload` wrapper, which is why a grep for `load` could not see it and
 *     why that row is the one that says the wrapper passes the answer on.
 *
 * ## How a reload is made to fail
 *
 * `151a`'s way, the situation being the same one: the write is answered by
 * `gate` with a crafted 200 and the reload that follows with a crafted 409, so
 * no row here reaches the database through a save. Each row reads once, after
 * the refused reload has reached the page and `SETTLE_MS` for its commit
 * (#50, #52); what stands behind that number is the sweep.
 *
 * ## What this file writes
 *
 * Its situation only, and `hold()` takes it back out: one file on
 * ActivityEvidence's shelf per row there, attached by the row (#129), and one
 * entry on the improvement plan, which the row that seeds it clears. Every
 * other row's write is the crafted 200 and never reaches the database.
 */

const db = createPool({ schema: E2E_SCHEMA });

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(async () => {
  await release();
  await db.end();
});

/** The body a gated write is answered with. Nothing on any screen draws it. */
const SAVED = {};

/** The reload's refusal - worded so nothing on any of the screens says it. */
const REFUSED = 'เรียกรายการใหม่ไม่ได้ เพื่อการทดสอบ #152';

const SETTLE_MS = 250;

const button = (scope, name) => scope.getByRole('button', { name, exact: true });

/**
 * Gates the write a press sends and the reload that follows it. The list is on
 * the write's own route on most of these screens and on its own route on two.
 */
async function gateTheWriteAndItsReload(page, api, list = api, success = SAVED) {
  const write = await gate(page, api, isWrite, { success });
  const reload = await gate(page, list, isGet, { refusal: REFUSED });
  return { write, reload };
}

/** Lets the write go, then the refused reload, and waits for the commit. */
async function refuseTheReload(page, { write, reload }) {
  write.open();
  await reload.sent;
  reload.open();
  await reload.answered;
  await page.waitForTimeout(SETTLE_MS);
}

/**
 * #152's claim, read once at a settle point rather than retried (#50): the
 * refusal is the one thing the screen says.
 *
 * Both halves are asserted, because the absence of the sentence means nothing
 * on its own - a screen that said nothing whatever would pass that half, and a
 * locator scoped to something never drawn reads empty either way (#171). The
 * refusal's presence is what makes the absence a measurement.
 */
async function onlyTheRefusal(page, sentence, what) {
  expect(await page.getByText(REFUSED).count(), "the failed reload's refusal").toBe(1);
  expect(await page.getByText(sentence).count(), what).toBe(0);
}

for (const screen of CARD_SCREENS) {
  test.describe(`${screen.name} (${screen.file})`, () => {
    test('a save whose reload is refused says the refusal and not that it saved', async ({
      page,
    }) => {
      await signIn(page, ACCOUNTS.teacherOne);
      await screen.open(page);
      await expect(pencils(page).nth(0), 'a card to edit').toBeVisible();

      await pencils(page).nth(0).click();
      const gates = await gateTheWriteAndItsReload(page, screen.api);
      await button(page, 'บันทึก').click();
      await refuseTheReload(page, gates);

      await onlyTheRefusal(page, screen.saved, 'the banner of the save');
    });

    test('a removal whose reload is refused says the refusal and not that it removed', async ({
      page,
    }) => {
      await signIn(page, ACCOUNTS.teacherOne);
      await screen.open(page);
      await expect(bins(page).nth(0), 'a card to remove').toBeVisible();

      const gates = await gateTheWriteAndItsReload(page, screen.api);
      await bins(page).nth(0).click();
      await button(page, 'ลบ').click();
      await refuseTheReload(page, gates);

      await onlyTheRefusal(page, screen.removed, 'the banner of the removal');
    });
  });
}

test.describe('ActivityEvidence.js', () => {
  // A PUT and a DELETE are both on the one file's own route; the list it is
  // drawn from is on the Activity's.
  const EVIDENCE_WRITE = /^\/api\/teaching\/sections\/\d+\/evidence\/\d+$/;
  const EVIDENCE_LIST = /\/activities\/\d+\/evidence$/;
  const pencilOf = (page, name) => button(page, `แก้ไขหลักฐาน ${name}`);
  const binOf = (page, name) => page.getByLabel(`ลบหลักฐาน ${name}`);

  /** One file on this teacher's shelf, attached by the row (#129). */
  async function aFile(page, tag) {
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
    await page.goto(evidencePath(rows[0].section_id, rows[0].id));
    const name = `152-${tag}.pdf`;
    await attach(page, { bytes: PDF_BYTES, name, description: `แนบไว้สำหรับแถว ${name}` });
    await expect(pencilOf(page, name)).toBeVisible();
    return name;
  }

  test('a save whose reload is refused says the refusal and not that it saved', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const name = await aFile(page, 'save');

    await pencilOf(page, name).click();
    const gates = await gateTheWriteAndItsReload(page, EVIDENCE_WRITE, EVIDENCE_LIST);
    await button(page, 'บันทึก').click();
    await refuseTheReload(page, gates);

    await onlyTheRefusal(page, 'บันทึกหลักฐานการประเมินแล้ว', 'the banner of the save');
  });

  test('a removal whose reload is refused says the refusal and not that it removed', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const name = await aFile(page, 'remove');

    const gates = await gateTheWriteAndItsReload(page, EVIDENCE_WRITE, EVIDENCE_LIST);
    await binOf(page, name).click();
    await button(page, 'ลบ').click();
    await refuseTheReload(page, gates);

    await onlyTheRefusal(page, 'ลบหลักฐานการประเมินแล้ว', 'the banner of the removal');
  });
});

test.describe('ContinuousImprovement.js', () => {
  const { LABELS } = improvement;
  const TYPE = 'SUMMARY';
  const region = (page) => improvement.formSection(page, TYPE);
  const editor = (page) => region(page).getByLabel(LABELS[TYPE], { exact: true });

  async function openThePlan(page) {
    await signIn(page, ACCOUNTS.teacherOne);
    const [sectionId] = await improvement.mySectionIds(page);
    await improvement.openPlan(page, sectionId);
    return sectionId;
  }

  test('a save whose reload is refused says the refusal and not that it saved', async ({
    page,
  }) => {
    await openThePlan(page);
    // Which button opens the editor depends on whether anything is written
    // there, and a row that had to know which would be asserting about the
    // state it is setting up - `writeSection`'s reason, and its shape.
    const start = button(region(page), `เขียน${LABELS[TYPE]}`);
    const change = button(region(page), `แก้ไข${LABELS[TYPE]}`);
    await expect(start.or(change), 'the button that opens the editor').toBeVisible();
    if (await start.count()) await start.click();
    else await change.click();
    await editor(page).fill('ข้อความที่แถวนี้พิมพ์ลงไป #152');
    const gates = await gateTheWriteAndItsReload(page, improvement.API);
    await button(region(page), 'บันทึก').click();
    await refuseTheReload(page, gates);

    await onlyTheRefusal(page, `บันทึก${LABELS[TYPE]}แล้ว`, 'the banner of the save');
  });

  test('a removal whose reload is refused says the refusal and not that it removed', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const [sectionId] = await improvement.mySectionIds(page);
    const [clo] = await improvement.myClos(page, sectionId);
    const entry = await improvement.seedEntry(page, sectionId, {
      clo_id: clo.clo_id,
      detail_type: TYPE,
      detail_text: 'ข้อความที่แถวนี้จะลบ #152',
    });
    await improvement.openPlan(page, sectionId);
    try {
      const gates = await gateTheWriteAndItsReload(page, improvement.API);
      await button(page, `ลบ${LABELS[TYPE]}`).click();
      await button(page, 'ลบ').click();
      await refuseTheReload(page, gates);

      await onlyTheRefusal(
        page,
        `ลบ${LABELS[TYPE]}แล้ว`,
        'the banner of the removal',
      );
    } finally {
      // The write was the crafted 200, so the entry this row seeded is still
      // there. Put it back in `finally`, or the next mutant's kill count is
      // about the row before (#89, #52).
      await improvement.clearEntry(page, sectionId, entry.entry_id);
    }
  });
});

test.describe('GradingWeights.js', () => {
  test('a save whose reload is refused says the refusal and not that it saved', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const [sectionId] = await enrolment.mySectionIds(page);
    await weights.openWeights(page, sectionId);
    await expect(button(page, 'บันทึก'), 'the save button').toBeVisible();

    const gates = await gateTheWriteAndItsReload(page, weights.API);
    await button(page, 'บันทึก').click();
    await refuseTheReload(page, gates);

    await onlyTheRefusal(page, 'บันทึกสัดส่วนคะแนนแล้ว', 'the banner of the save');
  });
});

test.describe('StudentGroups.js', () => {
  const GROUP = 'กลุ่มของแถว 152';

  /**
   * Creating, moving, taking out and disbanding all end in `after`, so one row
   * covers the site and the mutant is anchored there for the same reason. What
   * each of the other three would add is that its own way in arrives there,
   * and no mutant at that line could tell them apart (#191).
   */
  test('a write whose reload is refused says the refusal and not that it wrote', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const [sectionId] = await enrolment.mySectionIds(page);
    await groups.openGroups(page, sectionId);

    await page.getByLabel('ชื่อกลุ่มงาน', { exact: true }).fill(GROUP);
    const gates = await gateTheWriteAndItsReload(
      page,
      new RegExp(`^${groups.API(sectionId)}$`),
    );
    await button(page, 'สร้างกลุ่ม').click();
    await refuseTheReload(page, gates);

    await onlyTheRefusal(
      page,
      `สร้างกลุ่ม ${GROUP} แล้ว`,
      'the banner of the write',
    );
  });
});

test.describe('SubjectStudents.js', () => {
  const REMOVAL = /^\/api\/teaching\/sections\/\d+\/students\/\d+$/;

  test('an enrolment whose reload is refused says the refusal and not that it enrolled', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const [sectionId] = await enrolment.mySectionIds(page);
    await enrolment.openEnrolment(page, sectionId);

    await page
      .getByLabel('รหัสนักศึกษา', { exact: true })
      .fill(enrolment.SPARE_CODES[0]);
    // The answer carries a student because the handler reads one out of it to
    // build its sentence. A mutant that makes the sentence unconditional has
    // to be able to draw it, or the row would kill it for the wrong reason.
    const gates = await gateTheWriteAndItsReload(page, enrolment.API, enrolment.API, {
      student: { student_id: enrolment.SPARE_CODES[0], full_name_th: 'ชื่อของแถว 152' },
    });
    await button(page, 'เพิ่มนักศึกษา').click();
    await refuseTheReload(page, gates);

    await onlyTheRefusal(page, 'เข้าตอนเรียนแล้ว', 'the banner of the enrolment');
  });

  test('a removal whose reload is refused says the refusal and not that it removed', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const [sectionId] = await enrolment.mySectionIds(page);
    await enrolment.openEnrolment(page, sectionId);

    const bin = page.getByRole('button', { name: /^นำ / }).first();
    await expect(bin, 'a student to remove').toBeVisible();
    // The removal is on the student's own route and the list on the section's,
    // so the two gates cannot take each other's request.
    const gates = await gateTheWriteAndItsReload(page, REMOVAL, enrolment.API);
    await bin.click();
    await button(page, 'นำออก').click();
    await refuseTheReload(page, gates);

    await onlyTheRefusal(page, 'ออกจากตอนเรียนแล้ว', 'the banner of the removal');
  });
});
