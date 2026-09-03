'use strict';

const test = require('node:test');
const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

const { PASSWORD, ACCOUNTS, CURRENT_YEAR, SEMESTER, byAlias } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { MAX_BYTES } = require('../lib/evidence');

/**
 * docs/acceptance/35-assessment-evidence.md — the server half.
 *
 * The ticket exists as much for two security defects as for the feature. The
 * delivered upload middleware set a size limit and no type check of any kind,
 * so BR-15 (PDF only) was enforced on neither side; and the evidence directory
 * was served by `express.static` with no authentication at all, so any file was
 * retrievable by anybody who knew or guessed its path — student work included.
 * Both are criteria here rather than notes for later.
 *
 * Three things about this suite are deliberate.
 *
 * **The type check is asserted against a lie.** A test that uploads a `.png`
 * and watches it be refused proves only that the extension was read. The rows
 * here upload PNG bytes *named* `brief.pdf` and *declared* `application/pdf`,
 * because the extension and the Content-Type are both the client's to write and
 * the bytes are not.
 *
 * **Retrieval is asserted twice over, from both sides.** That an entitled
 * caller gets the file, and that an unauthenticated one and a teacher of
 * another Section do not — the defect was not that the wrong answer was
 * computed but that no question was asked.
 *
 * **Every file this suite writes is written under a directory of its own.**
 * `EVIDENCE_DIR` is set before the application is built and removed afterwards,
 * so a test run never touches `_local/evidence` and leaves nothing behind.
 */

const DEPT_COMPUTER = '05';

/** PDF is a magic number, not an extension: every reader starts with these. */
const PDF_BYTES = Buffer.from('%PDF-1.7\n1 0 obj\n<< >>\nendobj\ntrailer\n%%EOF\n', 'latin1');
/** PNG's own magic number, for the file that will claim to be a PDF. */
const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 7),
]);

