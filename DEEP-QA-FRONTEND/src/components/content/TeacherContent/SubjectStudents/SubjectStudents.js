import { useState, useMemo, useEffect } from 'react'
import { FaUserGraduate } from 'react-icons/fa'
import { DeleteBT, EditBT, SaveBT } from '../../../BT'
import { AnimatePresence, motion } from 'framer-motion'
import ContentTitle from '../../../ContentTitle'
import ContentMotionDIV from '../../../ContentMotionDIV'
import TableHeader from '../../../TableHeader'
import SearchSectionTeacher from '../../../SearchSectionTeacher'
import usePagination from '../../../usePagination'
import PageNumber from '../../../PageNumber'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import DeleteDialog from '../../../DeleteDialog'
import ImportSubjectStudentsDialog from './ImportSubjectStudentsDialog'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import MotionTr from '../../../MotionTr'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'

function SubjectStudents() {
  const [sessionExpired, setSessionExpired] = useState(false)
  const savedCourse = JSON.parse(localStorage.getItem('selectedCourse'))
  const section = localStorage.getItem('section_number') || ''
  const section_id = localStorage.getItem('section_id') || ''
  const term = localStorage.getItem('term') || ''
  const year = localStorage.getItem('year') || ''

  const [students, setStudents] = useState([])
  const [searchText, setSearchText] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const isReady = term
  const [formData, setFormData] = useState({
    student_id: '',
    subject_id: '',
    academic_year: '',
    semester: '',
  })
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  useEffect(() => {
    if (savedCourse && year && term && section_id) {
      setFormData((prev) => ({
        ...prev,
        section: section,
        section_id: section_id,
        subject_id: savedCourse.subject_id,
        academic_year: year,
        semester: term,
      }))

      fetchStudentCourses()
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    fetchAddStudentCourses()
    setFormData((prev) => ({
      ...prev,
      student_id: '',
    }))
  }

  const handleDeleteClick = (student) => {
    setSelectedStudent(student)
    setDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    const keyToDelete = selectedStudent.tempKey || selectedStudent.student_id
    setStudents(
      students.filter((s) => (s.tempKey || s.student_id) !== keyToDelete),
    )
    setDialogOpen(false)
    deleteStudentFromCourse(selectedStudent.student_id)
    setAlert({ open: true, message: 'ลบข้อมูลเรียบร้อย', severity: 'success' })
  }

  const filteredStudents = useMemo(() => {
    const lower = (searchText || '').toLowerCase()
    return students.filter((s) =>
      Object.values(s).some((val) =>
        String(val ?? '')
          .toLowerCase()
          .includes(lower),
      ),
    )
  }, [searchText, students])

  const {
    page,
    setPage,
    currentData,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(filteredStudents, 10)

  const fetchAddStudentCourses = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/studentCourse/add`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify(formData),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (res.ok) {
        setAlert({
          open: true,
          message: 'เพิ่มนักเรียนในรายวิชา สำเร็จ',
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: 'เพิ่มนักเรียนในรายวิชา ไม่สำเร็จ',
          severity: 'error',
        })
      }
      const data = await res.json()
      fetchStudentCourses()
      setIsAdding(false)
    } catch (err) {
      console.error('Error :', err)
    }
  }

  const deleteStudentFromCourse = async (student_id) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/studentCourse/delete`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({ student_id, section_id }),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()
      return data
    } catch (err) {
      console.error('delete error:', err)
      return null
    }
  }

  const fetchStudentCourses = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/studentCourse/get/${section_id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()

      // console.log('Fetched Students:', data.data, section_id)
      setStudents(data.data)
    } catch (err) {
      console.error('Error :', err)
      setStudents([])
    }
  }

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentSubjectTitle />

      <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-6 shadow">
        <ContentTitle
          titlename="รายชื่อนักศึกษาในรายวิชา"
          icon={FaUserGraduate}
        />

        <SearchSectionTeacher
          onSearch={(value) => {
            setSearchText(value)
            setPage(1)
          }}
          searchText="ค้นหานักศึกษา"
          onCleckImport={() => setIsUploadOpen(true)}
          onCleckAdd={() => setIsAdding(true)}
          isDisable={!isReady}
          showImport={true}
          showAdd={true}
          textImportBT="นักศึกษา"
          textAddBT="นักศึกษา"
        />

        <div className="mt-0 flex rounded-xl bg-white shadow">
          <div className="w-full overflow-x-auto rounded-lg">
            <table className="text-m min-w-full border-gray-300 text-center text-gray-700">
              <TableHeader columns={studentColumns} />
              <tbody>
                <AnimatePresence>
                  {isAdding && (
                    <MotionTr className="border-b border-gray-200 bg-white hover:bg-gray-50">
                      <td className=" px-2 py-2 text-center leading-relaxed">
                        <input
                          type="text"
                          name="student_id"
                          value={formData.student_id}
                          onChange={handleChange}
                          className="w-full rounded border px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="กรอกรหัสนักศึกษา เพื่อเพิ่มลงในรายวิชา"
                        />
                      </td>
                      <td className=" px-2 py-3 text-center"></td>
                      <td className=" px-2 py-3 text-left"></td>
                      <td className="px-2 py-2 text-left"></td>
                      <td className="flex justify-center gap-4 px-2 py-2">
                        <SaveBT
                          item={null}
                          onSave={handleSave}
                          disabled={!isReady}
                        />
                      </td>
                    </MotionTr>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {isReady &&
                    currentData.map((student, index) => {
                      return (
                        <MotionTr
                          key={index}
                          className="border-b border-gray-200 bg-white hover:bg-gray-50"
                        >
                          <td className=" px-10 py-2 text-center leading-relaxed">
                            {student.student_id}
                          </td>
                          {/* <td className=" px-2 py-3 text-center">นาย</td> */}
                          <td className=" px-2 py-3 text-left">
                            {student.first_name_th}
                          </td>
                          <td className="px-2 py-2 text-left">
                            {student.last_name_th}
                          </td>
                          <td className="px-2 py-2 ">{student.program_name}</td>
                          <td className="flex justify-center gap-4 px-2 py-2">
                            <DeleteBT
                              item={student}
                              onDelete={() => handleDeleteClick(student)}
                              disabled={!isReady}
                            />
                          </td>
                        </MotionTr>
                      )
                    })}
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
        />

        <Snackbar
          open={alert.open}
          autoHideDuration={5000}
          onClose={() => setAlert({ ...alert, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <div className="flex flex-col gap-2">
            {Array.isArray(alert.message) ? (
              alert.message.map((e, i) => (
                <Alert
                  key={i}
                  onClose={() => setAlert({ ...alert, open: false })}
                  severity={alert.severity}
                  variant="filled"
                >
                  ข้อมูลในแถวที่ {e.row}: {e.student_id} {e.error}
                </Alert>
              ))
            ) : (
              <Alert
                onClose={() => setAlert({ ...alert, open: false })}
                severity={alert.severity}
                variant="filled"
              >
                {alert.message ?? ''}
              </Alert>
            )}
          </div>
        </Snackbar>

        <DeleteDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          Name={
            `${selectedStudent?.first_name_th} ${selectedStudent?.last_name_th}` ||
            'นักศึกษา'
          }
          moreText={'ออกจากรายวิชา'}
        />

        <ImportSubjectStudentsDialog
          isOpen={isUploadOpen && isReady}
          onClose={() => setIsUploadOpen(false)}
          setAlert={setAlert}
          fetchStudents={fetchStudentCourses}
        />
      </ContentMotionDIV>
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}

export default SubjectStudents

const studentColumns = [
  { label: 'รหัสนักศึกษา', w: 'w-[120px]' },
  // { label: 'คำนำหน้า', align: 'center', w: 'w-[60px]' },
  { label: 'ชื่อ', align: 'left' },
  { label: 'นามสกุล', align: 'left' },
  { label: 'หลักสูตร', align: 'center' },
  { label: 'ดำเนินการ', w: 'w-[140px]' },
]
