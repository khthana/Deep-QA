-- Which year `programs.year` means - the one column in the schema that did not say.
--
-- Every other year in the database spells the concept out: `semester_courses.academic_year`,
-- `subject_clo.academic_year`, the weighting scheme's `subject_score_ratio.academic_year`,
-- `clo_course_cycle_cloplan.academic_year`, `student.admission_year`. `programs.year`
-- was the sole bare `year`, and it is none of those: it is the Buddhist-era year the
-- curriculum itself was revised - หลักสูตรปรับปรุง พ.ศ. 2564 - not a year anything is
-- taught in. The confusion was not hypothetical; reviewing #15 the question
-- "year of what?" had to be answered from 0001 rather than from the name.
--
-- `CONTEXT.md` got the term first and this follows it, rather than the column
-- naming itself and the glossary catching up. Three names were on the table and
-- two are ruled out there: `curriculum_year` because *curriculum* is already an
-- _Avoid_ under **Program**, and `program_year` because it reads as a student's
-- year of study (ชั้นปี). `revision_year` is how the university says it.
--
-- ADR-0001 is not engaged. `year` appears in no primary key, unique constraint
-- or foreign key on `programs` - it is a nullable `varchar(4)` and nothing
-- references it - so this is a rename and not key surgery.
--
-- The column keeps its type, its nullability and its values. What changes with
-- it, in the same commit, is every name the column is known by outside the
-- database: the API's field, the programmes import template's header column,
-- the form field and the table cell. The import format is therefore different
-- from this migration onward, which is the cost of the rename and is why the
-- template is generated from one list rather than written out per caller.

ALTER TABLE programs
  RENAME COLUMN year TO revision_year;
