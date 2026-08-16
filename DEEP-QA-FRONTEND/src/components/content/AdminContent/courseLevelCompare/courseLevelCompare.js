import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import ContentTitle from '../../../ContentTitle'
import { IoDocumentTextOutline } from 'react-icons/io5'
import { useState, useEffect } from 'react'
import SelecteProgForProgManager from '../../../SelecteProgForProgManager'
import { Radar } from 'react-chartjs-2'
import { AnimatePresence } from 'framer-motion'
import { getCurrentTermAndYear } from '../../../TermAndYearUtils'
import SessionExpiredDialog from '../../../SessionExpiredDialog'
import { isSessionExpired } from '../../../../utils/session'

function CourseLevelCompare() {
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [selectedYear, setSelectedYear] = useState(2565)
  const [selectedEndYear, setSelectedEndYear] = useState(2568)
  const [ListPLO, setListPLO] = useState([])
  const [ChartDialogOpen, setChartDialogOpen] = useState(false)
  const scopeName = localStorage.getItem('scopeName')
  const [loadingYear, setLoadingYear] = useState(false)
  const { year: currentYear } = getCurrentTermAndYear()
  const [sessionExpired, setSessionExpired] = useState(false)

  const fetchScoreEvaByYearRange = async (startYear, endYear) => {
    const startTime = Date.now()

    try {
      setLoadingYear(true)

      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/ploScore/${selectedProgram.program_id}/year-range/${startYear}/${endYear}`,
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
      // console.log(data)
      setListPLO(sortedData)
    } catch (err) {
      console.error(err)
      setListPLO([])
    } finally {
      const elapsed = Date.now() - startTime
      const delay = Math.max(1000 - elapsed, 0)

      setTimeout(() => {
        setLoadingYear(false)
      }, delay)
    }
  }

  useEffect(() => {
    if (!currentYear || !selectedProgram?.program_id) return

    const end = Number(currentYear)
    const start = end - 4

    setSelectedYear(start)
    setSelectedEndYear(end)

    const fetchInitial = async () => {
      const startTime = Date.now()

      try {
        setLoadingYear(true)
        await fetchScoreEvaByYearRange(start, end)
      } finally {
        const elapsed = Date.now() - startTime
        const delay = Math.max(1000 - elapsed, 0)

        setTimeout(() => {
          setLoadingYear(false)
        }, delay)
      }
    }

    fetchInitial()
  }, [currentYear, selectedProgram])

  const [selectedYears, setSelectedYears] = useState([
    2564,
    2565,
    2566,
    2567,
    2568,
  ])

  const toggleYear = (year) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year],
    )
  }

  const getYearRange = (start, end) => {
    if (!start || !end) return []
    const years = []
    for (let y = start; y <= end; y++) {
      years.push(y)
    }
    return years.slice(-5)
  }

  const yearRange = getYearRange(selectedYear, selectedEndYear)
  const yearColorMap = yearRange.map((year, idx) => ({
    year,
    color: colorPalette[idx % colorPalette.length],
  }))

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-6 shadow">
        <ContentTitle
          titlename="เปรียบเทียบผลการเรียนรู้ระดับหลักสูตร"
          icon={IoDocumentTextOutline}
        />
        <SelecteProgForProgManager
          startYear={true}
          endYear={true}
          showChart={true}
          selectedEndYear={selectedEndYear}
          setSelectedEndYear={setSelectedEndYear}
          selectedProgram={selectedProgram}
          setSelectedProgram={setSelectedProgram}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          setChartDialogOpen={setChartDialogOpen}
          ChartDialogOpen={ChartDialogOpen}
          fetchScoreEvaByYearRange={fetchScoreEvaByYearRange}
          loadingYear={loadingYear}
          setLoadingYear={setLoadingYear}
        />

        <div className="rounded-lg">
          <AnimatePresence mode="wait">
            {loadingYear ? (
              <ContentMotionDIV
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-40 flex-col items-center justify-center gap-2"
              >
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary" />
                <span className="text-sm text-gray-400">กำลังโหลดข้อมูล</span>
              </ContentMotionDIV>
            ) : (
              <ContentMotionDIV
                key="table"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <table className="min-w-full border border-gray-200 text-gray-700">
                  <thead className="bg-gradient-to-r from-slate-100 to-slate-100 text-gray-800">
                    <tr>
                      <th
                        rowSpan="2"
                        className="border border-gray-300 px-4 py-3 text-left align-middle"
                      >
                        ผลการเรียนรู้
                      </th>
                      <th
                        colSpan={yearRange.length}
                        className="border border-gray-300 px-4 py-2 text-center"
                      >
                        รุ่นปีรับเข้า
                      </th>
                    </tr>
                    <tr>
                      {yearRange.map((year) => (
                        <th
                          key={year}
                          className="whitespace-nowrap border border-gray-300 px-4 py-2"
                        >
                          {year}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {ListPLO.map((item, i) => (
                      <tr
                        key={i}
                        className="group border-b border-gray-200 transition-all hover:bg-blue-50"
                      >
                        <td className="border-r border-gray-200 px-2 py-2 align-top">
                          <div className="flex flex-col gap-1 rounded-md border-l-4 border-blue-300 bg-blue-50 p-2 transition group-hover:translate-x-1">
                            <span>
                              <span className="font-semibold text-secondary">
                                {item.plo_code}
                              </span>{' '}
                              : {item.plo_name}
                            </span>
                            <span className="text-sm text-gray-500">
                              {item.outcome_description}
                            </span>
                          </div>
                        </td>

                        {yearRange.map((year, idx) => {
                          const val = item.scores?.[year]
                          return (
                            <td
                              key={year}
                              className={`border px-4 py-3 text-center text-lg font-medium ${
                                val == null
                                  ? 'text-gray-300'
                                  : idx === 0
                                  ? 'text-blue-600'
                                  : idx === 1
                                  ? 'text-green-600'
                                  : idx === 2
                                  ? 'text-purple-600'
                                  : idx === 3
                                  ? 'text-orange-600'
                                  : 'text-rose-700'
                              }`}
                            >
                              {val != null ? val.toFixed(2) : '-'}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
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
                      <span>
                        เปรียบเทียบผลการเรียนรู้ระดับหลักสูตร ปี {selectedYear}{' '}
                        ถึง {selectedEndYear}
                      </span>
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
                  <div className="flex h-[65vh] w-[65vw] flex-col items-center rounded-2xl bg-white p-6">
                    <Radar
                      data={{
                        labels: ListPLO.map((plo) => plo.plo_code),
                        datasets: yearColorMap
                          .filter((y) => selectedYears.includes(y.year))
                          .map((y) => ({
                            label: `ปี ${y.year}`,
                            data: ListPLO.map((plo) => {
                              const val = plo.scores?.[y.year]
                              return val != null ? Number(val) : 0
                            }),
                            backgroundColor: y.color.replace('1)', '0.2)'),
                            borderColor: y.color,
                            borderWidth: 2,
                            pointBackgroundColor: y.color,
                            pointBorderColor: '#fff',
                            pointRadius: 4,
                          })),
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
                              label: (ctx) =>
                                `${ctx.dataset.label}: ${
                                  ctx.raw === 0
                                    ? 'ไม่มีข้อมูล'
                                    : ctx.raw.toFixed(2)
                                }`,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-4">
                  {yearColorMap.map((y) => (
                    <label
                      key={y.year}
                      className="flex cursor-pointer select-none items-center gap-2 text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedYears.includes(y.year)}
                        onChange={() => toggleYear(y.year)}
                        className="h-4 w-4 accent-blue-600"
                      />
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: y.color }}
                      />
                      <span>ปี {y.year}</span>
                    </label>
                  ))}
                </div>
              </div>
            </ContentMotionDIV>
          )}
        </AnimatePresence>
        <SessionExpiredDialog open={sessionExpired} />
      </ContentMotionDIV>
    </ContentMotionDIV>
  )
}
export default CourseLevelCompare

const colorPalette = [
  'rgba(239,68,68,1)', // แดง
  'rgba(234,179,8,1)', // เหลือง
  'rgba(34,197,94,1)', // เขียว
  'rgba(59,130,246,1)', // ฟ้า
  'rgba(147,51,234,1)', // ม่วง
]
