'use strict';

const fs = require('node:fs/promises');

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { mySectionIds } = require('../support/enrolment-screen');
const { openReport, exportPdf } = require('../support/clo-assessment-screen');
const {
  openMapping,
  API: MAPPING_API,
  exportPdf: exportGrid,
} = require('../support/plo-mapping-screen');
const {
  isReadable,
  linesOf,
  cellsOf,
  strandedVowels,
  orphanedMarks,
  overflows,
  holding,
} = require('../support/pdf-text');

/**
 * #117 — where the two PDFs put their line breaks.
 *
 * The defect was found by a person opening `assessment-…pdf` during #40's hand
 * walk and reading it. Nothing in three green suites could see it, and `40a`'s
 * own comment says why: its PDF row reads the bytes for a font, which is a claim
 * about the glyphs being present and no claim at all about where the sentence
 * drawn with them was cut. `e2e/support/pdf-text.js` is the instrument that
 * closes that gap, and every row below is a question asked of the file.
 *
 * ## What was actually wrong, measured on 25 September 2569
 *
 * The ticket names `splitTextToSize` in `assessmentPdf.js`. There is no such
 * call: `grep -rn splitTextToSize frontend/src` finds nothing. The wrap happens
 * one level down, inside `jspdf-autotable`, which calls jsPDF's splitter for any
 * cell styled `overflow: 'linebreak'`. The mechanism the ticket describes is
 * exactly right and the site it names has moved, which is why the fix has a
 * shape the ticket does not propose: the cells are wrapped *before* autoTable
 * sees them, and autoTable's own splitter is left in place behind them.
 *
 * jsPDF's splitter says so itself — *at this time works only on Western scripts,
 * ones with space char separating the words* — and its `splitLongWord` walks a
 * character at a time until the width runs out. Thai writes no spaces, so a
 * whole Thai sentence is one word to it and the break lands wherever the column
 * happens to end.
 *
 * ## Two of the ticket's four criteria were already met, and not by us
 *
 * Every tone mark and every above/below vowel has an advance width of **zero**
 * in TH Sarabun, and `splitLongWord`'s loop admits a zero-width character
 * unconditionally, so a mark is always pulled onto the line before it. Over
 * sixty crafted widths, not one line began with a mark. Row 4 is here anyway:
 * once the wrapping is ours, that property is ours to break.
 *
 * The stranded leading vowel is a different story. The seed's nine outcomes
 * produce one — `…และอินเทอร์เ` / `ฟซในการออกแบบ…`, the ticket's own CLO-4 row —
 * and a sweep of sixty crafted widths strands one in six of them. It is luck,
 * not logic, and row 3 is the row that says so.
 *
 * ## What a PDF cannot be asked
 *
 * A drawn line does not record the space or the newline that the break replaced,
 * so the lines of a cell run together are not the text the cell was given
 * wherever that text held whitespace. Row 2 is therefore asked of the outcome
 * details, which hold none, against the very strings the database has: eight of
 * the nine qualify, CLO-1 is excluded because it has two spaces in it, and the
 * criterion column is excluded for the same reason. Rows 3, 4 and 5 need no
 * original text and so cover every cell of both documents.
 *
 * ## #20's grid is in scope and its own data cannot show it
 *
 * `exportPdf.js` wraps Thai through the same library call, but the seed holds one
 * รายวิชา whose name draws 35.2mm inside 69.60mm of text space, so nothing in that
 * document wraps at all today and no row asked of the seeded grid could fail.
 * Row 8 injects a long name into the grid's answer rather than changing the seed:
 * the document is built in the browser out of exactly what the request returned.
 */

const db = createPool({ schema: E2E_SCHEMA });

