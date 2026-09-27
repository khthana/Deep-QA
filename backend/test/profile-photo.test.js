'use strict';

const test = require('node:test');
const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

const { PASSWORD, ACCOUNTS } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { MAX_PHOTO_BYTES } = require('../lib/userPhoto');

/**
 * docs/acceptance/47-profile-photo.md — the server half.
 *
 * #46 built `user_image` and deliberately left the path to it alone: the
 * inherited upload accepted any bytes under any name, the directory holding
 * them was served by `express.static` with no authentication, and deleting an
 * account removed the row and left the file. #47 is the ticket for all three,
 * and the first two are criteria here rather than notes for later.
 *
 * Three things about this suite are deliberate, and two of them are #35's — the
 * same defects against a different table, so the rows are shaped the same way.
 *
 * **The type check is asserted against a lie.** A row that uploads a `.txt` and
 * watches it be refused proves only that somebody read the extension. The rows
 * here send PDF bytes *named* `photo.png` and *declared* `image/png`, because
 * the name and the Content-Type are the caller's to write and the first bytes
 * of the file are not.
 *
 * **Retrieval is asserted from both sides.** That the caller gets their own
 * photo, that an unauthenticated request gets nothing, and that the bytes one
 * account receives are its own and not the other account's — the defect was
 * never a wrong answer, it was that no question was asked.
 *
 * **Every file this suite writes goes under a directory of its own.**
 * `EVIDENCE_DIR` is set before the application is built and removed afterwards,
 * so a run never touches `_local/evidence` and leaves nothing behind.
 */

/** PNG's magic number, and the only thing about a PNG this application reads. */
const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 7),
]);
/** A second PNG, so *which* bytes came back is a question with an answer. */
const PNG_REPLACEMENT = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 9),
]);
/** JPEG's, which is the other kind a camera or a phone hands over. */
const JPEG_BYTES = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(64, 3),
]);
/** The file that will claim to be a PNG. */
const PDF_BYTES = Buffer.from('%PDF-1.7\n1 0 obj\n<< >>\nendobj\ntrailer\n%%EOF\n', 'latin1');

let api;
let store;
before(async () => {
  store = fs.mkdtempSync(path.join(os.tmpdir(), 'deep-photo-'));
  process.env.EVIDENCE_DIR = store;
  // After the variable is set, for `evidence.test.js`' reason: the module reads
  // it when the application is built and a cached one would hold the default.
  const { startApi } = require('./helpers');
  api = await startApi('photo', { withSeed: true });
});
after(async () => {
  await api.close();
  delete process.env.EVIDENCE_DIR;
  fs.rmSync(store, { recursive: true, force: true });
});

const emailOf = (alias) => ACCOUNTS.find((account) => account.alias === alias).email;

async function signInAs(alias) {
  const response = await request(api.app)
    .post('/api/auth/login')
    .send({ email: emailOf(alias), password: PASSWORD });
  assert.equal(response.status, 200, 'sign-in failed for ' + alias + ': ' + response.body.message);
  return response.headers['set-cookie'];
}

/** Every file under the photo directory, however deep, as absolute paths. */
const storedFiles = () => {
  const root = path.join(store, 'user_image');
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(root, entry.name));
};

const upload = (cookie, bytes, { filename = 'photo.png', contentType = 'image/png' } = {}) =>
  request(api.app)
    .post('/api/me/photo')
    .set('Cookie', cookie)
    .attach('image', bytes, { filename, contentType });

test('a signed-in caller uploads a photo and reads it back', async () => {
  const cookie = await signInAs('U_ADMIN');

  const before = await request(api.app).get('/api/me').set('Cookie', cookie);
  assert.equal(before.status, 200);
  assert.equal(
    before.body.user.has_photo,
    false,
    'the account starts without one, which is what makes the change measurable',
  );

  const posted = await upload(cookie, PNG_BYTES);
  assert.equal(posted.status, 200, posted.body.message);

  const after = await request(api.app).get('/api/me').set('Cookie', cookie);
  assert.equal(after.body.user.has_photo, true);

  const fetched = await request(api.app).get('/api/me/photo').set('Cookie', cookie);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.headers['content-type'], 'image/png');
  assert.deepEqual(fetched.body, PNG_BYTES, 'the bytes that were sent are the bytes served');
  // The two headers #35 ends on, for the same reasons: a file that is a PNG and
  // something else is not sniffed into being the something else, and a photo
  // that has just been replaced is not read out of the browser's cache.
  assert.equal(fetched.headers['x-content-type-options'], 'nosniff');
  assert.equal(fetched.headers['cache-control'], 'no-store');
});

