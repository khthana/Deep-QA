import { useState, useEffect, useMemo } from 'react'
import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import ContentTitle from '../../../ContentTitle'
import { HiOutlineDocumentReport } from 'react-icons/hi'
import Sankey from './ThinSankey'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'

function OutcomeActivityMapping() {
  const [sessionExpired, setSessionExpired] = useState(false)
  const section_id = localStorage.getItem('section_id') || ''
  const [OutcomeData, setOutcomeData] = useState([])
  const [activities, setActivities] = useState([])
  const [scoreCategories, setScoreCategories] = useState([])

  useEffect(() => {
    if (section_id) {
      fetchOutcomeData()
      fetchActivities()
      // fetchScoreCategories()
    }
  }, [section_id])

  const fetchOutcomeData = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/cloEva/get/${section_id}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()

      const cloWithColors = data.data.map((row, i) => ({
        ...row,
        color: palette[i % palette.length],
      }))

      setOutcomeData(cloWithColors)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchActivities = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/activity/get/${section_id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()

      const categoryColor = {}

      let i = 0

      const colored = (data.result || []).map(group => {
        if (!categoryColor[group.score_category]) {
          categoryColor[group.score_category] = palette[i % palette.length]
          i++
        }

        return {
          ...group,
          color: categoryColor[group.score_category],
          activities: group.activities.map(a => ({
            ...a,
            color: categoryColor[group.score_category],
            score_category: group.score_category,
          })),
        }
      })

      setActivities(colored)
      // console.log('Fetched activities:', colored)
    } catch (err) {
      console.error('fetch activities error:', err)
    }
  }

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentSubjectTitle
        Subject="การเขียนโปรแกรมเชิงวัตถุ"
        term="1/2568"
      ></ContentSubjectTitle>
      <ContentMotionDIV className="flex h-full flex-col gap-4 rounded-xl bg-white p-6 shadow">
        <ContentTitle
          titlename="ความเชื่อมโยงผลการเรียนรู้และกิจกรรม"
          icon={HiOutlineDocumentReport}
        />

        <ContentMotionDIV className="flex gap-4">
          {[
            {
              value: OutcomeData ? OutcomeData.length : 0,
              label: 'จำนวน CLO',
              bg: 'green',
              text: '700',
            },
            {
              value:
                activities?.reduce(
                  (sum, g) => sum + (g.activities?.length ?? 0),
                  0
                ) ?? 0,
              label: 'จำนวนกิจกรรม',
              bg: 'purple',
              text: '700',
            },
            {
              value:
                OutcomeData?.reduce(
                  (sum, g) => sum + (g.indicators?.length ?? 0),
                  0
                ) ?? 0,
              label: 'ความสัมพันธ์ทั้งหมด',
              bg: 'yellow',
              text: '700',
            },
            {
              value: OutcomeData?.length
                ? (
                    OutcomeData.reduce(
                      (sum, g) => sum + (g.indicators?.length ?? 0),
                      0
                    ) / OutcomeData.length
                  ).toFixed(0)
                : 0,
              label: 'เฉลี่ยต่อ CLO',
              bg: 'orange',
              text: '700',
            },
          ].map((s, i) => (
            <ContentMotionDIV
              key={i}
              className={`bg-${s.bg}-100 flex w-full flex-col items-center rounded-lg px-4 py-6`}
            >
              <span className={`text-3xl text-${s.bg}-700`}>{s.value}</span>
              <span className={`text-lg text-${s.bg}-700`}>{s.label}</span>
            </ContentMotionDIV>
          ))}
        </ContentMotionDIV>

        <ContentMotionDIV className="flex flex-col items-center ">
          <span className=" mt-4 text-lg text-secondary">
            Sankey Chart แสดงการเชื่อมโยงผลการเรียนรู้กับกิจกรรม
          </span>
        </ContentMotionDIV>

        <Sankey OutcomeData={OutcomeData} ActivityGroups={activities} />

        <ContentMotionDIV className="rounded-lg bg-slate-50 px-2 py-4">
          <div className="flex flex-col gap-4 px-2">
            <span className=" text-xl text-secondary">คำอธิบาย</span>
            <div className="flex w-full flex-row gap-4">
              <div className="w-full overflow-x-auto rounded-lg bg-white shadow">
                <table className="w-full min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-gray-100 text-gray-700">
                      <th className="w-1/4 px-4 py-2 text-left">
                        Course Learning Outcome{' '}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {OutcomeData?.map((row, i) => (
                      <tr
                        key={i}
                        className="cursor-pointer border transition duration-150 hover:bg-gray-50"
                      >
                        <td className="flex items-start gap-2 px-4 py-2">
                          <span
                            className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full"
                            style={{
                              backgroundColor: row.color,
                            }}
                          ></span>

                          <span className="flex flex-col whitespace-normal break-words leading-relaxed">
                            <span className="font-medium">{`CLO-${row.clo_number}`}</span>
                            <span className="text-sm text-gray-500">
                              {row.clo_detail}
                            </span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="w-full overflow-x-auto rounded-lg bg-white  shadow">
                <table className="w-full min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-gray-100 text-gray-700">
                      <th className="w-1/4 px-4 py-2 text-left">
                        กิจกรรมการเรียนรู้
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities?.map(group =>
                      group.activities.map(row => (
                        <tr
                          key={row.activity_id}
                          className="cursor-pointer border transition duration-150 hover:bg-gray-50"
                        >
                          <td className="flex items-start gap-2 px-4 py-2">
                            <span
                              className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full"
                              style={{
                                backgroundColor: row.color,
                              }}
                            ></span>

                            <span className="flex flex-col whitespace-normal break-words leading-relaxed">
                              <span className="font-medium">
                                {group.score_category}: {row.activity_name}
                              </span>
                              <span className="text-sm text-gray-500">
                                {row.description}
                              </span>
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <span className="text-md text-gray-500">
              <span className="font-black">หมายเหตุ</span> :
              ความหนาของเส้นแสดงถึงน้ำหนักของความสัมพันธ์ระหว่าง CLO และ
              กิจกรรมการเรียนรู้
            </span>
          </div>
        </ContentMotionDIV>
        <ContentMotionDIV className="rounded-lg bg-slate-50 px-2 py-4">
          <div className="flex flex-col gap-4 px-2">
            <span className=" text-xl text-secondary">
              ตารางแสดงความสัมพันธ์โดยละเอียด
            </span>
            <div className="overflow-x-auto rounded-lg bg-white  shadow">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-gray-100 text-gray-700">
                    <th className="px-4 py-2 text-left">CLO</th>
                    <th className="px-4 py-2 text-left">กิจกรรม</th>
                    <th className="whitespace-nowrap px-4 py-2 text-center">
                      น้ำหนัก (%)
                    </th>
                    <th className="whitespace-nowrap px-4 py-2 text-center">
                      ประเภท
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {OutcomeData?.map(outcome =>
                    outcome.indicators?.map((indicator, i) => (
                      <tr
                        key={`${outcome.clo_number}-${i}`}
                        className="cursor-pointer border transition duration-150 hover:bg-gray-50"
                      >
                        {/* CLO */}
                        <td className="flex items-center gap-2 px-4 py-2">
                          <span
                            className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full"
                            style={{
                              backgroundColor: outcome.color,
                            }}
                          ></span>

                          <span className="flex flex-col whitespace-normal break-words leading-relaxed">
                            <span className="font-medium">{`CLO-${outcome.clo_number}`}</span>
                            <span className="text-sm text-gray-500">
                              {outcome.clo_detail}
                            </span>
                          </span>
                        </td>

                        {(() => {
                          let found = null

                          activities?.some(g => {
                            const act = g.activities.find(
                              a => a.activity_id === indicator.activity_id
                            )

                            if (act) {
                              found = {
                                ...act,
                                score_category: g.score_category,
                              }
                              return true
                            }

                            return false
                          })

                          return (
                            <td className="border px-4 py-2">
                              <div className="flex items-start gap-2">
                                <span
                                  className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: found?.color,
                                  }}
                                ></span>

                                <span className="flex flex-col whitespace-normal break-words leading-relaxed">
                                  <span className="font-medium">
                                    {found?.activity_name ?? '-'}
                                  </span>

                                  <span className="text-sm text-gray-500">
                                    {found?.description ?? ''}
                                  </span>
                                </span>
                              </div>
                            </td>
                          )
                        })()}

                        {/* น้ำหนัก */}
                        <td className="border px-4 py-2 text-center font-medium text-gray-700">
                          {indicator.weight} %
                        </td>

                        {(() => {
                          let found = null

                          activities?.some(g => {
                            const act = g.activities.find(
                              a => a.activity_id === indicator.activity_id
                            )

                            if (act) {
                              found = act
                              return true
                            }

                            return false
                          })

                          return (
                            <td className="border px-4 py-2 text-center">
                              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-gray-700">
                                <div>
                                  <span
                                    className="inline-block h-3 w-3 rounded-full"
                                    style={{
                                      backgroundColor: found?.color,
                                    }}
                                  ></span>
                                </div>
                                {found?.score_category}
                              </span>
                            </td>
                          )
                        })()}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </ContentMotionDIV>
      </ContentMotionDIV>
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
export default OutcomeActivityMapping

const palette = [
  '#ff6b6b', // แดง
  '#4dabf7', // ฟ้า
  '#51cf66', // เขียว
  '#ffd43b', // เหลือง
  '#845ef7', // ม่วง
  '#ff922b', // ส้ม
  '#20c997', // เขียวอมฟ้า
  '#f06595', // ชมพู
  '#339af0', // น้ำเงิน
  '#94d82d', // เขียวอ่อน
  '#fcc419', // เหลืองเข้ม
  '#ff8787', // ชมพูอ่อน
  '#748ffc', // ม่วงฟ้า
  '#63e6be', // มิ้นต์
  '#ffa94d', // ส้มอ่อน
  '#b197fc', // ลาเวนเดอร์
  '#69db7c', // เขียวสด
  '#e599f7', // ม่วงชมพู
  '#ffd8a8', // พีช
  '#22b8cf', // ฟ้าน้ำทะเล
]
