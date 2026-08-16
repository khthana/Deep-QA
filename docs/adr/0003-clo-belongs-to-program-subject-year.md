# A CLO belongs to (program, subject, academic year), not to a section

In the inherited schema `subject_clo.section_id` made each Course Learning Outcome the property of a single teaching
section, so two sections of the same subject in the same year could define entirely different CLO sets — confusing for
students and incoherent for programme-level reporting, which sums CLO attainment across sections. We move CLOs up to
the `(program_id, subject_id, academic_year)` grain and drop `section_id` from `subject_clo`,
`subject_clo_measurable_behavior` and `subject_clo_achievement_criteria`.

Three things drove the exact grain rather than the simpler "CLO belongs to a subject":

- **`program_id` is required** because `program_subjects` is many-to-many and `subject_clo.plo_id` points at
  `learning_outcomes`, which is programme-scoped. Without it, a subject shared by two programmes could link its CLOs to
  only one programme's PLOs.
- **`academic_year` is required** because CLO attainment is TABEE accreditation evidence. Keyed on subject alone,
  editing a CLO's wording in 2569 would silently change what the 2568 scores are recorded as having measured. Keyed by
  year, each cohort's CLO set is frozen once its scores exist.
- The student's own `clo_course_cycle_cloplan` table is already keyed `(subject_id, program_id, academic_year)` while
  referencing section-level CLOs — an inconsistency in the original design that this grain resolves.

## Consequences

- `subject_score_ratio` moves to the same grain, so all Sections of one Offering share a single weighting scheme —
  otherwise CLO attainment summed across Sections would be computed under different weightings. Teachers keep full
  freedom over the Activities inside each category.
- Activities, scores and evidence stay section-level and are unaffected: they reference `clo_id` and do not care what
  the CLO hangs off.
- R040 ("CLO is managed by the teacher") still holds, but teachers of different sections now co-edit one shared set per
  year rather than owning private copies. Last write wins, so `updated_by` on `subject_clo` becomes load-bearing.
- Screens T04/T05/T06 resolve their context from the offering rather than from `localStorage.section`.
