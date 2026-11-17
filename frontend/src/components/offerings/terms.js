/**
 * The ภาคการศึกษา, in one place — #23.
 *
 * `semester` on `semester_courses` is a number and the CHECK constraint allows
 * exactly these. Two since 17 พ.ย. 2569: the owner struck ภาคฤดูร้อน
 * system-wide (#279, migration 0010). Four files read it out to the person, so the words live
 * here rather than in four `switch` statements that will drift.
 */
export const SEMESTERS = [
  { value: 1, label: 'ภาคต้น' },
  { value: 2, label: 'ภาคปลาย' },
]

export const semesterLabel = semester =>
  SEMESTERS.find(term => term.value === Number(semester))?.label ?? `ภาค ${semester}`

/** ปีการศึกษา as it is written everywhere else here: four digits, พ.ศ. */
export const isYear = value => /^\d{4}$/.test(String(value ?? '').trim())

/**
 * A term as the owner asked it written on 17 พ.ย. 2569 (#279): `ภาค/ปี`, `1/2569`.
 * Takes `{ academic_year, semester }`, the shape the server answers in.
 */
export const termLabel = term => `${term.semester}/${term.academic_year}`
