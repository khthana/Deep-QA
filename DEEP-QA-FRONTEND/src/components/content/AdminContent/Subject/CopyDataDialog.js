import { useState } from 'react'
import ContentMotionDIV from '../../../ContentMotionDIV'
import { AnimatePresence, frameData } from 'framer-motion'

export default function CopyDataDialog({
  open,
  setOpen,
  selectedYear,
  setSelectedYear,
  years,
  currentYear,
  setAlert,
  fetchSemesterCourses,
}) {
  const [semester, setSemester] = useState(null)
  const handleCopyData = () => {
    if (!selectedYear) {
      setAlert({
        open: true,
        message: `กรุณาเลือกปีการศึกษาที่ต้องการคัดลอกข้อมูลมายัง ปีการศึกษา ${currentYear}`,
        severity: 'info',
      })
      return
    }

    const payload = {
      academic_year_now: currentYear,
      academic_year_old: selectedYear,
      semester: semester,
    }

    console.log(payload)
    fetchCopySemesterCourses(payload)
    setOpen(false)
  }

  const fetchCopySemesterCourses = async payload => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/semesterCourses/copy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      if (res.ok) {
        setAlert({
          open: true,
          message: `คัดลอกข้อมูลการเปิดรายวิชา สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `คัดลอกข้อมูลการเปิดรายวิชา สำเร็จ`,
          severity: 'error',
        })
      }

      const data = await res.json()
      fetchSemesterCourses()
    } catch (err) {
      console.error('Error :', err)
    }
  }

  return (
    <div>
      <AnimatePresence>
        {open && (
          <ContentMotionDIV className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="animate-fadeIn mb-48 flex w-[400px] flex-col gap-4 rounded-xl bg-white p-6 shadow-lg">
              <div className="flex flex-col gap-1">
                <span className="text-center text-2xl text-secondary">
                  คัดลอกข้อมูลจากปีการศึกษาเก่า
                </span>
                <span className="text-center text-sm text-gray-600">
                  เลือกปีการศึกษาที่ต้องการคัดลอกข้อมูลการเปิดรายวิชา
                </span>
                <span className=" text-center text-sm text-gray-600">
                  เพื่อคัดลอกมายัง{' '}
                  <span className="font-bold">ปีการศึกษา {currentYear}</span>
                </span>
              </div>

              <div>
                <label className="mb-2 block  text-sm font-medium text-gray-500">
                  เลือกปีเก่า
                </label>

                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-slate-100 px-3 py-2 text-left text-gray-700 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- เลือกปีการศึกษา --</option>
                  {years.map(y => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-500">
                  เลือกภาคเรียน
                </label>
                <ContentMotionDIV className="mb-6 flex gap-3">
                  <button
                    onClick={() => setSemester(1)}
                    className={`flex-1 rounded-md border px-4 py-2 ${
                      semester === 1
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    ภาคเรียนที่ 1
                  </button>
                  <button
                    onClick={() => setSemester(2)}
                    className={`flex-1 rounded-md border px-4 py-2 ${
                      semester === 2
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    ภาคเรียนที่ 2
                  </button>
                  {/* <button
                    onClick={() => setSemester(null)}
                    className={`flex-1 rounded-md border px-4 py-2 ${
                      semester === null
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    ทั้งหมด
                  </button> */}
                </ContentMotionDIV>
                <div className=" border-t border-gray-200"></div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800 transition hover:bg-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  //   disabled={!selectedYear}
                  onClick={handleCopyData}
                  className="rounded-lg bg-secondary px-4 py-2 font-medium text-white shadow-md transition hover:bg-secondary"
                >
                  ยืนยัน
                </button>
              </div>
            </div>
          </ContentMotionDIV>
        )}
      </AnimatePresence>
    </div>
  )
}
