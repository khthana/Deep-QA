/**
 * The five levels of `mapping_level`, and the two rules that read them.
 *
 * This file exists because the screen and the PDF are two drawings of one grid,
 * and a review found them spelling the same two rules twice — `keyOf` written
 * out inline in the export, and `level === 'E' ? '–' : level` written once as a
 * function and once as a ternary. Two spellings of one rule is two places to fix
 * and one place to forget, and the rule they were spelling is the distinction
 * the whole ticket is about: a square nobody has decided is blank, and a square
 * somebody decided against is `–`. A PDF that disagreed with the screen about
 * which of those a cell was would be wrong on the one document the distinction
 * exists for.
 *
 * It is deliberately free of `jspdf` and of React, so importing it into the
 * screen does not drag the PDF machinery into the main bundle — `PloMapping.js`
 * loads `exportPdf.js` through a dynamic `import()` to keep that split.
 */

/** The five levels, in the order the legend reads them, and the word for each. */
export const LEVELS = [
  ['E', 'ไม่ได้สอน'],
  ['I', 'เริ่มสอน'],
  ['D', 'พัฒนา'],
  ['P', 'ฝึกฝน'],
  ['A', 'ประเมินผล'],
]

/** What an `E` is drawn as: somebody said this outcome is not served here. */
export const NOT_SERVED = '–'

/** How a set square reads at a glance: the letter, and `–` for a stated no. */
export const mark = level => (level === 'E' ? NOT_SERVED : level)

/**
 * How a cell is looked up by the pair that identifies it.
 *
 * `subject_id` is a course code and `outcome_id` is a number, so no value of one
 * can collide with a value of the other across the separator.
 */
export const keyOf = (subjectId, outcomeId) => `${subjectId}|${outcomeId}`
