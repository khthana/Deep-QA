'use strict';

const { expect } = require('@playwright/test');

const STUDENT_DATA = '/main/student-data';
const BOM = '\uFEFF';

/** Opens the register and waits for the list it is about to assert on. */
async function openRegister(page) {
  const [response] = await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === '/api/students' &&
        answer.request().method() === 'GET',
    ),
    page.goto(STUDENT_DATA),
  ]);
  expect(response.status()).toBe(200);
  return response;
}

/**
 * The file the screen's own button produces.
 *
 * Fetched through the browser's download rather than from the endpoint,
 * because half of what row 12 states is about the file that reaches the disk:
 * the client re-adds the byte-order mark the Fetch specification strips
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

/** Uploads a file through the screen's own file input and waits for the report. */
async function importCsv(page, text, name = 'students.csv') {
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name, mimeType: 'text/csv', buffer: Buffer.from(text, 'utf8') });
}

/** What the pager says the register holds. */
async function total(page) {
  const line = await page.getByText(/ทั้งหมด \d+ รายการ/).first().innerText();
  return Number(line.match(/ทั้งหมด (\d+) รายการ/)[1]);
}

/**
 * The rejection report's own table, told apart from the register's list by the
 * column only it has. Two tables are on the screen at once once an import has
 * been refused, and the register's is the longer of them.
 */
const reportTable = page =>
  page.locator('table').filter({ hasText: 'บรรทัดที่' });

/** The line numbers the rejection report names, in the order it lists them. */
async function reportedLines(page) {
  const cells = await reportTable(page).locator('tbody tr td:first-child').allInnerTexts();
  return cells.map(Number);
}

module.exports = {
  STUDENT_DATA,
  BOM,
  openRegister,
  downloadTemplate,
  headerOf,
  csv,
  importCsv,
  total,
  reportTable,
  reportedLines,
};
