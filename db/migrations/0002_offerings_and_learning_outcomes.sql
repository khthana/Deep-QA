-- Offerings and learning outcomes: what is taught, and what it should achieve.
--
-- As in 0001, column types are recovered from the SQL the inherited models
-- actually issue rather than from docs/02, and where the two disagree the code
-- wins. The widths 0001 settled carry over unchanged: a faculty, department or
-- programme code is varchar(10); a person's identifier is varchar(20); a
-- subject code is varchar(8). docs/02 breaks that in seven columns here, always
-- in the same way - a person's identifier given the subject's width, or a
-- subject's identifier given the person's. course_sections_teacher.user_id,
-- course_syllabus.created_by, subject_plo_mapping.created_by and .updated_by,
-- and subject_clo.created_by are all Varchar(8) and become varchar(20);
-- subject_plo_mapping.subject_id and clo_course_cycle_cloplan.subject_id are
-- Varchar(20) and become varchar(8). Nothing in PostgreSQL would report it if
-- they were left alone: a varchar-to-varchar foreign key is created happily
-- across different widths, and only fails later, on a value that fits one side
-- and not the other.
--
-- ADR-0003 is the shape of this file. A CLO belongs to a (Program, Subject,
-- academic year), not to a Section: every Section of one Offering teaches
-- towards the same outcomes, and the inherited section_id on subject_clo and
-- its two child tables made that impossible to say. The column is gone from all
-- three, and the grain it is replaced by is a real foreign key into
-- program_subjects, so the pairing is enforced rather than merely intended.
--
-- Three unique constraints in docs/02 are single-column and should not be.
-- Section number, CLO code and PLO code are each unique within their parent
-- here, not across the institution - §9 items 4, 5 and 6. The inherited schema
-- permits exactly one "Section 1", one "CLO1" and one "PLO1" in the whole
-- university, which is not a rule anyone intended to write.
--
-- Deletion follows 0001's rule and its exception. Anything that could be
-- referred to later is RESTRICT, because the application soft-deletes; the
-- exception is a row with no meaning of its own once its parent is gone, which
-- CASCADEs. A syllabus week, a measurable behaviour, an achievement criterion
-- and a continuous-improvement detail are all of that kind: they are parts of
-- the thing above them, not records in their own right. Authorship columns
-- SET NULL, so deleting whoever wrote a CLO does not delete the CLO.

-- Enum values, and where each set comes from.
--
-- outcome_type and mapping_level are docs/02 §8 verbatim, and CONTEXT.md
-- carries mapping_level's five levels in the same order.
--
-- cognitive_level is Bloom, and CONTEXT.md settles it: "tagged with a cognitive
-- level (remember … create)", six levels. §8 lists four and trails off into a
-- parenthesis; the trailing two are the same two.
--
-- learning_activity is R063, which names four: ข้อสอบ, แบบฝึกหัด, การบ้าน,
-- งานที่มอบหมาย. The inherited screen offers three, because it renders แบบฝึกหัด
-- and การบ้าน as one combined label, and §8 gives a different four again - Quiz /
-- exam / homework "and assigned work". Neither is authoritative: the screen is
-- display copy in a frontend that is itself being replaced, and no surviving
-- INSERT writes these values as text the way one binds a column name. R063 is
-- the requirement the rebuild is held to and is marked M, so its four are taken,
-- in English. Quiz is dropped because only §8 has it. The cheaper hedge would
-- have been the shorter list: a value can be added later for the cost of one
-- ALTER TYPE ... ADD VALUE, while dropping one costs a rewrite of every row that
-- used it. R063 is mandatory, so its four are taken anyway. Anything added later
-- also needs its own migration file, since ADD VALUE cannot be used by a
-- statement in the same transaction that runs it, and this runner puts each file
-- in one transaction.
--
-- งานที่มอบหมาย is assigned_work and not "assignment", which CONTEXT.md lists
-- under Avoid. The name is taken: กิจกรรมการเรียนรู้ is also the glossary's
-- Activity, a piece of assessed work in a Section that becomes its own table in
-- a later ticket. This type names neither - it says how a measurable behaviour
-- is assessed - and keeps the inherited column name because the column is
-- recovered rather than chosen.
CREATE TYPE outcome_type AS ENUM ('knowledge', 'skills', 'ethics', 'character');
CREATE TYPE mapping_level AS ENUM ('I', 'D', 'P', 'A', 'E');
CREATE TYPE learning_activity AS ENUM (
  'exam', 'exercise', 'homework', 'assigned_work'
);
CREATE TYPE cognitive_level AS ENUM (
  'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
);

