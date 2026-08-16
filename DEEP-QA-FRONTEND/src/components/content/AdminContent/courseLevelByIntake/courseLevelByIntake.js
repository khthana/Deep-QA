import { useState, useEffect } from 'react'
import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentTitle from '../../../ContentTitle'
import { GrPlan } from 'react-icons/gr'
import SelecteProgForProgManager from '../../../SelecteProgForProgManager'
import { IoDocumentTextOutline } from 'react-icons/io5'
import { Radar } from 'react-chartjs-2'
import { AnimatePresence } from 'framer-motion'
import { isSessionExpired } from '../../../../utils/session'
import { useAuth } from '../../../../context/AuthContext'
import { getCurrentTermAndYear } from '../../../TermAndYearUtils'
import SessionExpiredDialog from '../../../SessionExpiredDialog'
import { useNavigate, useLocation } from 'react-router-dom'
import AssessmentCriteria from './AssessmentCriteria'

function CourseLevelByIntake() {
  const [selectedProgram, setSelectedProgram] = useState(null)
  const { term, year } = getCurrentTermAndYear()
  const [selectedYear, setSelectedYear] = useState(year)
  const [evaData, setEvaData] = useState([])
  const [ChartDialogOpen, setChartDialogOpen] = useState(false)
  const scopeName = localStorage.getItem('scopeName')
  const scopeID = localStorage.getItem('scopeID')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const [sessionExpired, setSessionExpired] = useState(false)

  const fetchScoreEva = async () => {
    const start = Date.now()

    try {
      setLoading(true)

      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/ploScore/${scopeID}/year/${selectedYear}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        },
      )

      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) throw new Error('API Error')

      const data = await res.json()
      const sortedData = data.data.sort((a, b) => {
        return a.plo_code.localeCompare(b.plo_code, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      })
      // console.log(data.data)
      setEvaData(sortedData)
    } catch (err) {
      console.error('Error :', err)
    } finally {
      const elapsed = Date.now() - start
      const delay = Math.max(1000 - elapsed, 0)

      setTimeout(() => {
        setLoading(false)
      }, delay)
    }
  }

  useEffect(() => {
    if (!selectedProgram?.program_id && scopeID) return
    fetchScoreEva()
  }, [selectedProgram, selectedYear])

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-6 shadow">
        <ContentTitle
          titlename="ผลการเรียนรู้ระดับหลักสูตร ของรุ่นปีรับเข้า"
          icon={IoDocumentTextOutline}
        />
        <SelecteProgForProgManager
          startYear={true}
          showChart={true}
          selectedProgram={selectedProgram}
          setSelectedProgram={setSelectedProgram}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          setChartDialogOpen={setChartDialogOpen}
          ChartDialogOpen={ChartDialogOpen}
        />

        <div className="overflow-x-auto rounded-lg">
          <AnimatePresence mode="wait">
            {loading && (
              <ContentMotionDIV
                key="loading"
                className="flex h-40 flex-col items-center justify-center gap-2"
              >
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary" />
                <span className="text-sm text-gray-400">กำลังโหลดข้อมูล</span>
              </ContentMotionDIV>
            )}

            {!loading && evaData.length === 0 && (
              <ContentMotionDIV
                key="empty"
                className="flex h-40 items-center justify-center text-sm text-gray-400"
              >
                ไม่พบข้อมูล
              </ContentMotionDIV>
            )}

            {!loading && evaData.length > 0 && (
              <ContentMotionDIV key="table">
                <table className="min-w-full border border-gray-200 text-gray-700">
                  <thead className="bg-gradient-to-r from-slate-100 to-slate-100 text-gray-800">
                    <tr>
                      <th className="border px-2 py-2 text-left">
                        ผลการเรียนรู้
                      </th>
                      <th className="border px-2 py-2 text-center">รายวิชา</th>
                      <th className="border px-2 py-2 text-center">CLO</th>
                      <th className="border px-2 py-2 text-center">
                        ระดับคะแนน
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {evaData.map((plo, i) => {
                      // 👉 ไม่มีวิชา
                      if (!plo.subjects || plo.subjects.length === 0) {
                        return (
                          <tr key={`plo-only-${i}`} className="border">
                            <td className="border px-2 py-3 align-top">
                              <b>{plo.plo_code}</b> : {plo.plo_name}
                              <div className="mt-2 rounded-lg bg-green-50 p-2 text-sm text-green-800">
                                คะแนน : 0.00
                              </div>
                            </td>

                            <td className="border text-center text-gray-300">
                              -
                            </td>
                            <td className="border text-center text-gray-300">
                              -
                            </td>
                            <td className="border text-center text-gray-300">
                              -
                            </td>
                          </tr>
                        )
                      }

                      // 👉 มีวิชา ปกติ
                      const rows = plo.subjects.flatMap((subj) =>
                        subj.clos.map((clo) => ({
                          subject: subj,
                          clo,
                        })),
                      )

                      return rows.map((row, j) => (
                        <tr key={`${i}-${j}`} className="border">
                          {j === 0 && (
                            <td
                              rowSpan={rows.length}
                              className="border px-2 py-3 align-top"
                            >
                              <b>{plo.plo_code}</b> : {plo.plo_name}
                              <div className="mt-2 rounded-lg bg-green-50 p-2 text-sm text-green-800">
                                คะแนน : {(plo?.plo_score ?? 0).toFixed(2)}
                              </div>
                            </td>
                          )}

                          {(j === 0 ||
                            row.subject.subject_id !==
                              rows[j - 1]?.subject.subject_id) && (
                            <td
                              rowSpan={row.subject.clos.length}
                              className="border px-2 py-3 align-top"
                            >
                              <div>{row.subject.subject_id}</div>
                              <div className="text-sm text-gray-500">
                                {row.subject.subject_name_en}
                              </div>
                              <div className="py-2 text-sm text-secondary">
                                {row.subject.subject_type === 'required'
                                  ? 'วิชาบังคับ'
                                  : 'วิชาเลือก'}
                              </div>

                              <button
                                onClick={() =>
                                  navigate(
                                    `${location.pathname}?evidence=${row.subject.subject_id}` +
                                      `&subjectName=${encodeURIComponent(
                                        row.subject.subject_name_en,
                                      )}` +
                                      `&year=${selectedYear}`,
                                  )
                                }
                                className="mt-2 w-full whitespace-nowrap rounded-lg bg-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-300"
                              >
                                แสดงหลักฐานการประเมิน
                              </button>
                            </td>
                          )}

                          <td className="border px-4 py-3 align-top text-sm">
                            CLO-{row.clo.clo_number} : {row.clo.clo_detail}
                          </td>

                          <td
                            className={`border text-center font-medium ${
                              row.clo.earned_score === null
                                ? 'text-gray-300'
                                : 'text-gray-700'
                            }`}
                          >
                            {row.clo.earned_score !== null
                              ? row.clo.earned_score.toFixed(2)
                              : '-'}
                          </td>
                        </tr>
                      ))
                    })}
                  </tbody>
                </table>
              </ContentMotionDIV>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {ChartDialogOpen && (
            <ContentMotionDIV className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
              <div className="flex h-[80vh] w-[90vw] flex-col items-center rounded-2xl bg-white p-6">
                <div className="relative mb-4 mt-6 flex w-full items-center">
                  <div className="absolute left-1/2 -translate-x-1/2 pt-1 text-center text-2xl text-secondary">
                    <div className="flex flex-col items-center">
                      <span>ผลการเรียนรู้ระดับหลักสูตร ของรุ่นปีรับ 2565</span>
                      <span className="text-lg text-gray-500">
                        หลักสูตร{scopeName}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setChartDialogOpen(false)}
                    className="absolute right-0 text-2xl font-bold text-gray-500 hover:text-gray-800"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-grow items-center justify-center">
                  <div className="flex h-[75vh] w-[75vw] flex-col items-center rounded-2xl bg-white p-6">
                    <Radar
                      data={{
                        labels: evaData.map((plo) => plo.plo_code),
                        datasets: [
                          {
                            label: 'คะแนนเฉลี่ย PLO',
                            data: evaData.map((plo) => plo.plo_score),
                            backgroundColor: 'rgba(59,130,246,0.3)',
                            borderColor: 'rgba(37,99,235,1)',
                            borderWidth: 2,
                            pointBackgroundColor: 'rgba(37,99,235,1)',
                            pointBorderColor: '#fff',
                            pointRadius: 5,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        aspectRatio: 1,
                        scales: {
                          r: {
                            beginAtZero: true,
                            min: 0,
                            max: 5,
                            ticks: {
                              stepSize: 1,
                              backdropColor: 'transparent',
                            },
                            grid: { color: 'rgba(0,0,0,0.1)' },
                            angleLines: { color: 'rgba(0,0,0,0.2)' },
                            pointLabels: { font: { size: 13 }, color: '#333' },
                          },
                        },
                        plugins: {
                          legend: { position: 'top' },
                          tooltip: {
                            callbacks: {
                              title: (tooltipItems) => {
                                const index = tooltipItems[0].dataIndex
                                const plo = evaData[index]
                                return `${plo.plo_code}`
                              },
                              label: (context) => {
                                const plo = evaData[context.dataIndex]
                                return [
                                  ` ${plo.plo_code}: ${plo.plo_name}`,
                                  ` คะแนน: ${plo.plo_score.toFixed(2)} / 5`,
                                ]
                              },
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </ContentMotionDIV>
          )}

          <AssessmentCriteria />
        </AnimatePresence>
        <SessionExpiredDialog open={sessionExpired} />
      </ContentMotionDIV>
    </ContentMotionDIV>
  )
}
export default CourseLevelByIntake
