import { useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'
import TeacherPicker from './TeacherPicker'
import { semesterLabel } from './terms'

/**
 * The ตอนเรียน of one Offering — #23's second, third and fourth criteria.
 *
 * The second grain of this screen. An Offering is the subject-in-a-term; a
 * Section is a class within it, and the number is a label rather than a count —
 * `พ1` and `01` are both real section numbers, which is why the column is text
 * and why this panel offers renaming rather than only adding and removing.
 *
 * The same number under two different subjects is ordinary and the same number
 * twice under one Offering is a mistake. Both are the database's answer, not
 * this panel's: the constraint is per Offering, so nothing here has to know the
 * rule for it to hold.
 *
 * Each row says how many students are enrolled, because that is what decides
 * whether it can be removed at all, and a screen that only learns of the
 * refusal from the server cannot warn anybody before they press the button.
 *
 * ## Two forms, and #228's answer reaches them differently
 *
 * #249, which is #228's answer of 26 ตุลาคม 2569 reaching this panel:
 * `components/users/UserForm.js` carries the reasons. The mount point is
 * `pages/Offerings.js:698`, the only one on 30 ตุลาคม 2569 (#220). This file
 * holds **two** forms, which is one of the six things `save-window-fields.js`
 * says it cannot measure - the marker below is read from the file, so it has to
 * be read as a sentence about the form it names and not about this file.
 *
 * **เพิ่มตอนเรียน closes its field, and keeps the number in it.** The flag is
 * this form's own, so a rename opened while the add is out is live. The number
 * is cleared **where the save succeeded** rather than at the press - the shape
 * `TeacherPicker`'s box below is given, and #228's own sentence read on this
 * form: a field emptied while the save is out shows the person nothing of what
 * is being saved, and a refusal then leaves them with neither the number nor a
 * way to send it again. `142a`'s first Offerings row typed the number a second
 * time for exactly that reason, and this ticket took that line out rather than
 * re-aiming it: the row's claim is read off the button directly now.
 *
 * **แก้ไขเลขตอน needs no flag**, and carries the marker that says so at the form
 * itself rather than here: it takes its own field off the screen when it sends.
 */

export default function SectionsPanel({
  offering,
  busy,
  onBack,
  // Answers `false` where the save was refused, and anything else - including
  // `undefined` - where it was not. #249 moved this form's clearing from the
  // press to the answer, so that distinction is now what decides whether the
  // number stays in the box for a second try, and it is a contract of the prop
  // rather than of this file: `onAssign` below is given the same one. A prop is
  // not an argument, so nothing can require this of a caller (#182) - the claim
  // is held by `249:sectionclearalways`, which clears unconditionally and dies
  // at *the number after a refusal, which clears nothing*.
  onAddSection,
  onRenameSection,
  onRemoveSection,
  onAssign,
}) {
  const [adding, setAdding] = useState('')
  const [addSending, setAddSending] = useState(false)
  const [renaming, setRenaming] = useState(null)
  const [renamed, setRenamed] = useState('')
  const [staffing, setStaffing] = useState(null)

  const sections = offering.sections ?? []

  return (
    <ContentMotionDIV className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-primary">
            {/* label-code: the heading of the offering this panel is working on, which is the
                screen's identity and not a label anybody chose from (#93) */}
            {offering.subject_id} {offering.subject_name_th}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            ปีการศึกษา {offering.academic_year} ภาคการศึกษา {offering.semester} (
            {semesterLabel(offering.semester)}) · หลักสูตร {offering.program_id}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          กลับไปหน้ารายการ
        </button>
      </div>

      <form
        onSubmit={async event => {
          event.preventDefault()
          setAddSending(true)
          try {
            if ((await onAddSection(adding.trim())) !== false) setAdding('')
          } finally {
            setAddSending(false)
          }
        }}
        className="flex flex-wrap items-end gap-3 rounded-lg bg-gray-50 p-4"
      >
        <label className="block">
          <span className="mb-1 block text-sm text-gray-500">เลขตอนเรียน</span>
          <input
            value={adding}
            onChange={event => setAdding(event.target.value)}
            disabled={addSending}
            placeholder="เช่น 1 หรือ พ1"
            maxLength={10}
            className="rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !adding.trim()}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover disabled:opacity-60"
        >
          เพิ่มตอนเรียน
        </button>
      </form>

      {sections.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-slate-500">
          ยังไม่มีตอนเรียนในรายวิชาที่เปิดสอนนี้
        </p>
      )}

      {/* A list rather than a stack of divs, and each item named by its own
          number: a section is one thing among several and the number is what
          tells them apart, so that is what the item is called. It is also the
          only stable handle the browser seam has on one card - the cards carry
          the same buttons as each other and differ only in their heading. */}
      <ul className="space-y-3">
        {sections.map(section => (
          <li
            key={section.section_id}
            aria-label={`ตอนเรียน ${section.section_number}`}
            className="rounded-xl border border-gray-200 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                {renaming === section.section_id ? (
                  // save-window: this form needs no flag of its own - it takes
                  // **its own field off the screen** when it sends,
                  // `setRenaming(null)` running in the same handler, so there is
                  // no window in which the field is live. That is
                  // `components/LoginForm.js`'s shape one grain in (#203's ninth
                  // reading, and the reason markers exist rather than
                  // exemptions). The day this form stays open across its own
                  // save it needs the flag เพิ่มตอนเรียน above has. Read as a
                  // sentence about this form: the marker is read from the file
                  // and this file holds two, which is one of the six things
                  // `save-window-fields.js` says it cannot measure (#249)
                  <form
                    onSubmit={event => {
                      event.preventDefault()
                      onRenameSection(section, renamed.trim())
                      setRenaming(null)
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      value={renamed}
                      onChange={event => setRenamed(event.target.value)}
                      maxLength={10}
                      className="w-28 rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
                    />
                    <button
                      type="submit"
                      disabled={busy || !renamed.trim()}
                      className="rounded-lg px-3 py-1.5 text-sm text-primary hover:bg-blue-50 disabled:opacity-60"
                    >
                      บันทึก
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenaming(null)}
                      className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                    >
                      ยกเลิก
                    </button>
                  </form>
                ) : (
                  <h3 className="font-medium text-gray-900">ตอนเรียน {section.section_number}</h3>
                )}
                <p className="mt-1 text-sm text-slate-500">
                  นักศึกษาลงทะเบียน {section.student_count} คน
                  {section.student_count > 0 && ' — ลบตอนเรียนนี้ไม่ได้'}
                </p>
              </div>

              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setRenamed(section.section_number)
                    setRenaming(section.section_id)
                  }}
                  className="rounded-lg px-3 py-1.5 text-sm text-primary hover:bg-blue-50"
                >
                  แก้ไขเลขตอน
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setStaffing(current =>
                      current === section.section_id ? null : section.section_id
                    )
                  }
                  className="rounded-lg px-3 py-1.5 text-sm text-primary hover:bg-blue-50"
                >
                  กำหนดผู้สอน
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveSection(section)}
                  className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  ลบตอนเรียน
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {section.teachers.length === 0 && (
                <span className="text-sm text-slate-500">ยังไม่ได้กำหนดผู้สอน</span>
              )}
              {section.teachers.map(teacher => (
                <span
                  key={teacher.user_id}
                  className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800"
                >
                  {[teacher.title_th, teacher.first_name_th, teacher.last_name_th]
                    .filter(Boolean)
                    .join(' ') || teacher.user_id}
                </span>
              ))}
            </div>

            {staffing === section.section_id && (
              <div className="mt-3">
                <TeacherPicker
                  section={section}
                  busy={busy}
                  onCancel={() => setStaffing(null)}
                  onSave={async userIds => {
                    // Closed only when the save went through. A refusal leaves
                    // the box open with the ticks still in it, which is the
                    // only state from which the person can fix what was wrong.
                    if ((await onAssign(section, userIds)) !== false) setStaffing(null)
                  }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </ContentMotionDIV>
  )
}