/**
 * A name long enough to wrap in #20's รายวิชา column - 72mm wide, 69.60mm of it
 * text - chosen for where the width runs out in it.
 *
 * Any long Thai name makes the column wrap. What makes this row able to fail is
 * that the two wrappers disagree about *this* name: ours breaks at offset 44,
 * which ICU calls a word end, and jsPDF's own splitter breaks at 50, which is
 * inside วิศวกรรม - so the defect draws `…สำหรับวิศวกร` / `รมคอมพิวเตอร…` and the
 * fix draws `…ษาจาวาสำหรับ` / `วิศวกรรมคอมพ…`.
 *
 * The first name this row used did not have that property. It broke at 49 ours
 * and 53 theirs, and 53 is a word end too, so both documents were correct by
 * this row's question and `notwrappedgrid` - the code before the fix, made to
 * run - survived it. One break is one chance to be wrong about, and a name where
 * the width happens to run out at a boundary spends it. Measured 25 September
 * 2569 over 260 candidates: 65 tell the two apart.
 */
const LONG_SUBJECT_NAME = 'การออกแบบและพัฒนาซอฟต์แวร์ด้วยภาษาจาวาสำหรับวิศวกรรมคอมพิวเตอร์';

/**
 * A run with nothing in it a dictionary could break, far wider than any column
 * and short enough to stay inside one page's worth of row.
 *
 * `ก้` repeated and not `ก` repeated, and the difference is the row. Asked on
 * 25 September 2569, ICU segments `ก`×60 into **thirty words of two characters**
 * - it is willing to break a run of identical consonants anywhere - so rule 1
 * wrapped it, `chop` was never called, and the row passed with the cluster chop
 * and the library's splitter both taken away. `ก้`×60 comes back as **one
 * segment of 120 characters**, which is what a word too wide for its column
 * means here. The tone mark costs no width, so the run still draws the same
 * 60 consonants wide.
 */
const UNBREAKABLE = 'ก้'.repeat(60);

/**
 * A detail whose fallback line break lands one cluster past a leading vowel.
 *
 * Crafted rather than seeded, and crafted for the width #40's outcome column
 * actually draws at: five ก in front of ordinary Thai prose is what puts the ไ of
 * ได้ at 48.20mm in a 48.80mm column, which is the one position where rule 3 has
 * anything to do. 16 of 60 filler widths reach it; 5 is the narrowest.
 */
const NO_DICTIONARY_DETAIL = 'กกกกกเฟซในการออกแบบโปรแกรมได้';

let section;
let invented;

test.beforeEach(async () => {
  invented = [];
});

test.afterEach(async () => {
  for (const cloId of invented) {
    await db.query('DELETE FROM subject_clo WHERE clo_id = $1', [cloId]);
  }
});

test.afterAll(async () => {
  await db.end();
});

/** The bytes of a file the browser was handed. */
const bytesOf = async download => fs.readFile(await download.path());

/**
 * Every offset at which `Intl.Segmenter` says one Thai word ends, asked of the
 * browser under test.
 *
 * Asked of the browser and not of Node on purpose. The wrapping in
 * `thaiWrap.js` runs in Chromium against Chromium's ICU, and a boundary computed
 * here against Node's could differ by an ICU version and turn a correct document
 * into a red row. The engine that drew the file is the engine that says where the
 * words were.
 */
const wordEndsIn = (page, text) =>
  page.evaluate(one => {
    const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
    const ends = [0];
    for (const word of segmenter.segment(one)) ends.push(word.index + word.segment.length);
    return ends;
  }, text);

/** An outcome of this Offering whose detail is whatever a row needs it to be. */
async function outcomeReading(number, detail) {
  const { rows } = await db.query(
    `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number, clo_detail)
     SELECT sc.program_id, sc.subject_id, sc.academic_year, $2, $3
       FROM course_sections cs
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
      WHERE cs.section_id = $1
     RETURNING clo_id`,
    [section, number, detail],
  );
  invented.push(rows[0].clo_id);
  return rows[0].clo_id;
}

