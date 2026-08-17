-- Assessment, scores and rubrics: what students did, and how it was marked.
--
-- Column types are recovered from the SQL the inherited models issue rather
-- than from docs/02, and where the two disagree the code wins. The widths 0001
-- settled carry over unchanged: an organisation code is varchar(10), a person's
-- identifier is varchar(20), a subject code is varchar(8). docs/02 breaks that
-- in nine columns here, always by giving a person the subject's width:
-- student_course.student_id, student_group_member.student_id,
-- student_group_change_log.student_id, activity_evidence.uploaded_by and
-- .updated_by, rubrics.created_by and .updated_by, and rubric_details.created_by
-- and .updated_by are all Varchar(8) and become varchar(20);
-- student_group_change_log.performed_by is Varchar(50) and becomes varchar(20)
-- too. PostgreSQL reports none of this: a varchar-to-varchar foreign key is
-- created happily across differing widths and only fails later, on a value that
-- fits one side and not the other.
--
-- One further mismatch is a type and not a width. docs/02 gives
-- student_group_change_log's three group columns as Smallint against
-- student_group.group_id's Integer, which is the same defect that reached
-- subject_clo_measurable_behavior.clo_id in 0002. All three are integer here,
-- and the change log's are integer even though they are not foreign keys - see
-- the table.
--
-- ADR-0003 reaches one table in this file. The weighting scheme belongs to a
-- (Program, Subject, academic year), not to a Section, so that attainment
-- summed across Sections is computed on one basis. Everything else here -
-- enrolment, groups, Activities, marks and Evidence - is genuinely Section-level
-- and stays there. The file therefore carries two grains, and the join between
-- them is the one place a reader should look twice: see activities.
--
-- Deletion follows 0001's rule and its exception. Anything that could be
-- referred to later is RESTRICT, because the application soft-deletes; the
-- exception is a row with no meaning of its own once its parent is gone, which
-- CASCADEs. Four columns are of that kind: student_group_member.group_id, and
-- activity_clo_mapping.activity_id, activity_scores.activity_id and
-- rubric_details.rubric_id. Authorship and upload columns SET NULL, so deleting
-- whoever uploaded a file does not delete the file.
--
-- activity_evidence.activity_id is the one hanging off an Activity that does not
-- join them. Evidence is what an accreditation review is shown, so it is exactly
-- the row that is referred to later, and it takes the rule's main clause rather
-- than its exception. That is a deliberate divergence from the inherited
-- deleteActivity, which issues a bare DELETE FROM activities WHERE id = $1 with
-- no cleanup before it and would now raise 23503 against an Activity that has a
-- file against it. Refusing that deletion, and asking for the evidence to be
-- removed first, belongs to the screen that deletes Activities - see #32, whose
-- acceptance criteria carry it.

-- Enumerated vocabularies here are CHECK constraints rather than enum types,
-- which is what docs/02 §6.2, §6.4 and §3.5 give them as. 0002 used enum types
-- where §8 gave a named domain; nothing in this file has one. The practical
-- difference is the SQLSTATE - 23514 rather than 22P02 - and that a value can be
-- added by an ALTER TABLE in a later file rather than an ALTER TYPE, which this
-- runner's one-transaction-per-file design makes the easier of the two.

-- ADR-0001 tier 2: an enrolment is a junction, so the surrogate id is dropped
-- and (student_id, section_id) becomes the key. Nothing inherited addresses an
-- enrolment any other way - every INSERT, DELETE and SELECT in
-- studentCourseModel keys on the pair, and the duplicate that the key now
-- refuses was being guarded by a SELECT in application code.
CREATE TABLE student_course (
  student_id  varchar(20) NOT NULL REFERENCES student (student_id) ON DELETE RESTRICT,
  section_id  integer     NOT NULL REFERENCES course_sections (section_id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, section_id)
);

