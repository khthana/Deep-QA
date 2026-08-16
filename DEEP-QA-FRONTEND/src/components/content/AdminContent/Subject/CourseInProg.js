import { useEffect, useState } from 'react'
import SelectPrograms from '../../../SelectProgram'
import { FaBook } from 'react-icons/fa'
import ContentTitle from '../../../ContentTitle'
import ContentMotionDIV from '../../../ContentMotionDIV'
import TableHeader from '../../../TableHeader'
import { DeleteBT, EditBT, SaveBT, CancleBT } from '../../../BT'
import { useAuth } from '../../../../context/AuthContext'
import MotionTr from '../../../MotionTr'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import usePagination from '../../../usePagination'
import PageNumber from '../../../PageNumber'
import DeleteDialog from '../../../DeleteDialog'
import { AnimatePresence } from 'framer-motion'
import ImportProgSubjectDialog from './ImportProgSubjectDilog'
import CopyDataDialog from './CopyDataDialog'
import SessionExpiredDialog from '../../../SessionExpiredDialog.js'
import { isSessionExpired } from '../../../../utils/session.js'

function CourseInProgram() {
  const [editRow, setEditRow] = useState(null)
  const [formData, setFormData] = useState({})
  const [isAdding, setIsAdding] = useState(false)
  const [SelectedProg, setSelectedProg] = useState([])
  const [programsInDept, setProgramsInDep] = useState([])
  const [DeprtID, setDepartID] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [SubjectInDept, setSubjectInDep] = useState([])
  const [subjectInProg, setSubjectInProg] = useState([])
  const { profile } = useAuth()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)

  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  useEffect(() => {
    if (!SelectedProg?.program_id) return
    setDepartID(SelectedProg.department_id)
    fetchSubjectsInProgram()
  }, [SelectedProg])

  useEffect(() => {
    fetchProgramsByDepartment()
  }, [DeprtID])

  const handleEdit = (subject) => {
    setEditRow(subject.subject_id)
    setFormData({ ...subject })
    setAlert({
      open: true,
      message: `กำลังแก้ไขรายวิชา ${subject.subject_id} ${subject.subject_name_th}`,
      severity: 'warning',
    })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleDelete = (subject) => {
    setEditRow(subject)
    setIsDeleteDialogOpen(true)
  }

  const handleChangeAddChang = (e) => {
    const value = e.target.value
    setFormData({ ...formData, subject_id: value })

    setSelectedSubject(null)

    if (value.trim() === '') {
      setSuggestions([])
      return
    }

    const filtered = SubjectInDept.filter((p) =>
      p.subject_id.toLowerCase().includes(value.toLowerCase()),
    )

    setSuggestions(filtered)
  }

  const handleSelect = (subject) => {
    setSelectedSubject(subject)
    setFormData({
      ...subject,
      subject_type: 'required',
      email: profile.email,
      program_id: SelectedProg.program_id,
    })
    setSuggestions([])
    setEditRow(null)
  }

  const handleSaveAdding = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/program_subjects/create-program_subjects`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        },
      )

      if (res.ok) {
        setAlert({
          open: true,
          message: `เพิ่มรายวิชา ${selectedSubject.subject_id} ${selectedSubject.subject_name_th} ลงในหลักสูตร สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `เพิ่มรายวิชาลงในหลักสูตร ไม่สำเร็จ`,
          severity: 'error',
        })
      }

      const data = await res.json()
      setIsAdding(false)
      setFormData({})
      setSelectedSubject(null)
      fetchSubjectsInProgram()
    } catch (err) {
      console.error('Error creating program subject:', err)
    }
  }

  const fetchSubjectsInProgram = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/program_subjects/get-program-subjectsby-program_id`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ program_id: SelectedProg.program_id }),
        },
      )

      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) throw new Error('API Error')

      const data = await res.json()
      // console.log(data)
      setSubjectInProg(data.data)
    } catch (err) {
      console.error('Error fetching subjects:', err)
    }
  }

  const fetchProgramsByDepartment = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjects/get-subject-by-department_id`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ department_id: DeprtID }),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) {
        throw new Error(`Failed to fetch programs: ${res.status}`)
      }

      const data = await res.json()
      // console.log(data)
      setSubjectInDep(data)
    } catch (err) {
      console.error('Error fetching programs by department:', err)
      return null
    }
  }

  const handleUpdate = async (subject) => {
    const updatedFormData = {
      ...formData,
      email: profile.email,
    }

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/program_subjects/update-program-subject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updatedFormData),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (res.ok) {
        setAlert({
          open: true,
          message: `แก้ไขรายวิชา ${subject.subject_id} ${subject.subject_name_th} สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `แก้ไขรายวิชา ${subject.subject_id} ${subject.subject_name_th} ไม่สำเร็จ`,
          severity: 'error',
        })
      }
      fetchSubjectsInProgram()
      setSelectedSubject(null)
      setEditRow(null)
      setFormData({})
      setSelectedSubject(null)
      const data = await res.json()
    } catch (err) {
      console.error('เกิดข้อผิดพลาด:', err)
    }
  }

  const handleDeleteProgramSubject = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/program_subjects/delete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            program_id: SelectedProg.program_id,
            subject_id: editRow.subject_id,
          }),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) {
        throw new Error(`Failed to delete program subject: ${res.status}`)
      }

      const data = await res.json()
      if (res.ok) {
        setAlert({
          open: true,
          message: `ลบรายวิชาออกจากหลักสูตร สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `ลบรายวิชาออกจากหลักสูตร ออกจากหลักสูตร ไม่สำเร็จ`,
          severity: 'error',
        })
      }
      setIsDeleteDialogOpen(false)
      fetchSubjectsInProgram()
    } catch (err) {
      console.error('Error deleting program subject:', err)
    }
  }

  const {
    page,
    setPage,
    currentData,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(subjectInProg, 10)

  return (
    <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-6 shadow">
      <ContentTitle titlename={'รายวิชาในหลักสูตร'} icon={FaBook} />
      <div>
        <SelectPrograms
          addImportBT={true}
          addAddBT={true}
          onAdd={() => setIsAdding(true)}
          onCleckImport={() => setIsUploadOpen(true)}
          setSelectedProg={setSelectedProg}
          SelectedProg={SelectedProg}
          setPage={setPage}
        ></SelectPrograms>

        <div className="flex rounded-xl bg-white shadow">
          <div className="w-full overflow-x-auto rounded-xl">
            <table className="text-m min-w-full border-gray-300 text-center text-gray-700">
              <TableHeader columns={subjectColumns} />
              <tbody>
                <AnimatePresence>
                  {isAdding && (
                    <MotionTr className="border-b border-gray-200 bg-white transition hover:bg-gray-50">
                      <td className="w-1 px-2 py-2">
                        <input
                          name="subject_id"
                          value={formData.subject_id}
                          onChange={handleChangeAddChang}
                          className="rounded border px-2 py-1 text-center transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="กรอกรหัสวิชา"
                        />
                        {suggestions.length > 0 && (
                          <ul className="absolute z-10 mt-1 w-auto rounded border bg-white text-left shadow-md">
                            {suggestions.map((s) => (
                              <li
                                key={s.subject_id}
                                onClick={() => handleSelect(s)}
                                className="cursor-pointer px-3 py-1 hover:bg-blue-100"
                              >
                                {s.subject_id} - {s.subject_name_th}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-2 py-2 text-left">
                        <div className="flex flex-col gap-1">
                          <span>{selectedSubject?.subject_name_th || ''}</span>
                          <span className="text-gray-500">
                            {selectedSubject?.subject_name_en || ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        {selectedSubject && (
                          <select
                            name="subject_type"
                            value={formData.subject_type}
                            onChange={handleChange}
                            className="w-full rounded-lg border px-2 py-1 text-center transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="required">วิชาบังคับ</option>
                            <option value="elective">วิชาเลือก</option>
                          </select>
                        )}
                      </td>

                      <td className="flex h-full items-center justify-center gap-4 px-2 py-2">
                        <SaveBT item={''} onSave={handleSaveAdding}></SaveBT>
                        <CancleBT onClick={() => setIsAdding(false)} />
                      </td>
                    </MotionTr>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {currentData &&
                    currentData.map((subject, index) => (
                      <MotionTr
                        className="border-b border-gray-200 bg-white transition hover:bg-gray-50"
                        key={subject.subject_id}
                      >
                        <td className="px-2 py-2">{subject.subject_id}</td>
                        <td className="px-2 py-2 text-left">
                          <div className="flex flex-col gap-1">
                            <span>{subject.subject_name_th}</span>
                            <span className="text-gray-500">
                              {subject.subject_name_en}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          {editRow === subject.subject_id ? (
                            <select
                              name="subject_type"
                              value={formData.subject_type}
                              onChange={handleChange}
                              className="w-full rounded-lg border px-2 py-1 text-center transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="required">วิชาบังคับ</option>
                              <option value="elective">วิชาเลือก</option>
                            </select>
                          ) : (
                            <span>
                              {subject.subject_type === 'required'
                                ? 'วิชาบังคับ'
                                : 'วิชาเลือก'}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex h-full items-center justify-center gap-4">
                            {editRow === subject.subject_id ? (
                              <SaveBT item={subject} onSave={handleUpdate} />
                            ) : (
                              <>
                                <EditBT item={subject} onEdit={handleEdit} />
                                <DeleteBT
                                  item={subject}
                                  onDelete={handleDelete}
                                />
                              </>
                            )}
                          </div>
                        </td>
                      </MotionTr>
                    ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
        {/* {showDialog && (
                <AddUserDialog
                  handleSubmit={handleSubmit}
                  formData={formData}
                  setFormData={setFormData}
                  roles={roles}
                  setShowDialog={setShowDialog}
                />
              )}
              <ImportUserDialog
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
              /> */}
      </div>

      <ImportProgSubjectDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        setAlert={setAlert}
        fetchSubjects={fetchSubjectsInProgram}
        SelectedProg={SelectedProg}
      />

      <PageNumber
        startIndex={startIndex}
        endIndex={endIndex}
        page={page}
        setPage={setPage}
        totalItems={totalItems}
        totalPages={totalPages}
      ></PageNumber>
      <Snackbar
        open={alert.open}
        autoHideDuration={3000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setAlert({ ...alert, open: false })}
          severity={alert.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>

      <DeleteDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteProgramSubject}
        Name={editRow ? `วิชา ${editRow.subject_name_th} ` : ''}
      />
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
export default CourseInProgram

const subjectColumns = [
  { label: 'รหัสวิชา' },
  { label: 'ชื่อวิชา', align: 'left' },
  { label: 'ประเภทวิชา' },
  { label: 'ดำเนินการ' },
]