/** The outcomes of this Offering, as the database holds them. */
async function outcomesOf() {
  const { rows } = await db.query(
    `SELECT c.clo_number, c.clo_detail
       FROM course_sections cs
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
       JOIN subject_clo c
         ON c.program_id = sc.program_id
        AND c.subject_id = sc.subject_id
        AND c.academic_year = sc.academic_year
      WHERE cs.section_id = $1
      ORDER BY c.clo_number`,
    [section],
  );
  return rows;
}

/** Signs in as the teacher whose Offering #40's report is about. */
async function signInAsTeacher(page) {
  await signIn(page, ACCOUNTS.teacherOne);
  if (section === undefined) [section] = await mySectionIds(page);
}

/** Opens the report for that Offering and reads back the file it saves. */
async function reportLines(page) {
  await openReport(page, section);
  const bytes = await bytesOf(await exportPdf(page));
  expect(isReadable(bytes)).toBe(true);
  return linesOf(bytes);
}

/**
 * Both halves, for the rows that need nothing done between them.
 *
 * Split into two because a row that invents an outcome has to write it after the
 * sign-in, which is what tells it which Offering it is looking at, and before the
 * export. Signing in a second time inside one test lands on a screen that is
 * already signed in, and waits sixty seconds for a form nobody will draw.
 */
async function assessmentLines(page) {
  await signInAsTeacher(page);
  return reportLines(page);
}

test('row 1: the report is a file whose text can be read back, glyph for glyph', async ({
  page,
}) => {
  const lines = await assessmentLines(page);

  // Every row after this one is worth nothing if the instrument is guessing, and
  // there are two ways it could be. A replacement character means a glyph the
  // file's own /ToUnicode table did not describe; a zero width means a glyph the
  // /W array did not. Either would let a later row pass by reading nothing.
  expect(lines.length).toBeGreaterThan(20);
  expect(lines.filter(line => line.text.includes('�'))).toEqual([]);
  expect(lines.filter(line => line.text.length > 0 && line.width === 0)).toEqual([]);

  // And the report really is the report: the heading and one seeded outcome.
  const said = lines.map(line => line.text);
  expect(said).toContain('รายงานการประเมินผลการเรียนรู้ระดับรายวิชา');
  expect(said.join('')).toContain('ประยุกต์');
});

test('row 2: no outcome in the report is broken in the middle of a word', async ({ page }) => {
  const lines = await assessmentLines(page);
  const outcomes = (await outcomesOf()).filter(one => !/\s/.test(one.clo_detail));
  const cells = cellsOf(lines);

  const cuts = [];
  let asked = 0;
  for (const { clo_number: code, clo_detail: detail } of outcomes) {
    // The cell holds the code, the newline the report writes after it, and the
    // detail. Matching on the whole string rather than a prefix is what makes a
    // cell that paged over fail to match instead of being half-measured.
    const cell = cells.find(one => one.text === `${code}${detail}`);
    if (!cell) continue;
    asked += 1;

    const ends = await wordEndsIn(page, detail);
    for (const at of cell.breaks) {
      // The break between the code and the detail is the newline the report
      // wrote, not a wrap.
      if (at === code.length) continue;
      const into = at - code.length;
      if (ends.includes(into)) continue;
      cuts.push(`${detail.slice(Math.max(0, into - 14), into)}|${detail.slice(into, into + 14)}`);
    }
  }

  // A run where nothing matched would report no cuts and prove nothing.
  expect(asked).toBeGreaterThan(4);
  expect(cuts).toEqual([]);
});

test('row 3: no line of the report ends with a leading vowel', async ({ page }) => {
  const lines = await assessmentLines(page);

  // The worst of the five breaks the walk found, and a different kind from the
  // others: เ แ โ ใ ไ are written before the consonant they are pronounced
  // after, so a line ending in one ends with something that cannot be read
  // aloud, and the line below starts mid-syllable.
  expect(strandedVowels(lines)).toEqual([]);
});

