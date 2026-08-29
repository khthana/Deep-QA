'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const bcrypt = require('bcrypt');

const { migrate } = require('../migrate');
const { createPool } = require('../pool');
const {
  seed,
  byAlias,
  PASSWORD,
  ACCOUNTS,
  ROLES,
  PLOS,
  CLOS,
  SCORE_RATIOS,
  ACTIVITIES,
  COHORTS,
  MAX_GROUP_SIZE,
  SUBJECT,
  PROGRAM,
  CURRENT_YEAR,
  PRIOR_YEAR,
} = require('../seed');
const { testSchema, dropSchema } = require('./helpers');

/**
 * Ticket #6's seed, at the same seam as the migration tests: the real seed()
 * against real PostgreSQL, in a schema this file owns and drops.
 *
 * The assertions are #6's acceptance criteria restated - the cohort is
 * enrolled, the weighting sums to 100, no student is in two groups, both years
 * carry marks, each named account exists with the role and scope it is
 * supposed to have. What is deliberately not asserted is the shape of the
 * code: how many statements it issues, or in what order. A seed is a set of
 * rows, and the rows are what anything downstream depends on.
 */

const SCHEMA = testSchema('seed');
let pool;

test.before(async () => {
  await migrate({ schema: SCHEMA });
  await seed({ schema: SCHEMA });
  pool = createPool({ schema: SCHEMA });
});

test.after(async () => {
  if (pool) await pool.end();
  await dropSchema(SCHEMA);
});

const count = async (sql, params = []) => {
  const { rows } = await pool.query(sql, params);
  return Number(rows[0].count);
};

const currentYear = COHORTS.find((cohort) => cohort.year === CURRENT_YEAR);
const priorYear = COHORTS.find((cohort) => cohort.year === PRIOR_YEAR);

test('the organisation, the offering and the enrolled cohort', async (t) => {
  await t.test('the subject is taught by the programme', async () => {
    const { rows } = await pool.query(
      `SELECT s.credits, ps.subject_type
       FROM program_subjects ps JOIN subjects s ON s.subject_id = ps.subject_id
       WHERE ps.program_id = $1 AND ps.subject_id = $2`,
      [PROGRAM, SUBJECT.id],
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0].credits, SUBJECT.credits);
    assert.equal(rows[0].subject_type, 'required');
  });

  await t.test('the current offering has more than one section', async () => {
    const sections = await count(
      `SELECT count(*) FROM course_sections cs
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
       WHERE sc.academic_year = $1`,
      [CURRENT_YEAR],
    );

    assert.equal(sections, currentYear.sections.length);
    assert.ok(sections > 1, 'a single-section offering cannot exercise the cross-section screens');
  });

  await t.test('every student in the cohort is enrolled in exactly one section', async () => {
    const students = await count(`SELECT count(*) FROM student WHERE admission_year = $1`, [
      currentYear.admission,
    ]);
    assert.equal(students, currentYear.students);

    const doubleEnrolled = await count(
      `SELECT count(*) FROM (
         SELECT sc.student_id FROM student_course sc
         JOIN course_sections cs ON cs.section_id = sc.section_id
         JOIN semester_courses o ON o.id = cs.semester_course_id
         WHERE o.academic_year = $1
         GROUP BY sc.student_id HAVING count(*) > 1
       ) doubled`,
      [CURRENT_YEAR],
    );
    assert.equal(doubleEnrolled, 0);
  });

  await t.test('every section has a teacher assigned', async () => {
    const unstaffed = await count(
      `SELECT count(*) FROM course_sections cs
       WHERE NOT EXISTS (
         SELECT 1 FROM course_sections_teacher t WHERE t.section_id = cs.section_id
       )`,
    );

    assert.equal(unstaffed, 0);
  });
});