let api;
let store;
before(async () => {
  store = fs.mkdtempSync(path.join(os.tmpdir(), 'deep-evidence-'));
  process.env.EVIDENCE_DIR = store;
  // Required after the variable is set: the application reads it when it is
  // built, and a module cached from an earlier require would hold the default.
  const { startApi } = require('./helpers');
  api = await startApi('evidence', { withSeed: true });
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

/** The same account, now acting as a teacher rather than as its senior grant. */
async function actingAsTeacher(cookie) {
  const switched = await request(api.app)
    .put('/api/me/acting-role')
    .set('Cookie', cookie)
    .send({ role_id: 'TEACHER', scope_id: DEPT_COMPUTER });
  assert.equal(switched.status, 200, switched.body.message);
  return switched.headers['set-cookie'];
}

async function teaching(alias) {
  const cookie = await signInAs(alias);
  return alias === 'U_MULTI' ? actingAsTeacher(cookie) : cookie;
}

/** The Section this alias teaches in the current year. */
async function seededSection(alias) {
  const { rows } = await api.pool.query(
    `SELECT cs.section_id FROM course_sections_teacher cst
       JOIN course_sections cs ON cs.section_id = cst.section_id
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
      WHERE cst.user_id = $1 AND sc.academic_year = $2 AND sc.semester = $3`,
    [byAlias(alias), CURRENT_YEAR, SEMESTER],
  );
  assert.ok(rows.length >= 1, 'expected a seeded section for ' + alias);
  return rows[0].section_id;
}

/** An Activity of that Section, and one the cohort has been marked on. */
async function seededActivity(sectionId) {
  const { rows } = await api.pool.query(
    `SELECT id FROM activities WHERE section_id = $1 ORDER BY id ASC LIMIT 1`,
    [sectionId],
  );
  assert.equal(rows.length, 1, 'expected an activity in section ' + sectionId);
  return rows[0].id;
}

const shelf = (sectionId, activityId) =>
  '/api/teaching/sections/' + sectionId + '/activities/' + activityId + '/evidence';

const item = (sectionId, evidenceId) =>
  '/api/teaching/sections/' + sectionId + '/evidence/' + evidenceId;

const fileOf = (evidenceId) => '/api/evidence/' + evidenceId + '/file';

/**
 * One upload, as the screen makes it: the bytes, plus what the file is and
 * what it is called.
 */
function upload(cookie, sectionId, activityId, { bytes, name, type, description, mime }) {
  const posted = request(api.app)
    .post(shelf(sectionId, activityId))
    .set('Cookie', cookie)
    .field('evidence_type', type ?? 'brief');
  if (description !== undefined) posted.field('description', description);
  return posted.attach('file', bytes, {
    filename: name ?? 'brief.pdf',
    contentType: mime ?? 'application/pdf',
  });
}

const listing = async (cookie, sectionId, activityId) => {
  const answered = await request(api.app).get(shelf(sectionId, activityId)).set('Cookie', cookie);
  assert.equal(answered.status, 200, answered.body.message);
  return answered.body;
};

/** Uploaded and taken away again, so the suite's rows never outlive a test. */
async function withEvidence(cookie, sectionId, activityId, options, run) {
  const made = await upload(cookie, sectionId, activityId, options);
  assert.equal(made.status, 201, made.body.message);
  try {
    return await run(made.body.evidence);
  } finally {
    await api.pool.query('DELETE FROM activity_evidence WHERE evidence_id = $1', [
      made.body.evidence.evidence_id,
    ]);
  }
}

test('a teacher attaches a PDF to their own Activity, and the shelf lists it', async () => {
  // The first criterion. The row comes back with what a reader needs to tell
  // one file from another — its type, its name and its size — and the bytes
  // are on disk under a name this request did not choose.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH');
  const activity = await seededActivity(section);

  await withEvidence(
    cookie,
    section,
    activity,
    { bytes: PDF_BYTES, name: 'โจทย์งานกลุ่ม.pdf', type: 'brief', description: 'โจทย์ที่แจก' },
    async (evidence) => {
      assert.equal(evidence.evidence_type, 'brief');
      assert.equal(evidence.file_name, 'โจทย์งานกลุ่ม.pdf');
      assert.equal(evidence.description, 'โจทย์ที่แจก');
      assert.equal(evidence.file_size, PDF_BYTES.length);

      const shelved = await listing(cookie, section, activity);
      assert.equal(shelved.evidence.length, 1);
      assert.equal(shelved.evidence[0].evidence_id, evidence.evidence_id);

      // The stored path is never the name the client sent. That name is a
      // string the uploader controls, and the delivered system used it to
      // build the path on disk.
      const { rows } = await api.pool.query(
        'SELECT file_path FROM activity_evidence WHERE evidence_id = $1',
        [evidence.evidence_id],
      );
      assert.ok(!rows[0].file_path.includes('โจทย์งานกลุ่ม'), rows[0].file_path);
      assert.ok(fs.existsSync(path.join(store, rows[0].file_path)), rows[0].file_path);
    },
  );
});

test('a PNG named brief.pdf and declared application/pdf is refused', async () => {
  // BR-15, asserted against a lie rather than against an honest mistake. Both
  // the extension and the Content-Type are strings the uploader writes, and the
  // delivered middleware read neither; the bytes are the only part of the claim
  // that would have to be forged.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH');
  const activity = await seededActivity(section);

  const refused = await upload(cookie, section, activity, {
    bytes: PNG_BYTES,
    name: 'brief.pdf',
    mime: 'application/pdf',
    type: 'brief',
  });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.evidenceNotPdf);

  // And nothing was written: not a row, and not a file either.
  const shelved = await listing(cookie, section, activity);
  assert.equal(shelved.evidence.length, 0);
});

test('a file over the size limit is refused with a message that names the limit', async () => {
  // The delivered middleware had this limit and nothing else. Kept at the same
  // number — the defect was that it was the only check, not that it was the
  // wrong one — but answered as a sentence rather than as a stack trace: an
  // unhandled multer error reaches the handler as เกิดข้อผิดพลาดในระบบ, which
  // is a system fault, for something the person can fix.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH');
  const activity = await seededActivity(section);

  const oversize = Buffer.concat([PDF_BYTES, Buffer.alloc(MAX_BYTES, 0x20)]);
  const refused = await upload(cookie, section, activity, {
    bytes: oversize,
    name: 'ใหญ่เกินไป.pdf',
    type: 'brief',
  });
  assert.equal(refused.status, 413);
  assert.match(refused.body.message, /50 MB/);
});

test('evidence can be filed under each of the five types, and under nothing else', async () => {
  // BR-16. The five come back with the shelf so the picker and the validator
  // cannot disagree, and the sixth is refused however plausible it looks.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH');
  const activity = await seededActivity(section);

  const shelf0 = await listing(cookie, section, activity);
  assert.deepEqual(
    shelf0.evidence_types.map((entry) => entry.evidence_type),
    ['brief', 'excellent', 'good', 'fair', 'poor'],
  );

  const made = [];
  try {
    for (const entry of shelf0.evidence_types) {
      const answered = await upload(cookie, section, activity, {
        bytes: PDF_BYTES,
        name: entry.evidence_type + '.pdf',
        type: entry.evidence_type,
      });
      assert.equal(answered.status, 201, entry.evidence_type + ': ' + answered.body.message);
      made.push(answered.body.evidence.evidence_id);
    }

    const shelved = await listing(cookie, section, activity);
    assert.deepEqual(
      shelved.evidence.map((file) => file.evidence_type),
      ['brief', 'excellent', 'good', 'fair', 'poor'],
    );

    const refused = await upload(cookie, section, activity, {
      bytes: PDF_BYTES,
      type: 'project_file',
    });
    assert.equal(refused.status, 400);
    assert.equal(refused.body.message, REFUSALS.evidenceTypeUnknown);

    // And a file filed under nothing at all is refused too. The column is
    // nullable, so nothing below this route objects; a row with no type is one
    // the screen can only draw as a blank heading, and *each of the five types*
    // is what the criterion asks for.
    const untyped = await upload(cookie, section, activity, { bytes: PDF_BYTES, type: '' });
    assert.equal(untyped.status, 400);
    assert.equal(untyped.body.message, REFUSALS.evidenceTypeUnknown);
  } finally {
    await api.pool.query('DELETE FROM activity_evidence WHERE evidence_id = ANY($1)', [made]);
  }
});

test('replacing a file leaves the old one unreachable and the row pointing at the new bytes', async () => {
  // The fourth criterion. What the id addresses afterwards is the new file, and
  // there is no second id that still addresses the old one — the row is the
  // thing retrieval is authorised against, so a superseded file has no way in.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH');
  const activity = await seededActivity(section);
  const second = Buffer.concat([PDF_BYTES, Buffer.from('ฉบับแก้ไข', 'utf8')]);

  await withEvidence(
    cookie,
    section,
    activity,
    { bytes: PDF_BYTES, name: 'ฉบับแรก.pdf', type: 'good', description: 'ฉบับแรก' },
    async (evidence) => {
      const before = await request(api.app).get(fileOf(evidence.evidence_id)).set('Cookie', cookie);
      assert.equal(before.status, 200);
      assert.equal(before.body.length, PDF_BYTES.length);

      const replaced = await request(api.app)
        .put(item(section, evidence.evidence_id))
        .set('Cookie', cookie)
        .field('evidence_type', 'excellent')
        .field('description', 'ตัวอย่างที่ดีกว่า')
        .attach('file', second, { filename: 'ฉบับสอง.pdf', contentType: 'application/pdf' });
      assert.equal(replaced.status, 200, replaced.body.message);
      assert.equal(replaced.body.evidence.file_name, 'ฉบับสอง.pdf');
      assert.equal(replaced.body.evidence.evidence_type, 'excellent');
      assert.equal(replaced.body.evidence.description, 'ตัวอย่างที่ดีกว่า');

      const after = await request(api.app).get(fileOf(evidence.evidence_id)).set('Cookie', cookie);
      assert.equal(after.status, 200);
      assert.equal(after.body.length, second.length);

      // One row, not two: a replace is an update, and the shelf does not grow.
      const shelved = await listing(cookie, section, activity);
      assert.equal(shelved.evidence.length, 1);
    },
  );
});

test('removed evidence disappears from the shelf and stops being retrievable', async () => {
  // The fifth criterion, and the half of the fourth that is about the id rather
  // than the bytes. Soft, because migration 0003 asks for it — but *removed* has
  // to mean removed to everybody holding the id, which is what the second
  // request here is for.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH');
  const activity = await seededActivity(section);

  const made = await upload(cookie, section, activity, {
    bytes: PDF_BYTES,
    name: 'ผิดไฟล์.pdf',
    type: 'poor',
  });
  assert.equal(made.status, 201, made.body.message);
  const { evidence_id: id } = made.body.evidence;

  try {
    const removed = await request(api.app).delete(item(section, id)).set('Cookie', cookie);
    assert.equal(removed.status, 204);

    const shelved = await listing(cookie, section, activity);
    assert.equal(shelved.evidence.length, 0);

    const opened = await request(api.app).get(fileOf(id)).set('Cookie', cookie);
    assert.equal(opened.status, 404);
    assert.equal(opened.body.message, REFUSALS.evidenceNotFound);

    // Removing it twice is ไม่พบ rather than a second silent success.
    const again = await request(api.app).delete(item(section, id)).set('Cookie', cookie);
    assert.equal(again.status, 404);

    // The row is still there, which is what soft-deleted means and what an
    // accreditation review is owed.
    const { rows } = await api.pool.query(
      'SELECT is_deleted FROM activity_evidence WHERE evidence_id = $1',
      [id],
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].is_deleted, true);
  } finally {
    await api.pool.query('DELETE FROM activity_evidence WHERE evidence_id = $1', [id]);
  }
});

