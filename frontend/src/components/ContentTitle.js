/**
 * A screen's title, and the card it stands in - #309.
 *
 * The delivered system drew every screen as a white card with its title at the
 * top left (`DEEP-QA-FRONTEND/src/components/ContentTitle.js` and the
 * `rounded-xl bg-white p-6 shadow` each screen wrapped itself in); the rebuild
 * drew a bare heading in one of three sizes, and the users screen none at all.
 * The owner's answer of 25 November 2569 gave the card back on every screen.
 *
 * Two differences from the delivered component, both about what it is rather
 * than how it looks: the title is an `h1`, so a screen reader can find it
 * (the delivered one was a `span` in a `div`), and the icon is hidden from
 * that reader, which would otherwise read nothing useful before the words.
 *
 * Each screen's icon is the one the delivered screen used, held in that
 * screen's own `TITLE_ICON`. Four screens the delivered system did not have
 * borrow their parent's: the CLO's criteria and behaviours `CourseOutcomes`',
 * a rubric's criteria `Rubrics`', and a section's page `TeacherDashboard`'s.
 */
export const CARD = 'rounded-xl bg-white p-6 shadow'

export default function ContentTitle({ icon: Icon, children }) {
  return (
    <h1 className="flex items-center text-2xl font-medium text-secondary">
      {Icon && (
        <Icon
          aria-hidden="true"
          className="me-2 h-6 w-6 shrink-0 text-secondary"
        />
      )}
      {children}
    </h1>
  )
}
