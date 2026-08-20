'use strict';

/**
 * The import box, for every screen that has one.
 *
 * `frontend/src/components/ImportPanel.js` is one component and every screen
 * passes it a different endpoint, so the browser seam has one set of helpers
 * and each screen's module binds its own path. What differs between screens is
 * the URL and the template's name; the button, the file input, the success line
 * and the rejection report are the same markup everywhere, which is what #14
 * row 9 asserts in prose.
 *
 * Factored out of `students-screen.js` when Departments became the second
 * caller. It is deliberately not a base class: each screen's module re-exports
 * what it needs under its own names, so a spec reads as that screen's language.
 */

const BOM = String.fromCharCode(0xfeff);

/**
 * The file the screen's own button produces.
 *
 * Fetched through the browser's download rather than from the endpoint,
 * because half of what a template row states is about the file that reaches the
 * disk: the client re-adds the byte-order mark the Fetch specification strips
 * (#62), so the endpoint's answer and the saved file are not the same bytes.
 */
async function downloadTemplate(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'ดาวน์โหลดแบบฟอร์ม' }).click(),
  ]);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return { name: download.suggestedFilename(), text: Buffer.concat(chunks).toString('utf8') };
}

/** The template's own header line, without the mark, to build files on. */
const headerOf = template => template.text.replace(BOM, '').split(/\r?\n/)[0];

/** A file made of the screen's own header and the rows a row of the checklist names. */
const csv = (header, ...rows) => [header, ...rows].join('\r\n') + '\r\n';

/**
 * Uploads a file through the screen's own file input, and waits for the import
 * to have answered before returning.
 *
 * Waiting is the whole point of the helper. Without it a spec that imports
 * twice asserts against a report the first import left on the screen, and would
 * go on passing if the second were refused - which is one of the things these
 * rows exist to catch.
 */
async function importCsv(page, { path, text, name }) {
  const [response] = await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === path && answer.request().method() === 'POST',
    ),
    page
      .locator('input[type="file"]')
      .setInputFiles({ name, mimeType: 'text/csv', buffer: Buffer.from(text, 'utf8') }),
  ]);
  return response;
}

/** What the pager says the list holds. */
async function total(page) {
  const line = await page.getByText(/ทั้งหมด \d+ รายการ/).first().innerText();
  return Number(line.match(/ทั้งหมด (\d+) รายการ/)[1]);
}

/**
 * The rejection report's own table, told apart from the screen's list by the
 * column only it has. Two tables are on the screen at once once an import has
 * been refused, and the list's is the longer of them.
 */
const reportTable = page => page.locator('table').filter({ hasText: 'บรรทัดที่' });

/** The line numbers the rejection report names, in the order it lists them. */
async function reportedLines(page) {
  const cells = await reportTable(page).locator('tbody tr td:first-child').allInnerTexts();
  return cells.map(Number);
}

/** The reason the report gives for one line. */
const reportedReason = (page, line) =>
  reportTable(page)
    .locator('tbody tr')
    .filter({ has: page.locator(`td:first-child:text-is("${line}")`) })
    .locator('td')
    .nth(1);

module.exports = {
  BOM,
  downloadTemplate,
  headerOf,
  csv,
  importCsv,
  total,
  reportTable,
  reportedLines,
  reportedReason,
};
