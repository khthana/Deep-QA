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
const clos = require('../support/clos-screen');
const criteria = require('../support/achievements-screen');
const behaviors = require('../support/behaviors-screen');
const plan = require('../support/plan-screen');
const activities = require('../support/activities-screen');

/**
 * #149 and #148 — a reload does not take down the form a person is typing into.
 *
 * The seven ผู้สอน screens drew their list **and** the open form inside one gate
 * on `loading`, and every reload began by raising it. Before #146 nothing was
 * open when a reload ran, because the save that ended with one had just closed
 * every form. #146 stopped an overtaken save from closing the form the person
 * had moved on to, so a form was now standing when the reload came — and the
 * reload unmounted it, and mounted a fresh one seeded from the record. What had
 * been typed was gone without a word.
 *
 * The owner decided the answer on 21 September 2569, in two layers because the
 * measurement on #148 found two: **the screen keeps what it last drew while a
 * reload is out**, with the loading line only when there is nothing yet to
 * draw, so the form survives; and **`EntrySection` seeds its draft by the
 * entry's id and not by the object**, because on แผนพัฒนาต่อเนื่อง the section a
 * person is typing into is looked up afresh from the reloaded list, and a new
 * object with the same id re-seeded the box on the same node. The other six
 * hand their form the row held in `editing`, whose identity no reload touches.
 *
 * ## What lifting the gate opened, and the rows about it
 *
 * The seven said *the reload that follows opens no second window*: for its
 * length there was nothing on the screen to press. That is no longer true — the
 * list is drawn while the reload is out, and its pencils and เขียน work. Both
 * handlers that end with a reload decide their banner **after** it, so a form
 * opened during the reload would have had `บันทึก…แล้ว` or `ลบ…แล้ว` land on
 * it: #146's defect, reopened by this fix through a door #146 had counted as
 * shut. So each handler now asks *is the screen still where it was when I was
 * sent* at the moment it decides, which is after the reload, and the rows about
 * a save's and a removal's banner hold the reload at the route and open a form
 * under it. The save rows also read, while the reload is held and before the
 * press, that the loading line is not drawn over the list.
 *
 * A guard asked only whether it keeps quiet has not been asked whether it
 * still speaks. A save's banner with nothing in its place is `146a`'s row; a
 * removal's had none anywhere, so each screen here carries *a removal nothing
 * took the place of says what it did* (#96: one crafted value per link).
 *
 * Those rows cannot even be run against the gate: the pencil they press is not
 * drawn while a reload is out. Their clicks carry a short timeout so a run
 * against the old gate says *not there* quickly rather than at the test's end.
 *
 * ## Where a row reads
 *
 * After the held response has reached the page, then `SETTLE_MS` for the
 * commit of whatever the screen decides — the same point and the same caveat as
 * `146a` (*Anything written for timing must not be able to decide anything*,
 * #52): what stands behind it is the sweep. The banner is read **once** at that
 * point, never retried (#50).
 *
 * ## What this file writes
 *
 * Every held write is answered by `gate` with a crafted 200, so no save and no
 * removal reaches the database. What the rows do write is their situation: two
 * files on หลักฐานการประเมิน's shelf and one entry on แผนพัฒนาต่อเนื่อง, built
 * by the rows themselves (#129). `hold()` takes them out again.
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

/** The answer a held write is given: a body every one of these routes could send. */
const SAVED = {};

/** What is typed into the form that must survive — worded so no record holds it. */
const TYPED = 'ข้อความที่พิมพ์ค้างไว้ของแถว #149';

/** How long the commit is given once the held answer has reached the page. */
const SETTLE_MS = 250;

/** A press on a control a gated screen does not draw while it reloads. */
const UNDER_A_RELOAD = { timeout: 5000 };

const EVIDENCE_WRITE = /^\/api\/teaching\/sections\/\d+\/evidence\/\d+$/;
const EVIDENCE_LIST = /\/activities\/\d+\/evidence$/;

const button = (scope, name) => scope.getByRole('button', { name, exact: true });

/** The list request a write ends with, whichever route it is on. */
function waitForReload(page, list) {
  return page.waitForResponse(
    (answer) =>
      list.test(new URL(answer.url()).pathname) && answer.request().method() === 'GET',
  );
}

/**
 * The five screens whose form sits above a list of cards, each card with a
 * pencil and a bin. `field` is a box every one of the screen's forms carries,
 * `saved` and `removed` the two banners.
 */
