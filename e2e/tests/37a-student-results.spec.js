'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { REFUSALS } = require('../../backend/auth/refusals');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { mySectionIds } = require('../support/enrolment-screen');
const { axesOf, pointsOf, tableCell } = require('../support/radar-chart');
const {
  AVERAGE,
  choose,
  drop,
  offeredCodes,
  openStudentResults,
  path,
  search,
  studentBox,
} = require('../support/student-results-screen');

/**
 * docs/acceptance/37-individual-student-results.md — the half a browser can prove.
 *
 * #37 computes nothing. Its read is #38's, and every rule inside it — the scale
 * of five, the blank that is not a nought, the guard that refuses another
 * account's ตอนเรียน — is proved once in `backend/test/learning-details.test.js`
 * and is not repeated here. That is the whole reason this ticket has no route
 * of its own: the fifth criterion asks that the normalisation be the Section
 * results', and sharing the read makes it so by construction rather than by an
 * assertion that would have to catch the two drifting.
 *
 * So what is left for a browser is what the browser is the only reader of: the
 * **drawing**, and the picker in front of it.
 */

const db = createPool({ schema: E2E_SCHEMA });

let section;
/** Undone in `afterEach`, whatever the row did — the suite reseeds, the row still tidies. */
let restore;

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  if (section === undefined) [section] = await mySectionIds(page);
  restore = [];
});

test.afterEach(async () => {
  for (const undo of restore.reverse()) await undo();
});

/** Which Offering this ตอนเรียน belongs to — ADR-0003's grain, not the Section's. */
async function offeringOf() {
  const { rows } = await db.query(
    `SELECT sc.program_id, sc.subject_id, sc.academic_year
       FROM course_sections cs
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
      WHERE cs.section_id = $1`,
    [section],
  );
  expect(rows.length, 'the ตอนเรียน should belong to one Offering').toBe(1);
  return rows[0];
}

/**
 * Two more outcomes on the Offering, taking it past the chart's ten.
 *
 * Added to the Offering rather than to the ตอนเรียน because that is the grain a
 * CLO has - ADR-0003 - and removed again afterwards. They carry no marks, which
 * is beside the point: the cap is about how many labels fit round a circle.
 *
 * Which outcome falls off the chart is worth knowing and is not asserted
 * anywhere. It used to be CLO-9, because `clo_number` ordered as text and
 * CLO-10 and CLO-11 sorted between CLO-1 and CLO-2 - and the row below leaned
 * on that deliberately, needing an outcome that was off the chart and still
 * marked. [#96](https://github.com/khthana/Deep-QA/issues/96) closed that, so
 * the eleven now read CLO-1..CLO-11 and **the one past the tenth axis is
 * CLO-11**, which this fixture creates with no marks on it.
 *
 * The row therefore builds its situation rather than inheriting it: it moves
 * one student's marks onto CLO-11 with `moveMarks`. That is longer, and it is
 * the honest shape - **a row that needs a defect to be reachable is a row that
 * has to be rewritten the day the defect is fixed**, which is exactly what
 * happened here.
 */