test('the PLO tree and the CLO set', async (t) => {
  await t.test('every main PLO is present and carries its sub-outcomes', async () => {
    const mains = await count(
      `SELECT count(*) FROM learning_outcomes WHERE program_id = $1 AND parent_outcome_id IS NULL`,
      [PROGRAM],
    );
    assert.equal(mains, PLOS.length);

    const subs = await count(
      `SELECT count(*) FROM learning_outcomes WHERE program_id = $1 AND parent_outcome_id IS NOT NULL`,
      [PROGRAM],
    );
    assert.equal(
      subs,
      PLOS.reduce((total, plo) => total + plo.subs, 0),
    );
  });

  await t.test('a sub-outcome sits under its own main outcome', async () => {
    const { rows } = await pool.query(
      `SELECT parent.outcome_code AS parent_code, child.level_depth
       FROM learning_outcomes child
       JOIN learning_outcomes parent ON parent.outcome_id = child.parent_outcome_id
       WHERE child.program_id = $1 AND child.outcome_code = 'PLO-2-7'`,
      [PROGRAM],
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0].parent_code, 'PLO-2');
    assert.equal(rows[0].level_depth, 2);
  });

  await t.test('the subject is mapped to the outcomes it serves', async () => {
    const mappings = await count(
      `SELECT count(*) FROM subject_plo_mapping WHERE program_id = $1 AND subject_id = $2`,
      [PROGRAM, SUBJECT.id],
    );

    assert.ok(mappings > 0);
  });

  // ADR-0003: a CLO belongs to a (Program, Subject, academic year), so each
  // year has its own set rather than sharing one.
  for (const year of [CURRENT_YEAR, PRIOR_YEAR]) {
    await t.test(`${year} has its own CLOs, behaviours and criteria`, async () => {
      const clos = await count(
        `SELECT count(*) FROM subject_clo
         WHERE program_id = $1 AND subject_id = $2 AND academic_year = $3`,
        [PROGRAM, SUBJECT.id, year],
      );
      assert.equal(clos, CLOS.length);

      const withoutBehaviours = await count(
        `SELECT count(*) FROM subject_clo c
         WHERE c.academic_year = $1 AND NOT EXISTS (
           SELECT 1 FROM subject_clo_measurable_behavior b WHERE b.clo_id = c.clo_id
         )`,
        [year],
      );
      assert.equal(withoutBehaviours, 0);

      const withoutCriteria = await count(
        `SELECT count(*) FROM subject_clo c
         WHERE c.academic_year = $1 AND NOT EXISTS (
           SELECT 1 FROM subject_clo_achievement_criteria a WHERE a.clo_id = c.clo_id
         )`,
        [year],
      );
      assert.equal(withoutCriteria, 0);
    });
  }

  await t.test('every CLO names the PLO it serves', async () => {
    const orphaned = await count(`SELECT count(*) FROM subject_clo WHERE plo_id IS NULL`);

    assert.equal(orphaned, 0);
  });
});

test('the weighting scheme, the activities and the marks', async (t) => {
  // BR-05. The schema cannot say this - it is a sum across rows - so the seed
  // has to, and this is the assertion that keeps it true.
  for (const year of [CURRENT_YEAR, PRIOR_YEAR]) {
    await t.test(`${year}'s weighting sums to 100`, async () => {
      const { rows } = await pool.query(
        `SELECT sum(weight)::int AS total, count(*)::int AS bands FROM subject_score_ratio
         WHERE program_id = $1 AND subject_id = $2 AND academic_year = $3`,
        [PROGRAM, SUBJECT.id, year],
      );

      assert.equal(rows[0].total, 100);
      assert.equal(rows[0].bands, SCORE_RATIOS.length);
    });
  }

  await t.test('every activity is weighed in a band and mapped to CLOs', async () => {
    const unbanded = await count(`SELECT count(*) FROM activities WHERE score_ratio_id IS NULL`);
    assert.equal(unbanded, 0);

    const unmapped = await count(
      `SELECT count(*) FROM activities a
       WHERE NOT EXISTS (SELECT 1 FROM activity_clo_mapping m WHERE m.activity_id = a.id)`,
    );
    assert.equal(unmapped, 0);
  });

  // BR-11, the same shape of rule one level down.
  await t.test("each activity's CLO weights sum to 100", async () => {
    const wrong = await count(
      `SELECT count(*) FROM (
         SELECT activity_id FROM activity_clo_mapping
         GROUP BY activity_id HAVING sum(weight) <> 100
       ) offenders`,
    );

    assert.equal(wrong, 0);
  });

  await t.test('every enrolled student is marked on every activity of their section', async () => {
    const missing = await count(
      `SELECT count(*) FROM student_course sc
       JOIN activities a ON a.section_id = sc.section_id
       JOIN activity_clo_mapping m ON m.activity_id = a.id
       WHERE NOT EXISTS (
         SELECT 1 FROM activity_scores s
         WHERE s.student_id = sc.student_id AND s.activity_id = a.id AND s.clo_id = m.clo_id
       )`,
    );

    assert.equal(missing, 0);
  });

  await t.test('a mark never exceeds what the CLO is marked out of', async () => {
    const over = await count(
      `SELECT count(*) FROM activity_scores s
       JOIN activity_clo_mapping m
         ON m.activity_id = s.activity_id AND m.clo_id = s.clo_id
       WHERE s.score > m.score`,
    );

    assert.equal(over, 0);
  });

  // The year-over-year comparison screens need two points to compare.
  await t.test('the prior year carries completed marks of its own', async () => {
    const marks = await count(
      `SELECT count(*) FROM activity_scores s
       JOIN subject_clo c ON c.clo_id = s.clo_id
       WHERE c.academic_year = $1`,
      [PRIOR_YEAR],
    );

    assert.ok(marks > 0);
    assert.equal(
      marks,
      priorYear.students * ACTIVITIES.reduce((total, spec) => total + spec.clos.length, 0),
    );
  });
});

