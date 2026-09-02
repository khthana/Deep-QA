import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  HiOutlineArrowRightCircle,
  HiOutlineClock,
  HiOutlinePencilSquare,
  HiOutlinePlusCircle,
  HiOutlineTrash,
  HiOutlineXMark,
} from 'react-icons/hi2'

import ConfirmDialog from '../components/ConfirmDialog'
import ContentMotionDIV from '../components/ContentMotionDIV'
import ImportPanel from '../components/ImportPanel'
import Notice from '../components/Notice'
import GroupHistory from '../components/groups/GroupHistory'
import {
  addToGroup,
  createGroup,
  deleteGroup,
  importGroups,
  importTemplate,
  listGroupHistory,
  listGroups,
  moveToGroup,
  removeFromGroup,
  renameGroup,
} from '../api/workGroups'

/**
 * กลุ่มงานนักศึกษา — ticket #26.
 *
 * The class list divided into the groups that do group work, with the two
 * rules that keep the division valid enforced on the server and stated here.
 *
 * ## Why the roll is a picker and not a search
 *
 * #25's screen takes a typed code, because the register it draws from holds
 * thousands of people and a dropdown of them would be unusable. This one draws
 * from fifty-seven — the ตอนเรียน's own roll — so it offers them, and each
 * option says which group the person is already in.
 *
 * That is not a convenience. BR-07 lets somebody belong to one group per
 * ตอนเรียน, so the interesting question at the moment of choosing is exactly
 * "where are they now", and a picker that hid it would make the server's
 * refusal look arbitrary. It is also what makes the two verbs choosable: a
 * person the picker shows as อยู่ในกลุ่มที่ 2 is added with **ย้ายมากลุ่มนี้**
 * and not with **เพิ่มเข้ากลุ่ม**, and the screen never guesses between them.
 *
 * ## The two buttons are two different acts
 *
 * **เพิ่มเข้ากลุ่ม** is refused, by the server, for anybody already in a group,
 * and the refusal names the group. **ย้ายมากลุ่มนี้** is refused for anybody who
 * is in none. Neither falls back to the other. A screen that retried an add as
 * a move would leave a history in which nobody was ever moved — which is the
 * one question this screen exists to be able to answer three months later,
 * when a student says they were put in the wrong group.
 *
 * ## What the numbers are for
 *
 * Every group carries `n/10` rather than `n`, because the ceiling is a rule
 * somebody is about to run into and a bare count does not warn anybody. The
 * ungrouped panel carries its own count for the same reason in the other
 * direction: a grouping is finished when that number is nought, and nothing
 * else on the screen says so.
 */
