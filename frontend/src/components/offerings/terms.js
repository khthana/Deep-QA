/**
 * The three ภาคการศึกษา, in one place — #23.
 *
 * `semester` on `semester_courses` is a number and the CHECK constraint allows
 * exactly these three. Four files read it out to the person, so the words live
 * here rather than in four `switch` statements that will drift.
 */
export const SEMESTERS = [
  { value: 1, label: 'ภาคต้น' },
  { value: 2, label: 'ภาคปลาย' },
  { value: 3, label: 'ภาคฤดูร้อน' },
]

export const semesterLabel = semester =>
  SEMESTERS.find(term => term.value === Number(semester))?.label ?? `ภาค ${semester}`

/** ปีการศึกษา as it is written everywhere else here: four digits, พ.ศ. */
export const isYear = value => /^\d{4}$/.test(String(value ?? '').trim())
