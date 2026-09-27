'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const { evidenceDir } = require('./evidence');

/**
 * Where a profile photo lives, what counts as one, and what happens to the file
 * it replaces — ticket #47.
 *
 * Migration 0004 built `user_image` and said in as many words which half of the
 * problem it was not solving: "The file on disk is not swept up with the row …
 * The database cannot reach a filesystem, so this half belongs to the upload
 * path, with the type-check and retrieval-auth defects: #47." This module is
 * that half, and it is `lib/evidence.js` one table over — the delivered system
 * had the same three defects twice, because both uploads went through the same
 * six-line middleware and the same unauthenticated `express.static`.
 *
 * ## The bytes decide, not the name
 *
 * `imageKind` reads the first bytes of the file. The extension and the
 * Content-Type are both written by whoever is uploading, so a check on either
 * refuses only the honest mistakes. The delivered path checked neither: it took
 * `path.extname(req.file.originalname)` and wrote the file under it, so a
 * caller could store any bytes at all under any extension they liked, inside a
 * directory that was served to the world.
 *
 * ## Two kinds, and why the list is short
 *
 * PNG and JPEG. Nothing in the requirements names a format — the delivered code
 * accepted anything — so this is a decision rather than an inheritance (#45),
 * and the argument for the short list is that the file is drawn in an `<img>`
 * in the navbar and these are the two a camera, a phone or a screenshot
 * produces. The cost of the list being too short is a person whose photo is
 * refused with a sentence that says which kinds are taken; the cost of it being
 * too long is a format the browser will not draw, stored and served as an image.
 * A third kind is `KINDS` plus a signature, and the sentence in `refusals.js`
 * names the formats, so both move together.
 *
 * ## The stored name is never the sent name
 *
 * The delivered path built it out of the user id and `Date.now()` —
 * `/user_image/66010001_1699999999999.png` — which is a name the uploader
 * mostly writes and anybody can guess, and it was guessable at a URL that
 * answered without a session. Here it is a random name this module chooses, and
 * the sent name is not kept at all: unlike a piece of evidence, a profile photo
 * is never shown to anybody as a document with a filename.
 *
 * ## What is deleted, and why deleting is this module's job
 *
 * `removePhoto` unlinks. Two callers need it and only one of them exists today:
 * a replacement, which is criterion 4 and the one part of the inherited
 * implementation that was already right; and the deletion of an account, which
 * is criterion 5 and which no route in this application can do — `users.js` has
 * no DELETE and `docs/acceptance/11-user-accounts.md` says why. Migration 0004's
 * CASCADE removes the row the day somebody deletes a user through SQL; the file
 * is what this function is for, and the route that will need it does not exist
 * yet. That is written on the sheet rather than solved with a caller nobody
 * calls.
 */

/** The signature of each kind, with what to serve it as and what to call it. */
const KINDS = [
  {
    mime: 'image/png',
    extension: '.png',
    signature: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    // Three bytes rather than four: the fourth says which flavour of JFIF or
    // Exif it is, and a phone, a scanner and a screenshot tool disagree about
    // it while all three produce a JPEG every reader opens.
    mime: 'image/jpeg',
    extension: '.jpg',
    signature: Buffer.from([0xff, 0xd8, 0xff]),
  },
];

/**
 * The size limit, which is the one check that was already there.
 *
 * The delivered route reached this middleware — `uploads.single('image')`, the
 * evidence uploader — so the number it enforced was fifty megabytes, chosen for
 * a PDF of student work. Five here, because a number copied from a sibling
 * screen is a decision and not an inheritance (#45), and this one is a
 * decision: the file is a face in a forty-pixel circle, the limit is what a
 * caller may make this process hold in memory before anything about the file is
 * known, and fifty megabytes of that per request is a cost with nothing asking
 * for it. Nothing in the requirements names a number either way, so the
 * measurement that matters is the one in the other direction — a photo straight
 * off a recent phone is two to five megabytes, which is what makes five the
 * smallest number that refuses nobody's actual photograph.
 */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** The megabytes the refusal says, so the sentence and the limit cannot differ. */