test('row 4: no line of the report begins with a mark', async ({ page }) => {
  const lines = await assessmentLines(page);

  // Held today by TH Sarabun giving every one of these an advance of zero, which
  // jsPDF's splitter can never break before — so this row could not fail before
  // the fix and is not evidence about it. It is here because the wrapping is ours
  // now: a fix that chopped an over-long run between a consonant and its tone
  // mark would put a mark at the head of a line, and nothing else would say so.
  expect(orphanedMarks(lines)).toEqual([]);
});

test('row 5: no line of the report runs past the cell drawn around it', async ({ page }) => {
  const lines = await assessmentLines(page);

  // The other half of the third criterion, and the failure this fix could
  // introduce rather than the one it removes: wrapping by word means measuring
  // words, and a wrapper that measured them with the wrong font, or that let one
  // word stand alone on a line however wide it was, would draw text through the
  // table's own border. Before the fix autoTable's splitter guaranteed this by
  // chopping at the width; afterwards it is only the fallback.
  expect(overflows(lines)).toEqual([]);
});

test('row 6: a word too long for the column is still cut rather than left to overflow', async ({
  page,
}) => {
  // The outcome has to exist before the report is asked for, and `section` is
  // only known once somebody has signed in, so this row does the two halves
  // itself with the write in between.
  await signInAsTeacher(page);
  await outcomeReading('CLO-97', UNBREAKABLE);

  const lines = await reportLines(page);

  // Two of the run's clusters and not one: a single `ก้` is what every line of
  // the run starts with anyway, so it would match a line holding nothing else.
  const carrying = holding(lines, 'ก้ก้');

  // Three claims because they are one behaviour: the run is broken up, all of it
  // is still there, and none of it is outside the cell. The ticket's third
  // criterion is the middle one — a wrapper that dropped what would not fit, or
  // that refused to break a word it could not fit, would satisfy the other two.
  //
  // Asked of every line holding the run rather than of one cell, because a row
  // this tall can be split across a page and a cell is one rectangle.
  expect(carrying.length).toBeGreaterThan(2);
  expect(carrying.map(line => line.text).join('')).toContain(UNBREAKABLE);
  expect(overflows(lines)).toEqual([]);
});

test('row 7: this browser knows where Thai words end', async ({ page }) => {
  // The premise the whole fix stands on, asserted rather than assumed — the same
  // row #118 wrote for the same reason. `Intl.Segmenter` is what replaces the
  // spaces Thai does not write; without it `thaiWrap.js` falls back to breaking
  // between grapheme clusters and row 2 would be the only thing to say so.
  await page.goto('/');
  const answer = await page.evaluate(() => {
    if (typeof Intl.Segmenter !== 'function') return null;
    const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
    return [...segmenter.segment('ประยุกต์ใช้พอลิมอร์ฟิซึม')].map(one => one.segment);
  });

  expect(answer).not.toBeNull();
  expect(answer.length).toBeGreaterThan(1);
  expect(answer.join('')).toBe('ประยุกต์ใช้พอลิมอร์ฟิซึม');
  expect(answer).toContain('ประยุกต์');
});

