import { FaSave } from 'react-icons/fa'
import { RxCross2 } from 'react-icons/rx'

/**
 * One rubric written down or changed in its own row of the list - #276.
 *
 * Until 14 พ.ย. 2569 this was `RubricForm`, a form drawn **in place of** the
 * list. The owner's answer to #276 put it back the way the delivered screen
 * drew it (`DEEP-QA-FRONTEND/src/components/content/AdminContent/Rubric/RubricTable.js`):
 * an add row at the top of the table and an edit row where the rubric stood,
 * the save and cancel squares in the ดำเนินการ column. Three things about it are
 * decisions rather than habit.
 *
 * *There is no หลักสูตร field.* The list shows one curriculum at a time (the
 * same answer), so a new rubric is written into the curriculum the list is
 * showing and the screen adds it to the draft; an existing one is not moved,
 * the server ignoring the field on an edit (`backend/routes/rubrics.js`). What
 * `RubricForm` carried about which curriculum to start on (#232, #234) went
 * with the field.
 *
 * *The edit row has ยกเลิก.* The delivered edit row had only the save square;
 * the owner asked for both (#276). The add row had both already.
 *
 * *The fields close while the save is out, and ยกเลิก does not* - #228's rule.
 * The flag says *whose* save is out (#249) and is the page's, handed in as
 * `sending`: until the review of 14 พ.ย. 2569 the row held it itself, and a
 * curriculum switched away and back while a save was out drew the edit row
 * anew with the flag down and four live fields (#276). A `<form>` cannot
 * sit around a table row, so the form is the cell holding the two squares and
 * the four fields name it with `form=`, which is what makes Enter in any of
 * them send it.
 *
 * *What has been typed is the screen's, not this row's.* The row is drawn
 * inside the list, so it comes and goes with the list's own drawing - the
 * loading line replaces every row while a read is out, and paging away from the
 * rubric being changed takes its row off the screen. A draft held here would
 * be thrown away by each of those; held by `pages/Rubrics.js` it is drawn again
 * as it was, which is what the delivered screen's `formData` did too.
 *
 * The placeholders are `RubricForm`'s, word for word: there is no label above a
 * cell, so the column heading and the field's `aria-label` say what it is and
 * the placeholder says what to write.
 */

/**
 * Each field says its own width - the owner's request of 14 พ.ย. 2569. Until
 * then this carried `w-full`, which the ลำดับ field's `w-20` could not narrow,
 * so a two-digit number had a column as wide as a name.
 */
const field =
  'rounded border px-2 py-1 text-sm text-gray-900 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'

/** The delivered `SaveBT` and `CancleBT` squares (`DEEP-QA-FRONTEND/src/components/BT.js`). */
const square =
  'inline-flex rounded-lg border p-2 transition focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'

export default function RubricRow({ draft, onChange, busy, sending, onSave, onCancel }) {
  const form = draft.id ? `rubric-${draft.id}` : 'rubric-new'

  const set = name => event => {
    const typed = event.target.value
    onChange(current => ({ ...current, [name]: typed }))
  }

  const submit = event => {
    event.preventDefault()
    onSave({
      rubric_code: draft.rubric_code,
      rubric_name_th: draft.rubric_name_th,
      rubric_name_en: draft.rubric_name_en,
      display_order: draft.display_order,
    })
  }

  return (
    <tr className="bg-blue-50/40">
      {/* ลำดับ first and รหัส second, then one column per language - the
          owner's request of 14 พ.ย. 2569, which `pages/Rubrics.js` draws in the
          heading and the rows the same way. */}
      <td className="px-4 py-2 align-top">
        <input
          className={`${field} w-16`}
          form={form}
          type="number"
          value={draft.display_order}
          onChange={set('display_order')}
          aria-label="ลำดับ"
          step={1}
          min={0}
          disabled={sending}
          required
        />
      </td>
      <td className="px-4 py-2 align-top">
        <input
          className={`${field} w-32`}
          form={form}
          value={draft.rubric_code}
          onChange={set('rubric_code')}
          aria-label="รหัส Rubric"
          title="รหัสนี้ห้ามซ้ำกันทั้งระบบ ไม่ใช่แค่ในหลักสูตรนี้"
          placeholder="เช่น RUB-12"
          maxLength={20}
          disabled={sending}
          autoFocus
          required
        />
      </td>
      <td className="px-4 py-2 align-top">
        <input
          className={`${field} w-full min-w-[10rem]`}
          form={form}
          value={draft.rubric_name_th}
          onChange={set('rubric_name_th')}
          aria-label="ชื่อ Rubric (ภาษาไทย)"
          placeholder="เช่น การนำเสนอผลงาน"
          maxLength={255}
          disabled={sending}
          required
        />
      </td>
      <td className="px-4 py-2 align-top">
        <input
          className={`${field} w-full min-w-[10rem]`}
          form={form}
          value={draft.rubric_name_en}
          onChange={set('rubric_name_en')}
          aria-label="ชื่อ Rubric (ภาษาอังกฤษ)"
          placeholder="เช่น Presentation"
          maxLength={255}
          disabled={sending}
          required
        />
      </td>
      <td className="px-4 py-2 align-top">
        <form
          id={form}
          onSubmit={submit}
          className="flex items-center justify-center gap-4"
        >
          <button
            type="submit"
            disabled={busy}
            aria-label="บันทึก"
            title="บันทึก"
            className={`${square} border-blue-700 text-blue-700 hover:bg-blue-200`}
          >
            <FaSave aria-hidden="true" className="text-xl" />
          </button>
          <button
            type="button"
            onClick={onCancel}
            aria-label="ยกเลิก"
            title="ยกเลิก"
            className={`${square} border-slate-400 text-slate-400 hover:bg-slate-200`}
          >
            <RxCross2 aria-hidden="true" className="text-xl" />
          </button>
        </form>
      </td>
    </tr>
  )
}