const MAX_PHOTO_MEGABYTES = Math.floor(MAX_PHOTO_BYTES / (1024 * 1024));

/** What this buffer is, or null if it is not one of the kinds. */
const imageKind = (buffer) => {
  if (!Buffer.isBuffer(buffer)) return null;
  return (
    KINDS.find(
      (kind) =>
        buffer.length >= kind.signature.length &&
        buffer.subarray(0, kind.signature.length).equals(kind.signature),
    ) ?? null
  );
};

/**
 * The directory, under the evidence root and named as migration 0004 has it.
 *
 * `user_image` because that is the folder the delivered code wrote to and the
 * string every `image_path` in a live database already begins with. Read on
 * each call rather than at require time, for `lib/evidence.js`' reason: a test
 * points `EVIDENCE_DIR` at a directory of its own.
 */
const photoDir = () => path.join(evidenceDir(), 'user_image');

/** The absolute path of a stored photo, from the relative one the row carries. */
const absolutePath = (relative) => path.join(evidenceDir(), relative);

/**
 * Writes the bytes and answers where they went, relative to the evidence root.
 *
 * Relative for the reason `storeFile` is: a row outlives the deployment, and an
 * absolute path in the database stops resolving when the directory moves. No
 * folder per user — there is one file per account and the name is random, so a
 * directory per user would hold exactly one file and tell a reader of the
 * directory whose it was, which is the one thing the name deliberately does not
 * say.
 */
async function storePhoto(buffer, kind) {
  await fs.mkdir(photoDir(), { recursive: true });
  const relative = path.join('user_image', crypto.randomUUID() + kind.extension);
  await fs.writeFile(absolutePath(relative), buffer);
  // Forward slashes whatever the platform, so a row written on Windows resolves
  // on the server that will serve it.
  return relative.split(path.sep).join('/');
}

/**
 * Where a stored path really lands, or null if that is not under the photos.
 *
 * Both of the callers below need this and it was written for one of them, which
 * is the shape a guard usually has when it is wrong: a rule written for the
 * delete is a claim about the read as well. `image_path` comes out of the
 * database, so it is data this process wrote rather than input a caller sent —
 * and that is exactly the assumption worth one line of code. A row edited to
 * `../../../etc/passwd` would otherwise have made `removePhoto` delete what it
 * named and `readPhoto` serve it, the second of those to a caller who is asking
 * only for their own face.
 *
 * Resolved rather than spelled: a `..` in the middle is answered by where the
 * path ends, not by how it is written.
 */
const insidePhotos = (relative) => {
  if (typeof relative !== 'string' || relative.length === 0) return null;
  const target = path.resolve(absolutePath(relative));
  const root = path.resolve(photoDir());
  return target.startsWith(root + path.sep) ? target : null;
};

/**
 * The bytes back, or null if the file is not where the row says it is.
 *
 * A path that is not under the photo directory is *also* null, and deliberately
 * the same answer: the route turns it into the sentence that says to upload the
 * photograph again, which is the true thing to tell somebody whose row points
 * somewhere it should never have pointed.
 */
async function readPhoto(relative) {
  const target = insidePhotos(relative);
  if (!target) return null;
  try {
    return await fs.readFile(target);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

/**
 * Deletes the file a row used to point at.
 *
 * A file that is already gone is not an error: the caller's intent is that the
 * bytes not be there afterwards, and they are not. Anything else — a directory
 * where a file was, a permission refusal — is thrown, because it means the old
 * photo is still readable and the caller is about to report success.
 *
 * It refuses to delete anything that is not under the photo directory —
 * `insidePhotos` above, which the read asks as well.
 */
async function removePhoto(relative) {
  const target = insidePhotos(relative);
  if (!target) return;
  try {
    await fs.unlink(target);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

module.exports = {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_MEGABYTES,
  imageKind,
  readPhoto,
  removePhoto,
  storePhoto,
};