const CARD_SCREENS = [
  {
    name: 'ผลการเรียนรู้รายวิชา',
    file: 'CourseOutcomes.js',
    open: async (page) => {
      const [sectionId] = await clos.mySectionIds(page);
      await clos.openClos(page, sectionId);
    },
    api: clos.API,
    field: 'รายละเอียดผลการเรียนรู้',
    saved: 'บันทึกผลการเรียนรู้รายวิชาแล้ว',
    removed: 'ลบผลการเรียนรู้รายวิชาแล้ว',
  },
  {
    name: 'เกณฑ์การบรรลุผล',
    file: 'AchievementCriteria.js',
    open: async (page) => {
      const [sectionId] = await criteria.mySectionIds(page);
      const [clo] = await criteria.myClos(page, sectionId);
      await criteria.openCriteria(page, sectionId, clo.clo_id);
    },
    api: criteria.API,
    field: 'เกณฑ์การประเมิน',
    saved: 'บันทึกเกณฑ์การบรรลุผลแล้ว',
    removed: 'ลบเกณฑ์การบรรลุผลแล้ว',
  },
  {
    name: 'พฤติกรรมบ่งชี้',
    file: 'MeasurableBehaviors.js',
    open: async (page) => {
      const [sectionId] = await behaviors.mySectionIds(page);
      const [clo] = await behaviors.myClos(page, sectionId);
      await behaviors.openBehaviors(page, sectionId, clo.clo_id);
    },
    api: behaviors.API,
    field: 'รายละเอียดพฤติกรรม',
    saved: 'บันทึกพฤติกรรมบ่งชี้แล้ว',
    removed: 'ลบพฤติกรรมบ่งชี้แล้ว',
  },
  {
    name: 'แผนการสอน',
    file: 'TeachingPlan.js',
    open: async (page) => {
      const [sectionId] = await plan.mySectionIds(page);
      await plan.openPlan(page, sectionId);
    },
    api: plan.API,
    field: 'หัวข้อ',
    saved: 'บันทึกแผนการสอนแล้ว',
    removed: 'ลบหัวข้อออกจากแผนการสอนแล้ว',
  },
  {
    name: 'กิจกรรมการเรียนรู้',
    file: 'LearningActivities.js',
    open: async (page) => {
      const [sectionId] = await activities.mySectionIds(page);
      await activities.openActivities(page, sectionId);
    },
    api: activities.API,
    field: 'ชื่อกิจกรรม',
    saved: 'บันทึกกิจกรรมแล้ว',
    removed: 'ลบกิจกรรมแล้ว',
  },
];

/** Every card's pencil and bin, whose labels start with แก้ไข and ลบ on all five. */
const pencils = (page) => page.getByRole('button', { name: /^แก้ไข/ });
const bins = (page) => page.getByRole('button', { name: /^ลบ./ });

/** The box a row types into, inside the one form on the screen. */
const boxOf = (page, label) => page.locator('form').first().getByLabel(label, { exact: true });

/**
 * Presses บันทึก with the write answered at once and the reload that follows it
 * held, and returns once that reload has been asked for.
 */
async function saveAndHoldTheReload(page, api) {
  const write = await gate(page, api, isWrite, { success: SAVED });
  const reload = await gate(page, api, isGet);
  write.open();
  await button(page, 'บันทึก').click();
  await reload.sent;
  return reload;
}

/** The same, for a bin and the dialog it opens. */
async function removeAndHoldTheReload(page, api, bin) {
  const write = await gate(page, api, isWrite, { success: SAVED });
  const reload = await gate(page, api, isGet);
  write.open();
  await bin.click();
  await button(page, 'ลบ').click();
  await reload.sent;
  return reload;
}

/**
 * The third clause of the owner's answer: the loading line is for a screen with
 * nothing yet to draw, not for one reloading a list it already shows. Read once,
 * `SETTLE_MS` after the held reload was asked for — `setLoading(true)` is called
 * before the request goes, and a read at the request itself could come before
 * the commit and pass for the wrong reason (#50). The reload is still held, so
 * nothing after that point takes the line down again.
 */
async function noLoadingLineOverTheList(page) {
  await page.waitForTimeout(SETTLE_MS);
  expect(
    await page.getByText('กำลังโหลดข้อมูล').count(),
    'the loading line over a list already drawn',
  ).toBe(0);
}