-- An Offering is a Program Subject opened for one academic year and semester,
-- so (program_id, subject_id) points at program_subjects as a pair rather than
-- at programs and subjects separately. Two foreign keys would let an offering
-- name a subject the programme does not teach.
--
-- ADR-0001 tier 3: the surrogate id stays, and the natural key that docs/02
-- leaves unconstrained is added. Without it the same subject can be opened
-- twice in one semester, and nothing downstream could tell the two apart.
CREATE TABLE semester_courses (
  id             integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  program_id     varchar(10) NOT NULL,
  subject_id     varchar(8)  NOT NULL,
  academic_year  varchar(4)  NOT NULL,
  semester       smallint    NOT NULL CHECK (semester IN (1, 2, 3)),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (program_id, subject_id)
    REFERENCES program_subjects (program_id, subject_id) ON DELETE RESTRICT,
  UNIQUE (program_id, subject_id, academic_year, semester)
);

-- section_number is varchar and not an integer: it is a label, and the read
-- side never does arithmetic on it.
CREATE TABLE course_sections (
  section_id          integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  semester_course_id  integer     NOT NULL REFERENCES semester_courses (id) ON DELETE RESTRICT,
  section_number      varchar(10) NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (semester_course_id, section_number)
);

-- ADR-0001 tier 2: a teaching assignment is a junction, so the surrogate id is
-- dropped and (section_id, user_id) becomes the key. R035 - a section may have
-- several teachers - is why the pair and not section_id alone.
--
-- docs/02's semester_course_id is dropped with it. It is written by all three
-- inserts and read by none: the one query that needs an offering reaches it
-- through course_sections, and a copy that no one reads can only ever disagree
-- with the section it belongs to.
CREATE TABLE course_sections_teacher (
  section_id  integer     NOT NULL REFERENCES course_sections (section_id) ON DELETE RESTRICT,
  user_id     varchar(20) NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (section_id, user_id)
);

