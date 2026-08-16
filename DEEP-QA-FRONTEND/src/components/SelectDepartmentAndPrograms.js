import { useEffect, useState } from 'react'
import { mapRole } from './MapRole'

function SelectDepartmentAndPrograms({
  addImportBT,
  departments,
  setSelectedDept,
  programs,
  selectedProg,
  setSelectedProg,
  selectedDept,
}) {
  const [departmentList, setDepartmentList] = useState([])
  const Scope = localStorage.getItem('scopeID')
  const Role = mapRole(localStorage.getItem('selectedRole'))
  const [showDeptSelect, setShowDeptSelect] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (Role === 'FACULTY_ADMIN') {
        setDepartmentList(departments)
      } else if (Role === 'PROG_MANAGER') {
        setShowDeptSelect(false)
      } else {
        try {
          const res = await fetch(
            `${process.env.REACT_APP_API_URL}/api/department/get-department-by-id`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ department_id: Scope }),
            },
          )

          if (!res.ok) throw new Error('Failed to fetch department')
          const data = await res.json()
          setSelectedDept(data.department_id)
          setDepartmentList([data])
        } catch (err) {
          console.error('Error:', err)
        }
      }
    }

    fetchData()
  }, [departments, Role, Scope])

  if (Role === 'PROG_MANAGER') {
    return
  }

  return (
    <div className="mt-4 flex w-full flex-col rounded-lg border bg-white p-5 shadow">
      {/* ใช้ lg:flex-row เพื่อจัดแถวในคอม และ flex-col ในมือถือ */}
      <div className="flex w-full flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* กลุ่ม Filter: ใช้ min-w-0 เพื่อยอมให้ลูกๆ ย่อตัวได้เมื่อพื้นที่ไม่พอ */}
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap lg:flex-nowrap lg:items-center lg:gap-6">
          {/* 1. เลือกภาควิชา */}
          {showDeptSelect && (
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <span className="shrink-0 select-none text-sm font-medium text-gray-600">
                เลือกภาควิชา
              </span>
              <select
                className="w-full min-w-0 rounded-lg border border-gray-300 bg-slate-100 px-3 py-2 text-left text-gray-700 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed sm:w-[220px]"
                disabled={Role !== 'FACULTY_ADMIN'}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                {/* ... logic option เหมือนเดิม ... */}
                {Role !== 'FACULTY_ADMIN' ? (
                  departmentList.map((dept) => (
                    <option key={dept.department_id} value={dept.department_id}>
                      {dept.department_name_th}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="" hidden>
                      -- กรุณาเลือกภาควิชา --
                    </option>
                    {departmentList.map((dept) => (
                      <option
                        key={dept.department_id}
                        value={dept.department_id}
                      >
                        {dept.department_name_th}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          )}

          {/* 2. เลือกหลักสูตร */}
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <span className="shrink-0 select-none text-sm font-medium text-gray-600">
              เลือกหลักสูตร
            </span>
            <select
              className="w-full min-w-0 rounded-lg border border-gray-300 bg-slate-100 px-3 py-2 text-left text-gray-700 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed sm:w-[280px]"
              disabled={!selectedDept}
              onChange={(e) => setSelectedProg(e.target.value)}
            >
              <option value="" hidden>
                -- กรุณาเลือกหลักสูตร --
              </option>
              {programs.map((prog) => (
                <option key={prog.program_id} value={prog.program_id}>
                  {prog.program_id} - {prog.program_name_th} - {prog.year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
export default SelectDepartmentAndPrograms
