import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import ContentMotionDIV from '../components/ContentMotionDIV'
import Notice from '../components/Notice'
import OutcomeActivityFlow, {
  colourOf,
} from '../components/results/OutcomeActivityFlow'
import { marks, score } from '../lib/bands'
import { getOutcomeActivityMap } from '../api/outcomeActivityMap'

/**
 * ความเชื่อมโยงผลการเรียนรู้และกิจกรรม — #39.
 *
 * What #33 writes one row at a time, seen whole. A ผู้สอน attributes each piece
 * of work to the outcomes it assesses and never sees the result of all those
 * decisions together: which outcome is carrying half the marking load, and
 * which one has a single quiz behind it and a paragraph in the ตัวเอกสาร
 * saying it is taught.
 *
 * ## Three readings of one table, and each is here for a different reader
 *
 * The **diagram** is for the shape: it answers *which of these is thin* in a
 * glance and answers nothing precisely. The **outcome table** is for the
 * outcome as a unit — its mean, how many pieces of work reach it, how many
 * marks they carry. The **detail table** is the attribution table itself, one
 * row per link, which is the only one of the three a person can check a number
 * against.
 *
 * A diagram alone would be a picture nobody could verify; a table alone is
 * what the screen is replacing.
 *
 * ## The two silences are written out
 *
 * An outcome nothing assesses and a piece of work attributed to nothing are
 * both drawn as nodes with no band, and both are also *named* underneath in a
 * sentence. #38 does the same with the outcomes needing attention and for the
 * same reason: what a person is meant to act on should not have to be spotted
 * in a drawing.
 */

/** One count, as a card. The three of them are the ticket's second criterion. */
const card = (label, value, note) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-medium text-slate-400">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-primary">{value}</p>
    {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
  </div>
)

