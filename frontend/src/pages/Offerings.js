import { useCallback, useEffect, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog'
import CopyTermPanel from '../components/offerings/CopyTermPanel'
import Notice from '../components/Notice'
import OfferingForm from '../components/offerings/OfferingForm'
import Pager from '../components/Pager'
import SectionsPanel from '../components/offerings/SectionsPanel'
import { SEMESTERS, semesterLabel } from '../components/offerings/terms'
import {
  assignTeachers,
  copyTerm,
  createOffering,
  createSection,
  deleteOffering,
  deleteSection,
  getOffering,
  listOfferings,
  listReachablePrograms,
  updateSection,
} from '../api/offerings'

/**
 * การเปิดรายวิชาในภาคการศึกษา — ticket #23.
 *
 * Which of a หลักสูตร's subjects run in a given term, split into ตอนเรียน, each
 * given to ผู้สอน. This is the only screen the กรรมการหลักสูตร holds alone —
 * every other role, Faculty Admin included, is refused at the server, and the
 * sidebar offers the entry to that role only. Nothing in this file checks a
 * role: what arrives is what that account may see (ADR-0002).
 *
 * It is the point at which everything on the Teacher side becomes reachable. A
 * teacher's dashboard is the sections assigned here and nothing else, so an
 * Offering nobody opened is a teacher with an empty screen.
 *
 * ## Two views, one page
 *
 * The list is the term being planned; opening a row goes to that Offering's
 * sections. They are one page rather than two routes for the same reason #18's
 * editor is: the section list is only ever reached from the row above it, and a
 * URL for it would be a URL somebody could arrive at holding an Offering they
 * no longer have.
 *
 * ## The three filters
 *
 * หลักสูตร, ปีการศึกษา and ภาคการศึกษา. The programme is the same control
 * ข้อมูลรายวิชา draws for departments and for the same reason — a committee
 * member reaches one programme and is shown its name rather than a dropdown
 * whose every option returns the same rows. The other two are the term, and the
 * screen is almost always being read one term at a time.
 *
 * ## What a removal means here
 *
 * Not what it means on the four screens above. There is no switching off: an
 * Offering records a term that ran, and a term with enrolled students cannot be
 * made not to have run. So a removal either happens or is refused with a message
 * about what depends on it, the dialog says which is likely before the button is
 * pressed — the section rows carry their enrolment counts — and the banner says
 * what actually happened.
 *
 * ## What the copy panel assumes
 *
 * That the person using it reaches one programme. The panel sends the filter's
 * programme, and for a committee member the filter is not a dropdown at all, so
 * it is always theirs. If `COMMITTEE` ever widens to a role that reaches several
 * — a department administrator, say — an unfiltered copy would target whichever
 * programme sorts first and quietly build a term in the wrong curriculum. The
 * server would not stop it: it checks reach, and the reach would be real. The
 * fix at that point is to make the programme a required choice on this panel
 * rather than to inherit the filter's.
 */

const PAGE_SIZE = 10

export default function Offerings() {
  const [page, setPage] = useState(1)
  const [program, setProgram] = useState('')
  const [year, setYear] = useState('')
  const [semester, setSemester] = useState('')
  const [data, setData] = useState({ offerings: [], total: 0 })
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [opening, setOpening] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [copied, setCopied] = useState(null)
  const [busy, setBusy] = useState(false)

  const report = useCallback(error => {
    // A 401 already raises the shell's dialog; saying it again here would put a
    // banner behind that dialog.
    if (!error.expired) setNotice({ error: true, message: error.message })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(
        await listOfferings({
          page,
          per_page: PAGE_SIZE,
          program_id: program,
          academic_year: year,
          semester,
        })
      )
    } catch (error) {
      report(error)
    } finally {
      setLoading(false)
    }
  }, [page, program, year, semester, report])

  useEffect(() => {
    load()
  }, [load])

  // The programmes in reach, fetched once: what this account covers is a
  // property of the grant and does not change with the page being looked at.
  useEffect(() => {
    let cancelled = false
    listReachablePrograms()
      .then(({ programs: reachable }) => {
        if (!cancelled) setPrograms(reachable)
      })
      .catch(report)
    return () => {
      cancelled = true
    }
  }, [report])

  const nameOf = programId =>
    programs.find(entry => entry.program_id === programId)?.program_name_th ?? programId

  /**
   * The Offering being worked on, read afresh.
   *
   * Every section write ends here rather than patching the copy in hand: the
   * enrolment counts and the teaching are read back from the database, so a
   * panel that has been open a while shows what is there now.
   */
  const refresh = useCallback(
    async id => {
      const { offering } = await getOffering(id)
      setViewing(offering)
      return offering
    },
    []
  )

  const openSections = async offering => {
    setNotice(null)
    setBusy(true)
    try {
      await refresh(offering.id)
    } catch (error) {
      report(error)
      await load()
    } finally {
      setBusy(false)
    }
  }

  /** One section write, its refusal reported and the panel read back after. */
  /**
   * Answers whether the work went through, because one caller has to know.
   *
   * The refusal is turned into a banner here and not rethrown, which is right
   * for the two callers that have nothing left on the screen afterwards. The
   * teacher picker is the third: it closes when the save returns, so a refusal
   * that came back looking like a success closed the box and threw away every
   * tick with it - and the person then has to remember who they had chosen.
   */
  const onSection = async work => {
    setNotice(null)
    setBusy(true)
    try {
      const message = await work()
      await refresh(viewing.id)
      if (message) setNotice({ error: false, message })
      return true
    } catch (error) {
      report(error)
      // The panel is read back even after a refusal: a 409 on one section says
      // nothing about the state of the others, and leaving a stale panel on the
      // screen under an error banner is how #91 was reported.
      try {
        await refresh(viewing.id)
      } catch (again) {
        report(again)
      }
      return false
    } finally {
      setBusy(false)
    }
  }

  const save = async draft => {
    setBusy(true)
    try {
      const { offering } = await createOffering(draft)
      setOpening(false)
      setNotice({
        error: false,
        message: `เปิดรายวิชา ${offering.subject_id} ${offering.subject_name_th} ในปีการศึกษา ${offering.academic_year} ภาคการศึกษา ${offering.semester} เรียบร้อยแล้ว ขั้นต่อไปคือเพิ่มตอนเรียน`,
      })
      await load()
      await refresh(offering.id)
    } catch (error) {
      report(error)
    } finally {
      setBusy(false)
    }
  }

  const runCopy = async terms => {
    setNotice(null)
    setBusy(true)
    try {
      const target = program || programs[0]?.program_id
      // Guarded rather than sent as `undefined`. คัดลอก only needs two years to
      // become pressable, and the programme list arrives on its own request, so
      // a fast hand on a slow connection would send a copy with no programme in
      // it and get back `invalidOffering` for a form that looks complete.
      if (!target) {
        setNotice({ error: true, message: 'กำลังโหลดรายชื่อหลักสูตร กรุณาลองอีกครั้ง' })
        return
      }
      const answer = await copyTerm({ ...terms, program_id: target })
      setCopied(answer)
      setNotice({
        error: false,
        message:
          answer.created.length === 0
            ? 'ไม่มีรายวิชาใดถูกคัดลอก รายละเอียดอยู่ในกล่องด้านล่าง'
            : `คัดลอกเรียบร้อยแล้ว เปิดรายวิชาใหม่ ${answer.created.length} รายวิชา รวม ${answer.sections} ตอนเรียน`,
      })
      setPage(1)
      await load()
    } catch (error) {
      report(error)
    } finally {
      setBusy(false)
    }
  }

  const confirmRemoval = async () => {
    setBusy(true)
    try {
      if (removing.kind === 'section') {
        await deleteSection(viewing.id, removing.section.section_id)
        setRemoving(null)
        setNotice({ error: false, message: 'ลบตอนเรียนเรียบร้อยแล้ว' })
        await refresh(viewing.id)
      } else {
        await deleteOffering(removing.offering.id)
        setRemoving(null)
        setViewing(null)
        setNotice({ error: false, message: 'ยกเลิกการเปิดรายวิชาเรียบร้อยแล้ว' })
        // The last row of the last page having gone, staying on that page shows
        // an empty table and reads as "there are none". Stepping back is a
        // change of page and the effect fetches it; calling `load` here as well
        // would race it with a second request for the page just left.
        if (page > 1 && data.offerings.length === 1) setPage(current => current - 1)
        else await load()
      }
    } catch (error) {
      const wasSection = removing.kind === 'section'
      setRemoving(null)
      report(error)
      if (wasSection && viewing) await refresh(viewing.id).catch(report)
    } finally {
      setBusy(false)
    }
  }

  if (viewing) {
    return (
      <div className="space-y-6">
        <Notice notice={notice} />
        <SectionsPanel
          offering={viewing}
          busy={busy}
          onBack={() => {
            setNotice(null)
            setViewing(null)
            load()
          }}
          onAddSection={number =>
            onSection(async () => {
              await createSection(viewing.id, { section_number: number })
              return `เพิ่มตอนเรียน ${number} เรียบร้อยแล้ว`
            })
          }
          onRenameSection={(section, number) =>
            onSection(async () => {
              await updateSection(viewing.id, section.section_id, { section_number: number })
              return `แก้ไขเลขตอนเรียนเป็น ${number} เรียบร้อยแล้ว`
            })
          }
          onRemoveSection={section => {
            setNotice(null)
            setRemoving({ kind: 'section', section })
          }}
          onAssign={(section, userIds) =>
            onSection(async () => {
              await assignTeachers(viewing.id, section.section_id, userIds)
              return userIds.length === 0
                ? `นำผู้สอนออกจากตอนเรียน ${section.section_number} เรียบร้อยแล้ว`
                : `กำหนดผู้สอน ${userIds.length} คนให้ตอนเรียน ${section.section_number} เรียบร้อยแล้ว`
            })
          }
        />

        <ConfirmDialog
          open={Boolean(removing)}
          title="ยืนยันการลบตอนเรียน"
          message={
            removing?.section
              ? `ต้องการลบตอนเรียน ${removing.section.section_number} ใช่หรือไม่ ผู้สอนที่กำหนดไว้จะถูกนำออกไปด้วย${
                  removing.section.student_count > 0
                    ? ` ตอนเรียนนี้มีนักศึกษาลงทะเบียนอยู่ ${removing.section.student_count} คน ระบบจะไม่อนุญาตให้ลบ`
                    : ''
                }`
              : ''
          }
          confirmLabel="ลบตอนเรียน"
          busy={busy}
          onConfirm={confirmRemoval}
          onCancel={() => {
            setNotice(null)
            setRemoving(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Notice notice={notice} />

      {opening ? (
        <OfferingForm
          programs={programs}
          defaultProgram={program}
          defaultYear={year}
          defaultSemester={semester}
          busy={busy}
          onSave={save}
          onCancel={() => {
            setNotice(null)
            setOpening(false)
          }}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-medium text-primary">การเปิดรายวิชาในภาคการศึกษา</h1>
            <div className="flex flex-wrap items-center gap-3">
              {/* A picker when there is a choice to make, and a statement of
                  where one is when there is not — ข้อมูลรายวิชา's control, for
                  ข้อมูลรายวิชา's reasons. A กรรมการหลักสูตร reaches one
                  programme and is shown which. */}
              {programs.length > 1 ? (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  หลักสูตร
                  <select
                    value={program}
                    onChange={event => {
                      setPage(1)
                      setProgram(event.target.value)
                    }}
                    className="rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
                  >
                    <option value="">ทุกหลักสูตร</option>
                    {programs.map(entry => (
                      <option key={entry.program_id} value={entry.program_id}>
                        {entry.program_id} {entry.program_name_th}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                programs.length === 1 && (
                  <span className="flex items-center gap-2 text-sm text-slate-600">
                    หลักสูตร
                    <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900">
                      {programs[0].program_id} {programs[0].program_name_th}
                    </span>
                  </span>
                )
              )}

              <label className="flex items-center gap-2 text-sm text-slate-600">
                ปีการศึกษา
                <input
                  value={year}
                  onChange={event => {
                    setPage(1)
                    setYear(event.target.value)
                  }}
                  placeholder="ทุกปี"
                  inputMode="numeric"
                  maxLength={4}
                  className="w-24 rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                ภาคการศึกษา
                <select
                  value={semester}
                  onChange={event => {
                    setPage(1)
                    setSemester(event.target.value)
                  }}
                  className="rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
                >
                  <option value="">ทุกภาค</option>
                  {SEMESTERS.map(term => (
                    <option key={term.value} value={term.value}>
                      {term.value} — {term.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => {
                  setNotice(null)
                  setOpening(true)
                }}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover"
              >
                เปิดรายวิชา
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">รหัสวิชา</th>
                  <th className="px-4 py-3">ชื่อวิชา</th>
                  <th className="px-4 py-3">ปีการศึกษา</th>
                  <th className="px-4 py-3">ภาคการศึกษา</th>
                  <th className="px-4 py-3">ตอนเรียน</th>
                  <th className="px-4 py-3">หลักสูตร</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      กำลังโหลด…
                    </td>
                  </tr>
                )}
                {!loading && data.offerings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      ยังไม่มีรายวิชาที่เปิดสอนตามเงื่อนไขนี้
                    </td>
                  </tr>
                )}
                {!loading &&
                  data.offerings.map(offering => (
                    <tr key={offering.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {offering.subject_id}
                      </td>
                      <td className="px-4 py-3">
                        {offering.subject_name_th}
                        <span className="block text-xs text-slate-500">
                          {offering.subject_name_en}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{offering.academic_year}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {offering.semester} — {semesterLabel(offering.semester)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {offering.section_count} ตอน
                      </td>
                      <td className="px-4 py-3 text-slate-500">{nameOf(offering.program_id)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openSections(offering)}
                          className="rounded-lg px-3 py-1.5 text-primary hover:bg-blue-50"
                        >
                          ตอนเรียนและผู้สอน
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNotice(null)
                            setRemoving({ kind: 'offering', offering })
                          }}
                          className="rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50"
                        >
                          ยกเลิกการเปิด
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <Pager
            page={page}
            shown={data.page}
            total={data.total}
            perPage={PAGE_SIZE}
            onPage={setPage}
          />

          <CopyTermPanel busy={busy} report={copied} onCopy={runCopy} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="ยืนยันการยกเลิกการเปิดรายวิชา"
        message={
          removing?.offering
            ? `ต้องการยกเลิกการเปิดรายวิชา ${removing.offering.subject_id} ${removing.offering.subject_name_th} ปีการศึกษา ${removing.offering.academic_year} ภาคการศึกษา ${removing.offering.semester} ใช่หรือไม่ ตอนเรียนทั้งหมดและการกำหนดผู้สอนจะถูกลบไปด้วย หากมีนักศึกษาลงทะเบียนหรือมีการบันทึกคะแนนแล้ว ระบบจะไม่อนุญาตให้ลบ`
            : ''
        }
        confirmLabel="ยกเลิกการเปิดรายวิชา"
        busy={busy}
        onConfirm={confirmRemoval}
        onCancel={() => {
          setNotice(null)
          setRemoving(null)
        }}
      />
    </div>
  )
}
