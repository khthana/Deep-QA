import api, { del, get } from './client'

/**
 * หลักฐานการประเมิน — #35.
 *
 * The shelf belongs to an Activity of a Section; the file belongs to the
 * evidence row and is reached by its id alone, because the two callers who
 * open one arrive from different places. A Teacher comes from their own
 * Section's screen; a committee member comes from #42's drill-down, where they
 * are looking at a figure and not at a ตอนเรียน they teach.
 *
 * ## Why the upload is FormData and the imports are not
 *
 * Every other upload in this application posts its file as `text/csv` and the
 * client note in `client.js` says why: a file input can read its file and send
 * the characters, and nothing is written to disk. A PDF is not characters, and
 * it arrives with two fields beside it — what kind of evidence it is, and a
 * description that may name a student. Putting those in the query string would
 * write them into every access log the request passes through. So this one is
 * multipart, which is what a form with a file and two fields is.
 *
 * ## Why the file is fetched and not linked to
 *
 * `saveAsFile`'s reason, one floor down: the endpoint reads the session cookie,
 * and the answer is either a PDF or this application's own refusal. A plain
 * `<a href>` to the API origin would show the second one as a browser error
 * page — and #35's whole point is that the endpoint asks who is calling.
 */

/** The Activity's files, the five kinds one can be filed under, and the limit. */
export const getEvidence = (sectionId, activityId) =>
  get(`/api/teaching/sections/${sectionId}/activities/${activityId}/evidence`)

/** One upload: the bytes, what kind of evidence it is, and what it says. */
export const uploadEvidence = (sectionId, activityId, { file, evidence_type, description }) =>
  api(`/api/teaching/sections/${sectionId}/activities/${activityId}/evidence`, {
    method: 'POST',
    body: formOf({ file, evidence_type, description }),
  })

/** Replace the file, or correct what it says about itself, or both. */
export const replaceEvidence = (sectionId, evidenceId, { file, evidence_type, description }) =>
  api(`/api/teaching/sections/${sectionId}/evidence/${evidenceId}`, {
    method: 'PUT',
    body: formOf({ file, evidence_type, description }),
  })

export const deleteEvidence = (sectionId, evidenceId) =>
  del(`/api/teaching/sections/${sectionId}/evidence/${evidenceId}`)

/** The PDF itself, as bytes this tab can show. */
export const getEvidenceFile = evidenceId =>
  api(`/api/evidence/${evidenceId}/file`, { accept: 'blob' })

/**
 * Opens a fetched PDF in a tab of its own.
 *
 * The object URL is revoked on a timer rather than immediately: revoking it
 * before the new tab has read it leaves the reader looking at a blank page,
 * and there is no event here that says it has. A minute is long past the read
 * and short of the tab's lifetime mattering.
 */
export function showPdf(blob, fileName) {
  const url = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: 'application/pdf' }))
  const opened = window.open(url, '_blank', 'noopener')
  if (!opened) {
    // A blocked popup would otherwise be a press that did nothing. Falling back
    // to a download keeps the file reachable, under the name it was given.
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * The multipart body, with the file left out when there is not one.
 *
 * A PUT with no file is a metadata correction, and sending an empty `file`
 * part would make it look like an upload of nothing — which the server would
 * then have to tell apart from a real one.
 */
function formOf({ file, evidence_type, description }) {
  const form = new FormData()
  if (file) form.append('file', file, file.name)
  if (evidence_type) form.append('evidence_type', evidence_type)
  form.append('description', description ?? '')
  return form
}