/** Lets a held reload go and waits for the commit of whatever the screen decides. */
async function letGo(page, reload) {
  reload.open();
  await reload.answered;
  await page.waitForTimeout(SETTLE_MS);
}

for (const screen of CARD_SCREENS) {
  test.describe(`${screen.name} (${screen.file})`, () => {
    test("what was typed into another card's form survives the reload a save ends with", async ({
      page,
    }) => {
      await signIn(page, ACCOUNTS.teacherOne);
      await screen.open(page);
      await expect(pencils(page).nth(1), 'a second card to press แก้ไข on').toBeVisible();

      await pencils(page).nth(0).click();
      const write = await gate(page, screen.api, isWrite, { success: SAVED });
      await button(page, 'บันทึก').click();
      await write.sent;

      await pencils(page).nth(1).click();
      await boxOf(page, screen.field).fill(TYPED);

      const reloaded = waitForReload(page, screen.api);
      write.open();
      await write.answered;
      await reloaded;
      await page.waitForTimeout(SETTLE_MS);

      expect(await boxOf(page, screen.field).isVisible(), "the second card's form").toBe(true);
      expect(await boxOf(page, screen.field).inputValue(), 'what was typed').toBe(TYPED);
    });

    test('a save whose reload a pencil overtook says nothing over the form it opened', async ({
      page,
    }) => {
      await signIn(page, ACCOUNTS.teacherOne);
      await screen.open(page);
      await pencils(page).nth(0).click();
      const reload = await saveAndHoldTheReload(page, screen.api);
      await noLoadingLineOverTheList(page);

      await pencils(page).nth(1).click(UNDER_A_RELOAD);
      await letGo(page, reload);

      expect(await page.getByText(screen.saved).count(), 'the banner of the save before').toBe(0);
      expect(await boxOf(page, screen.field).isVisible(), 'the form the pencil opened').toBe(true);
    });

    test('a removal whose reload a pencil overtook says nothing over the form it opened', async ({
      page,
    }) => {
      await signIn(page, ACCOUNTS.teacherOne);
      await screen.open(page);
      await expect(bins(page).nth(0)).toBeVisible();
      const reload = await removeAndHoldTheReload(page, screen.api, bins(page).nth(0));

      await pencils(page).nth(0).click(UNDER_A_RELOAD);
      await letGo(page, reload);

      expect(await page.getByText(screen.removed).count(), 'the banner of the removal').toBe(0);
      expect(await boxOf(page, screen.field).isVisible(), 'the form the pencil opened').toBe(true);
    });

    test('a removal nothing took the place of says what it did', async ({ page }) => {
      await signIn(page, ACCOUNTS.teacherOne);
      await screen.open(page);
      await expect(bins(page).nth(0)).toBeVisible();
      const reload = await removeAndHoldTheReload(page, screen.api, bins(page).nth(0));
      await letGo(page, reload);

      expect(await page.getByText(screen.removed).count(), 'the banner of the removal').toBe(1);
    });
  });
}

/**
 * หลักฐานการประเมิน — the five's shape, with its files attached by the rows
 * (`activity_evidence` is deliberately not seeded) and one form per file, which
 * seeds when it mounts (#147 — `147a` holds that); the box a row types into here
 * is the one field that is typed rather than chosen.
 */
