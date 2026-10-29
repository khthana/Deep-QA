/**
 * What a person reads when they save a row the table's own filter excludes —
 * #247, the owner's answer ข้อ จ of 29 ตุลาคม 2569.
 *
 * ## The situation, and why it is seven screens rather than one
 *
 * A filtered list and a form that may write outside that filter are one screen
 * apart from each other: `load` asks for the curriculum, department or search
 * the table is on, while the form's own picker is open on an *add* and can be
 * set to anything the person's grants reach. Since #238 the success sentence is
 * keyed on the read it is about, and that read is the table's — so it lands,
 * the key matches, and the sentence stands over a list that does not hold the
 * row that was just saved, with nothing on the screen saying so.
 *
 * #247 was written about `pages/Plos.js` and its population measured on
 * 29 ตุลาคม 2569 by the mechanism rather than by the screen's subject (#174,
 * #223): the keys of each `load`, intersected with the form fields that write
 * one of those keys and are not `disabled`. Seven screens hold it — `Plos`,
 * `ProgramSubjects`, `Rubrics`, `Students` (whose field has no `disabled` at
 * all, which on another screen would mean an *edit* moves a row out too and
 * here means nothing: that screen has no *แก้ไข*, so the only way in is an
 * add - the review of the same day caught the reason while the verdict stood,
 * #141), `Subjects`, `Offerings` (three filters, so three ways, and **two**
 * saves: the row form and `CopyTermPanel`'s *ไปยังภาคการศึกษา*, which the
 * census cannot tell apart because it asks the file and not each sentence) and
 * `Users`, where the filter a row can fall outside of is the **search
 * string** and so has no name to put in a sentence. That last one is why the
 * answer is one shared sentence and not the name of where the row went
 * (#128): an option whose value a screen's own mechanism cannot carry is not
 * an option for every screen.
 *
 * ## What is here and what is at the call sites
 *
 * The sentence is one constant because the same words on seven screens typed
 * seven times is a string a grep for the words cannot find (#111, #124). The
 * *use* of it stays a claim of each screen, and each screen's mutant is written
 * at its own save (#104) — extracting shared text costs the proof nothing as
 * long as the mutants do not move here.
 *
 * `e2e/support/outside-the-filter.js` holds a copy, because that suite is
 * CommonJS and this is an ES module inside the CRA build. The copy drifting is
 * what makes the rows fail rather than pass quietly.
 */
export const OUTSIDE_THE_FILTER = 'แถวนี้อยู่นอกรายการที่กรองอยู่'

/**
 * Is a value a save wrote outside what the table is filtered to?
 *
 * An empty filter is *all of them* on the five screens that offer that option
 * (ทุกหลักสูตร, ทุกภาควิชา, ทุกภาค), so a row written while nothing is selected
 * is never outside the list: the comparison is only made when a filter is set.
 * Compared as text because a year arrives from a `<select>` as a string and
 * from an answer as a number, and `2569 !== '2569'` would add the sentence to
 * every save on `Offerings`.
 */
export const outsideFilter = (filter, saved) =>
  Boolean(filter) && String(filter) !== String(saved ?? '')

/**
 * A screen's own sentence, with the shared one added when the save fell outside.
 *
 * One spelling of the join, so that seven screens cannot each choose their own
 * separator and no row has to know which one its screen picked.
 */
export const alsoOutside = (message, outside) =>
  outside ? `${message} ${OUTSIDE_THE_FILTER}` : message
