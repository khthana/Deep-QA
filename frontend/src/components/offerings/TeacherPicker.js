import { useEffect, useState } from 'react'

import { searchTeachers } from '../../api/offerings'

/**
 * Who teaches one ตอนเรียน — #23's fourth and fifth criteria.
 *
 * A replacement rather than an addition, which is why this is a set of ticks
 * and a บันทึก rather than an "เพิ่มผู้สอน" button: the fourth criterion asks
 * that teachers be *reassigned*, and a control that can only add cannot take
 * somebody off a class they no longer teach.
 *
 * The people already assigned stay on the list whatever has been typed into the
 * search box. Without that, searching for the person being added would hide the
 * two already there, and pressing บันทึก would quietly remove them — the exact
 * accident the replacement shape makes possible.
 *
 * The list is every registered account rather than only those holding TEACHER.
 * The ticket says "already registered as a user", and a section is sometimes
 * taught by somebody whose grant is another role. Suspended accounts are not
 * offered, because assigning one is refused.
 */

const nameOf = person =>
  [person.title_th, person.first_name_th, person.last_name_th].filter(Boolean).join(' ') ||
  person.user_id

export default function TeacherPicker({ section, busy, onSave, onCancel }) {
  const [chosen, setChosen] = useState(() => section.teachers.map(teacher => teacher.user_id))
  const [term, setTerm] = useState('')
  const [found, setFound] = useState([])
  const [searching, setSearching] = useState(true)

  useEffect(() => {
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(() => {
      searchTeachers(term)
        .then(({ teachers }) => {
          if (!cancelled) setFound(teachers)
        })
        .catch(() => {
          if (!cancelled) setFound([])
        })
        .finally(() => {
          if (!cancelled) setSearching(false)
        })
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [term])

  // Whoever is already on the section, plus whatever the search turned up. See
  // the note above: a person who is assigned must never fall off the list
  // because of what is in the search box.
  const offered = [
    ...section.teachers,
    ...found.filter(person => !section.teachers.some(t => t.user_id === person.user_id)),
  ]

  const toggle = userId =>
    setChosen(current =>
      current.includes(userId)
        ? current.filter(id => id !== userId)
        : [...current, userId]
    )

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-gray-900">
          ผู้สอนของตอนเรียน {section.section_number}
        </h3>
        <input
          value={term}
          onChange={event => setTerm(event.target.value)}
          placeholder="ค้นหาด้วยรหัส ชื่อ หรืออีเมล"
          className="rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
        />
      </div>

      <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
        {searching && <p className="p-2 text-sm text-slate-500">กำลังค้นหา…</p>}
        {!searching && offered.length === 0 && (
          <p className="p-2 text-sm text-slate-500">ไม่พบผู้ใช้งานที่ตรงกับคำค้นหา</p>
        )}
        {offered.map(person => (
          <label
            key={person.user_id}
            className="flex cursor-pointer items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm hover:bg-blue-50"
          >
            <input
              type="checkbox"
              checked={chosen.includes(person.user_id)}
              onChange={() => toggle(person.user_id)}
            />
            <span className="text-gray-900">{nameOf(person)}</span>
            <span className="text-xs text-slate-500">{person.user_id}</span>
          </label>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        เลือกไว้ {chosen.length} คน — การบันทึกจะแทนที่รายชื่อผู้สอนเดิมทั้งหมด
        ตอนเรียนที่ยังไม่มีผู้สอนก็บันทึกได้
      </p>

      <div className="mt-3 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave(chosen)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary_hover disabled:opacity-60"
        >
          บันทึกผู้สอน
        </button>
      </div>
    </div>
  )
}