-- A work group within one section. section_id is NOT NULL against docs/02,
-- which leaves it nullable: a group belongs to a section or it belongs to
-- nothing.
--
-- The delete is RESTRICT and not CASCADE even though a group outside its
-- section is meaningless, because deleting a group is a logged action - see
-- student_group_change_log - and a cascade would remove groups without ever
-- passing through the code that writes the log.
--
-- No unique constraint on group_name: it defaults to the empty string, so
-- unnamed groups would collide with each other on their first day.
CREATE TABLE student_group (
  group_id    integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  section_id  integer      NOT NULL REFERENCES course_sections (section_id) ON DELETE RESTRICT,
  group_name  varchar(100) NOT NULL DEFAULT '',
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

-- ADR-0001 tier 2 again, on the same evidence: studentGroupModel inserts and
-- deletes membership by (group_id, student_id) and never by an id.
--
-- BR-06 (at most ten students to a group) and BR-07 (one group per student per
-- subject) are not here. Neither is a constraint a row can satisfy on its own:
-- the first counts siblings, the second reaches through two tables to the
-- offering. They belong to the service layer, and the ticket that builds it.
CREATE TABLE student_group_member (
  group_id    integer     NOT NULL REFERENCES student_group (group_id) ON DELETE CASCADE,
  student_id  varchar(20) NOT NULL REFERENCES student (student_id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, student_id)
);

-- The history of group membership, written by logService.createLog and by
-- studentGroupModel's own delete path.
--
-- None of the three group columns is a foreign key, and that is deliberate.
-- docs/02 leaves group_id plain and makes old_group_id and new_group_id
-- references, which cannot both be honoured: deleteGroup writes a DELETE_GROUP
-- row and then deletes the group inside one transaction, so RESTRICT would make
-- the deletion impossible and SET NULL would erase the very fact being recorded.
-- A log is a record of what happened, not a pointer to what still exists. The
-- columns keep student_group.group_id's type all the same, so that a value read
-- back out of the log can be compared with a live group without a cast - and
-- since there is no foreign key, the type check in the tests will not catch it
-- if that stops being true.
--
-- group_name is likewise a copy and not a lookup: the name a group had at the
-- time is what the log is for.
--
-- section_id and student_id are foreign keys all the same, and the difference is
-- that nothing deletes a section or a student in the transaction that writes the
-- log. Both are soft-deleted like every other referable row in 0001's rule, so
-- RESTRICT here never blocks a deletion the application actually performs, and
-- the log is read back by section. student_id is RESTRICT and not SET NULL for
-- the same reason the group columns have no foreign key at all: which student an
-- entry is about is the fact being recorded, and an entry that has forgotten it
-- records nothing. performed_by is the exception, being authorship rather than
-- subject, and follows 0001's rule for authorship.
CREATE TABLE student_group_change_log (
  log_id        integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  section_id    integer      NOT NULL REFERENCES course_sections (section_id) ON DELETE RESTRICT,
  group_id      integer      NOT NULL,
  group_name    varchar(100) NOT NULL,
  student_id    varchar(20)  REFERENCES student (student_id) ON DELETE RESTRICT,
  action_type   varchar(20)  NOT NULL CHECK (action_type IN (
                               'CREATE_GROUP', 'DELETE_GROUP', 'ADD_STUDENT',
                               'REMOVE_STUDENT', 'MOVE_STUDENT')),
  old_group_id  integer,
  new_group_id  integer,
  performed_by  varchar(20)  REFERENCES users (user_id) ON DELETE SET NULL,
  created_at    timestamptz  NOT NULL DEFAULT now()
);

-- The weighting scheme: the score categories an offering is marked out of, and
-- what each is worth.
--
-- This is the ADR-0003 table of the file. subjectScoreModel keys the whole
-- save on section_id - SELECT the existing rows for a section, delete the ones
-- not resent, update the rest - so two sections of one offering can be marked
-- out of different categories, and an attainment figure summed across them is
-- summed across two different bases. The column is replaced by the same
-- (program_id, subject_id, academic_year) grain 0002 gave subject_clo, and by
-- the same real foreign key into program_subjects, so the pairing is enforced
-- rather than intended. The save path is rewritten against this grain in the
-- ticket that builds it; the diff-on-id shape survives, keyed on the offering.
--
-- ADR-0001 tier 3: the surrogate key stays, because activities and
-- activity_clo_mapping both point at it, and the natural key is enforced with
-- UNIQUE instead. score_category is free text - Midterm, Final, โครงงาน - so
-- two categories differing by a trailing space are two categories here. That is
-- a normalisation for the service layer to make on the way in, not something to
-- invent in the schema.
--
-- BR-05, that the weights of an offering sum to 100, is not a row-level
-- constraint and is not here. The per-row bound is, because a weight outside
-- 0..100 cannot be part of any sum that reaches it.
CREATE TABLE subject_score_ratio (
  score_ratio_id  integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  program_id      varchar(10) NOT NULL,
  subject_id      varchar(8)  NOT NULL,
  academic_year   varchar(4)  NOT NULL,
  sequence_order  integer     NOT NULL,
  score_category  text        NOT NULL,
  weight          smallint    NOT NULL DEFAULT 0 CHECK (weight BETWEEN 0 AND 100),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (program_id, subject_id)
    REFERENCES program_subjects (program_id, subject_id) ON DELETE RESTRICT,
  UNIQUE (program_id, subject_id, academic_year, score_category)
);

-- An Activity: a piece of assessed work set to one Section.
--
-- score_ratio_id is where the file's two grains meet, and the join is not
-- enforceable. An Activity carries section_id and nothing else, while a
-- weighting row is identified by (program_id, subject_id, academic_year), so
-- there is no composite foreign key to write - the columns to put in it do not
-- exist on this side. An Activity in one Section can therefore name a weighting
-- category belonging to a different subject entirely, and only the service
-- layer will notice. Denormalising the grain onto activities would close it and
-- would put a second copy of every Activity's offering in the database; the
-- ticket that builds the save path resolves it by deriving the offering from
-- the Section on the way in.
--
-- course_syllabus_id SET NULL and not RESTRICT: an Activity may be attached to
-- a week of the plan, and rewriting the plan should not take the Activity with
-- it.
CREATE TABLE activities (
  id                  integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  section_id          integer      NOT NULL REFERENCES course_sections (section_id) ON DELETE RESTRICT,
  score_ratio_id      integer      REFERENCES subject_score_ratio (score_ratio_id) ON DELETE RESTRICT,
  activity_type       varchar(20)  NOT NULL CHECK (activity_type IN ('group', 'individual')),
  activity_name       varchar(255) NOT NULL,
  description         text,
  score_number        numeric(5,2) NOT NULL DEFAULT 0,
  announcement_date   timestamptz,
  deadline_date       timestamptz,
  course_syllabus_id  integer      REFERENCES course_syllabus (id) ON DELETE SET NULL,
  is_average_score    boolean      NOT NULL DEFAULT false,
  is_self_assessment  boolean      NOT NULL DEFAULT false,
  detail              jsonb,
  expected_level      integer,
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

-- How one Activity's marks are divided between the CLOs it assesses.
--
-- The unique constraint is deferrable because of how the rows are saved.
-- upsertActivityCloMapping opens a transaction and updates the surviving rows one
-- at a time, so swapping two criteria's order passes through a state where both
-- hold the same sequence_order. Checked per statement, that state is a
-- duplicate-key error and reordering is impossible; checked at commit, it is
-- the middle of a legal move. A single INSERT is still refused, because its
-- implicit transaction commits at the end of the statement.
--
-- BR-11, that the weights of an Activity's CLOs sum to 100, is a sum and is not
-- here, for the reason given at subject_score_ratio.
CREATE TABLE activity_clo_mapping (
  id              integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  activity_id     integer      NOT NULL REFERENCES activities (id) ON DELETE CASCADE,
  sequence_order  integer      NOT NULL,
  clo_id          integer      REFERENCES subject_clo (clo_id) ON DELETE RESTRICT,
  weight          integer      NOT NULL DEFAULT 0 CHECK (weight BETWEEN 0 AND 100),
  score_ratio_id  integer      NOT NULL REFERENCES subject_score_ratio (score_ratio_id) ON DELETE RESTRICT,
  score           numeric(5,2) NOT NULL DEFAULT 0,
  detail          text,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (activity_id, sequence_order) DEFERRABLE INITIALLY DEFERRED
);

-- One student's mark on one Activity, against one CLO.
--
-- clo_id is NOT NULL against docs/02, and the unique constraint is the reason.
-- activityScoreModel writes marks with ON CONFLICT (student_id, activity_id,
-- clo_id) DO UPDATE, which needs a unique constraint on exactly those three
-- columns or it raises 42P10 and writes nothing. docs/02 puts the constraint on
-- the first two and leaves clo_id nullable, and a nullable column in a unique
-- constraint is not unique: two marks with no CLO would both insert, the upsert
-- would quietly stop being one, and re-marking a student would accumulate rows
-- rather than replace them. R072 has every mark carry its CLO in any case.
CREATE TABLE activity_scores (
  score_id     integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id   varchar(20)  NOT NULL REFERENCES student (student_id) ON DELETE RESTRICT,
  activity_id  integer      NOT NULL REFERENCES activities (id) ON DELETE CASCADE,
  clo_id       integer      NOT NULL REFERENCES subject_clo (clo_id) ON DELETE RESTRICT,
  score        numeric(5,2),
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (student_id, activity_id, clo_id)
);

-- The uploaded file standing as evidence that an Activity was assessed. This is
-- what an accreditation review is shown, so it is RESTRICT on both parents and
-- soft-deleted rather than removed.
--
-- BR-15 (PDF only) and BR-16 (the permitted evidence types) are enforced on the
-- way in, where the file itself is available to check, and not by a CHECK on a
-- string the uploader controls.
CREATE TABLE activity_evidence (
  evidence_id    integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  section_id     integer     NOT NULL REFERENCES course_sections (section_id) ON DELETE RESTRICT,
  activity_id    integer     NOT NULL REFERENCES activities (id) ON DELETE RESTRICT,
  evidence_type  varchar(50),
  description    text,
  file_name      text        NOT NULL,
  file_path      text        NOT NULL,
  mime_type      text,
  file_size      integer,
  uploaded_by    varchar(20) REFERENCES users (user_id) ON DELETE SET NULL,
  uploaded_at    timestamptz NOT NULL DEFAULT now(),
  updated_by     varchar(20) REFERENCES users (user_id) ON DELETE SET NULL,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  is_deleted     boolean     NOT NULL DEFAULT false
);

-- A rubric, and the criteria it marks against.
--
-- ADR-0001 tier 3: the surrogate id is kept and rubric_code carries the natural
-- key as a UNIQUE. The ADR listed rubrics under tier 2 until this migration was
-- written; tier 2 is for junctions, and a rubric is not one - it has no pair of
-- parents to be keyed on. It is also addressed by that surrogate throughout:
-- rubricsModel deletes and updates WHERE id = $1, and rubric_details.rubric_id
-- is that id, so dropping it would rewrite queries this file is meant to serve.
-- The ADR's list was the thing that was wrong, and it has since been corrected.
--
-- rubric_code is unique across the institution and not within its programme,
-- which is the opposite of the scoping 0002 gave section numbers and CLO codes.
-- The difference is that the inherited code looks a rubric up by its code alone
-- - findRubricByCode(rubric_code), with no programme in hand - so a code that
-- meant one thing in one programme and another elsewhere would resolve to
-- whichever row was found first. program_id says which programme owns it, not
-- which namespace it is in.
CREATE TABLE rubrics (
  id              integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rubric_code     varchar(20)  NOT NULL UNIQUE,
  rubric_name_en  varchar(255) NOT NULL,
  rubric_name_th  varchar(255) NOT NULL,
  program_id      varchar(10)  REFERENCES programs (program_id) ON DELETE RESTRICT,
  display_order   integer      NOT NULL DEFAULT 0,
  created_by      varchar(20)  REFERENCES users (user_id) ON DELETE SET NULL,
  updated_by      varchar(20)  REFERENCES users (user_id) ON DELETE SET NULL,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now()
);

-- rubric_details, plural, which is what all nine occurrences in the inherited
-- code say. docs/02 §7.2 calls it rubric_detail and is alone in doing so.
--
-- The four level descriptions are four columns and not four rows, because that
-- is the shape the inherited screen and its insert both use. A criterion with
-- five levels would need this table changed; nothing asks for one.
CREATE TABLE rubric_details (
  id                     integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rubric_id              integer      NOT NULL REFERENCES rubrics (id) ON DELETE CASCADE,
  criteria_name_en       varchar(255) NOT NULL,
  criteria_name_th       varchar(255) NOT NULL,
  weight                 numeric(5,2) NOT NULL DEFAULT 1.00,
  level_4_description    text,
  level_3_description    text,
  level_2_description    text,
  level_1_description    text,
  display_order          integer      NOT NULL DEFAULT 0,
  created_by             varchar(20)  REFERENCES users (user_id) ON DELETE SET NULL,
  updated_by             varchar(20)  REFERENCES users (user_id) ON DELETE SET NULL,
  created_at             timestamptz  NOT NULL DEFAULT now(),
  updated_at             timestamptz  NOT NULL DEFAULT now()
);

-- Foreign keys that are not already the leftmost column of a key of their own,
-- as in 0001 and 0002. student_course.student_id, student_group_member.group_id
-- and subject_score_ratio's composite into program_subjects need nothing of
-- their own, being leftmost of a primary key or unique constraint above; their
-- partners do, because a RESTRICT check on the other parent looks the row up by
-- the trailing column.
--
-- The change log's three group columns are not foreign keys and so have no
-- RESTRICT check to serve, but the log is read back by section and by group, so
-- section_id leads and group_id follows it.
CREATE INDEX student_course_section_id_idx ON student_course (section_id);
CREATE INDEX student_group_section_id_idx ON student_group (section_id);
CREATE INDEX student_group_member_student_id_idx ON student_group_member (student_id);
CREATE INDEX student_group_change_log_section_id_group_id_idx
  ON student_group_change_log (section_id, group_id);
CREATE INDEX student_group_change_log_student_id_idx ON student_group_change_log (student_id);
CREATE INDEX student_group_change_log_performed_by_idx ON student_group_change_log (performed_by);
CREATE INDEX activities_section_id_idx ON activities (section_id);
CREATE INDEX activities_score_ratio_id_idx ON activities (score_ratio_id);
CREATE INDEX activities_course_syllabus_id_idx ON activities (course_syllabus_id);
CREATE INDEX activity_clo_mapping_clo_id_idx ON activity_clo_mapping (clo_id);
CREATE INDEX activity_clo_mapping_score_ratio_id_idx ON activity_clo_mapping (score_ratio_id);
CREATE INDEX activity_scores_activity_id_idx ON activity_scores (activity_id);
CREATE INDEX activity_scores_clo_id_idx ON activity_scores (clo_id);
CREATE INDEX activity_evidence_section_id_idx ON activity_evidence (section_id);
CREATE INDEX activity_evidence_activity_id_idx ON activity_evidence (activity_id);
CREATE INDEX activity_evidence_uploaded_by_idx ON activity_evidence (uploaded_by);
CREATE INDEX activity_evidence_updated_by_idx ON activity_evidence (updated_by);
CREATE INDEX rubrics_program_id_idx ON rubrics (program_id);
CREATE INDEX rubrics_created_by_idx ON rubrics (created_by);
CREATE INDEX rubrics_updated_by_idx ON rubrics (updated_by);
CREATE INDEX rubric_details_rubric_id_idx ON rubric_details (rubric_id);
CREATE INDEX rubric_details_created_by_idx ON rubric_details (created_by);
CREATE INDEX rubric_details_updated_by_idx ON rubric_details (updated_by);
