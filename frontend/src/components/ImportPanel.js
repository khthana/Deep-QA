import { useRef, useState } from 'react'

import ContentMotionDIV from './ContentMotionDIV'
import { saveAsFile } from '../api/client'

/**
 * Importing a spreadsheet — the pattern every import screen in this system
 * follows: download the template, upload the completed file, read a per-row
 * report.
 *
 * Written for accounts in #11 and made shared in #14, alongside the server's
 * `lib/importer` and for the same reason: ten screens need this and none of
 * them needs its own version of it. What differs between them is four strings
 * and two calls - the heading, the subtitle, the file's name, and the two API
 * functions that fetch the template and post the file - so those are props and
 * everything else is here.
 *
 * The report is the part worth getting right. A failed import writes nothing,
 * so what the person needs is not "it did not work" but the line number and the
 * reason for every row that was wrong, all of them at once - otherwise fixing a
 * file with three mistakes in it is three uploads.
 *
 * The file is read in the browser and posted as its own text. There is no
 * multipart upload and nothing is written to the server's disk, so a request
 * that failed leaves nothing behind to clean up.
 */
export default function ImportPanel({
  title,
  subtitle,
  templateName,
  fetchTemplate,
  send,
  onImported,
  onError,
}) {
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState(null)
  const [filename, setFilename] = useState('')
  const input = useRef(null)

  const download = async () => {
    try {
      saveAsFile(await fetchTemplate(), templateName)
    } catch (error) {
      onError?.(error)
    }
  }

  const upload = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    setFilename(file.name)
    setReport(null)
    setBusy(true)
    try {
      const result = await send(await file.text())
      setReport({ ok: true, created: result.created })
      onImported?.()
    } catch (error) {
      // `details` is the per-row report, which rides on the refusal because a
      // rejected import is one: nothing was written. A refusal without rows -
      // an expired session, a role that may not import, a file with nothing in
      // it - is left to the shell and to the caller.
      //
      // Asked for a row rather than for the key: the server sends `errors: []`
      // with the refusal for an empty file, and an empty array is truthy, so
      // asking `error.details` drew the heading "no rows were saved, correct
      // the rows below" over a table with no rows in it and threw away the one
      // sentence that said what was wrong (#14 row 7, and every other screen
      // with this panel on it).
      if (error.details?.length) setReport({ ok: false, errors: error.details })
      else onError?.(error)
    } finally {
      setBusy(false)
      // So the same file can be chosen again after it has been corrected;
      // without this the input holds the old selection and fires no change.
      if (input.current) input.current.value = ''
    }
  }

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-medium text-primary">{title}</h2>
      <p className="mb-4 text-sm text-slate-500">{subtitle}</p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={download}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          ดาวน์โหลดแบบฟอร์ม
        </button>
        <label className="cursor-pointer rounded-lg bg-secondary px-5 py-2.5 text-sm font-medium text-white hover:bg-secondary_hover">
          {busy ? 'กำลังนำเข้า…' : 'เลือกไฟล์ที่กรอกแล้ว'}
          <input
            ref={input}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={upload}
            disabled={busy}
          />
        </label>
        {filename && <span className="text-sm text-slate-500">{filename}</span>}
      </div>

      {report?.ok && (
        <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          นำเข้าสำเร็จ {report.created} รายการ
        </p>
      )}

      {report && !report.ok && (
        <div className="mt-4 rounded-lg bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">
            ไม่ได้บันทึกรายการใด กรุณาแก้ไขแถวต่อไปนี้แล้วอัปโหลดใหม่
          </p>
          <table className="mt-2 w-full text-left text-sm text-red-800">
            <thead>
              <tr>
                <th className="w-24 py-1">บรรทัดที่</th>
                <th className="py-1">สาเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {report.errors.map(error => (
                <tr key={`${error.line}-${error.message}`}>
                  <td className="py-1 align-top">{error.line}</td>
                  <td className="py-1">{error.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ContentMotionDIV>
  )
}