test('an unauthenticated request for a known evidence path is refused', async () => {
  // The defect this ticket exists for, stated as plainly as it can be. The path
  // is not guessed here — the test has just been told the id — and it is still
  // refused, because the guard is a question about the caller and not about how
  // hard the address was to find. `express.static` could never have asked it.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH');
  const activity = await seededActivity(section);

  await withEvidence(
    cookie,
    section,
    activity,
    { bytes: PDF_BYTES, name: 'งานนักศึกษา.pdf', type: 'excellent' },
    async (evidence) => {
      const anonymous = await request(api.app).get(fileOf(evidence.evidence_id));
      assert.equal(anonymous.status, 401);
      assert.equal(anonymous.body.message, REFUSALS.noSession);
      // And nothing of the file came back with the refusal.
      assert.notEqual(anonymous.headers['content-type'], 'application/pdf');
    },
  );
});

test('a teacher is refused another Section — for the listing and for the file alike', async () => {
  // The eighth criterion, both halves. The listing is refused by the Section
  // guard every teaching route already has; the file is refused by a guard of
  // its own, because it is not addressed through a Section and could not borrow
  // that one.
  const owner = await teaching('U_TEACH');
  // U_MULTI rather than U_TEACH2: the second teacher account holds no
  // Section in the current year, and a stranger who teaches nothing could not
  // show that the guard reads *which* Section rather than *whether any*.
  const stranger = await teaching('U_MULTI');
  const section = await seededSection('U_TEACH');
  const activity = await seededActivity(section);

  await withEvidence(
    owner,
    section,
    activity,
    { bytes: PDF_BYTES, name: 'ของอาจารย์คนแรก.pdf', type: 'good' },
    async (evidence) => {
      const listed = await request(api.app).get(shelf(section, activity)).set('Cookie', stranger);
      assert.equal(listed.status, 404);
      assert.equal(listed.body.message, REFUSALS.sectionNotFound);

      const opened = await request(api.app).get(fileOf(evidence.evidence_id)).set('Cookie', stranger);
      assert.equal(opened.status, 404);
      assert.equal(opened.body.message, REFUSALS.evidenceNotFound);

      // The same stranger cannot reach it through the Section they do teach
      // either: the row is checked against the Section that was authorised.
      const theirs = await seededSection('U_MULTI');
      const removed = await request(api.app)
        .delete(item(theirs, evidence.evidence_id))
        .set('Cookie', stranger);
      assert.equal(removed.status, 404);
    },
  );
});