-- The weekly teaching plan. section_id is NOT NULL against docs/02, which
-- leaves it nullable: a plan belongs to a section or it belongs to nothing.
--
-- This is the second table after user_log where ADR-0001 tier 3 asks for a
-- natural key and there is none to give. (section_id, week_no) is the obvious
-- candidate and is wrong: upsertCourseSyllabus decides between insert and
-- update on the surrogate id alone, never on the week, so the screen adds a
-- second row for a week that already has one whenever a week holds more than
-- one topic. A unique constraint here would reject that.
--
-- What is left is week_no > 0, which is weaker than a key and still worth
-- having: a plan is written a week at a time, and week zero is a typo rather
-- than a week.
CREATE TABLE course_syllabus (
  id           integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  section_id   integer     NOT NULL REFERENCES course_sections (section_id) ON DELETE CASCADE,
  week_no      smallint    NOT NULL CHECK (week_no > 0),
  title        text,
  description  text,
  remark       text,
  created_by   varchar(20) REFERENCES users (user_id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- PLOs. R039's tree is parent_outcome_id, level_depth and sequence_order:
-- the parent link is the structure, the other two are what the screen sorts and
-- indents by. is_expanded is UI state stored per outcome rather than per
-- viewer, which is how the inherited screen behaves.
--
-- parent_outcome_id is RESTRICT, not CASCADE: deleting a main outcome must not
-- silently take its sub-outcomes, and every PLO here is referred to by CLOs and
-- by subject mappings anyway.
--
-- outcome_code is unique within its programme, not globally - §9 item 6. Each
-- programme numbers its own outcomes from PLO1.
--
-- UNIQUE (program_id, outcome_id) is redundant on its own - outcome_id is
-- already the primary key - and exists so that everything linking to a PLO can
-- carry the programme in the foreign key rather than trusting it. This is
-- ADR-0003's own argument for keeping program_id on subject_clo: a subject
-- taught by two programmes must not be able to link its CLOs to the other
-- programme's PLOs. Naming outcome_id alone leaves exactly that reachable, so
-- subject_plo_mapping, subject_clo and the parent link below all reference the
-- pair instead.
CREATE TABLE learning_outcomes (
  outcome_id           integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  program_id           varchar(10)  NOT NULL REFERENCES programs (program_id) ON DELETE RESTRICT,
  outcome_code         varchar(50)  NOT NULL,
  outcome_title        varchar(500) NOT NULL,
  outcome_description  text,
  outcome_type         outcome_type NOT NULL,
  parent_outcome_id    integer,
  sequence_order       integer      NOT NULL,
  level_depth          smallint     NOT NULL DEFAULT 1,
  is_expanded          boolean      NOT NULL DEFAULT false,
  is_active            boolean      NOT NULL DEFAULT true,
  created_by           varchar(20)  REFERENCES users (user_id) ON DELETE SET NULL,
  updated_by           varchar(20)  REFERENCES users (user_id) ON DELETE SET NULL,
  created_at           timestamptz  NOT NULL DEFAULT now(),
  updated_at           timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (program_id, outcome_code),
  UNIQUE (program_id, outcome_id),
  FOREIGN KEY (program_id, parent_outcome_id)
    REFERENCES learning_outcomes (program_id, outcome_id) ON DELETE RESTRICT
);

-- ADR-0001 tier 2: how strongly one subject serves one PLO is a junction, so
-- the surrogate mapping_id goes and (program_id, subject_id, outcome_id) is the
-- key. program_id and subject_id go to program_subjects as a pair for the same
-- reason semester_courses does.
--
-- outcome_id is NOT NULL, against docs/02, which leaves it nullable so that
-- createEmptyMapping can write a placeholder row naming no outcome. That
-- placeholder is dead: createEmptyMapping has no callers, the one path that
-- looked like it - the programme's subject import - calls createPloMapping with
-- an explicit null instead, and the only read that could distinguish "a
-- placeholder exists" from "no rows" is checkMappingExists, which exists to
-- decide whether to write the placeholder. Nothing else in the system asks. So
-- an unmapped subject is one with no rows. 'E' now says that one named PLO is
-- not served by this subject, which is narrower than what the placeholder row
-- could have said, and is the only one of the two anything reads.
--
-- mapping_level keeps its 'E' default: both controllers that write a mapping
-- pass 'E' explicitly when the user has chosen nothing.
CREATE TABLE subject_plo_mapping (
  program_id     varchar(10)   NOT NULL,
  subject_id     varchar(8)    NOT NULL,
  outcome_id     integer       NOT NULL,
  mapping_level  mapping_level NOT NULL DEFAULT 'E',
  created_by     varchar(20)   REFERENCES users (user_id) ON DELETE SET NULL,
  updated_by     varchar(20)   REFERENCES users (user_id) ON DELETE SET NULL,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (program_id, subject_id, outcome_id),
  FOREIGN KEY (program_id, subject_id)
    REFERENCES program_subjects (program_id, subject_id) ON DELETE RESTRICT,
  FOREIGN KEY (program_id, outcome_id)
    REFERENCES learning_outcomes (program_id, outcome_id) ON DELETE RESTRICT
);

-- CLOs, at ADR-0003's grain. section_id is gone and (program_id, subject_id,
-- academic_year) takes its place, so every section of an offering reads one
-- set of outcomes instead of each keeping its own copy.
--
-- clo_number is unique within that grain - §9 item 5, which proposes making it
-- unique with section_id. ADR-0003 removes the section, so the scope is the
-- programme-subject-year: one CLO1 per subject per year per programme.
--
-- updated_by is added, which docs/02 does not have. ADR-0003 makes it
-- load-bearing: a CLO set is now shared by every section of an offering, so two
-- teachers can edit the same row and the last write wins. Who that was has to
-- be recoverable.
CREATE TABLE subject_clo (
  clo_id             integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  program_id         varchar(10) NOT NULL,
  subject_id         varchar(8)  NOT NULL,
  academic_year      varchar(4)  NOT NULL,
  clo_number         varchar(50) NOT NULL,
  clo_detail         text,
  teaching_method    text,
  assessment_method  text,
  plo_id             integer,
  created_by         varchar(20) REFERENCES users (user_id) ON DELETE SET NULL,
  updated_by         varchar(20) REFERENCES users (user_id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (program_id, subject_id)
    REFERENCES program_subjects (program_id, subject_id) ON DELETE RESTRICT,
  FOREIGN KEY (program_id, plo_id)
    REFERENCES learning_outcomes (program_id, outcome_id) ON DELETE RESTRICT,
  UNIQUE (program_id, subject_id, academic_year, clo_number)
);

-- clo_id is integer, matching subject_clo.clo_id. docs/02 gives it as Smallint
-- on both child tables while the parent is Integer - §9 item 2 - which is a
-- table that stops accepting rows at 32,767 CLOs.
--
-- section_id is dropped here too: a behaviour describes its CLO, and the CLO no
-- longer belongs to a section.
--
-- (clo_id, behavior_no) is ADR-0001 tier 3's natural key, which docs/02 does not
-- have. Unlike course_syllabus above, the inherited code wants it: the delete
-- path renumbers what is left so the numbers stay 1..N with no gaps, and
-- subjectCloAchController already answers a duplicate with "Duplicate entry for
-- ... criteria_no" from application code. The constraint only says in the
-- database what the application was already trying to say.
--
-- The renumbering loop survives it because it walks ORDER BY behavior_no ASC and
-- deletion only ever frees a lower number, so each row moves into a number that
-- is already vacant. Rewriting that loop to descend would collide; it does not
-- today, and the constraint is what would catch it if it ever did.
--
-- The same holds for (clo_id, criteria_no) on achievement criteria.
CREATE TABLE subject_clo_measurable_behavior (
  id                 integer           GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  clo_id             integer           NOT NULL REFERENCES subject_clo (clo_id) ON DELETE CASCADE,
  behavior_no        smallint          NOT NULL,
  behavior_detail    text              NOT NULL,
  learning_activity  learning_activity NOT NULL,
  cognitive_level    cognitive_level   NOT NULL,
  created_at         timestamptz       NOT NULL DEFAULT now(),
  updated_at         timestamptz       NOT NULL DEFAULT now(),
  UNIQUE (clo_id, behavior_no)
);

-- achievement_level stays a CHECK rather than becoming an enum, as docs/02 has
-- it. The four bands are the rubric's own vocabulary and appear again on
-- rubrics and on evidence in later tickets; a CHECK is the constraint that can
-- be widened in one table without an ALTER TYPE that reaches all of them.
--
-- It is NOT NULL, which docs/02 leaves open. A criterion that names no band is
-- not a criterion.
CREATE TABLE subject_clo_achievement_criteria (
  id                    integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  clo_id                integer     NOT NULL REFERENCES subject_clo (clo_id) ON DELETE CASCADE,
  criteria_no           smallint    NOT NULL,
  achievement_level     varchar(20) NOT NULL
    CHECK (achievement_level IN ('ดีเยี่ยม', 'ดี', 'พอใช้', 'ต้องปรับปรุง')),
  criteria_detail       text        NOT NULL,
  criteria_description  text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clo_id, criteria_no)
);

-- The continuous-improvement cycle. It already sits at ADR-0003's grain in the
-- inherited design, which is part of why that ADR reads the way it does - a
-- cycle is per programme, subject and year, and the CLOs it reflects on were
-- per section.
--
-- The unique constraint is not optional decoration: createCycle ends in
-- ON CONFLICT (subject_id, program_id, academic_year) DO UPDATE, which raises
-- 42P10 unless a constraint covers exactly those columns.
CREATE TABLE clo_course_cycle_cloplan (
  clo_course_cycle_id  bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject_id           varchar(8)  NOT NULL,
  program_id           varchar(10) NOT NULL,
  academic_year        varchar(4)  NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (program_id, subject_id)
    REFERENCES program_subjects (program_id, subject_id) ON DELETE RESTRICT,
  UNIQUE (subject_id, program_id, academic_year)
);

-- detail_type is a CHECK and not an enum, as docs/02 has it. The four kinds are
-- the four sections of one form and the controller validates them by name.
--
-- Its unique constraint is load-bearing in the same way: upsertDetail does
-- ON CONFLICT (clo_course_cycle_id, clo_id, detail_type) DO UPDATE.
--
-- reference_academic_year is varchar(4) and not docs/02's Integer. An academic
-- year is varchar(4) everywhere else in this file and in 0001; a year that is
-- only ever compared and displayed is not a number, and one concept stored two
-- ways is the class of defect §9 exists to list.
CREATE TABLE clo_course_cycle_detail_cloplan (
  clo_course_cycle_detail_id  bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  clo_course_cycle_id         bigint      NOT NULL
    REFERENCES clo_course_cycle_cloplan (clo_course_cycle_id) ON DELETE CASCADE,
  clo_id                      integer     NOT NULL REFERENCES subject_clo (clo_id) ON DELETE CASCADE,
  detail_type                 varchar(30) NOT NULL
    CHECK (detail_type IN ('SUMMARY', 'REFLECTION', 'IMPROVEMENT', 'NEXT_PLAN')),
  detail_text                 text        NOT NULL,
  reference_academic_year     varchar(4),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clo_course_cycle_id, clo_id, detail_type)
);

