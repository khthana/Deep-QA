import { Select } from '@material-tailwind/react'
import ContentMotionDIV from './ContentMotionDIV'
import { mapRole } from './MapRole'
import { useState, useEffect, useRef } from 'react'
import SessionExpiredDialog from './SessionExpiredDialog'
import { isSessionExpired } from '../utils/session'
import { AnimatePresence } from 'framer-motion'

function SelecteProgForProgManager({
  startYear = false,
  endYear = false,
  student = false,
  showChart = false,
  selectedProgram,
  selectedYear,
  selectedEndYear,
  setSelectedEndYear,
  ChartDialogOpen,
  setSelectedProgram,
  setSelectedYear,
  setSelectedStudent,
  selectedStudent,
  setChartDialogOpen,
  fetchScoreEvaByYearRange,
  loadingYear,
  setLoadingYear,
  studentInProg,
}) {
  const scopeID = localStorage.getItem('scopeID')
  const Role = localStorage.getItem('selectedRole')
  const [programs, setPrograms] = useState([])
  const isSingle = programs.length === 1
  const [sessionExpired, setSessionExpired] = useState(false)
  const [selectedStudentInput, setSelectedStudentInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  const fetchProgramsByRole = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/programs/get-program-by-role`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            role_id: mapRole(Role),
            scope_id: scopeID,
          }),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) {
        throw new Error(`Failed to fetch programs: ${res.status}`)
      }

      const data = await res.json()
      const sortedData = data.sort((a, b) =>
        a.program_id.localeCompare(b.program_id),
      )
      return sortedData
    } catch (err) {
      console.error('Error fetching programs by role:', err)
      return null
    }
  }

  useEffect(() => {
    if (mapRole(Role) === 'TEACHER') return
    const loadPrograms = async () => {
      const data = await fetchProgramsByRole()
      if (data) setPrograms(data)
      if (programs.length === 0) {
        setSelectedProgram(data[0])
      }
    }
    loadPrograms()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const MAX_RANGE = 5
  const debounceRef = useRef(null)
  const DEBOUNCE_DELAY = 800 // ms (ปรับได้)

  const debounceFetch = (start, end) => {
    // ถ้ามี loading handler ค่อยแสดง
    if (typeof setLoadingYear === 'function') {
      setLoadingYear(true)
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // ถ้าไม่มี fetch function → จบแค่นี้
    if (typeof fetchScoreEvaByYearRange !== 'function') {
      return
    }

    debounceRef.current = setTimeout(() => {
      fetchScoreEvaByYearRange(start, end)
    }, DEBOUNCE_DELAY)
  }

  const handleStartYearChange = (value) => {
    let start = Number(value)
    let end = selectedEndYear

    if (end && end - start + 1 > MAX_RANGE) {
      end = start + MAX_RANGE - 1
      setSelectedEndYear(end)
    }

    if (typeof setSelectedStudent === 'function') {
      setSelectedStudent(null)
      setSelectedStudentInput('')
      setShowDropdown(false)
    }

    setSelectedYear(start)
    debounceFetch(start, end)
  }

  const handleEndYearChange = (value) => {
    let end = Number(value)
    let start = selectedYear

    if (start && end - start + 1 > MAX_RANGE) {
      start = end - MAX_RANGE + 1
      setSelectedYear(start)
    }

    setSelectedEndYear(end)
    debounceFetch(start, end)
  }

  return (
    <ContentMotionDIV className="my-4 flex w-full flex-col gap-4 rounded-lg border bg-white p-4 shadow lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        {/* ส่วนกลุ่ม Filter ซ้าย: หลักสูตร, ปีรับเข้า, รหัสนักศึกษา */}
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center lg:flex-nowrap">
          {/* 1. หลักสูตร */}
          {programs && (
            <div className="flex flex-col gap-1.5 sm:min-w-[280px]">
              <span className="shrink-0 select-none text-sm font-medium text-gray-600">
                หลักสูตร
              </span>
              <select
                value={selectedProgram ? selectedProgram.program_id : ''}
                onChange={(e) => {
                  const selected = programs.find(
                    (p) => p.program_id === e.target.value,
                  )
                  setSelectedProgram(selected)
                }}
                className="w-full rounded-lg border border-gray-300 bg-slate-100 px-3 py-2 text-gray-700 outline-none transition focus:ring-2 focus:ring-blue-500"
                disabled={isSingle}
              >
                {programs.map((p) => (
                  <option key={p.program_id} value={p.program_id}>
                    {p.program_id} - {p.program_name_th} - {p.program_year}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 2. ปีรับเข้า - ถึง (รวมเป็นกลุ่มเดียวกัน) */}
          <div className="flex items-end gap-2">
            {startYear && (
              <div className="flex flex-col gap-1.5">
                <span className="shrink-0 select-none text-sm font-medium text-gray-600">
                  รุ่นปีรับเข้า
                </span>
                <input
                  value={selectedYear}
                  onChange={(e) => handleStartYearChange(e.target.value)}
                  type="number"
                  className="w-20 rounded-lg border border-gray-300 bg-slate-100 px-2 py-2 text-center outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {endYear && (
              <>
                <span className="mb-3 self-end text-gray-400">ถึง</span>
                <div className="flex flex-col gap-1.5">
                  <input
                    value={selectedEndYear}
                    onChange={(e) => handleEndYearChange(e.target.value)}
                    type="number"
                    className="w-20 rounded-lg border border-gray-300 bg-slate-100 px-2 py-2 text-center outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          {/* 3. รหัสนักศึกษา (ขยายพื้นที่ตามจริง) */}
          {student && (
            <div
              ref={dropdownRef}
              className="relative flex flex-col gap-1.5 md:min-w-[300px] lg:w-[350px]"
            >
              <span className="shrink-0 select-none text-sm font-medium text-gray-600">
                รหัสนักศึกษา
              </span>
              <div className="relative w-full">
                <input
                  type="text"
                  value={selectedStudentInput}
                  disabled={!studentInProg}
                  onChange={(e) => {
                    setSelectedStudentInput(e.target.value)
                    setShowDropdown(true)
                    setSelectedStudent(null)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full rounded-lg border border-gray-300 bg-slate-100 px-3 py-2 pr-9 text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="พิมพ์รหัส / ชื่อ / นามสกุล"
                />
                {selectedStudentInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudent(null)
                      setSelectedStudentInput('')
                      setShowDropdown(false)
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    ✕
                  </button>
                )}

                <AnimatePresence>
                  {showDropdown && (
                    <ContentMotionDIV className="absolute top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
                      {studentInProg
                        .filter((s) => {
                          const keyword = selectedStudentInput.toLowerCase()
                          return (
                            s.student_id.includes(keyword) ||
                            `${s.first_name_th} ${s.last_name_th}`
                              .toLowerCase()
                              .includes(keyword)
                          )
                        })
                        .map((s) => (
                          <div
                            key={s.student_id}
                            onClick={() => {
                              setSelectedStudent(s)
                              setSelectedStudentInput(
                                `${s.student_id} ${s.first_name_th} ${s.last_name_th}`,
                              )
                              setShowDropdown(false)
                            }}
                            className="cursor-pointer border-b px-4 py-2.5 text-sm transition last:border-0 hover:bg-blue-50"
                          >
                            <span className="font-bold text-gray-700">
                              {s.student_id}
                            </span>{' '}
                            {s.first_name_th} {s.last_name_th}
                          </div>
                        ))}
                      {studentInProg.length === 0 && (
                        <div className="px-3 py-4 text-center text-sm italic text-gray-400">
                          ไม่พบข้อมูลนักศึกษา
                        </div>
                      )}
                    </ContentMotionDIV>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {showChart && (
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setChartDialogOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-2.5 font-medium text-white shadow-sm transition hover:bg-cyan-700 active:scale-95 lg:w-auto"
            >
              <span className="whitespace-nowrap text-[14px] lg:text-base">
                แสดง Chart ผลการเรียนรู้
              </span>
            </button>
          </div>
        )}
      </div>
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
export default SelecteProgForProgManager
