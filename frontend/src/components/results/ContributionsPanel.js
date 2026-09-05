/**
 * ที่มาของตัวเลข — the panel that lets a figure be checked rather than believed.
 *
 * #42 opens it on an outcome of one intake and #45 opens it on the same outcome
 * for one student of that intake, and between the two the *list* is identical:
 * the Subjects whose CLOs name the outcome, the Activities under them that were
 * actually marked, and the evidence attached to each. What differs is only what
 * the panel is about, so that is all a caller passes — the heading and the
 * sentence for when there is nothing behind the figure.
 *
 * Extracted at the second caller, which is this repository's rule for
 * extractions and, here, is more than housekeeping. The two panels are read as
 * evidence for two different claims (*this cohort was marked on…* and *this
 * student was marked on…*) and a reader who saw them drift would have no way to
 * tell which of the two had drifted.
 *
 * The evidence is *listed* here and opened by the caller. #35 owns the
 * authenticated retrieval — the delivered system served that directory with no
 * authentication at all, which is one of the two defects that ticket exists to
 * fix — and a fetch built into this component would put the road to it in a
 * place neither screen names.
 */
export default function ContributionsPanel({ drill, heading, nothing, onOpenEvidence }) {
  if (!drill) return <p className="text-sm text-slate-500">กำลังโหลดที่มาของตัวเลข…</p>

  return (
    <>
      <h3 className="text-sm font-medium text-primary">{heading}</h3>

      {drill.subjects.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{nothing}</p>
      ) : (
        <div className="mt-3 space-y-4">
          {drill.subjects.map(subject => (
            <div key={subject.subject_id} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-700">
                {subject.subject_id} {subject.subject_name_th}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                ผลการเรียนรู้รายวิชาที่เชื่อมโยง{' '}
                {subject.clos.map(clo => clo.clo_number).join(' · ')}
              </p>

              <ul className="mt-3 space-y-2">
                {subject.activities.map(activity => (
                  <li key={activity.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-sm text-slate-700">{activity.activity_name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      ตอนเรียน {activity.section_id} · คะแนนเต็ม {activity.score_number} ·{' '}
                      {activity.clos.map(clo => clo.clo_number).join(' · ')}
                    </p>
                    {activity.evidence.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {activity.evidence.map(file => (
                          <li key={file.evidence_id} className="text-xs text-slate-500">
                            {/* #35 landed, so this is a request and no longer a
                                name on a page. The file is fetched with the
                                session and shown from the bytes that come back
                                — a link straight at the API would be the static
                                mount that ticket removed. */}
                            <button
                              type="button"
                              onClick={() => onOpenEvidence(file)}
                              aria-label={`เปิดหลักฐาน ${file.file_name}`}
                              className="text-primary hover:underline"
                            >
                              หลักฐาน {file.file_name}
                            </button>
                            {file.description ? ` — ${file.description}` : ''}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">ยังไม่มีหลักฐานแนบกับกิจกรรมนี้</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {/* The sentence that used to stand here said the files could not be
              opened yet and named the ticket that would change it. #35 is that
              ticket, and it is done — so the note is gone and each file is a
              control. #42's own sheet was ◐ for this half. */}
        </div>
      )}
    </>
  )
}
