'use strict';

const express = require('express');
const multer = require('multer');

const { REFUSALS } = require('../auth/refusals');
const { requireRole } = require('../auth/authorise');
const { blankToNull, integerId } = require('../lib/fields');
const {
  EVIDENCE_TYPES,
  MAX_BYTES,
  isEvidenceType,
  looksLikePdf,
  readFile,
  storeFile,
} = require('../lib/evidence');
const { reachablePrograms } = require('../lib/reach');
const { sectionOf, notThisSection } = require('./enrolment');

/**
 * Ticket #35: หลักฐานการประเมิน — the files that make an assessment defensible.
 *
 * A Teacher attaches the brief and a work sample at each of the four
 * achievement bands (BR-16), replaces one when a better example appears, and
 * removes one that should not have been there. That is the feature. The ticket
 * exists as much for two defects in what was delivered, and both are the reason
 * this file looks the way it does.
 *
 * ## The type check had nowhere to live, so it lived nowhere
 *
 * The delivered `evidenceUpload.js` was six lines: memory storage and a size
 * limit, and no `fileFilter` at all. BR-15 says PDF only, and it was enforced
 * on neither side — not by the browser, not by the server, and not by a CHECK
 * on the schema either, which migration 0003 says in as many words is
 * deliberate: the column holds a string the uploader writes.
 *
 * So the check is here, on the bytes. `looksLikePdf` reads the first five of
 * them. A test that uploads a `.png` and watches it be refused would prove only
 * that somebody read the extension; the row that matters uploads PNG bytes
 * named `brief.pdf` and declared `application/pdf`, because those two are the
 * uploader's to write and the signature is not.
 *
 * ## The directory answered to anybody
 *
 * `app.use('/static', express.static('/data/evidence'))` — one line, no guard.
 * Every evidence file in the system was retrievable by anyone who knew or
 * guessed its path, student work included, and the paths were built out of a
 * timestamp and the original filename, so guessing was not far-fetched.
 *
 * There is no static mount here. `GET /evidence/:id/file` reads the row, works
 * out whether *this* caller is entitled to *this* file, and only then reads the
 * bytes — which is the shape every other read in this application already has
 * (ADR-0002), and the one thing a directory served statically can never do.
 *
 * ## Who is entitled, and why it is two questions and not one
 *
 * A Teacher reaches the evidence of a Section they teach: `sectionOf` answers
 * that, as it does for every other Section-grained route.
 *
 * A committee member or an external assessor reaches it too, and by a different
 * road. #42's drill-down already names the evidence behind a figure and says on
 * screen that opening it waits for this ticket; that sentence is what this
 * endpoint is answering. Their entitlement is not "you teach this Section" — they
 * teach nothing — but "this file hangs off an Activity attributed to a CLO of a
 * curriculum you can read", which is exactly the path the drill-down came down.
 * Anything looser would hand a reader of one curriculum the student work of
 * another.
 *
 * The two questions are asked in that order and either one is enough. Neither is
 * asked of the request body: both are computed from the session and the row.
 *
 * ## What replacing and removing mean
 *
 * A replace writes the new file, points the row at it, and leaves the old bytes
 * where they are; a remove sets `is_deleted`. Both are what migration 0003 asks
 * for — evidence is what an accreditation review is shown, so the rows are
 * soft-deleted rather than removed and the parents are RESTRICT. *Stops being
 * retrievable* is therefore a property of the row and not of the disk: every
 * read here, the listing and the file both, is `NOT is_deleted`, and a caller
 * holding the old id gets ไม่พบ.
 */

const TEACHING = ['TEACHER'];
const READERS = ['PROG_MANAGER', 'EXT_ASSESSOR'];

/**
 * The upload, held in memory and never on disk until it has been judged.
 *
 * `memoryStorage` is the delivered choice and the right one: a file written to
 * disk before the type check is a file the check has to clean up after, and
 * `lib/importer.js` makes the same argument one floor down about the CSV
 * imports. The limit is multer's, so the bytes stop arriving rather than
 * arriving and being measured — it is the one check that has to happen before
 * the body is read, which is why it is configuration and the type check is not.
 */
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES } });

/**
 * multer's own refusals, turned into this application's.
 *
 * Without this the size limit reaches the error handler as an unhandled throw
 * and is answered เกิดข้อผิดพลาดในระบบ — a system fault, for something the
 * person can fix by attaching a smaller file. The ticket asks for a clear
 * message and this is where it becomes one.
 */
