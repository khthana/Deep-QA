import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowLeft,
  HiOutlinePencil,
  HiOutlineTrash,
} from 'react-icons/hi2'

import ConfirmDialog from '../components/ConfirmDialog'
import ContentMotionDIV from '../components/ContentMotionDIV'
import EvidenceForm from '../components/evidence/EvidenceForm'
import Notice from '../components/Notice'
import {
  deleteEvidence,
  getEvidence,
  getEvidenceFile,
  replaceEvidence,
  showPdf,
  uploadEvidence,
} from '../api/evidence'

/**
 * หลักฐานการประเมิน — ticket #35.
 *
 * The files that make one Activity's assessment defensible at accreditation:
 * the brief, and a work sample at each of the four achievement bands. Reached
 * from the Activity's card on #32's screen, and inheriting that screen's grain
 * whole — the work is this ตอนเรียน's, so its evidence is too.
 *
 * ## Opening a file is a request, not a link
 *
 * Every file here is fetched with the session cookie and shown from the bytes
 * that come back. That is not a detail of styling: the delivered system served
 * the whole evidence directory as static files with no authentication, so a
 * link was all anybody needed. A link here would be a link there, and the
 * guard would have nothing to guard.
 *
 * ## What the screen refuses and what it does not
 *
 * The file input asks for PDFs and the sentence beneath it says PDF only, but
 * neither is the check — the server reads the file's first five bytes, because
 * the extension and the Content-Type are both written by whoever is uploading.
 * A refusal arrives here in the server's own words and is shown as sent.
 */
export default function ActivityEvidence() {
  const { sectionId, activityId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getEvidence(sectionId, activityId))
    } catch (error) {
      setData(null)
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setLoading(false)
    }
  }, [sectionId, activityId])

  useEffect(() => {
    load()
  }, [load])

  const save = async draft => {
    setBusy(true)
    setNotice(null)
    try {
      if (editing === 'new') await uploadEvidence(sectionId, activityId, draft)
      else await replaceEvidence(sectionId, editing.evidence_id, draft)
      setEditing(null)
      await load()
      setNotice({ error: false, message: 'บันทึกหลักฐานการประเมินแล้ว' })
    } catch (error) {
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setNotice(null)
    try {
      await deleteEvidence(sectionId, removing.evidence_id)
      setRemoving(null)
      await load()
      setNotice({ error: false, message: 'ลบหลักฐานการประเมินแล้ว' })
    } catch (error) {
      // The dialog closes either way, for MeasurableBehaviors' reason: a dialog
      // over a banner hides it, and the same button pressed again cannot do
      // anything different.
      setRemoving(null)
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setBusy(false)
    }
  }

  const open = async file => {
    setNotice(null)
    try {
      showPdf(await getEvidenceFile(file.evidence_id), file.file_name)
    } catch (error) {
      if (!error.expired) setNotice({ error: true, message: error.message })
    }
  }

  const nameOfType = code =>
    data?.evidence_types.find(entry => entry.evidence_type === code)?.label_th ?? code

  return (
    <ContentMotionDIV className="space-y-4 px-6 py-6">
      <Notice notice={notice} />

      {loading && <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>}

      {!loading && data && (
        <>
          <div>
            <Link
              to={`/teacher/teacherDashboard/${sectionId}/learningActivities`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <HiOutlineArrowLeft className="h-4 w-4" />
              กิจกรรมการเรียนรู้ในรายวิชา
            </Link>
            <p className="mt-3 text-xs font-medium text-slate-400">{data.section.subject_id}</p>
            <h1 className="mt-1 text-xl font-semibold text-primary">
              หลักฐานการประเมินของ {data.activity.activity_name}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              โจทย์ที่ใช้ และตัวอย่างผลงานของนักศึกษาในแต่ละระดับ เก็บไว้เป็นหลักฐานว่ากิจกรรมนี้ถูกประเมินอย่างไร
              ไฟล์เหล่านี้เปิดได้เฉพาะผู้ที่มีสิทธิ์เท่านั้น
            </p>
          </div>

          {editing ? (
            <EvidenceForm
              evidence={editing === 'new' ? null : editing}
              types={data.evidence_types}
              maxBytes={data.max_bytes}
              busy={busy}
              onSubmit={save}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover"
            >
              แนบหลักฐาน
            </button>
          )}

          {data.evidence.length === 0 && (
            <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-slate-500">
              ยังไม่มีหลักฐานแนบกับกิจกรรมนี้
            </p>
          )}

          <ul className="space-y-3">
            {data.evidence.map(file => (
              <li
                key={file.evidence_id}
                aria-label={`หลักฐาน ${file.file_name}`}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-medium text-gray-900">{nameOfType(file.evidence_type)}</h2>
                    {/* The name a reader hears is *เปิดหลักฐาน <ชื่อไฟล์>* and
                        not the filename alone. The hand-walk is what settled
                        that: on screen the arrow icon says *press this to open
                        it*, and to anybody not looking at the icon the button
                        was called `walk-brief.pdf` — which names the file and
                        not the act, where its two neighbours name both. */}
                    <button
                      type="button"
                      onClick={() => open(file)}
                      aria-label={`เปิดหลักฐาน ${file.file_name}`}
                      className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <HiOutlineArrowDownTray className="h-4 w-4" />
                      {file.file_name}
                    </button>
                    {file.description && (
                      <p className="mt-1 text-sm text-slate-600">{file.description}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">{sizeOf(file.file_size)}</p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(file)}
                      aria-label={`แก้ไขหลักฐาน ${file.file_name}`}
                      className="rounded-lg p-2 text-primary hover:bg-blue-50"
                    >
                      <HiOutlinePencil className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoving(file)}
                      aria-label={`ลบหลักฐาน ${file.file_name}`}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    >
                      <HiOutlineTrash className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="ลบหลักฐานการประเมิน"
        message={
          removing
            ? `ต้องการลบ ${removing.file_name} ออกจากกิจกรรมนี้หรือไม่ ไฟล์จะไม่ปรากฏและเปิดไม่ได้อีก`
            : ''
        }
        confirmLabel="ลบ"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </ContentMotionDIV>
  )
}

/** A size a person reads, from the bytes the row carries. */
function sizeOf(bytes) {
  if (typeof bytes !== 'number') return ''
  const megabytes = bytes / (1024 * 1024)
  return megabytes >= 1
    ? `${megabytes.toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}