test('row 8: #20 grid wraps a long รายวิชา name at a word boundary too', async ({ page }) => {
  // The seeded grid has one รายวิชา and its name does not reach the column's
  // width, so the injection is what gives this row something to measure. It
  // replaces a field of the answer the screen is about to draw from, and writes
  // nothing: the export builds the PDF in the browser out of exactly this.
  await page.route(
    address => new URL(address).pathname === MAPPING_API,
    async route => {
      const answer = await route.fetch();
      const grid = await answer.json();
      grid.subjects[0].subject_name_th = LONG_SUBJECT_NAME;
      await route.fulfill({ response: answer, json: grid });
    },
  );

  // `committee0501` and not the teacher the other rows use: the grid is a
  // curriculum screen, and #20's own rows are all this account.
  await signIn(page, ACCOUNTS.committee0501);
  await openMapping(page);
  const bytes = await bytesOf(await exportGrid(page));
  expect(isReadable(bytes)).toBe(true);
  const lines = linesOf(bytes);

  const cell = cellsOf(lines).find(one => one.text.endsWith(LONG_SUBJECT_NAME));
  expect(cell, 'the injected name reached the document whole').toBeTruthy();

  // The cell is the รหัสวิชา, a space, and the name - so the name's own offsets
  // are the cell's shifted by everything before it, and that prefix is the one
  // piece of whitespace here the file does record: it is inside a line, not at a
  // break.
  const from = cell.text.length - LONG_SUBJECT_NAME.length;
  const ends = await wordEndsIn(page, LONG_SUBJECT_NAME);
  const inside = cell.breaks.map(at => at - from).filter(into => into > 0);
  const cuts = inside
    .filter(into => !ends.includes(into))
    .map(into => `${LONG_SUBJECT_NAME.slice(into - 14, into)}|${LONG_SUBJECT_NAME.slice(into, into + 14)}`);

  // The precondition, not a nicety: a name that fitted on one line would give no
  // break to be wrong about and this row would pass on any code at all.
  expect(inside.length).toBeGreaterThan(0);
  expect(cuts).toEqual([]);

  // The other three criteria, asked of the second document in the ticket's
  // scope rather than of the report alone - the wrapper is one module and both
  // screens call it, but which of them draws correctly is a claim per document.
  expect(strandedVowels(lines)).toEqual([]);
  expect(orphanedMarks(lines)).toEqual([]);
  expect(overflows(lines)).toEqual([]);
});

test('row 9: with no dictionary, the fallback still ends no line with a leading vowel', async ({
  page,
}) => {
  // The row that holds rule 3, and the only place it can be held.
  //
  // With `Intl.Segmenter` present the retreat is unreachable: measured on
  // 25 September 2569, not one ICU word segment over every Thai string in
  // `db/seed.js` ends with a leading vowel, and the only runs `chop` ever
  // receives are ones ICU has already split in front of every vowel. 141 crafted
  // shapes reached it zero times. Removing the rule changes nothing a real
  // browser draws, which is exactly why it needs a row: the fallback path is
  // where it bites, and nothing else goes near it.
  //
  // Deleting `Intl.Segmenter` makes the whole paragraph one word, so the cluster
  // chop does all the breaking and a cut can land wherever the width runs out.
  // For this detail that is right after the ไ: without the retreat the second
  // line is `กกกกกเฟซในการออกแบบโปรแกรมไ` at 48.20mm, with it
  // `กกกกกเฟซในการออกแบบโปรแกรม` at 46.99mm, and either way three lines - the
  // retreat costs the document nothing here, which is the other half of the
  // claim.
  await page.addInitScript(() => {
    delete Intl.Segmenter;
  });

  await signInAsTeacher(page);
  await outcomeReading('CLO-96', NO_DICTIONARY_DETAIL);
  const lines = await reportLines(page);

  // Three preconditions, because a row measuring the fallback has to show it was
  // on the fallback: the dictionary is gone, the crafted detail reached the
  // document whole, and it was broken somewhere inside itself rather than fitting
  // on one line. `breaks` counts the newline the report writes after the code as
  // well, so more than one break is at least one wrap in the detail.
  expect(await page.evaluate(() => typeof Intl.Segmenter)).toBe('undefined');
  const cell = cellsOf(lines).find(one => one.text === `CLO-96${NO_DICTIONARY_DETAIL}`);
  expect(cell, 'the crafted outcome reached the document whole').toBeTruthy();
  expect(cell.breaks.length).toBeGreaterThan(1);

  expect(strandedVowels(lines)).toEqual([]);
  expect(overflows(lines)).toEqual([]);
});
