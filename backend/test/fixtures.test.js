'use strict';

/**
 * The fixture builders, tested because every later ticket's tests rest on them:
 * a scenario that silently builds the wrong shape would make a screen's tests
 * pass against data the screen will never meet.
 *
 * This file is also what proves the harness migrated the schema in full - the
 * chain touches tables from 0001, 0002 and 0003 in one go, and none of it
 * would insert against a half-built schema.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { startApi } = require('./helpers');
const { coreChain, section, enrolment, mark } = require('./fixtures');

test('the core chain', async (t) => {
  const api = await startApi('fixtures');
  t.after(() => api.close());

  const chain = await coreChain(api.pool, 'chainA', { score: 75 });

  await t.test('a mark is readable back through every link of the chain', async () => {
    const { rows } = await api.pool.query(
      `SELECT p.program_id, s.subject_id, sc.academic_year, cs.section_number,
              st.student_id, clo.clo_number, a.activity_name, sco.score
         FROM activity_scores sco
         JOIN activities a       ON a.id = sco.activity_id
         JOIN subject_clo clo    ON clo.clo_id = sco.clo_id
         JOIN student st         ON st.student_id = sco.student_id
         JOIN course_sections cs ON cs.section_id = a.section_id
         JOIN semester_courses sc ON sc.id = cs.semester_course_id
         JOIN programs p         ON p.program_id = sc.program_id
         JOIN subjects s         ON s.subject_id = sc.subject_id
        WHERE sco.score_id = $1`,
      [chain.scoreId],
    );

    assert.deepEqual(rows, [
      {
        program_id: chain.program,
        subject_id: chain.subject,
        academic_year: chain.academicYear,
        section_number: '1',
        student_id: chain.studentId,
        clo_number: 'CLO1',
        activity_name: 'งานที่ 1',
        score: '75.00',
      },
    ]);
  });

  // The teaching assignment is the row an authorisation check will read to
  // decide whether a Teacher may touch a Section, so a chain without it would
  // make every scoped test in #9 onwards misleading.
  await t.test('the chain records who teaches the Section', async () => {
    const { rows } = await api.pool.query(
      `SELECT user_id FROM course_sections_teacher WHERE section_id = $1`,
      [chain.sectionId],
    );

    assert.deepEqual(rows, [{ user_id: chain.user }]);
  });

  // Not an assertion about the fixtures so much as about the schema they run
  // in: a suite pointed at development data, or at a schema shared with another
  // test file, would see more than the one chain built here.
  await t.test('the schema holds this file’s fixtures and nothing else', async () => {
    const { rows } = await api.pool.query('SELECT count(*)::int AS n FROM programs');

    assert.equal(rows[0].n, 1);
  });

  await t.test('a second scenario is independent of the first', async () => {
    const other = await coreChain(api.pool, 'chainB');

    assert.notEqual(other.program, chain.program);
    assert.notEqual(other.subject, chain.subject);
    assert.notEqual(other.sectionId, chain.sectionId);
  });

  // The builders are meant to compose, not only to run as one call: a test that
  // needs two Sections of one offering, or two students in one Section, adds a
  // line rather than a second chain.
  await t.test('builders compose onto an existing chain', async () => {
    const second = await section(api.pool, {
      offeringId: chain.offeringId,
      teacher: chain.user,
      sectionNumber: '2',
    });
    const student = await enrolment(api.pool, {
      sectionId: second,
      department: chain.department,
      program: chain.program,
      tag: 'chainA2',
    });
    const scoreId = await mark(api.pool, {
      studentId: student,
      activityId: chain.activityId,
      cloId: chain.cloId,
      score: 90,
    });

    const { rows } = await api.pool.query(
      `SELECT count(*)::int AS n FROM course_sections WHERE semester_course_id = $1`,
      [chain.offeringId],
    );

    assert.equal(rows[0].n, 2);
    assert.ok(scoreId);
  });
});