async function pastTheCap() {
  const offering = await offeringOf();
  const added = ['CLO-10', 'CLO-11'];
  restore.push(() =>
    db.query(
      `DELETE FROM subject_clo
        WHERE program_id = $1 AND subject_id = $2 AND academic_year = $3
          AND clo_number = ANY($4)`,
      [offering.program_id, offering.subject_id, offering.academic_year, added],
    ),
  );
  for (const number of added) {
    await db.query(
      `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number, clo_detail)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        offering.program_id,
        offering.subject_id,
        offering.academic_year,
        number,
        'ผลการเรียนรู้ที่เพิ่มเพื่อทดสอบเพดานของกราฟ',
      ],
    );
  }
  return offering;
}

/**
 * Moves one student's marks from one outcome to another, remembering how to put
 * them back - #96.
 *
 * `activity_scores` carries `clo_id` against `subject_clo` directly rather than
 * against the mapping rows, which is the shape
 * [#108](https://github.com/khthana/Deep-QA/issues/108) is filed about; here it
 * is what lets one student's marks be re-pointed at an outcome past the cap
 * without touching what the rest of the cohort was marked on.
 *
 * The undo is pushed after `pastTheCap`'s and before `unmark`'s, and
 * `afterEach` drains the queue in reverse - so the scores come back first, then
 * the outcome they hang on, then the outcome itself is deleted. Any other order
 * would try to delete a `subject_clo` that still has marks against it, which
 * the schema refuses.
 */
async function moveMarks(studentId, { from, to }) {
  const { rows: outcomes } = await db.query(
    `SELECT clo_number, clo_id FROM subject_clo c
      WHERE c.clo_number = ANY($1)
        AND EXISTS (
          SELECT 1 FROM semester_courses sc
           JOIN course_sections cs ON cs.semester_course_id = sc.id
          WHERE cs.section_id = $2 AND sc.program_id = c.program_id
            AND sc.subject_id = c.subject_id AND sc.academic_year = c.academic_year
        )`,
    [[from, to], section],
  );
  const idOf = Object.fromEntries(outcomes.map((row) => [row.clo_number, row.clo_id]));
  expect(idOf[from], from + ' should be an outcome of this Offering').toBeTruthy();
  expect(idOf[to], to + ' should be an outcome of this Offering').toBeTruthy();

  const { rows: moved } = await db.query(
    `UPDATE activity_scores s SET clo_id = $1
       FROM activities a
      WHERE a.id = s.activity_id AND a.section_id = $2
        AND s.student_id = $3 AND s.clo_id = $4
      RETURNING s.activity_id`,
    [idOf[to], section, studentId, idOf[from]],
  );
  expect(moved.length, 'nothing marked on ' + from + ' for ' + studentId).toBeGreaterThan(0);

  // A score alone is not a mark the report will count: the figures are built
  // over `activity_clo_mapping`, so an outcome with no row there has no
  // denominator and reads as unmarked however many scores point at it. The
  // mapping is added beside the one it was copied from rather than moved off
  // it, because moving it would take the rest of the cohort's marks with it.
  const { rows: mappings } = await db.query(
    `INSERT INTO activity_clo_mapping
            (activity_id, sequence_order, clo_id, weight, score_ratio_id, score)
     SELECT m.activity_id,
            (SELECT MAX(sequence_order) + 1 FROM activity_clo_mapping
              WHERE activity_id = m.activity_id),
            $1, m.weight, m.score_ratio_id, m.score
       FROM activity_clo_mapping m
      WHERE m.activity_id = ANY($2) AND m.clo_id = $3
      RETURNING id`,
    [idOf[to], moved.map((row) => row.activity_id), idOf[from]],
  );
  expect(mappings.length, from + ' should be mapped to the activities it is marked on').toBeGreaterThan(0);

  restore.push(async () => {
    await db.query(`DELETE FROM activity_clo_mapping WHERE id = ANY($1)`, [
      mappings.map((row) => row.id),
    ]);
  });

  restore.push(async () => {
    await db.query(
      `UPDATE activity_scores SET clo_id = $1
        WHERE student_id = $2 AND clo_id = $3 AND activity_id = ANY($4)`,
      [idOf[from], studentId, idOf[to], moved.map((row) => row.activity_id)],
    );
  });
}

/**
 * Takes one student's marks out of the reckoning entirely, remembering how to
 * put them back.
 *
 * The seed marks every student on every outcome, so the sixth criterion's
 * situation does not exist until a row builds it. That is a normal part of a
 * walk and of a spec: a criterion about *no marks* cannot be proved against a
 * fixture where everybody has some.
 */
async function unmark(studentId, { except = null } = {}) {
  const { rows } = await db.query(
    `SELECT s.student_id, s.activity_id, s.clo_id, s.score
       FROM activity_scores s
       JOIN activities a ON a.id = s.activity_id
       JOIN subject_clo c ON c.clo_id = s.clo_id
      WHERE a.section_id = $1 AND s.student_id = $2 AND s.score IS NOT NULL
        AND ($3::text IS NULL OR c.clo_number <> $3)`,
    [section, studentId, except],
  );
  expect(rows.length, 'nothing to unmark for ' + studentId).toBeGreaterThan(0);
  restore.push(async () => {
    for (const row of rows) {
      await db.query(
        `UPDATE activity_scores SET score = $1
          WHERE student_id = $2 AND activity_id = $3 AND clo_id = $4`,
        [row.score, row.student_id, row.activity_id, row.clo_id],
      );
    }
  });
  await db.query(
    `UPDATE activity_scores SET score = NULL
      WHERE student_id = $1 AND activity_id = ANY($2) AND clo_id = ANY($3)`,
    [studentId, rows.map((row) => row.activity_id), rows.map((row) => row.clo_id)],
  );
}

test('choosing a student draws their line against the Section average', async ({ page }) => {
  const answer = await openStudentResults(page, section);
  expect(answer.status()).toBe(200);
  const body = await answer.json();

  // The roll is the picker, and it is the whole roll rather than a first page
  // of ten — the seventh criterion, and the reason this screen reads #38's
  // endpoint rather than the paged class list.
  expect((await offeredCodes(page)).sort()).toEqual(
    body.students.map((student) => student.student_id).sort(),
  );

  // Before anybody is chosen the chart is not empty: the Section's own shape is
  // what the individual is going to be read against, so it is already there.
  const axes = await axesOf(page);
  const before = await pointsOf(page);
  expect(Object.keys(before)).toEqual([AVERAGE]);
  for (const clo of body.clos) {
    if (clo.mean === null || !axes.includes(clo.clo_number)) continue;
    expect(before[AVERAGE][clo.clo_number].said).toBeCloseTo(clo.mean, 2);
    expect(before[AVERAGE][clo.clo_number].drawn).toBeCloseTo(clo.mean, 1);
  }

  // Somebody who is not the average on every outcome, so that a chart drawing
  // the average twice cannot pass this row.
  const student = body.students.find((one) =>
    body.clos.some((clo) => {
      const cell = one.scores[clo.clo_id];
      return cell.score !== null && cell.score !== clo.mean;
    }),
  );
  expect(student, 'the seed should hold a student who differs from the mean').toBeTruthy();

  await choose(page, student.student_id);

  const drawn = await pointsOf(page);
  expect(Object.keys(drawn).sort()).toEqual([AVERAGE, student.student_id].sort());
  for (const clo of body.clos) {
    const cell = student.scores[clo.clo_id];
    if (cell.score === null || !axes.includes(clo.clo_number)) continue;
    // Said, drawn, and written in the table — the middle one is why the chart
    // is SVG. A series plotted from the wrong array is titled correctly and
    // sits in the wrong place, and only the geometry can tell.
    expect(drawn[student.student_id][clo.clo_number].said).toBeCloseTo(cell.score, 2);
    expect(drawn[student.student_id][clo.clo_number].drawn).toBeCloseTo(cell.score, 1);
    await expect(tableCell(page, clo.clo_number, student.student_id)).toHaveText(
      cell.score.toFixed(2),
    );
  }
});

test('the picker narrows to what is typed into it, and a chosen student stays on the chart', async ({
  page,
}) => {
  const answer = await openStudentResults(page, section);
  const body = await answer.json();
  const [first, second] = body.students;

  await choose(page, first.student_id);
  await search(page, second.student_id);

  // The person being searched for is offered, and so is the person already
  // chosen — a filter that hid them would leave a line on the chart with no
  // control left to take it off, which is the shape of defect #36's review
  // found in its refusal path.
  const offered = await offeredCodes(page);
  expect(offered).toContain(second.student_id);
  expect(offered).toContain(first.student_id);
  expect(offered.length).toBeLessThan(body.students.length);
  await expect(studentBox(page, first.student_id)).toBeChecked();
  expect(Object.keys(await pointsOf(page)).sort()).toEqual(
    [AVERAGE, first.student_id].sort(),
  );
});

test('four students fit on one chart and a fifth is refused with a reason', async ({ page }) => {
  const answer = await openStudentResults(page, section);
  const body = await answer.json();
  const five = body.students.slice(0, 5).map((student) => student.student_id);
  expect(five.length, 'the roll should hold at least five').toBe(5);

  for (const code of five.slice(0, 4)) await choose(page, code);

  // Four students and the average is five strokes, which is the whole palette
  // plus the backdrop. The cap is not a taste: a fifth student wraps to the
  // first palette entry, and the legend would then list two lines identical in
  // both colour and dash.
  const drawn = await pointsOf(page);
  expect(Object.keys(drawn).sort()).toEqual([AVERAGE, ...five.slice(0, 4)].sort());

  // Refused, and *said* — a box that has gone grey with no sentence beside it
  // reads as a screen that has broken rather than as a rule.
  await expect(studentBox(page, five[4])).toBeDisabled();
  await expect(page.getByText(/เลือกครบ .* คนแล้ว/)).toBeVisible();

  // And the refusal lifts when it should: taking one off frees the slot.
  await drop(page, five[0]);
  await expect(studentBox(page, five[4])).toBeEnabled();
});

test('a student with no marks is named rather than drawn as a shape they did not earn', async ({
  page,
}) => {
  const first = await openStudentResults(page, section);
  const [victim] = (await first.json()).students;
  await unmark(victim.student_id);

  const answer = await openStudentResults(page, section);
  const body = await answer.json();
  const student = body.students.find((one) => one.student_id === victim.student_id);
  expect(
    body.clos.every((clo) => student.scores[clo.clo_id].score === null),
    'the student should have come back unmeasured on every outcome',
  ).toBe(true);

  // The picker says so before they are chosen, which is the point at which it
  // is useful to know.
  await expect(page.getByText('ยังไม่มีคะแนน').first()).toBeVisible();

  await choose(page, student.student_id);

  // No line, no markers, and no polygon collapsed onto the centre — which is
  // what a five-point chart draws for a student read as a row of noughts, and
  // is the same *blank is not a nought* rule the arithmetic keeps.
  const drawn = await pointsOf(page);
  expect(Object.keys(drawn)).toEqual([AVERAGE]);
  // Instead the screen says whose line is missing and why — and says it in a
  // live region, because it is the answer to something the reader just did.
  // Filtered - #111. This page renders `<Notice>`, which since #111 also
  // carries `role="status"` on a success, so an unfiltered `getByRole('status')`
  // here is one saved form away from a strict-mode violation. It is green today
  // only because this test never makes that page save anything. `39a` and `40a`
  // already filter; this file was the outlier.
  await expect(
    page.getByRole('status').filter({ hasText: 'ยังไม่มีคะแนน' }),
  ).toHaveText(new RegExp(`${student.student_id}.*ยังไม่มีคะแนน`));
  // The average is still drawn: one unmarked student is not an unmarked class.
  expect(Object.keys(drawn[AVERAGE]).length).toBeGreaterThan(0);
});

test('a student marked only past the tenth axis is told that, not left with an unchanged chart', async ({
  page,
}) => {
  // The two criteria that meet here are the fourth and the sixth, and they meet
  // badly: cap the chart at ten outcomes, and name a student who has no line.
  // A student marked *only* on an outcome the cap left off has marks - so the
  // first version of the sixth criterion's test called them measured - and no
  // line, so the reader gets the ticked box and the unchanged chart that the
  // sentence exists to prevent. Found by review; this row is the situation.
  //
  // Which outcome is off the chart: with #96 fixed the eleven read
  // CLO-1..CLO-11, so it is CLO-11 - and `pastTheCap` creates it with no marks.
  // The situation is therefore built rather than inherited: this student's
  // CLO-9 marks are moved onto CLO-11, and everything else is taken away.
  const first = await openStudentResults(page, section);
  const [victim] = (await first.json()).students;
  await pastTheCap();
  await moveMarks(victim.student_id, { from: 'CLO-9', to: 'CLO-11' });
  await unmark(victim.student_id, { except: 'CLO-11' });

  const answer = await openStudentResults(page, section);
  const body = await answer.json();
  const student = body.students.find((one) => one.student_id === victim.student_id);
  const axes = await axesOf(page);
  expect(axes, 'CLO-11 should be the outcome the cap left off').not.toContain('CLO-11');

  const marked = body.clos.filter((clo) => student.scores[clo.clo_id].score !== null);
  expect(marked.map((clo) => clo.clo_number), 'marked on exactly the off-chart outcome').toEqual([
    'CLO-11',
  ]);

  await choose(page, student.student_id);

  // No line - which is right, there is nothing on these axes to draw.
  expect(Object.keys(await pointsOf(page))).toEqual([AVERAGE]);
  // And the reason is the one that is true: they have marks, the chart does not
  // reach them. Not *ยังไม่มีคะแนน*, which would be a lie about their marking.
  await expect(
    page.getByRole('status').filter({ hasText: 'ไม่ได้อยู่บนกราฟ' }),
  ).toHaveText(new RegExp(`${student.student_id}.*ไม่ได้อยู่บนกราฟ`));
  // The score is still on the page, in the row the cap does not apply to. The
  // outcome named here is whichever one the marks are on, which is the same
  // `marked[0]` the score is read from — naming it twice by hand is how this
  // line came to say CLO-9 while the marks had moved to CLO-11.
  await expect(tableCell(page, marked[0].clo_number, student.student_id)).toHaveText(
    student.scores[marked[0].clo_id].score.toFixed(2),
  );
});

test('a Subject with more than ten outcomes draws ten of them and says how many it left off', async ({
  page,
}) => {
  // The seed holds nine outcomes, so the fourth criterion's situation has to be
  // built. Two more take the Offering past the cap. They are added to the
  // Offering rather than to the ตอนเรียน because that is the grain a CLO has —
  // ADR-0003 — and they carry no marks, which is beside the point here: the cap
  // is about how many labels fit round a circle, not about what is on them.
  await pastTheCap();

  const answer = await openStudentResults(page, section);
  const body = await answer.json();
  expect(body.clos.length).toBe(11);

  // Ten axes on the chart — which ten is still not asserted here, and still
  // deliberately: this row is about the cap and the sentence beside it, and the
  // order the eleven come in is `96a`'s claim, proved where CLO-10 is the point
  // rather than a side effect. Before #96 this comment named CLO-9 as the one
  // left off; it is CLO-11 now.
  const axes = await axesOf(page);
  expect(axes.length).toBe(10);

  // Said out loud, with both numbers in it.
  await expect(page.getByText(/กราฟแสดงผลการเรียนรู้ 10 ข้อแรก จากทั้งหมด 11 ข้อ/)).toBeVisible();

  // And nothing is lost: every outcome still has its row in the table.
  for (const clo of body.clos) {
    await expect(tableCell(page, clo.clo_number, AVERAGE)).toHaveCount(1);
  }
});

test('a ผู้สอน who types another ตอนเรียน’s address is refused, and is not left waiting', async ({
  page,
}) => {
  // The guard is #38's and is proved at the HTTP seam. What is only provable
  // here is the second half: that the refusal arrives on *this* screen without
  // กำลังโหลดข้อมูล… left underneath it, which is the defect #43's hand-walk
  // found on two screens and which no green suite had seen. It is a per-screen
  // defect, so it is a per-screen row.
  const { rows } = await db.query(
    `SELECT cs.section_id FROM course_sections cs
      WHERE cs.section_id <> $1
        AND NOT EXISTS (SELECT 1 FROM course_sections_teacher t
                         WHERE t.section_id = cs.section_id AND t.user_id = 'teach01')
      ORDER BY cs.section_id LIMIT 1`,
    [section],
  );
  expect(rows.length, 'the seed should hold a ตอนเรียน this ผู้สอน does not teach').toBe(1);

  await page.goto(path(rows[0].section_id));
  await expect(page.getByText(REFUSALS.sectionNotFound)).toBeVisible();
  await expect(page.locator('svg[role="img"]')).toHaveCount(0);
  await expect(page.locator('input[type="checkbox"]')).toHaveCount(0);
  await expect(page.getByText('กำลังโหลดข้อมูล')).toHaveCount(0);
});
