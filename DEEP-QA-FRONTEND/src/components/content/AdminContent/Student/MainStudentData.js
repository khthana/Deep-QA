import { useState, useEffect } from 'react'
import { PiStudentBold } from 'react-icons/pi'
import { mapRole } from '../../../MapRole'
import { useDepartments } from '../../../../hooks/useDepartments'
import { usePrograms } from '../../../../hooks/usePrograms'
import ContentTitle from '../../../ContentTitle'
import ContentMotionDIV from '../../../ContentMotionDIV'
import TableHeader from '../../../TableHeader'
import SelectDepartmentAndPrograms from '../../../SelectDepartmentAndPrograms'
import SeachSection from '../../../SeachSection'
import usePagination from '../../../usePagination'
import PageNumber from '../../../PageNumber'
import MotionTr from '../../../MotionTr'
import { AnimatePresence } from 'framer-motion'
import SessionExpiredDialog from '../../../SessionExpiredDialog.js'
import { isSessionExpired } from '../../../../utils/session.js'

function MainStudentData() {
  const Role = mapRole(localStorage.getItem('selectedRole'))
  const Scope = localStorage.getItem('scopeID')
  const [sessionExpired, setSessionExpired] = useState(false)
  const { departments, fetchDepartments } = useDepartments({
    setSessionExpired,
    isSessionExpired,
  })
  const [selectedDept, setSelectedDept] = useState(null)
  const [selectedProg, setSelectedProg] = useState(null)
  const { programs, fetchPrograms } = usePrograms(selectedDept)
  const [StudentList, setStudentList] = useState([])
  const [filteredPrograms, setFilteredPrograms] = useState([])
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    if (Role === 'PROG_MANAGER' && Scope) {
      setSelectedProg(Scope)
      fetchStudentsByProgram()
    }

    if (selectedDept !== null) {
      fetchStudentsByProgram()
    }
  }, [selectedProg])

  useEffect(() => {
    if (!selectedDept) return
    setSelectedProg(null)
    setStudentList([])
    fetchPrograms()
  }, [selectedDept])

  const fetchStudentsByProgram = async () => {
    if (!selectedProg) return
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/student/get-by-program`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({ program_id: selectedProg }),
        },
      )

      if (!res.ok) {
        throw new Error(`Error: ${res.status}`)
      }

      const data = await res.json()
      setStudentList(data.data)
      // console.log(data.data)
    } catch (error) {
      console.error('Failed to fetch students by program:', error)
      return null
    }
  }

  useEffect(() => {
    if (Array.isArray(StudentList)) {
      const filtered = StudentList.filter((student) => {
        const search = searchText.toLowerCase()
        return Object.values(student).some((value) => {
          if (value === null || value === undefined) return false
          return value.toString().toLowerCase().includes(search)
        })
      })
      setFilteredPrograms(filtered)
    }
  }, [searchText, StudentList])

  const {
    page,
    setPage,
    currentData,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(filteredPrograms, 10)

  return (
    <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-6 shadow">
      <ContentTitle titlename={'ข้อมูลนักศึกษากลาง'} icon={PiStudentBold} />
      <SelectDepartmentAndPrograms
        departments={departments}
        setSelectedDept={setSelectedDept}
        selectedDept={selectedDept}
        programs={programs}
        selectedProg={selectedProg}
        setSelectedProg={setSelectedProg}
      ></SelectDepartmentAndPrograms>

      <SeachSection
        onSearch={(value) => {
          setSearchText(value)
          setPage(1)
        }}
        textImportBT="นักศึกษา"
        textAddBT="นักศึกษา"
        addBtAction={false}
      ></SeachSection>

      <div className="flex rounded-xl bg-white shadow">
        <div className="w-full overflow-x-auto rounded-lg">
          <table className="text-m min-w-full border-gray-300 text-center text-gray-700">
            <TableHeader columns={studentHeader} />
            <tbody>
              <AnimatePresence>
                {currentData.map((student) => (
                  <MotionTr
                    key={student.student_id}
                    className="border-b border-gray-200 bg-white transition hover:bg-gray-50"
                  >
                    <td className="w-1 px-10 py-2">{student.student_id}</td>
                    <td className="px-2 py-2 text-left">{student.title_th}</td>
                    <td className="px-2 py-2 text-left">
                      {student.first_name_th}
                    </td>
                    <td className="px-2 py-2 text-left">
                      {student.last_name_th}
                    </td>
                    <td className="px-2 py-2">{'วิศวกรรมคอมพิวเตอร์'}</td>
                    <td className="w-1 px-20 py-2">{student.admission_year}</td>
                  </MotionTr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
      <PageNumber
        startIndex={startIndex}
        endIndex={endIndex}
        page={page}
        setPage={setPage}
        totalItems={totalItems}
        totalPages={totalPages}
      ></PageNumber>

      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
export default MainStudentData

const studentHeader = [
  { label: 'รหัสนักศึกษา' },
  { label: 'คำนำหน้า', align: 'center', w: 'w-[60px]' },
  { label: 'ชื่อ', align: 'left' },
  { label: 'นามสกุล', align: 'left' },
  { label: 'หลักสูตร' },
  { label: 'ปีที่เข้ารับการศึกษา' },
]