-- Foreign keys that are not already the leftmost column of a key of their own,
-- as in 0001. The composite keys into program_subjects are covered by the
-- unique constraints and primary keys above, which lead with the same two
-- columns in the same order - except clo_course_cycle_cloplan, whose unique
-- constraint is (subject_id, program_id, ...) and so does not. The composite
-- keys into learning_outcomes are indexed on the pair, because that is what a
-- RESTRICT check looks up; learning_outcomes.program_id needs nothing of its
-- own, being leftmost of UNIQUE (program_id, outcome_code).
CREATE INDEX course_sections_teacher_user_id_idx ON course_sections_teacher (user_id);
CREATE INDEX course_syllabus_section_id_week_no_idx ON course_syllabus (section_id, week_no);
CREATE INDEX course_syllabus_created_by_idx ON course_syllabus (created_by);
CREATE INDEX learning_outcomes_parent_idx
  ON learning_outcomes (program_id, parent_outcome_id);
CREATE INDEX learning_outcomes_created_by_idx ON learning_outcomes (created_by);
CREATE INDEX learning_outcomes_updated_by_idx ON learning_outcomes (updated_by);
CREATE INDEX subject_plo_mapping_outcome_idx
  ON subject_plo_mapping (program_id, outcome_id);
CREATE INDEX subject_plo_mapping_created_by_idx ON subject_plo_mapping (created_by);
CREATE INDEX subject_plo_mapping_updated_by_idx ON subject_plo_mapping (updated_by);
CREATE INDEX subject_clo_plo_idx ON subject_clo (program_id, plo_id);
CREATE INDEX subject_clo_created_by_idx ON subject_clo (created_by);
CREATE INDEX subject_clo_updated_by_idx ON subject_clo (updated_by);
CREATE INDEX clo_course_cycle_cloplan_program_id_subject_id_idx
  ON clo_course_cycle_cloplan (program_id, subject_id);
CREATE INDEX clo_course_cycle_detail_cloplan_clo_id_idx
  ON clo_course_cycle_detail_cloplan (clo_id);