test('a JPEG is the other kind a phone hands over, and is accepted', async () => {
  const cookie = await signInAs('U_FAC');
  const posted = await upload(cookie, JPEG_BYTES, {
    filename: 'selfie.jpg',
    contentType: 'image/jpeg',
  });
  assert.equal(posted.status, 200, posted.body.message);

  const fetched = await request(api.app).get('/api/me/photo').set('Cookie', cookie);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.headers['content-type'], 'image/jpeg');
  assert.deepEqual(fetched.body, JPEG_BYTES);
});

test('a file that is not an image is refused however it is named and declared', async () => {
  const cookie = await signInAs('U_DEPT');
  const count = storedFiles().length;

  const posted = await upload(cookie, PDF_BYTES);
  assert.equal(posted.status, 400);
  assert.equal(posted.body.message, REFUSALS.photoNotImage);
  assert.equal(
    storedFiles().length,
    count,
    'a refused upload writes nothing: the judgement happens before the disk',
  );

  const fetched = await request(api.app).get('/api/me/photo').set('Cookie', cookie);
  assert.equal(fetched.status, 404, 'and leaves the account with no photo at all');
});

test('a file over the limit is refused with the limit in the sentence', async () => {
  const cookie = await signInAs('U_COM');
  const oversize = Buffer.concat([PNG_BYTES, Buffer.alloc(MAX_PHOTO_BYTES, 1)]);

  const posted = await upload(cookie, oversize);
  assert.equal(posted.status, 413);
  assert.equal(
    posted.body.message,
    REFUSALS.photoTooLarge(Math.floor(MAX_PHOTO_BYTES / (1024 * 1024))),
  );
});

test('a request with no file at all is a refusal and not a fault', async () => {
  const cookie = await signInAs('U_COM2');
  const posted = await request(api.app).post('/api/me/photo').set('Cookie', cookie);
  assert.equal(posted.status, 400);
  assert.equal(posted.body.message, REFUSALS.photoNoFile);
});

test('a replacement removes the previous file from disk', async () => {
  const cookie = await signInAs('U_TEACH');

  // Bytes nothing else in this file uploads, because the name on disk is random
  // and the only way to say *which* file was this row's is to recognise it. Two
  // accounts uploading identical bytes would leave two files this row cannot
  // tell apart, which is a precondition it was handed rather than one it built.
  const first = Buffer.concat([PNG_BYTES.subarray(0, 8), Buffer.alloc(64, 0x47)]);

  assert.equal((await upload(cookie, first)).status, 200);
  const mine = storedFiles().filter((file) => fs.readFileSync(file).equals(first));
  assert.equal(mine.length, 1, 'one file for one upload');

  assert.equal((await upload(cookie, PNG_REPLACEMENT)).status, 200);

  assert.equal(
    fs.existsSync(mine[0]),
    false,
    'the bytes it replaced are gone, not merely unreferenced',
  );
  const fetched = await request(api.app).get('/api/me/photo').set('Cookie', cookie);
  assert.deepEqual(fetched.body, PNG_REPLACEMENT);
});

test('an unauthenticated caller reaches neither the upload nor the photo', async () => {
  const cookie = await signInAs('U_TEACH2');
  assert.equal((await upload(cookie, PNG_BYTES)).status, 200);

  const fetched = await request(api.app).get('/api/me/photo');
  assert.equal(fetched.status, 401);
  assert.equal(fetched.body.reason, 'anonymous');

  const posted = await request(api.app)
    .post('/api/me/photo')
    .attach('image', PNG_BYTES, { filename: 'photo.png', contentType: 'image/png' });
  assert.equal(posted.status, 401);
});

test('the photo a caller receives is their own, because the cookie names it', async () => {
  const mine = await signInAs('U_DEPT2');
  const theirs = await signInAs('U_EXT');

  assert.equal((await upload(mine, PNG_BYTES)).status, 200);
  assert.equal((await upload(theirs, PNG_REPLACEMENT)).status, 200);

  // There is no identifier in the path to get wrong, which is the point: the
  // inherited static mount answered to a path, and this answers to a session.
  assert.deepEqual((await request(api.app).get('/api/me/photo').set('Cookie', mine)).body, PNG_BYTES);
  assert.deepEqual(
    (await request(api.app).get('/api/me/photo').set('Cookie', theirs)).body,
    PNG_REPLACEMENT,
  );
});