test('a committee member opens the evidence behind a figure they can read', async () => {
  // #42's drill-down names the evidence a figure rests on and says on screen
  // that opening it waits for this ticket. This is that sentence answered.
  //
  // Their entitlement is not the Section — they teach nothing — but the CLO:
  // the file hangs off an Activity attributed to an outcome of a curriculum
  // they reach, which is the road the drill-down itself came down.
  const owner = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH');
  const activity = await seededActivity(section);

  await withEvidence(
    owner,
    section,
    activity,
    { bytes: PDF_BYTES, name: 'หลักฐานของหลักสูตร.pdf', type: 'brief' },
    async (evidence) => {
      const committee = await signInAs('U_COM');
      const opened = await request(api.app).get(fileOf(evidence.evidence_id)).set('Cookie', committee);
      assert.equal(opened.status, 200, opened.body.message);
      assert.equal(opened.headers['content-type'], 'application/pdf');
      assert.equal(opened.body.length, PDF_BYTES.length);

      // The external assessor reads what the committee reads, as they do
      // everywhere else in the reporting half.
      const assessor = await signInAs('U_EXT');
      const byAssessor = await request(api.app)
        .get(fileOf(evidence.evidence_id))
        .set('Cookie', assessor);
      assert.equal(byAssessor.status, 200, byAssessor.body.message);

      // A committee member of another curriculum is refused the same file. The
      // reach is what decides, and it is read from the database rather than
      // from anything in the request (ADR-0002).
      const other = await signInAs('U_COM2');
      const refused = await request(api.app).get(fileOf(evidence.evidence_id)).set('Cookie', other);
      assert.equal(refused.status, 404);
      assert.equal(refused.body.message, REFUSALS.evidenceNotFound);
    },
  );
});