test('the work groups', async (t) => {
  await t.test('groups exist and none exceeds the size limit', async () => {
    const groups = await count(`SELECT count(*) FROM student_group`);
    assert.ok(groups > 0);

    const oversized = await count(
      `SELECT count(*) FROM (
         SELECT group_id FROM student_group_member
         GROUP BY group_id HAVING count(*) > $1
       ) offenders`,
      [MAX_GROUP_SIZE],
    );
    assert.equal(oversized, 0, `BR-06 caps a group at ${MAX_GROUP_SIZE} students`);
  });

  // BR-07 is stated per subject, not per section - "นักศึกษาอยู่ 2 กลุ่มใน
  // รายวิชาเดียวกัน" (docs/04 §2.14, TC-GRP-004). Grouping by the offering
  // rather than the section is what actually asks that question: a student who
  // somehow appeared in two sections of one subject would be caught here and
  // missed by the narrower grain.
  await t.test('no student belongs to two groups within one offering', async () => {
    const doubled = await count(
      `SELECT count(*) FROM (
         SELECT m.student_id, cs.semester_course_id FROM student_group_member m
         JOIN student_group g ON g.group_id = m.group_id
         JOIN course_sections cs ON cs.section_id = g.section_id
         GROUP BY m.student_id, cs.semester_course_id HAVING count(*) > 1
       ) offenders`,
    );

    assert.equal(doubled, 0);
  });

  // Not a rule the requirements state, but the reason the seed slices the roll
  // into even shares instead of filling groups greedily: a greedy fill of 57
  // students into eights leaves a last group of one, which is a poor fixture
  // for any screen that shows a group.
  await t.test('the roll is split evenly, with no runt group left over', async () => {
    const { rows } = await pool.query(
      `SELECT g.section_id, count(*)::int AS size
       FROM student_group_member m JOIN student_group g ON g.group_id = m.group_id
       GROUP BY g.group_id, g.section_id`,
    );

    for (const section of new Set(rows.map((row) => row.section_id))) {
      const sizes = rows.filter((row) => row.section_id === section).map((row) => row.size);
      assert.ok(
        Math.max(...sizes) - Math.min(...sizes) <= 1,
        `section ${section} has groups of ${sizes.join(', ')}`,
      );
    }
  });

  await t.test('every enrolled student of the current year has a group', async () => {
    const ungrouped = await count(
      `SELECT count(*) FROM student_course sc
       JOIN course_sections cs ON cs.section_id = sc.section_id
       JOIN semester_courses o ON o.id = cs.semester_course_id
       WHERE o.academic_year = $1 AND NOT EXISTS (
         SELECT 1 FROM student_group_member m
         JOIN student_group g ON g.group_id = m.group_id
         WHERE m.student_id = sc.student_id AND g.section_id = sc.section_id
       )`,
      [CURRENT_YEAR],
    );

    assert.equal(ungrouped, 0);
  });
});

