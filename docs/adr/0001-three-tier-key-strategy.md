# Three-tier key strategy: natural keys at the top, surrogate + UNIQUE at the bottom

DEEP-Core's entities nest deeply (program → subject-in-program → offering → section → CLO → activity → score), so a
pure natural-key design accumulates: a section's natural key is 5 columns and a CLO's is 6, each of which would then
propagate as a composite FK into roughly a dozen child tables and into every teacher-side API path. We therefore split
the schema into three tiers:

- **Tier 1 — reference data** (`faculty`, `departments`, `programs`, `subjects`, `users`, `student`, `roles`): the
  real-world code *is* the primary key (`'05'`, `'0501'`, `'01076105'`). No surrogate.
- **Tier 2 — junctions and assignments** (`program_subjects`, `subject_plo_mapping`, `user_roles`, `student_course`,
  `student_group_member`): the natural key is 2–3 short columns, so the surrogate `id` is dropped and the
  natural key becomes the composite primary key.
- **Tier 3 — deeply nested records** (`semester_courses`, `course_sections`, `subject_clo`, `subject_score_ratio`,
  `activities`, `course_syllabus`, `rubrics`, and the log/evidence tables): a surrogate primary key is kept for FK and
  URL use, but the full natural key is enforced with a `UNIQUE` constraint.

The `UNIQUE` constraint is the point of tier 3 — it is what the thesis schema got wrong. The original declared
`course_sections.section_number`, `subject_clo.clo_number` and `learning_outcomes.outcome_code` as *standalone*
unique, which means "กลุ่ม 1" could exist for only one subject in the entire system and only one program could ever
own a `PLO1`. Scoping each of those to its parent fixes a real defect while keeping joins and API paths single-column.

## Consequences

- `:section_id` survives as the teacher-side context identifier in URLs and `localStorage`, so the 18 teacher screens
  keep their current API shape.
- Tier 2 tables lose their `id` column, so any student code that selects or passes `program_subjects.id` or
  `user_roles.id` must be rewritten during the copy-and-modify pass rather than carried over.