test('the file name travels in the header without travelling in the path', async () => {
  // Two things at once, and they are the same thing seen from both ends. The
  // Thai name survives the round trip, which the delivered service had to
  // repair too; and it is nowhere in what the row stores, because the delivered
  // service built the path on disk out of it — a name containing `../` is a
  // path the uploader wrote.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH');
  const activity = await seededActivity(section);

  await withEvidence(
    cookie,
    section,
    activity,
    { bytes: PDF_BYTES, name: '../../หนีออกไป.pdf', type: 'fair' },
    async (evidence) => {
      const opened = await request(api.app).get(fileOf(evidence.evidence_id)).set('Cookie', cookie);
      assert.equal(opened.status, 200);
      assert.match(
        opened.headers['content-disposition'],
        new RegExp(encodeURIComponent('หนีออกไป.pdf')),
      );

      const { rows } = await api.pool.query(
        'SELECT file_path FROM activity_evidence WHERE evidence_id = $1',
        [evidence.evidence_id],
      );
      assert.ok(!rows[0].file_path.includes('..'), rows[0].file_path);
      assert.match(rows[0].file_path, /^section_\d+\/activity_\d+\/[0-9a-f-]{36}\.pdf$/);
    },
  );
});

test('evidence of an Activity that is not this Section is not on this shelf', async () => {
  // The path names a Section and an Activity, and both are checked. Otherwise a
  // teacher could read another Section's shelf by asking their own Section for
  // somebody else's Activity — the id is an integer and nothing about it says
  // whose it is.
  const cookie = await teaching('U_TEACH');
  const mine = await seededSection('U_TEACH');
  const theirs = await seededSection('U_MULTI');
  const strangerActivity = await seededActivity(theirs);

  const answered = await request(api.app)
    .get(shelf(mine, strangerActivity))
    .set('Cookie', cookie);
  assert.equal(answered.status, 404);
  assert.equal(answered.body.message, REFUSALS.activityNotFound);
});

test('a request carrying nothing at all is refused as a sentence, not as a fault', async () => {
  // The review found this one. multer returns early when a request is not
  // multipart, and the body parsers leave `req.body` undefined — so reading a
  // field off it threw, and the throw was answered เกิดข้อผิดพลาดในระบบ. A
  // system fault, for a request that is simply missing everything: the exact
  // muddle the size-limit handler two lines away exists to clear up.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH');
  const activity = await seededActivity(section);

  const empty = await request(api.app).post(shelf(section, activity)).set('Cookie', cookie);
  assert.equal(empty.status, 400);
  assert.equal(empty.body.message, REFUSALS.evidenceTypeUnknown);
});

test('a replace that says nothing about the description keeps it', async () => {
  // *Absent* and *empty* are two different instructions, and the route reads
  // them as two. The screen sends the field on every save, so a person who
  // clears the box still clears the row — but the endpoint is the contract, and
  // a caller replacing only the file was silently wiping what the file said.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH');
  const activity = await seededActivity(section);

  await withEvidence(
    cookie,
    section,
    activity,
    { bytes: PDF_BYTES, name: 'เดิม.pdf', type: 'good', description: 'คำอธิบายที่ต้องอยู่ต่อ' },
    async (evidence) => {
      const replaced = await request(api.app)
        .put(item(section, evidence.evidence_id))
        .set('Cookie', cookie)
        .attach('file', PDF_BYTES, { filename: 'ใหม่.pdf', contentType: 'application/pdf' });
      assert.equal(replaced.status, 200, replaced.body.message);
      assert.equal(replaced.body.evidence.file_name, 'ใหม่.pdf');
      assert.equal(replaced.body.evidence.description, 'คำอธิบายที่ต้องอยู่ต่อ');

      // And a description sent empty still clears it, which is what the screen
      // does when somebody empties the box.
      const cleared = await request(api.app)
        .put(item(section, evidence.evidence_id))
        .set('Cookie', cookie)
        .field('description', '');
      assert.equal(cleared.status, 200, cleared.body.message);
      assert.equal(cleared.body.evidence.description, null);
      assert.equal(cleared.body.evidence.file_name, 'ใหม่.pdf');
    },
  );
});