test('the named accounts', async (t) => {
  await t.test('all six roles exist, ranked so a lower number sees more', async () => {
    const { rows } = await pool.query(`SELECT role_id, priority FROM roles ORDER BY priority`);

    assert.deepEqual(
      rows.map((row) => row.role_id),
      ROLES.map((role) => role.id),
    );
    assert.equal(rows[0].role_id, 'FULL_ADMIN');
  });

  await t.test('every alias in docs/04 §1.2 has an account with its grants', async () => {
    for (const account of ACCOUNTS) {
      const { rows } = await pool.query(
        `SELECT role_id, scope_id FROM user_roles WHERE user_id = $1 ORDER BY role_id`,
        [account.id],
      );

      assert.deepEqual(
        rows.map((row) => [row.role_id, row.scope_id]),
        [...account.grants].sort(([a], [b]) => a.localeCompare(b)),
        `${account.alias} should hold exactly the grants it is specified with`,
      );
    }
  });

  await t.test('a global grant uses the sentinel scope, never null', async () => {
    const { rows } = await pool.query(
      `SELECT scope_id FROM user_roles WHERE role_id = 'FULL_ADMIN'`,
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0].scope_id, 'FULL_ADMIN');
  });

  await t.test('every account can sign in with the documented password', async () => {
    const { rows } = await pool.query(`SELECT user_id, password FROM users`);

    assert.equal(rows.length, ACCOUNTS.length);
    for (const row of rows) {
      assert.ok(
        await bcrypt.compare(PASSWORD, row.password),
        `${row.user_id} should accept the password README.md documents`,
      );
    }
  });

  // The two negative accounts. Both exist so that a permission rule can be
  // shown to refuse something, rather than merely be assumed to.
  await t.test('the cross-scope department admin administers the other department', async () => {
    const { rows } = await pool.query(
      `SELECT scope_id FROM user_roles WHERE user_id = $1 AND role_id = 'DEPT_ADMIN'`,
      [byAlias('U_DEPT2')],
    );

    assert.equal(rows[0].scope_id, '01');
    assert.notEqual(rows[0].scope_id, SUBJECT.department);
  });

  await t.test('the second teacher teaches no section at all', async () => {
    const sections = await count(
      `SELECT count(*) FROM course_sections_teacher WHERE user_id = $1`,
      [byAlias('U_TEACH2')],
    );

    assert.equal(sections, 0);
  });

  await t.test('the multi-role account holds two roles at once', async () => {
    const grants = await count(`SELECT count(*) FROM user_roles WHERE user_id = $1`, [
      byAlias('U_MULTI'),
    ]);

    assert.equal(grants, 2);
  });

  await t.test('one account sits outside the kmitl.ac.th domain', async () => {
    const outside = await count(
      `SELECT count(*) FROM users WHERE email NOT LIKE '%@kmitl.ac.th'`,
    );

    assert.ok(outside > 0, 'R010 needs an address the domain rule can reject');
  });
});

/**
 * The first acceptance criterion: one command, and safe to run again. Re-seeding
 * an already-seeded schema has to be a no-op rather than a duplicate-key error
 * or a second copy of the dataset - a developer who runs it twice should not
 * have to reset to recover.
 */
test('seeding twice changes nothing', async () => {
  // One table per thing the seed writes with a different idempotency mechanism:
  // natural-key lookups, name-within-section lookups, and the change log, which
  // has no natural key at all and so is the one most likely to grow on a rerun.
  const TABLES = [
    'student',
    'activities',
    'course_syllabus',
    'activity_scores',
    'student_group',
    'student_group_member',
    'learning_outcomes',
    'user_roles',
    'student_group_change_log',
  ];
  const snapshot = () =>
    Promise.all(TABLES.map((table) => count(`SELECT count(*) FROM ${table}`)));

  const before = await snapshot();
  await seed({ schema: SCHEMA });
  const after = await snapshot();

  assert.deepEqual(after, before);
});
