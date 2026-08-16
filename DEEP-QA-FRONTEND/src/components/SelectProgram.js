import { IoMdAdd } from 'react-icons/io'
import { FaFileImport } from 'react-icons/fa6'
import { mapRole } from './MapRole'
import { useState, useEffect } from 'react'
import { LuImport } from 'react-icons/lu'
import { isSessionExpired } from '../utils/session'
function SelectPrograms({
  addImportBT,
  addAddBT,
  onAdd,
  SelectedProg,
  setSelectedProg,
  setPage,
  onCleckImport,
  setSessionExpired,
}) {
  const scopeID = localStorage.getItem('scopeID')
  const Role = localStorage.getItem('selectedRole')
  const [programs, setPrograms] = useState([])
  const isSingle = programs.length === 1

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
      try {
        const data = await fetchProgramsByRole()

        if (data && Array.isArray(data) && data.length > 0) {
          setPrograms(data)

          if (SelectedProg.length === 0) {
            setSelectedProg(data[0])
          }
        } else {
          setPrograms([])
        }
      } catch (error) {
        console.error('Failed to load programs:', error)
      }
    }

    loadPrograms()
  }, [Role])

  // useEffect(() => {
  //   setSelectedProg(programs[0])
  // }, [scopeID])

  return (
    <div className="my-4 flex w-full flex-col gap-4 rounded-lg border bg-white p-4 shadow sm:flex-row sm:items-center sm:justify-between">
      {/* ฝั่งซ้าย: ข้อความและ Select (เพิ่ม min-w-0 เพื่อป้องกันการล้น) */}
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
        <span className="shrink-0 select-none text-sm font-medium text-gray-600 sm:text-base">
          เลือกหลักสูตรที่ใช้งาน
        </span>

        {programs && (
          <select
            value={SelectedProg ? SelectedProg.program_id : ''}
            onChange={(e) => {
              const selected = programs.find(
                (p) => p.program_id === e.target.value,
              )
              setSelectedProg(selected)
              setPage(1)
            }}
            // ปรับเป็น min-w-0 และใช้ w-full เพื่อให้หดตัวตาม flex-1
            className="w-full min-w-0 max-w-lg rounded-lg border border-gray-300 bg-slate-100 px-3 py-2 text-left text-sm text-gray-700 outline-none transition focus:ring-2 focus:ring-blue-500 sm:text-base"
            disabled={isSingle}
          >
            {programs.map((p) => (
              <option key={p.program_id} value={p.program_id}>
                {p.program_id} - {p.program_name_th} - {p.program_year}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ฝั่งขวา: ปุ่มกด (ให้ลอยอยู่ด้วยกันและไม่บีบตัว) */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {addImportBT && (
          <button
            onClick={onCleckImport}
            type="button"
            className="flex flex-1 items-center justify-center whitespace-nowrap rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 sm:px-5 sm:py-2.5 sm:text-base"
          >
            <LuImport className="me-1 h-4 w-4 sm:me-2 sm:h-5 sm:w-5" />
            นำเข้าข้อมูล
          </button>
        )}

        {addAddBT && (
          <button
            onClick={onAdd}
            className="flex flex-1 items-center justify-center whitespace-nowrap rounded-lg bg-secondary px-3 py-2 text-sm text-white transition hover:bg-secondary_hover sm:px-5 sm:py-2.5 sm:text-base"
          >
            <IoMdAdd className="me-1 h-4 w-4 sm:me-2 sm:h-5 sm:w-5" />
            เพิ่มข้อมูล
          </button>
        )}
      </div>
    </div>
  )
}
export default SelectPrograms
