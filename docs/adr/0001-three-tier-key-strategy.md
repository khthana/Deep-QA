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

## Amended by #31 — the one tier 3 table with no natural key to enforce

[#31](https://github.com/khthana/Deep-QA/issues/31) built แผนการสอน on `course_syllabus`, and that table is the
exception to the paragraph above: it is listed in tier 3, it keeps its surrogate `id`, and it has **no `UNIQUE`
constraint** — migration 0002 left `(section_id, week_no)` deliberately open, and the ticket's behaviour depends on
that being so.

The reason is that `(section_id, week_no)` is not a natural key. A week number is not an identifier the record earns
by being that record; it is a date, written by the person, and one week of a semester may hold two topics for the
same honest reason a Tuesday may hold two lectures. Nothing in the system addresses a plan row by its week: the FK
that matters is `activities.course_syllabus_id`, which points at the surrogate. Declaring the pair unique would not
be enforcing a natural key, it would be inventing a rule the domain does not have — and it would fail at the first
week somebody wanted to split.

So tier 3's sentence reads, more precisely: *a surrogate primary key is kept for FK and URL use, and the full natural
key is enforced with a `UNIQUE` constraint where there is one*. The tier is about what a key is for, and the three
tables the thesis schema got wrong (`course_sections.section_number`, `subject_clo.clo_number`,
`learning_outcomes.outcome_code`) all had a real key scoped wrongly. `course_syllabus` has none to scope.

Where the row order comes from instead: `ORDER BY week_no ASC, id ASC` in `backend/routes/teachingPlan.js` — the
calendar first, then insertion order within a week — and the screen names its rows by number *and* title, because the
number alone does not identify one.
