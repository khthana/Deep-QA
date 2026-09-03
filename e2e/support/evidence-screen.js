'use strict';

const { expect } = require('@playwright/test');

/**
 * หลักฐานการประเมิน — #35, as a browser reaches it.
 *
 * `backend/test/evidence.test.js` owns every refusal and every rule: the PDF
 * signature, the five types, the size limit, and which caller may open which
 * file. Repeating one here would be the same claim asserted twice, in the place
 * that goes stale.
 *
 * What is only here is the round trip. A real file input carrying real bytes to
 * a real multipart endpoint is the one part of this ticket that no in-process
 * test exercises — supertest builds the body itself — and a screen that fetches
 * a PDF with the session and shows it from the bytes is behaviour rather than
 * arithmetic.
 */

/** PDF is a magic number. These five bytes are what the server reads. */
const PDF_BYTES = Buffer.from('%PDF-1.7\n1 0 obj\n<< >>\nendobj\ntrailer\n%%EOF\n', 'latin1');

/** PNG's own, for the file that will be named `.pdf` and declared a PDF. */
const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 7),
]);

const activitiesPath = (sectionId) =>
  `/teacher/teacherDashboard/${sectionId}/learningActivities`;

const evidencePath = (sectionId, activityId) =>
  `${activitiesPath(sectionId)}/${activityId}/evidence`;

/** The paperclip on an Activity's card — the way in, from the list. */
const evidenceLink = (page, activityName) =>
  page.getByLabel(`หลักฐานการประเมินของ ${activityName}`);

/**
 * Attaches one file through the form, exactly as a person would.
 *
 * The bytes and the name are given separately on purpose: the rows that matter
 * most send bytes that disagree with the name.
 */
async function attach(page, { bytes, name, type, description }) {
  await page.getByRole('button', { name: 'แนบหลักฐาน', exact: true }).click();
  if (type) await page.getByLabel('ประเภทหลักฐาน').selectOption(type);
  if (description) await page.getByLabel('คำอธิบาย').fill(description);
  await page.locator('input[type="file"]').setInputFiles({
    name,
    mimeType: 'application/pdf',
    buffer: bytes,
  });
  await page.getByRole('button', { name: 'แนบหลักฐาน', exact: true }).click();
}

/** One row, addressed the way a reader would name it. */
const fileRow = (page, fileName) => page.getByLabel(`หลักฐาน ${fileName}`, { exact: true });

/**
 * Presses the file's own name and waits for the request that opening it makes.
 *
 * The new tab is not followed. What this row is about is that opening a file is
 * a request carrying the session — the defect #35 exists for was a directory
 * served statically, where opening one was not a request at all — so the answer
 * is what is asserted, and `window.open` is stubbed out so a run does not
 * accumulate tabs.
 */
async function openFile(page, fileName) {
  await page.addInitScript(() => {
    window.open = () => null;
  });
  const [answer] = await Promise.all([
    page.waitForResponse(
      (response) =>
        /\/api\/evidence\/\d+\/file$/.test(new URL(response.url()).pathname) &&
        response.request().method() === 'GET',
    ),
    page.getByRole('button', { name: fileName, exact: true }).click(),
  ]);
  return answer;
}

/** Removes one file and rides out the confirmation. */
async function removeFile(page, fileName) {
  await page.getByLabel(`ลบหลักฐาน ${fileName}`).click();
  await page.getByRole('button', { name: 'ลบ', exact: true }).click();
  await expect(fileRow(page, fileName)).toHaveCount(0);
}

module.exports = {
  PDF_BYTES,
  PNG_BYTES,
  activitiesPath,
  attach,
  evidenceLink,
  evidencePath,
  fileRow,
  openFile,
  removeFile,
};