test.describe('หลักฐานการประเมิน (ActivityEvidence.js)', () => {
  const describedAs = (page) => page.getByLabel('คำอธิบาย', { exact: true });
  const pencilOf = (page, name) =>
    page.getByRole('button', { name: `แก้ไขหลักฐาน ${name}`, exact: true });
  const binOf = (page, name) => page.getByRole('button', { name: `ลบหลักฐาน ${name}`, exact: true });

  /** The Activity `teacher.one@` can attach to. */
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

  /** Files on the shelf, named after the row that hung them there. */
  async function files(page, tag, count) {
    const activity = await shelf();
    await page.goto(evidencePath(activity.section_id, activity.id));
    const names = ['หนึ่ง', 'สอง'].slice(0, count).map((n) => `${n}-149-${tag}.pdf`);
    for (const name of names) {
      await attach(page, { bytes: PDF_BYTES, name, description: `แฟ้ม ${name}` });
      await expect(pencilOf(page, name)).toBeVisible();
    }
    return names;
  }

  test("what was typed into another file's form survives the reload a save ends with", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const [first, second] = await files(page, 'ก', 2);

    await pencilOf(page, first).click();
    const write = await gate(page, EVIDENCE_WRITE, isWrite, { success: SAVED });
    await button(page, 'บันทึก').click();
    await write.sent;

    await pencilOf(page, second).click();
    await describedAs(page).fill(TYPED);

    const reloaded = waitForReload(page, EVIDENCE_LIST);
    write.open();
    await write.answered;
    await reloaded;
    await page.waitForTimeout(SETTLE_MS);

    expect(await describedAs(page).isVisible(), "the second file's form").toBe(true);
    expect(await describedAs(page).inputValue(), 'what was typed').toBe(TYPED);
  });

  test('a save whose reload a pencil overtook says nothing over the form it opened', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const [only] = await files(page, 'ข', 1);

    await pencilOf(page, only).click();
    const write = await gate(page, EVIDENCE_WRITE, isWrite, { success: SAVED });
    const reload = await gate(page, EVIDENCE_LIST, isGet);
    write.open();
    await button(page, 'บันทึก').click();
    await reload.sent;
    await noLoadingLineOverTheList(page);

    await pencilOf(page, only).click(UNDER_A_RELOAD);
    await letGo(page, reload);

    expect(
      await page.getByText('บันทึกหลักฐานการประเมินแล้ว').count(),
      'the banner of the save before',
    ).toBe(0);
    expect(await describedAs(page).isVisible(), 'the form the pencil opened').toBe(true);
  });

  test('a removal whose reload a pencil overtook says nothing over the form it opened', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const [only] = await files(page, 'ค', 1);

    const write = await gate(page, EVIDENCE_WRITE, isWrite, { success: SAVED });
    const reload = await gate(page, EVIDENCE_LIST, isGet);
    write.open();
    await binOf(page, only).click();
    await button(page, 'ลบ').click();
    await reload.sent;

    await pencilOf(page, only).click(UNDER_A_RELOAD);
    await letGo(page, reload);

    expect(
      await page.getByText('ลบหลักฐานการประเมินแล้ว').count(),
      'the banner of the removal',
    ).toBe(0);
    expect(await describedAs(page).isVisible(), 'the form the pencil opened').toBe(true);
  });

  test('a removal nothing took the place of says what it did', async ({ page }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const [only] = await files(page, 'ง', 1);

    const write = await gate(page, EVIDENCE_WRITE, isWrite, { success: SAVED });
    const reload = await gate(page, EVIDENCE_LIST, isGet);
    write.open();
    await binOf(page, only).click();
    await button(page, 'ลบ').click();
    await reload.sent;
    await letGo(page, reload);

    expect(
      await page.getByText('ลบหลักฐานการประเมินแล้ว').count(),
      'the banner of the removal',
    ).toBe(1);
  });
});

/**
 * แผนพัฒนาต่อเนื่อง — four sections, each its own editor, of which one is open
 * at a time. It carries the one row that tells #148's layer from #149's: a
 * section that already holds an entry is looked up afresh from the reloaded
 * list, and only that case was still wiped once the gate was lifted.
 */
