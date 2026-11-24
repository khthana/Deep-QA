'use strict';

const fs = require('node:fs/promises');
const { test, expect } = require('@playwright/test');
const { PROGRAMS, SUBJECT, CURRENT_YEAR, SEMESTER } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { ACCOUNTS, IDS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { E2E_SCHEMA } = require('../support/env');
const { openOfferings, filterToTerm, openSections } = require('../support/offerings-screen');
const { openMapping, exportPdf } = require('../support/plo-mapping-screen');
const { isReadable, linesOf } = require('../support/pdf-text');
const { openHistory, entryCell } = require('../support/history-panel');

/**
 * #294 - an organisation unit is read by its name, not its code.
 *
 * The owner answered on 20 November 2569 that a faculty, a department and a
 * programme are named everywhere except the two screens that manage those
 * records, with the kind word in front where the line does not already say it,
 * and the code kept only where the name cannot be found (`docs/org-unit-names.md`).
 * The role picker's rows are `231a`'s and the two administration screens'
 * `215a`'s and `90a`'s, rewritten the same day; the removal question is `18a`
 * row 6's. These are the three places that drew a bare code and had no row
 * reading them at all.
 *
 * Each row reads the whole line with `toHaveText` or an exact comparison,
 * because `0501`'s name is a substring of `0503`'s: a `toContain` of the first
 * would pass on a screen drawing the second (#116).
 *
 * Row 3 writes two history entries straight to `user_log` - the history screen
 * reads what is there, and a programme deleted through the screen is a
 * programme some other spec's row may still be using - and takes them out
 * again below the seam, whatever the row did (#181, #233).
 */

const PROGRAM = PROGRAMS.find(entry => entry.id === '0501');

const db = createPool({ schema: E2E_SCHEMA });
let written = [];

test.afterAll(async () => {
  try {
    if (written.length) await db.query('DELETE FROM user_log WHERE id = ANY($1)', [written]);
  } finally {
    await db.end();
  }
});

test('row 1: the offering panel names the curriculum it belongs to', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openOfferings(page);
  await filterToTerm(page, CURRENT_YEAR, SEMESTER);
  await openSections(page, SUBJECT.id);

  // The line under the panel's heading: the term, then the curriculum by its
  // name with the kind word in front, glued the way Thai writes it.
  await expect(page.getByText(/^ภาคการศึกษา \d\/\d+/)).toHaveText(
    `ภาคการศึกษา ${SEMESTER}/${CURRENT_YEAR} · หลักสูตร${PROGRAM.th}`,
  );
});

test('row 2: the exported mapping is headed by the curriculum\'s name, and its file by the code', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openMapping(page);
  const download = await exportPdf(page);

  // The owner's two halves of rule 5: the file name keeps the code, because it
  // has to be safe characters and unique; the heading drops it.
  expect(download.suggestedFilename()).toBe(`plo-mapping-${PROGRAM.id}.pdf`);

  const bytes = await fs.readFile(await download.path());
  expect(isReadable(bytes)).toBe(true);
  const texts = linesOf(bytes).map(line => line.text);
  const heading = `หลักสูตร${PROGRAM.th} (หลักสูตรปี ${PROGRAM.revision_year})`;
  expect(texts, 'the heading line, whole').toContain(heading);
  expect(texts.filter(text => text.includes(PROGRAM.id))).toEqual([]);
});

test('row 3: the history names a curriculum, and keeps the code of one that is gone', async ({
  page,
}) => {
  // In the future, so they are the two newest lines of the table whatever the
  // files before this one wrote (#132) - since #305 one table of every
  // account's lines, which the Central Admin reaches whole.
  const { rows } = await db.query(
    `INSERT INTO user_log (user_id, activity, target_kind, target_id, time_stamp) VALUES
       ($1, 'CREATE_PROGRAM', 'PROGRAM', $2, now() + interval '1 day 1 second'),
       ($1, 'DELETE_PROGRAM', 'PROGRAM', 'Z294GONE', now() + interval '1 day')
     RETURNING id`,
    [IDS.systemAdmin, PROGRAM.id],
  );
  written = rows.map(row => row.id);

  await signIn(page, ACCOUNTS.systemAdmin);
  await openHistory(page);

  await expect(entryCell(page, 0, 'ทำกับข้อมูล')).toHaveText(`หลักสูตร${PROGRAM.th}`);
  // A programme that no longer exists has no name to find, and the code is the
  // only thing left that says what it was (#294 rule 6) - with a space, so the
  // kind word and the code do not run together.
  await expect(entryCell(page, 1, 'ทำกับข้อมูล')).toHaveText('หลักสูตร Z294GONE');
});
