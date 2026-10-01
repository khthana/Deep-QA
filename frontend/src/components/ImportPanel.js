import { useEffect, useRef, useState } from 'react'

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
 * `notes` is the fifth prop and the only optional one - a list of sentences
 * rather than a string, which is why the guard below asks `Array.isArray`
 * before it asks for a length: `'x'.length > 0` is true and `.map` is not
 * there, so a caller passing one sentence would take the panel down with it.
 * #124. A template that
 * carries no example row has to say somewhere how its columns are filled, and
 * the screen is the place: the file teaches nothing until it has been
 * downloaded, and by then the person is in a spreadsheet and not here. It is
 * left undefined by the nine other callers - eight of which still ship an
 * example, `Students.js` having stopped at #67 - so nothing is drawn for them
 * and no import screen but this one changes shape.
 *
 * Drawn as a block rather than as a line of small print under the subtitle,
 * because for the screen that passes it these sentences are the *only* place
 * the formats are stated. A rule set as though it were a footnote is #41's grey
 * citation and #45's `ยังไม่มีคะแนน` again, and this store has met that one
 * three times.
 *
 * The report is the part worth getting right. A failed import writes nothing,
 * so what the person needs is not "it did not work" but the line number and the
 * reason for every row that was wrong, all of them at once - otherwise fixing a
 * file with three mistakes in it is three uploads.
 *
 * The file is read in the browser and posted as its own text. There is no
 * multipart upload and nothing is written to the server's disk, so a request
 * that failed leaves nothing behind to clean up.
 *
 * ## `target` says what the report is about, and every caller passes one - #179
 *
 * The report is about the thing the file was sent for, and for nine of the ten
 * callers nothing on the screen re-aims it: six pass a constant naming the
 * register they import into, and three the `sectionId` from `useParams`, which
 * no control on those screens changes -
 * every link on them goes up a level and takes the panel with it. That last part
 * is a measurement with the same expiry as #133's reading of `loadList`, not a
 * property of the router: a route that let a person step sideways between
 * sections would keep these panels mounted through the change, and the prop
 * below is what makes that harmless on the day it lands. The tenth is
 * `pages/ActivityScores.js`, whose target is the กิจกรรม a `<select>` beside this
 * panel chooses, and that screen's `load` leaves `data` standing while it moves -
 * so the panel is still here, with the previous กิจกรรม's report in it.
 *
 * So the panel is told what it is aimed at, and the prop has no default: a
 * default of *nothing has changed* is the mistake #133 is about, written one
 * level further out, and nothing in a shared component can see which of its
 * callers has a picker. What a caller whose target cannot change passes is the
 * name of the register it imports into, which is the truth about it.
 *
 * **Nothing enforces it, and that is a gap and not a decision.** An eleventh
 * caller that forgets `target` gets `undefined` on both sides of every
 * comparison here, which is the silent old behaviour - *yes, still current* -
 * and no instrument says so: `frontend/` has no component test harness (no file
 * under `src` is named `*.test.js`) and `prop-types` is not a dependency, so
 * a throw on a missing prop could not be proved by anything, and the census in
 * `frontend/scripts/` reads a screen's own `await`s and never a component's
 * props. Measured 1 ตุลาคม 2569, written here so the next caller is read rather
 * than trusted.
 *
 * Three things follow from the prop, and they answer different ways in -
 * `mutation/179-the-report-of-another-activity.py` has a mutant for each:
 *
 * - **What is remembered is forgotten when the target changes**, below, before
 *   anything is drawn from it. This one needs no race: a report that has already
 *   landed outlives the move until a reload otherwise.
 * - **An answer is drawn only if it is still the answer to what the screen is
 *   asking**, in `upload`, which is the race the ticket was written for.
 * - **And the sentence the shell speaks is not an answer**, so it stays outside
 *   the guard: a refusal with no rows in it is about the person, not about the
 *   target, and the person hears it wherever the picker has since moved to.
 */
export default function ImportPanel({
  title,
  subtitle,
  notes,
  templateName,
  target,
  fetchTemplate,
  send,
  onStart,
  onImported,
  onError,
}) {
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState(null)
  const [filename, setFilename] = useState('')
  const [aimedAt, setAimedAt] = useState(target)
  const input = useRef(null)

  // What the panel is aimed at *now*, for the answer that comes back later to
  // compare itself against. A ref and not the state above, because `upload`
  // reads it from the render the file was chosen in, where the state still
  // holds the target of that moment - which is exactly what has to be compared
  // against rather than trusted.
  const latest = useRef(target)
  useEffect(() => {
    latest.current = target
  }, [target])

  // Forgetting, during the render that first sees the new target rather than in
  // an effect after it: an effect keyed on the change runs once the fields have
  // already been drawn from the old values, which is #167's frame, and here
  // those values are a green line saying that somebody else's file was
  // imported. React's own shape for this - the state that says which target the
  // rest was read for, set beside what is being thrown away.
  if (target !== aimedAt) {
    setAimedAt(target)
    setReport(null)
    setFilename('')
  }

  const download = async () => {
    try {
      saveAsFile(await fetchTemplate(), templateName)
    } catch (error) {
      onError?.(error)
    }
  }

  /**
   * The file input is the only way in and it is `disabled={busy}`, so no second
   * import can be begun while this answer is out. What can happen while it is
   * out is the screen being re-aimed - #179, and `target` above is how this
   * knows. The answer is a read like any other: it is drawn only if it is still
   * the answer to what the screen is asking (#133, #140), and here *what was
   * asked* is the target as it stood when the file was chosen.
   */
  const upload = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    const asked = target
    setFilename(file.name)
    setReport(null)
    // The screen's own banner, not this panel's report - #91. Choosing a file
    // is a new action, and the panel is the one place that begins one without
    // touching `editing` or `removing`, so it was the site the first pass at
    // #91 walked straight past: a refusal from the upload before, or a
    // "saved" from something else entirely, sat above the panel's own green
    // line and read as though it belonged to the import that just succeeded.
    onStart?.()
    setBusy(true)
    try {
      const result = await send(await file.text())
      if (latest.current !== asked) return
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
      //
      // Asked on this side rather than once above the `try`, because the answer
      // is bound inside it and binding it outside would hide this site from the
      // census that found #179 (`frontend/scripts`). It is one question read
      // twice rather than two opinions (#97): `asked` and `latest` are written
      // in one place each.
      //
      // And asked around the drawing only. The per-row report is drawn in this
      // panel, about the target the file was sent to, so a superseded one is
      // thrown away - but the refusal the shell speaks is about what the person
      // did, and `34-activity-marks.md` settled that side for the save's banner
      // already: it speaks every time and names what was asked for, because it
      // reports the action and not the screen. An escalation that must always
      // happen does not go behind a question that can refuse it (#131), and the
      // one that reaches here is an expired session or a role that may not
      // import - the kinds the person has to be told about wherever they have
      // since moved the picker to.
      if (error.details?.length) {
        if (latest.current !== asked) return
        setReport({ ok: false, errors: error.details })
      } else onError?.(error)
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

      {Array.isArray(notes) && notes.length > 0 && (
        <div className="mb-4 rounded-lg bg-slate-50 p-4">
          <h3 className="mb-2 text-sm font-medium text-slate-800">รูปแบบข้อมูลในไฟล์</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {notes.map(note => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}

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

      {/*
        Announced as well as drawn - #111. The role is on the block rather
        than on the sentence inside it, so the table of offending lines is
        part of what gets read out: *nothing was saved* on its own tells
        somebody that they have to go and find out why.
      */}
      {report && !report.ok && (
        <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3">
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
