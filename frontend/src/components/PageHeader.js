import { IoMdAdd } from 'react-icons/io'
import { LuImport } from 'react-icons/lu'

/**
 * The bar at the top of every screen that imports - #270, the owner's answer of
 * 10 พฤศจิกายน 2569: give back the delivered system's layout.
 *
 * The delivered screens drew it with `DEEP-QA-FRONTEND/src/components/
 * SeachSection.js`: a search box on the left and, on the right, **นำเข้า…**
 * (`bg-cyan-600`, `LuImport`) and **เพิ่ม…** (`bg-secondary`, `IoMdAdd`), each
 * label the verb and the register's noun - `นำเข้าภาควิชา`, `เพิ่มภาควิชา`. The
 * rebuild had put its *เพิ่ม…* beside the heading in `bg-primary` with no icon,
 * and its import as a box at the foot of the page.
 *
 * Two rows, because the ticket asked for two: the heading first, as the caller
 * draws it - so a heading with a line above and a line below it, which is what
 * the four teacher screens draw, stays exactly the markup it was - and the bar
 * second. The bar's left half is `children`, which is where a screen's filters
 * stand today and where #272's search box lands without anything here being
 * laid out again.
 *
 * Each button is drawn only where the screen passes its handler. The screens
 * whose *add* is a form inside the page rather than a button that opens one -
 * `StudentGroups`, `SubjectStudents`, `GradingWeights`, and `ActivityScores`,
 * which has no add at all - pass no `onAdd`, which is the ticket's *มีแค่ปุ่ม
 * นำเข้า*.
 *
 * The labels are the screen's, not built here from a noun, so that a grep for
 * `เพิ่มภาควิชา` finds the screen that says it (#111, #124) - the delivered
 * component's `'เพิ่ม' + textAddBT` is a string no grep for the words can find.
 */
export default function PageHeader({
  heading,
  importLabel,
  onImport,
  addLabel,
  onAdd,
  children,
}) {
  return (
    <div className="space-y-4">
      {heading}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">{children}</div>
        <div className="ml-auto flex flex-row gap-2">
          {onImport && (
            <button
              type="button"
              onClick={onImport}
              className="flex items-center justify-center rounded-lg bg-cyan-600 px-5 py-2.5 text-center font-medium text-white transition-all hover:bg-cyan-700 active:scale-95"
            >
              <LuImport aria-hidden="true" className="me-2 h-5 w-5" />
              {importLabel}
            </button>
          )}
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="flex items-center justify-center rounded-lg bg-secondary px-5 py-2.5 font-medium text-white transition-all hover:bg-secondary_hover active:scale-95"
            >
              <IoMdAdd aria-hidden="true" className="me-2 h-5 w-5" />
              {addLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
