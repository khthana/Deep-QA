'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

/**
 * Where evidence files live, what counts as one, and what a PDF actually is.
 *
 * #35 exists as much for two security defects as for the feature, and both of
 * them were about this module not existing. The delivered upload middleware set
 * a size limit and performed no type check of any kind, so BR-15 (PDF only) was
 * enforced on neither side; and the directory the files landed in was handed to
 * `express.static` with no authentication, so any document — student work
 * included — was retrievable by anyone who knew or guessed its path.
 *
 * ## The bytes decide, not the name
 *
 * `looksLikePdf` reads the file's first five bytes. The extension and the
 * Content-Type are both written by whoever is uploading, so a check on either
 * refuses only the honest mistakes; the signature is the one part of the claim
 * the uploader would have to forge a file to satisfy. A caller that forges it
 * has produced something a PDF reader will open, which is what BR-15 is for.
 *
 * ## The stored name is never the sent name
 *
 * The delivered service built the path on disk out of `Date.now()` and the
 * client's own filename. That is a path the uploader writes: `../` in a name
 * escapes the directory, and two uploads in the same millisecond collide. Here
 * the stored name is a random one this module chooses and the sent name is kept
 * in `file_name`, which is display and Content-Disposition and nothing else.
 *
 * ## The directory
 *
 * `EVIDENCE_DIR` names it; the default is `_local/evidence`, which is
 * gitignored, because the files are student work and runtime data rather than
 * source. Read on each call rather than at require time so a test can point it
 * at a directory of its own — the same reason `config.js` reads `FRONTEND_URL`
 * through a function.
 */

/**
 * BR-16's five kinds of evidence, in the order a screen offers them: the brief
 * itself, then a work sample at each of the four achievement bands.
 *
 * The labels are here rather than in the frontend because the shelf hands them
 * to the picker, which is what makes it impossible for the picker and the
 * validator to disagree about what is acceptable — `activities.js` states the
 * rule and this is a fifth place it holds.
 */
const EVIDENCE_TYPES = [
  { evidence_type: 'brief', label_th: 'โจทย์' },
  { evidence_type: 'excellent', label_th: 'ตัวอย่างผลงานระดับดีเยี่ยม' },
  { evidence_type: 'good', label_th: 'ตัวอย่างผลงานระดับดี' },
  { evidence_type: 'fair', label_th: 'ตัวอย่างผลงานระดับปานกลาง' },
  { evidence_type: 'poor', label_th: 'ตัวอย่างผลงานระดับต้องปรับปรุง' },
];

const TYPE_CODES = new Set(EVIDENCE_TYPES.map((entry) => entry.evidence_type));

/**
 * The size limit, unchanged from what was delivered.
 *
 * Nothing in the requirements names a number, so this is not the place to
 * invent a stricter one: the defect was that the limit was the *only* check,
 * not that it was the wrong limit.
 */
const MAX_BYTES = 50 * 1024 * 1024;

/** The five bytes every PDF starts with, whatever it is called. */
const PDF_SIGNATURE = Buffer.from('%PDF-', 'latin1');

const looksLikePdf = (buffer) =>
  Buffer.isBuffer(buffer) &&
  buffer.length >= PDF_SIGNATURE.length &&
  buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE);

const isEvidenceType = (value) => TYPE_CODES.has(value);

const evidenceDir = () =>
  process.env.EVIDENCE_DIR ?? path.join(__dirname, '..', '..', '_local', 'evidence');

/** The absolute path of a stored file, from the relative one the row carries. */
const absolutePath = (relative) => path.join(evidenceDir(), relative);

/**
 * Writes the bytes and answers where they went, relative to the directory.
 *
 * Relative because the row outlives the deployment: an absolute path in the
 * database is a row that stops resolving when the directory moves, which is a
 * migration nobody would think to write. The Section and the Activity are in
 * the path so that a person looking at the directory can tell what they are
 * holding without the database, and because the two ids are the granularity
 * everything else about evidence is authorised at.
 */
async function storeFile(buffer, { sectionId, activityId }) {
  const folder = path.join('section_' + sectionId, 'activity_' + activityId);
  const relative = path.join(folder, crypto.randomUUID() + '.pdf');
  await fs.mkdir(absolutePath(folder), { recursive: true });
  await fs.writeFile(absolutePath(relative), buffer);
  // Stored with forward slashes whatever the platform, so a row written on
  // Windows resolves on the server that will serve it.
  return relative.split(path.sep).join('/');
}

/** The bytes back, or null if the file is not where the row says it is. */
async function readFile(relative) {
  try {
    return await fs.readFile(absolutePath(relative));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

module.exports = {
  EVIDENCE_TYPES,
  MAX_BYTES,
  isEvidenceType,
  looksLikePdf,
  readFile,
  storeFile,
};