const acceptFile = (req, res, next) =>
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(413)
        .json({ message: REFUSALS.evidenceTooLarge(Math.floor(MAX_BYTES / (1024 * 1024))) });
    }
    // Every other multer refusal - a second file part, a field where a file
    // was expected, a truncated body - is a malformed upload and not a system
    // fault. Left to fall through, each of them reached the handler as
    // เกิดข้อผิดพลาดในระบบ, which is the muddle this middleware exists to
    // clear up and is no less muddled for being rarer than the size limit.
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: REFUSALS.evidenceUploadUnreadable });
    }
    return next(error);
  });

/**
 * The name the browser sent, read as UTF-8.
 *
 * multipart filenames arrive as latin1 bytes, so a Thai filename read straight
 * off `originalname` is mojibake - the delivered service found this too and
 * repaired it the same way. The name is display and Content-Disposition only;
 * nothing on disk is built from it.
 */
const fileNameOf = (file) => Buffer.from(file.originalname, 'latin1').toString('utf8');

function evidenceRoutes(pool) {
  const router = express.Router();

  const notFound = (res) => res.status(404).json({ message: REFUSALS.evidenceNotFound });

  /**
   * Resolves the ตอนเรียน in the path, or refuses - **before the body is read**.
   *
   * The order is the point. `acceptFile` buffers up to fifty megabytes into
   * this process's memory, and if the ownership check came after it, any
   * account holding a TEACHER grant could make the server hold fifty megabytes
   * for a Section they have nothing to do with. Asking `sectionOf` first costs
   * one query and means the bytes of an unauthorised upload are never accepted
   * in the first place.
   */
  const withSection = async (req, res, next) => {
    try {
      const section = await sectionOf(pool, req, req.params.sectionId);
      if (!section) return notThisSection(res);
      req.section = section;
      return next();
    } catch (error) {
      return next(error);
    }
  };

  /** The Activity, but only if it is this Section's. */
  async function activityIn(sectionId, activityId) {
    const id = integerId(activityId);
    if (id === null) return null;
    const { rows } = await pool.query(
      `SELECT id, activity_name FROM activities WHERE id = $1 AND section_id = $2`,
      [id, sectionId],
    );
    return rows[0] ?? null;
  }

  /**
   * What the shelf holds, in the order it was filled.
   *
   * `file_path` is not among the columns and that is not an oversight: it is
   * where the bytes are, the caller has an id that fetches them through a guard,
   * and a path on the wire is a path somebody will try.
   */
  async function evidenceOf(activityId) {
    const { rows } = await pool.query(
      `SELECT evidence_id, activity_id, evidence_type, description,
              file_name, mime_type, file_size, uploaded_at, updated_at
         FROM activity_evidence
        WHERE activity_id = $1 AND NOT is_deleted
        ORDER BY uploaded_at ASC, evidence_id ASC`,
      [activityId],
    );
    return rows;
  }

  /** One row, whole, including where its bytes are. Not for the wire. */
  async function rowOf(evidenceId) {
    const id = integerId(evidenceId);
    if (id === null) return null;
    const { rows } = await pool.query(
      `SELECT * FROM activity_evidence WHERE evidence_id = $1 AND NOT is_deleted`,
      [id],
    );
    return rows[0] ?? null;
  }

  /**
   * What a POST or a PUT is refused for, before anything is written.
   *
   * The order is the order a person would fix things in: whether there is a
   * file at all, then whether it is a PDF, then what it is being filed as.
   */
  function refuseUpload(req, { fileRequired }) {
    // `req.body ?? {}` for `enrolment.js`' reason: multer returns early when
    // the request is not multipart at all and body-parser leaves `req.body`
    // undefined, so a POST with no body would throw here and be answered
    // เกิดข้อผิดพลาดในระบบ - a system fault, for a request that is simply
    // missing everything.
    const type = blankToNull((req.body ?? {}).evidence_type);
    // A new file has to say what kind of evidence it is. The column is
    // nullable and BR-16 does not say it must not be, but a row filed under
    // nothing is a row the screen can only draw as a blank heading — and *each
    // of the five types* is the criterion. A PUT may leave it out, because
    // leaving a field out of an edit means keeping it.
    if (type === null && fileRequired) return REFUSALS.evidenceTypeUnknown;
    if (type !== null && !isEvidenceType(type)) return REFUSALS.evidenceTypeUnknown;
    if (!req.file) return fileRequired ? REFUSALS.evidenceNoFile : null;
    if (!looksLikePdf(req.file.buffer)) return REFUSALS.evidenceNotPdf;
    return null;
  }

  /**
   * Everything the evidence screen opens with: the Activity's files, and the
   * five kinds it can file a new one under.
   *
   * The types travel with the list rather than being written into the screen,
   * which is `activities.js`' rule about a picker and a validator that must not
   * be able to disagree.
   */
  router.get(
    '/teaching/sections/:sectionId/activities/:activityId/evidence',
    requireRole(...TEACHING),
    withSection,
    async (req, res, next) => {
      try {
        const section = req.section;
        const activity = await activityIn(section.section_id, req.params.activityId);
        if (!activity) return res.status(404).json({ message: REFUSALS.activityNotFound });

        res.json({
          section,
          activity,
          evidence_types: EVIDENCE_TYPES,
          max_bytes: MAX_BYTES,
          evidence: await evidenceOf(activity.id),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/teaching/sections/:sectionId/activities/:activityId/evidence',
    requireRole(...TEACHING),
    withSection,
    acceptFile,
    async (req, res, next) => {
      try {
        const section = req.section;
        const activity = await activityIn(section.section_id, req.params.activityId);
        if (!activity) return res.status(404).json({ message: REFUSALS.activityNotFound });

        const refusal = refuseUpload(req, { fileRequired: true });
        if (refusal) return res.status(400).json({ message: refusal });

        // Written to disk before the row, so a row never points at bytes that
        // are not there. The other order fails the other way, and that failure
        // is the one nobody notices until an accreditation review opens a file.
        const filePath = await storeFile(req.file.buffer, {
          sectionId: section.section_id,
          activityId: activity.id,
        });

        const { rows } = await pool.query(
          `INSERT INTO activity_evidence
             (section_id, activity_id, evidence_type, description,
              file_name, file_path, mime_type, file_size, uploaded_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, 'application/pdf', $7, $8, $8)
           RETURNING evidence_id, activity_id, evidence_type, description,
                     file_name, mime_type, file_size, uploaded_at, updated_at`,
          [
            section.section_id,
            activity.id,
            blankToNull(req.body.evidence_type),
            blankToNull(req.body.description),
            fileNameOf(req.file),
            filePath,
            req.file.size,
            req.session.userId,
          ],
        );
        res.status(201).json({ evidence: rows[0] });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Replace the file, or correct what it says about itself, or both.
   *
   * One endpoint rather than two because they are one act on the screen — the
   * row is opened, some of it is changed, it is saved — and because a replace
   * that could not also fix the description would send a person through two
   * saves to correct one mistake.
   */
  router.put(
    '/teaching/sections/:sectionId/evidence/:evidenceId',
    requireRole(...TEACHING),
    withSection,
    acceptFile,
    async (req, res, next) => {
      try {
        const section = req.section;
        const row = await rowOf(req.params.evidenceId);
        // The Section in the path is the one that was authorised; a row of
        // another Section is ไม่พบ here rather than a different sentence, for
        // the reason in this file's header.
        if (!row || row.section_id !== section.section_id) return notFound(res);

        const refusal = refuseUpload(req, { fileRequired: false });
        if (refusal) return res.status(400).json({ message: refusal });

        const replacing = Boolean(req.file);
      // Absent and empty are two different instructions for a description. A
      // caller that leaves the field out is not touching it; one that sends it
      // empty is clearing it. `blankToNull` cannot tell them apart, so the
      // difference is read before it is applied - and the screen sends the
      // field on every save, so clearing still works from there.
      const touchesDescription = (req.body ?? {}).description !== undefined;
        const filePath = replacing
          ? await storeFile(req.file.buffer, {
              sectionId: section.section_id,
              activityId: row.activity_id,
            })
          : row.file_path;

        const { rows } = await pool.query(
          // `evidence_type` keeps its value when the field is absent and
          // `description` does not, and the asymmetry is the screen's: the type
          // is a select that always has a value, so a blank one means the field
          // was not sent at all; the description is a text box, and a person who
          // empties it means to empty it.
          `UPDATE activity_evidence
              SET evidence_type = COALESCE($2, evidence_type),
                  description   = CASE WHEN $8 THEN $3 ELSE description END,
                  file_name     = COALESCE($4, file_name),
                  file_path     = $5,
                  file_size     = COALESCE($6, file_size),
                  updated_by    = $7,
                  updated_at    = now()
            WHERE evidence_id = $1
        RETURNING evidence_id, activity_id, evidence_type, description,
                  file_name, mime_type, file_size, uploaded_at, updated_at`,
          [
            row.evidence_id,
            blankToNull(req.body.evidence_type),
            blankToNull(req.body.description),
            replacing ? fileNameOf(req.file) : null,
            filePath,
            replacing ? req.file.size : null,
            req.session.userId,
            touchesDescription,
          ],
        );
        res.json({ evidence: rows[0] });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/teaching/sections/:sectionId/evidence/:evidenceId',
    requireRole(...TEACHING),
    withSection,
    async (req, res, next) => {
      try {
        const section = req.section;
        // Soft, and in one statement: `NOT is_deleted` in the WHERE is what
        // makes a second DELETE answer ไม่พบ rather than quietly succeed.
        const { rowCount } = await pool.query(
          `UPDATE activity_evidence
              SET is_deleted = true, updated_by = $2, updated_at = now()
            WHERE evidence_id = $1 AND section_id = $3 AND NOT is_deleted`,
          [integerId(req.params.evidenceId), req.session.userId, section.section_id],
        );
        if (rowCount === 0) return notFound(res);
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Whether this caller may open this file. Two roads in, and the row decides.
   *
   * Neither answer is read from the request. The teacher's is the join through
   * `course_sections_teacher` that `sectionOf` already owns; the reader's is
   * their reachable curricula against the curricula this Activity's CLOs belong
   * to. A reader entitled to nothing reaches nothing, which is the case the
   * static mount got wrong for everybody at once.
   */
  async function mayOpen(req, row) {
    // What a caller may do is what they are *acting* as, never the set of
    // grants they hold (ADR-0002). An account with both a teaching grant and a
    // committee one is one or the other at a time, and this reads the one.
    const acting = req.auth?.acting ?? null;

    if (acting && TEACHING.includes(acting.role_id)) {
      const section = await sectionOf(pool, req, row.section_id);
      if (section) return true;
    }

    if (acting && READERS.includes(acting.role_id)) {
      const programs = await reachablePrograms(pool, acting.scope_id);
      if (programs.length === 0) return false;
      const { rows } = await pool.query(
        `SELECT 1
           FROM activity_clo_mapping m
           JOIN subject_clo c ON c.clo_id = m.clo_id
          WHERE m.activity_id = $1 AND c.program_id = ANY($2)
          LIMIT 1`,
        [row.activity_id, programs.map((program) => program.program_id)],
      );
      if (rows.length > 0) return true;
    }

    return false;
  }

  /**
   * The file itself, to a caller who has been asked who they are.
   *
   * Not under `/teaching`, because a committee member reaching a figure's
   * evidence is not teaching anything, and not under `/program-results` either,
   * because a Teacher opening their own brief is not reading a report. It is
   * addressed by the evidence id alone and the guard is inside it.
   */
  router.get('/evidence/:evidenceId/file', async (req, res, next) => {
    try {
      const row = await rowOf(req.params.evidenceId);
      if (!row) return notFound(res);
      if (!(await mayOpen(req, row))) return notFound(res);

      const bytes = await readFile(row.file_path);
      // The row outlived its bytes. Answered as its own sentence rather than as
      // ไม่พบ, because the two have different answers: one file is uploaded
      // again, the other is reported.
      if (!bytes) return res.status(410).json({ message: REFUSALS.evidenceFileMissing });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', bytes.length);
      // Five bytes of `%PDF-` do not make the rest of the file a PDF. A file
      // that is a valid PDF *and* something else is served here as whatever
      // the browser decides it looks like, unless it is told not to guess -
      // and `inline` means the browser renders it in this application's own
      // context. One header, and the last residue of the retrieval defect.
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // `inline` so a reviewer reads it in the browser rather than collecting
      // downloads; the filename is RFC 5987-encoded because the names are Thai.
      res.setHeader(
        'Content-Disposition',
        `inline; filename*=UTF-8''${encodeURIComponent(row.file_name)}`,
      );
      res.send(bytes);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { evidenceRoutes };