export default function OutcomeActivityMapping() {
  const { sectionId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getOutcomeActivityMap(sectionId))
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

  const unassessed = data ? data.clos.filter(clo => clo.link_count === 0) : []
  const unattributed = data
    ? data.activities.filter(activity => activity.link_count === 0)
    : []

  // The detail table reads down the outcomes, because that is the column the
  // rest of the screen is organised by. The answer's own order is by Activity,
  // which is the order the rows were written in and the one the diagram stacks
  // its bands in.
  const byOutcome = data
    ? data.clos.flatMap(clo =>
        data.links
          .filter(link => link.clo_id === clo.clo_id)
          .map(link => ({
            link,
            clo,
            activity: data.activities.find(
              one => one.activity_id === link.activity_id
            ),
          }))
      )
    : []

  return (
    <ContentMotionDIV className="space-y-4 px-6 py-6">
      <Notice notice={notice} />

      {loading && !data && (
        <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>
      )}

      {data && (
        <>
          <div>
            <p className="text-xs font-medium text-slate-400">
              {data.section.subject_id} {data.section.subject_name_en}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-primary">
              ความเชื่อมโยงผลการเรียนรู้และกิจกรรม
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              ตอนเรียน {data.section.section_number} · ปีการศึกษา{' '}
              {data.section.academic_year}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {card(
              'ผลการเรียนรู้',
              `${data.counts.clos} ข้อ`,
              'ของรายวิชานี้ในปีการศึกษานี้'
            )}
            {card(
              'กิจกรรมการเรียนรู้',
              `${data.counts.activities} กิจกรรม`,
              'ของตอนเรียนนี้'
            )}
            {card(
              'ความเชื่อมโยง',
              `${data.counts.links} เส้น`,
              'หนึ่งเส้นคือกิจกรรมหนึ่งวัดผลการเรียนรู้หนึ่งข้อ'
            )}
          </div>

          {data.empty ? (
            // Not a diagram of nine outcomes and nothing else: an empty
            // half-drawing invites a person to look for meaning in the fact
            // that no work has been set yet.
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-600">
                ยังไม่มีกิจกรรมการเรียนรู้ในตอนเรียนนี้
              </p>
              <p className="mt-2 text-sm text-slate-500">
                เมื่อสร้างกิจกรรมและผูกกับผลการเรียนรู้แล้ว
                ความเชื่อมโยงจะแสดงที่นี่
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-lg font-medium text-primary">
                    ผลการเรียนรู้ทางซ้าย · กิจกรรมทางขวา
                  </h2>
                  <p className="text-xs text-slate-400">
                    ความหนาของเส้นคือคะแนนที่กิจกรรมนั้นให้กับผลการเรียนรู้ข้อนั้น
                    ไม่ใช่ร้อยละ
                  </p>
                </div>

                {/* The diagram keeps its own width and scrolls inside this
                    frame, so a narrow window never pushes the page sideways —
                    #98's rule, the same one #38's heatmap follows. */}
                <div className="overflow-x-auto">
                  <div className="min-w-[52rem]">
                    <OutcomeActivityFlow
                      clos={data.clos}
                      activities={data.activities}
                      links={data.links}
                      title="แผนผังความเชื่อมโยงระหว่างผลการเรียนรู้กับกิจกรรมการเรียนรู้"
                    />
                  </div>
                </div>

                {(unassessed.length > 0 || unattributed.length > 0) && (
                  <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                    {unassessed.length > 0 && (
                      <p
                        role="status"
                        className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
                      >
                        <span className="font-semibold">
                          {unassessed.map(clo => clo.clo_number).join(' · ')}
                        </span>{' '}
                        ยังไม่มีกิจกรรมใดวัด จึงยังไม่มีคะแนนของข้อนี้
                      </p>
                    )}
                    {unattributed.length > 0 && (
                      <p
                        role="status"
                        className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700"
                      >
                        <span className="font-semibold">
                          {unattributed
                            .map(one => one.activity_name)
                            .join(' · ')}
                        </span>{' '}
                        ยังไม่ได้ผูกกับผลการเรียนรู้ข้อใด
                        คะแนนของกิจกรรมนี้จึงยังไม่ถูกนับที่ใด
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-medium text-primary">
                  ผลการเรียนรู้แต่ละข้อ
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] text-left text-sm">
                    <thead className="border-b border-gray-200 text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">ผลการเรียนรู้</th>
                        <th className="px-4 py-3 text-center font-medium">
                          คะแนนเฉลี่ย (เต็ม 5)
                        </th>
                        <th className="px-4 py-3 text-center font-medium">
                          กิจกรรมที่วัด
                        </th>
                        <th className="px-4 py-3 text-center font-medium">
                          คะแนนที่ผูกไว้
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.clos.map((clo, index) => (
                        <tr
                          key={clo.clo_id}
                          className="border-b border-gray-100 align-top"
                        >
                          <td className="px-4 py-3">
                            <span className="flex gap-2">
                              <span
                                className="mt-1.5 inline-block h-3 w-3 shrink-0 rounded-sm"
                                style={{ backgroundColor: colourOf(index) }}
                              />
                              <span>
                                <span className="font-medium text-slate-700">
                                  {clo.clo_number}
                                </span>
                                <span className="block text-xs text-slate-500">
                                  {clo.clo_detail}
                                </span>
                              </span>
                            </span>
                          </td>
                          <td
                            aria-label={`เฉลี่ย ${clo.clo_number} ${score(clo.mean)}`}
                            className="px-4 py-3 text-center text-slate-600"
                          >
                            <span className="block font-semibold">
                              {score(clo.mean)}
                            </span>
                            <span className="block text-xs text-slate-400">
                              จาก {clo.student_count} คนที่มีคะแนน
                            </span>
                          </td>
                          <td
                            aria-label={`จำนวนกิจกรรม ${clo.clo_number} ${clo.link_count}`}
                            className="px-4 py-3 text-center text-slate-600"
                          >
                            {clo.link_count}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">
                            {marks(clo.marks)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-1 text-lg font-medium text-primary">
                  ความเชื่อมโยงโดยละเอียด
                </h2>
                <p className="mb-4 text-sm text-slate-500">
                  หนึ่งแถวคือหนึ่งเส้นในแผนผัง ·
                  ร้อยละคือสัดส่วนของคะแนนกิจกรรมนั้น
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] text-left text-sm">
                    <thead className="border-b border-gray-200 text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">ผลการเรียนรู้</th>
                        <th className="px-4 py-3 font-medium">กิจกรรม</th>
                        <th className="px-4 py-3 font-medium">หมวดคะแนน</th>
                        <th className="px-4 py-3 text-center font-medium">
                          น้ำหนัก
                        </th>
                        <th className="px-4 py-3 text-center font-medium">
                          คะแนน
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {byOutcome.map(({ link, clo, activity }) => (
                        <tr
                          key={`${link.activity_id}:${link.clo_id}`}
                          aria-label={`เชื่อมโยง ${clo.clo_number} ${activity.activity_name} ${link.weight}% ${marks(link.marks)}`}
                          className="border-b border-gray-100"
                        >
                          <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-600">
                            {clo.clo_number}
                          </td>
                          <td className="px-4 py-2 text-slate-600">
                            {activity.activity_name}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                            {activity.score_category ?? '—'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-center text-slate-600">
                            {link.weight}%
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-center text-slate-600">
                            {marks(link.marks)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </ContentMotionDIV>
  )
}