export default function StudentGroups() {
  const { sectionId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [chosen, setChosen] = useState({})
  const [renaming, setRenaming] = useState(null)
  const [removingGroup, setRemovingGroup] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  /**
   * `loading` swaps the body of the screen and nothing above it —
   * `SubjectStudents`' shape, and here for its reason: a reload after an import
   * that unmounted `ImportPanel` would take the per-row report with it, and the
   * report is the whole answer to a rejected file.
   */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await listGroups(sectionId))
    } catch (error) {
      setData(null)
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setLoading(false)
    }
  }, [sectionId])

  useEffect(() => {
    load()
  }, [load])

  /**
   * Every write ends in a reload rather than in a patch of the state it just
   * changed.
   *
   * A move takes a student out of one card and puts them into another, a
   * deletion returns its members to the ungrouped panel, and both change every
   * count on the screen. Reconciling that by hand is four places to forget one,
   * and the read costs one request against a list that is a few dozen rows.
   */
  const after = async message => {
    await load()
    setNotice({ error: false, message })
  }

  const failed = error => {
    if (!error.expired) setNotice({ error: true, message: error.message })
  }

  /** One write, with the banner cleared first and the screen unlocked after. */
  const write = async (action, succeeded) => {
    setBusy(true)
    setNotice(null)
    try {
      await after(succeeded(await action))
    } catch (error) {
      failed(error)
    } finally {
      setBusy(false)
    }
  }

  const create = async event => {
    event.preventDefault()
    const typed = name.trim()
    await write(createGroup(sectionId, typed), () => {
      setName('')
      return `สร้างกลุ่ม ${typed} แล้ว`
    })
  }

  const submitRename = async event => {
    event.preventDefault()
    const { group_id, value } = renaming
    await write(renameGroup(sectionId, group_id, value.trim()), () => {
      setRenaming(null)
      return `เปลี่ยนชื่อกลุ่มเป็น ${value.trim()} แล้ว`
    })
  }

  const place = async (group, verb) => {
    const studentId = chosen[group.group_id]
    if (!studentId) return
    const student = data.students.find(one => one.student_id === studentId)
    const moving = verb === 'move'
    await write(
      moving
        ? moveToGroup(sectionId, group.group_id, studentId)
        : addToGroup(sectionId, group.group_id, studentId),
      () => {
        setChosen({ ...chosen, [group.group_id]: '' })
        return moving
          ? `ย้าย ${student.full_name_th} จาก ${student.group_name} มาที่ ${group.group_name} แล้ว`
          : `เพิ่ม ${student.full_name_th} เข้ากลุ่ม ${group.group_name} แล้ว`
      },
    )
  }

  const takeOut = (group, member) =>
    write(removeFromGroup(sectionId, group.group_id, member.student_id), () => {
      return `นำ ${member.full_name_th} ออกจาก ${group.group_name} แล้ว`
    })

  const disband = async () => {
    const group = removingGroup
    setBusy(true)
    setNotice(null)
    try {
      await deleteGroup(sectionId, group.group_id)
      setRemovingGroup(null)
      await after(`ลบ ${group.group_name} แล้ว`)
    } catch (error) {
      // The dialog closes either way — `SubjectStudents`' reason: leaving it
      // open over a refusal puts the banner behind it and offers a button that
      // cannot do anything different.
      setRemovingGroup(null)
      failed(error)
    } finally {
      setBusy(false)
    }
  }

  const ungrouped = data?.students.filter(student => student.group_id === null) ?? []
  const placed = (data?.students.length ?? 0) - ungrouped.length

  return (
    <ContentMotionDIV className="space-y-4 px-6 py-6">
      <Notice notice={notice} />

      {loading && !data && <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>}

      {data && (
        <>
          <div>
            <p className="text-xs font-medium text-slate-400">
              {data.section.subject_id} {data.section.subject_name_en}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-primary">กลุ่มงานนักศึกษา</h1>
            <p className="mt-2 text-sm text-slate-500">
              ตอนเรียน {data.section.section_number} · ปีการศึกษา{' '}
              {data.section.academic_year} · {data.groups.length} กลุ่ม · จัดกลุ่มแล้ว{' '}
              {placed} คน · ยังไม่มีกลุ่ม {ungrouped.length} คน
            </p>
          </div>

          <form
            onSubmit={create}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-1 text-lg font-medium text-primary">สร้างกลุ่มงาน</h2>
            <p className="mb-4 text-sm text-slate-500">
              ตั้งชื่อกลุ่มไม่ซ้ำกันภายในตอนเรียนนี้ หนึ่งกลุ่มมีนักศึกษาได้ไม่เกิน{' '}
              {data.max_group_size} คน และนักศึกษาหนึ่งคนอยู่ได้กลุ่มเดียวต่อหนึ่งตอนเรียน
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="sr-only" htmlFor="group_name">
                ชื่อกลุ่มงาน
              </label>
              <input
                id="group_name"
                name="group_name"
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="ชื่อกลุ่มงาน"
                className="w-64 rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover disabled:opacity-60"
              >
                สร้างกลุ่ม
              </button>
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="ml-auto inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <HiOutlineClock className="h-5 w-5" />
                {showHistory ? 'ซ่อนประวัติการเปลี่ยนแปลง' : 'ประวัติการเปลี่ยนแปลง'}
              </button>
            </div>
          </form>

          {showHistory && (
            <GroupHistory
              fetchPage={page => listGroupHistory(sectionId, { page })}
              onError={failed}
            />
          )}

          <ImportPanel
            title="นำเข้ากลุ่มงาน"
            subtitle="ดาวน์โหลดแบบฟอร์ม กรอกชื่อกลุ่มและรหัสนักศึกษาบรรทัดละหนึ่งคน แล้วอัปโหลดกลับเข้ามา กลุ่มที่ยังไม่มีจะถูกสร้างให้ และนักศึกษาที่อยู่ในกลุ่มอยู่แล้วจะถูกปฏิเสธทั้งไฟล์"
            templateName="section-groups-template.csv"
            fetchTemplate={() => importTemplate(sectionId)}
            send={csv => importGroups(sectionId, csv)}
            onStart={() => setNotice(null)}
            onImported={load}
            onError={failed}
          />

          <div className="grid gap-4 md:grid-cols-2">
            {data.groups.length === 0 && (
              <p className="text-sm text-slate-500">
                ยังไม่มีกลุ่มงานในตอนเรียนนี้
              </p>
            )}

            {data.groups.map(group => (
              <section
                key={group.group_id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                {renaming?.group_id === group.group_id ? (
                  <form onSubmit={submitRename} className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`rename-${group.group_id}`}>
                      ชื่อใหม่ของ {group.group_name}
                    </label>
                    <input
                      id={`rename-${group.group_id}`}
                      value={renaming.value}
                      onChange={event =>
                        setRenaming({ ...renaming, value: event.target.value })
                      }
                      className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary_hover disabled:opacity-60"
                    >
                      บันทึกชื่อ
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenaming(null)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      ยกเลิก
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-medium text-primary">
                      {group.group_name}
                    </h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        group.member_count >= data.max_group_size
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {group.member_count}/{data.max_group_size}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setRenaming({ group_id: group.group_id, value: group.group_name })
                      }
                      aria-label={`เปลี่ยนชื่อ ${group.group_name}`}
                      className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    >
                      <HiOutlinePencilSquare className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemovingGroup(group)}
                      aria-label={`ลบ ${group.group_name}`}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    >
                      <HiOutlineTrash className="h-5 w-5" />
                    </button>
                  </div>
                )}

                <ul className="mt-3 space-y-1">
                  {group.members.length === 0 && (
                    <li className="py-2 text-sm text-slate-500">ยังไม่มีสมาชิกในกลุ่มนี้</li>
                  )}
                  {group.members.map(member => (
                    <li
                      key={member.student_id}
                      className="flex items-center gap-2 border-b border-gray-100 py-1.5 last:border-0"
                    >
                      <span className="text-sm text-gray-800">{member.student_id}</span>
                      <span className="text-sm text-slate-600">{member.full_name_th}</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => takeOut(group, member)}
                        aria-label={`นำ ${member.student_id} ออกจาก ${group.group_name}`}
                        className="ml-auto rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                      >
                        <HiOutlineXMark className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`pick-${group.group_id}`}>
                    เลือกนักศึกษาเข้า {group.group_name}
                  </label>
                  <select
                    id={`pick-${group.group_id}`}
                    value={chosen[group.group_id] ?? ''}
                    onChange={event =>
                      setChosen({ ...chosen, [group.group_id]: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-64"
                  >
                    <option value="">เลือกนักศึกษา…</option>
                    {data.students.map(student => (
                      <option key={student.student_id} value={student.student_id}>
                        {student.student_id} {student.full_name_th} ·{' '}
                        {student.group_name ?? 'ยังไม่มีกลุ่ม'}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => place(group, 'add')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5 disabled:opacity-60"
                  >
                    <HiOutlinePlusCircle className="h-5 w-5" />
                    เพิ่มเข้ากลุ่ม
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => place(group, 'move')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <HiOutlineArrowRightCircle className="h-5 w-5" />
                    ย้ายมากลุ่มนี้
                  </button>
                </div>
              </section>
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-medium text-primary">
              ยังไม่มีกลุ่ม {ungrouped.length} คน
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              นักศึกษาที่ลงทะเบียนในตอนเรียนนี้แล้วแต่ยังไม่ได้อยู่กลุ่มใด
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {ungrouped.length === 0 && (
                <li className="text-sm text-slate-500">ทุกคนมีกลุ่มแล้ว</li>
              )}
              {ungrouped.map(student => (
                <li
                  key={student.student_id}
                  className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                >
                  {student.student_id} {student.full_name_th}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(removingGroup)}
        title="ลบกลุ่มงาน"
        message={
          removingGroup
            ? `ต้องการลบ ${removingGroup.group_name} หรือไม่ นักศึกษา ${removingGroup.member_count} คนในกลุ่มนี้จะถูกนำออกจากกลุ่มและบันทึกไว้ในประวัติ ทุกคนยังอยู่ในตอนเรียนตามเดิม`
            : ''
        }
        confirmLabel="ลบกลุ่ม"
        busy={busy}
        onConfirm={disband}
        onCancel={() => setRemovingGroup(null)}
      />
    </ContentMotionDIV>
  )
}