test.describe('แผนพัฒนาต่อเนื่อง (ContinuousImprovement.js)', () => {
  const { LABELS } = improvement;
  const region = (page, type) => improvement.formSection(page, type);
  const editor = (page, type) => region(page, type).getByLabel(LABELS[type], { exact: true });
  const start = (page, type) => button(region(page, type), `เขียน${LABELS[type]}`);
  const change = (page, type) => button(region(page, type), `แก้ไข${LABELS[type]}`);

  /** The plan, with an entry written into `type` first when one is asked for. */
  async function openWith(page, type) {
    await signIn(page, ACCOUNTS.teacherOne);
    const [sectionId] = await improvement.mySectionIds(page);
    if (type) {
      const [clo] = await improvement.myClos(page, sectionId);
      const { entries } = await improvement.planOf(page, sectionId);
      expect(
        entries.filter((e) => String(e.clo_id) === String(clo.clo_id) && e.detail_type === type),
        `nothing written in ${type} yet, so the row writes the only entry there`,
      ).toHaveLength(0);
      await improvement.seedEntry(page, sectionId, {
        clo_id: clo.clo_id,
        detail_type: type,
        detail_text: `บันทึกที่มีอยู่แล้วของแถว #148 (${type})`,
      });
    }
    await improvement.openPlan(page, sectionId);
  }

  /** Opens สรุปผลการดำเนินงาน, types, and sends its save held at the route. */
  async function sendTheFirst(page) {
    await start(page, 'SUMMARY').click();
    await editor(page, 'SUMMARY').fill('ส่วนแรก ส่งไปแล้ว');
    const write = await gate(page, improvement.API, isWrite, { success: SAVED });
    await button(region(page, 'SUMMARY'), 'บันทึก').click();
    await write.sent;
    return write;
  }

  async function landIt(page, write) {
    const reloaded = improvement.waitForPlan(page);
    write.open();
    await write.answered;
    await reloaded;
    await page.waitForTimeout(SETTLE_MS);
  }

  test('what was typed into an unwritten section survives the reload a save ends with', async ({
    page,
  }) => {
    await openWith(page, null);
    const write = await sendTheFirst(page);

    await start(page, 'REFLECTION').click();
    await editor(page, 'REFLECTION').fill(TYPED);
    await landIt(page, write);

    expect(await editor(page, 'REFLECTION').isVisible(), "the second section's editor").toBe(true);
    expect(await editor(page, 'REFLECTION').inputValue(), 'what was typed').toBe(TYPED);
  });

  test('what was typed into a written section survives the reload a save ends with', async ({
    page,
  }) => {
    await openWith(page, 'NEXT_PLAN');
    const write = await sendTheFirst(page);

    await change(page, 'NEXT_PLAN').click();
    await editor(page, 'NEXT_PLAN').fill(TYPED);
    await landIt(page, write);

    expect(await editor(page, 'NEXT_PLAN').isVisible(), "the written section's editor").toBe(true);
    expect(await editor(page, 'NEXT_PLAN').inputValue(), 'what was typed').toBe(TYPED);
  });

  test("a save whose reload another section's เขียน overtook says nothing over it", async ({
    page,
  }) => {
    await openWith(page, null);
    await start(page, 'SUMMARY').click();
    await editor(page, 'SUMMARY').fill('ส่วนแรก ส่งไปแล้ว');
    const write = await gate(page, improvement.API, isWrite, { success: SAVED });
    const reload = await gate(page, improvement.API, isGet);
    write.open();
    await button(region(page, 'SUMMARY'), 'บันทึก').click();
    await reload.sent;
    await noLoadingLineOverTheList(page);

    await start(page, 'REFLECTION').click(UNDER_A_RELOAD);
    await letGo(page, reload);

    expect(
      await page.getByText(`บันทึก${LABELS.SUMMARY}แล้ว`).count(),
      'the banner of the save before',
    ).toBe(0);
    expect(await editor(page, 'REFLECTION').isVisible(), 'the editor เขียน opened').toBe(true);
  });

  test("a removal whose reload another section's เขียน overtook says nothing over it", async ({
    page,
  }) => {
    await openWith(page, 'IMPROVEMENT');
    const write = await gate(page, improvement.API, isWrite, { success: SAVED });
    const reload = await gate(page, improvement.API, isGet);
    write.open();
    await button(region(page, 'IMPROVEMENT'), `ลบ${LABELS.IMPROVEMENT}`).click();
    await button(page, 'ลบ').click();
    await reload.sent;

    await start(page, 'REFLECTION').click(UNDER_A_RELOAD);
    await letGo(page, reload);

    expect(
      await page.getByText(`ลบ${LABELS.IMPROVEMENT}แล้ว`).count(),
      'the banner of the removal',
    ).toBe(0);
    expect(await editor(page, 'REFLECTION').isVisible(), 'the editor เขียน opened').toBe(true);
  });

  // REFLECTION, because the rows above leave NEXT_PLAN and IMPROVEMENT written
  // until `hold()` takes them out, and `openWith` refuses a section already written.
  test('a removal nothing took the place of says what it did', async ({ page }) => {
    await openWith(page, 'REFLECTION');
    const write = await gate(page, improvement.API, isWrite, { success: SAVED });
    const reload = await gate(page, improvement.API, isGet);
    write.open();
    await button(region(page, 'REFLECTION'), `ลบ${LABELS.REFLECTION}`).click();
    await button(page, 'ลบ').click();
    await reload.sent;
    await letGo(page, reload);

    expect(
      await page.getByText(`ลบ${LABELS.REFLECTION}แล้ว`).count(),
      'the banner of the removal',
    ).toBe(1);
  });
});