test('a row whose bytes are gone says so, rather than answering not found', async () => {
  const cookie = await signInAs('U_MULTI');
  // Bytes of its own, for the reason the replacement row gives at length: the
  // name on disk is random, so recognising the file is the only way to say which
  // one was this row's, and `JPEG_BYTES` is a photo another account also has.
  const mine = Buffer.concat([JPEG_BYTES.subarray(0, 3), Buffer.alloc(64, 0x4a)]);
  assert.equal((await upload(cookie, mine)).status, 200);

  const file = storedFiles().find((candidate) => fs.readFileSync(candidate).equals(mine));
  assert.ok(file, 'the upload landed somewhere');
  fs.rmSync(file);

  const fetched = await request(api.app).get('/api/me/photo').set('Cookie', cookie);
  assert.equal(fetched.status, 410);
  assert.equal(fetched.body.message, REFUSALS.photoFileMissing);
  // `/api/me` still says there is one, and that is correct: the row is what the
  // navbar asks about, and a 410 is what it will meet. The two answers together
  // are what tell a person to upload it again rather than report a fault.
  const shell = await request(api.app).get('/api/me').set('Cookie', cookie);
  assert.equal(shell.body.user.has_photo, true);
});

test('an account with no photo is a 404 and not an empty answer', async () => {
  const cookie = await signInAs('U_CROSS');
  const fetched = await request(api.app).get('/api/me/photo').set('Cookie', cookie);
  assert.equal(fetched.status, 404);
  assert.equal(fetched.body.message, REFUSALS.photoNotFound);
});

test('the limit the shell publishes is the limit the server enforces', async () => {
  const cookie = await signInAs('U_NONKMITL');

  const shell = await request(api.app).get('/api/me').set('Cookie', cookie);
  const limit = shell.body.photo.max_bytes;
  assert.equal(limit, MAX_PHOTO_BYTES, 'the dialog is told the number, not a copy of it');

  // Either side of it, because a number published for a browser to draw a
  // sentence from is only worth publishing if it is the number that decides.
  const atLimit = Buffer.concat([PNG_BYTES.subarray(0, 8), Buffer.alloc(limit - 8, 2)]);
  assert.equal(atLimit.length, limit);
  assert.equal((await upload(cookie, atLimit)).status, 200);

  const overLimit = Buffer.concat([atLimit, Buffer.alloc(1, 2)]);
  assert.equal((await upload(cookie, overLimit)).status, 413);
});

test('a row pointing outside the photo directory is not a way to read a file', async () => {
  // The path is data this process wrote, so this row writes a different one —
  // which is the only way to ask whether anything checks. A guard written for
  // the delete is a claim about the read too, and the read is the one that would
  // hand the file to somebody.
  const cookie = await signInAs('U_CROSS');
  assert.equal((await upload(cookie, PNG_BYTES)).status, 200);

  const outside = path.join(store, 'not-a-photo.png');
  fs.writeFileSync(outside, PNG_BYTES);
  await api.pool.query(
    `UPDATE user_image SET image_path = $2 WHERE user_id = (SELECT user_id FROM users WHERE email = $1)`,
    [emailOf('U_CROSS'), '../not-a-photo.png'],
  );

  const fetched = await request(api.app).get('/api/me/photo').set('Cookie', cookie);
  assert.equal(fetched.status, 410, 'the bytes are there; what is refused is where they are');
  assert.equal(fetched.body.message, REFUSALS.photoFileMissing);
  assert.equal(fs.existsSync(outside), true, 'and nothing outside the directory was touched');
});

test('the sign-in answer says whether there is a photo, like every other answer', async () => {
  // `Login.js` throws this `user` away and calls `reload()`, so nothing in this
  // application reads it — but an answer nobody happens to read is still an
  // answer, and `false` about an account with a photo would be wrong on the wire.
  const cookie = await signInAs('U_DEPT');
  assert.equal((await upload(cookie, PNG_BYTES)).status, 200);

  const again = await request(api.app)
    .post('/api/auth/login')
    .send({ email: emailOf('U_DEPT'), password: PASSWORD });
  assert.equal(again.status, 200);
  assert.equal(again.body.user.has_photo, true);
});
