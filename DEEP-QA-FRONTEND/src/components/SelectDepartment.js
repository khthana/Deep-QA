import { useEffect, useState } from 'react'
import { isSessionExpired } from '../utils/session'

function SelectDepartment({
  setSelectedDept,
  Scope,
  Role,
  departments,
  setSessionExpired,
}) {
  const [departmentList, setDepartmentList] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      if (Role === 'FACULTY_ADMIN') {
        setDepartmentList(departments)
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
          if (isSessionExpired(res)) return setSessionExpired(true)
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

  return (
    <div className="mt-4 flex w-full flex-col items-center justify-between rounded-lg border bg-white p-5 shadow md:flex-row">
      <div className="flex w-full flex-col items-start justify-between gap-4 md:flex-row md:items-center md:gap-6">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:w-auto md:gap-6">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
            {/* Label: ปรับให้ไม่ตัดคำ */}
            <span className="shrink-0 select-none font-medium text-gray-600">
              เลือกภาควิชา
            </span>

            {/* Select: ปรับความกว้างให้ยืดหยุ่น */}
            <select
              className="w-full min-w-[200px] rounded-lg border border-gray-300 bg-slate-100 px-3 py-2 text-left text-gray-700 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed md:w-auto"
              disabled={Role !== 'FACULTY_ADMIN'}
              onChange={(e) => {
                setSelectedDept(e.target.value)
              }}
            >
              {Role !== 'FACULTY_ADMIN' ? (
                <>
                  {departmentList.map((dept) => (
                    <option key={dept.department_id} value={dept.department_id}>
                      {dept.department_name_th}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option key="" value="" hidden>
                    -- กรุณาเลือกภาควิชา --
                  </option>
                  {departmentList.map((dept) => (
                    <option key={dept.department_id} value={dept.department_id}>
                      {dept.department_name_th}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>

        {/* กรณีอยากเปิดใช้งานปุ่มภายหลัง ปุ่มจะจัดวางอยู่ขวาสุดในจอใหญ่ */}
        {/* <button
      className="w-full md:w-auto px-5 py-2 rounded-md bg-secondary text-white 
                 hover:bg-secondary_hover disabled:bg-gray-400 disabled:cursor-not-allowed transition"
      disabled={Role !== 'FACULTY_ADMIN'}
    >
      เลือก
    </button> 
    */}
      </div>
    </div>
  )
}
export default SelectDepartment
