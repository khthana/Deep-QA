import { useState, useEffect, useMemo } from 'react'
import { FaUserFriends } from 'react-icons/fa'
import { EditBT, SaveBT, DeleteBT, ViewBT, CancleBT } from '../../../BT'
import ContentTitle from '../../../ContentTitle'
import ContentMotionDIV from '../../../ContentMotionDIV'
import usePagination from '../../../usePagination'
import PageNumber from '../../../PageNumber'
import SearchSectionTeacher from '../../../SearchSectionTeacher'
import ImportStudentGroupsDialog from './ImportStudentGroupsDialog'
import TableHeader from '../../../TableHeader'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import MotionTr from '../../../MotionTr'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '../../../../context/AuthContext'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import { RiDeleteBin6Line } from 'react-icons/ri'
import DeleteDialog from '../../../DeleteDialog'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'

function StudentGroups() {
  const [sessionExpired, setSessionExpired] = useState(false)
  const savedCourse = JSON.parse(localStorage.getItem('selectedCourse'))
  const section_number = localStorage.getItem('section_number') || ''
  const section_id = localStorage.getItem('section_id') || ''
  const term = localStorage.getItem('term') || ''
  const year = localStorage.getItem('year') || ''
  const { profile } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [groups, setGroups] = useState([])
  const [editRow, setEditRow] = useState(null)
  const [isAddMode, setIsAddMode] = useState(false)
  const [selectedDeleteGroup, setSelectedDeleteGroup] = useState(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [logList, setLogList] = useState([])
  const [showLogModal, setShowLogModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState(null)

  const [formData, setFormData] = useState({
    group_id: null,
    group_name: '',
    students: [],
    subject_id: '',
    academic_year: '',
    semester: '',
    section: '',
    performed_by: '',
    section_id: '',
  })
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  useEffect(() => {
    const courseData = JSON.parse(localStorage.getItem('selectedCourse'))
    const sectionData = localStorage.getItem('section')
    const section_id = localStorage.getItem('section_id')
    const termData = localStorage.getItem('term')
    const yearData = localStorage.getItem('year')

    if (courseData && sectionData && termData && yearData) {
      setFormData(prev => ({
        ...prev,
        subject_id: courseData.subject_id,
        academic_year: yearData,
        semester: termData,
        section: sectionData,
        section_id: section_id,
        performed_by: profile.user_id,
      }))

      fetchStudentGroup()
    }
  }, [])

  const handleEdit = group => {
    setEditRow(group.group_id)
    setFormData({ ...group })
    setFormData(prev => ({
      ...prev,
      performed_by: profile.user_id,
      academic_year: year,
      section_id: section_id,
    }))
  }

  const handleSave = () => {
    setEditRow(null)
    fetchAddStudentGroup()
  }

  const handleDelete = group => {
    setSelectedDeleteGroup(group)
    setDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    fetchDeleteStudentGroup()
    setDialogOpen(false)
  }

  const handleViewLogs = async group => {
    setSelectedGroup(group)
    setShowLogModal(true)

    try {
      const section_id = localStorage.getItem('section_id')
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/studentGroup/log/${section_id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      )

      if (isSessionExpired(res)) return setSessionExpired(true)

      const result = await res.json()

      const groupLogs = (result.data || []).filter(
        log => log.group_id === group.group_id
      )

      setLogList(groupLogs)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddStart = () => {
    if (editRow) { 
      return
    }

    setIsAddMode(true)
  }

  const handleAddSaveAddGroup = () => {
    setIsAddMode(false)
    fetchAddStudentGroup()
  }

  const handleAddCancel = () => {
    setIsAddMode(false)
    setFormData({ group_id: null, group_name: '', members: [] ,students: []})
  }

  const filteredGroups = useMemo(() => {
    const q = (searchText || '').toLowerCase().trim()
    if (!q) return groups
    return groups.filter((g, idx) => {
      const inName = g.group_name?.toLowerCase().includes(q)
      const inMembers = (g.students || []).join(',').toLowerCase().includes(q)
      const inIndex =
        String(idx + 1).includes(q) || String(g.group_id).includes(q)
      return inName || inMembers || inIndex
    })
  }, [groups, searchText])

  const {
    page,
    setPage,
    currentData,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(filteredGroups, 10)

  const isDisabled = !(term && savedCourse)

  const fetchAddStudentGroup = async () => {
    console.log('Submitting formData:', formData)
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/studentGroup/upsert`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify(formData),
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (res.ok) {
        setAlert({
          open: true,
          message: 'เพิ่มกลุ่มนักเรียนในรายวิชา สำเร็จ',
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: 'เพิ่มกลุ่มนักเรียนในรายวิชา ไม่สำเร็จ',
          severity: 'error',
        })
      }

      const data = await res.json()
      setFormData(prev => ({
        ...prev,
        group_name: '',
        group_id: '',
        students: [],
      }))
      fetchStudentGroup()
      setIsAddMode(false)
    } catch (err) {
      console.error('Error :', err)
    }
  }

  const fetchStudentGroup = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/studentGroup/get-all-groups-in-section/${section_id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()
      // console.log('Fetched Student Groups:', data.data)
      setGroups(data.data)
    } catch (err) {
      console.error('Error :', err)
    }
  }

  const fetchDeleteStudentGroup = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/studentGroup/delete-group`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({
            group_id: selectedDeleteGroup.group_id,
            performed_by: profile.user_id,
          }),
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()
      fetchStudentGroup()
    } catch (err) {
      console.error('Error :', err)
    }
  }

  const actionMapping = {
    ADD_STUDENT: {
      label: 'เพิ่มนักเรียน',
      class: 'bg-green-100 text-green-700',
    },
    REMOVE_STUDENT: {
      label: 'ย้าย/ลบนักเรียน',
      class: 'bg-red-100 text-red-700',
    },
    CREATE_GROUP: {
      label: 'สร้างกลุ่มใหม่',
      class: 'bg-blue-100 text-blue-700',
    },
    DELETE_GROUP: { label: 'ลบกลุ่ม', class: 'bg-orange-100 text-orange-700' },
  }

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentSubjectTitle />
      <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-6 shadow">
        <ContentTitle titlename="กลุ่มงานนักศึกษา" icon={FaUserFriends} />
        <SearchSectionTeacher
          onSearch={value => {
            setSearchText(value)
            setPage(1)
          }}
          searchText="ค้นหากลุ่มหรือสมาชิก"
          textImportBT="กลุ่ม"
          textAddBT="กลุ่ม"
          onCleckImport={() => setIsUploadOpen(true)}
          onCleckAdd={handleAddStart}
          isDisable={isDisabled}
          showImport={true}
          showAdd={true}
        />

        <div className=" overflow-x-auto rounded-xl shadow">
          <table className="min-w-full text-center text-slate-700">
            <TableHeader columns={studentColumns} />
            <tbody>
              <AnimatePresence>
                {isAddMode && (
                  <MotionTr className="border-b bg-white">
                    <td className="px-2 py-2 text-gray-400">ใหม่</td>
                    <td className=" px-2 py-2 text-left">
                      <input
                        className="w-full rounded border px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.group_name}
                        onChange={e =>
                          setFormData(p => ({
                            ...p,
                            group_name: e.target.value,
                          }))
                        }
                        placeholder="กรอกชื่อกลุ่ม"
                      />
                    </td>
                    <td className=" px-2 py-2 text-left">
                      <MemberColumn
                        isEdit
                        students={formData.students}
                        onChange={newMembers =>
                          setFormData(p => ({
                            ...p,
                            students: newMembers,
                          }))
                        }
                      />
                    </td>
                    <td className=" px-2 py-2">
                      <div className="flex h-full items-center justify-center gap-2 align-middle">
                        <SaveBT onSave={handleAddSaveAddGroup} />
                        <CancleBT onClick={() => handleAddCancel()} />
                      </div>
                    </td>
                  </MotionTr>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {currentData.map((group, index) => {
                  return (
                    <MotionTr
                      key={group.group_id}
                      className="border-b hover:bg-slate-50"
                    >
                      <td className="px-2 py-2">{startIndex + index + 1}</td>
                      <td className=" px-2 py-2 text-center">
                        {editRow === group.id ? (
                          <input
                            className="w-full rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.group_name}
                            onChange={e =>
                              setFormData({
                                ...formData,
                                group_name: e.target.value,
                              })
                            }
                          />
                        ) : (
                          group.group_name
                        )}
                      </td>
                      <td className=" px-2 py-2 ">
                        <MemberColumn
                          isEdit={editRow === group.group_id}
                          students={
                            editRow === group.group_id
                              ? formData.students
                              : group.students
                          }
                          onChange={newMembers =>
                            setFormData({ ...formData, students: newMembers })
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-center gap-2">
                          {editRow === group.group_id ? (
                            <SaveBT item={group} onSave={handleSave} />
                          ) : (
                            <EditBT item={group} onEdit={handleEdit} />
                          )}
                          <DeleteBT item={group} onDelete={handleDelete} />
                          <ViewBT item={group} onView={handleViewLogs} />
                        </div>
                      </td>
                    </MotionTr>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        <AnimatePresence>
          {showLogModal && (
            <ContentMotionDIV className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur">
              <div
                className="relative flex h-full max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b bg-white px-6 py-4">
                  <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-secondary">
                      ประวัติกิจกรรมของกลุ่ม
                    </h2>
                    <p className=" font-medium text-gray-500">
                      กลุ่ม: {selectedGroup?.group_name}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowLogModal(false)
                      setLogList([]) // ล้างข้อมูลเมื่อปิด
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                {/* Log Items */}
                <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4">
                  <div className="space-y-3">
                    {logList.length > 0 ? (
                      logList.map(log => (
                        <div
                          key={log.log_id}
                          className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[14px]  ${
                                actionMapping[log.action_type]?.class ||
                                'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {actionMapping[log.action_type]?.label ||
                                log.action_type}
                            </span>
                            <span className="text-sm text-gray-400">
                              {new Date(log.created_at).toLocaleString('th-TH')}
                            </span>
                          </div>

                          <div className="text">
                            {log.student_id ? (
                              <p className="text-gray-700">
                                <span className="ml-1 text-gray-700">
                                  {log.student_id}{' '}
                                </span>
                                <span className=" text-gray-700">
                                  {log.student_title}
                                  {log.student_first_name}{' '}
                                  {log.student_last_name}
                                </span>
                              </p>
                            ) : (
                              <p className=" text-gray-500">
                                ทำรายการกับกลุ่มโดยตรง
                              </p>
                            )}
                          </div>

                          <div className="mt-1 border-t pt-2 text-sm text-gray-400">
                            ดำเนินการโดย:{' '}
                            <span className="font-medium text-gray-600">
                              {log.performer_title}
                              {log.performer_first_name}{' '}
                              {log.performer_last_name}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex h-32 flex-col items-center justify-center gap-2 text-gray-400">
                        <span className="text-sm ">
                          ยังไม่มีประวัติกิจกรรมในกลุ่มนี้
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ContentMotionDIV>
          )}
        </AnimatePresence>
        <PageNumber
          startIndex={startIndex}
          endIndex={endIndex}
          page={page}
          setPage={setPage}
          totalItems={totalItems}
          totalPages={totalPages}
        />

        <ImportStudentGroupsDialog
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          fetchStudentGroup={fetchStudentGroup}
          performed_by={profile?.user_id || ''}
          setAlert={setAlert}
        />

        <DeleteDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          Name={selectedDeleteGroup?.group_name}
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
      </ContentMotionDIV>
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
function MemberColumn({ isEdit, students, onChange }) {
  const [inputValue, setInputValue] = useState('')

  const handleAdd = () => {
    if (inputValue && !students.includes(inputValue)) {
      onChange([...students, { student_id: inputValue }])
      setInputValue('')
    }
  }

  const handleRemove = member => {
    onChange(students.filter(m => m !== member))
  }

  return (
    <div className="flex flex-col gap-2">
      {students.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {students.map(member => (
              <ContentMotionDIV
                key={member.student_id}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-200 px-3 py-1 text-slate-600
             transition-colors duration-200 hover:bg-slate-300 hover:text-slate-800"
              >
                {member && <span>{member.student_id}</span>}
                {isEdit && (
                  <button
                    onClick={() => handleRemove(member)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <RiDeleteBin6Line />
                  </button>
                )}
              </ContentMotionDIV>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {isEdit && (
          <ContentMotionDIV className=" flex gap-2">
            <input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="กรอกรหัสนักศึกษา"
            />
            <button
              onClick={handleAdd}
              className="rounded-lg bg-secondary px-4 text-white hover:bg-secondary"
            >
              เพิ่ม
            </button>
          </ContentMotionDIV>
        )}
      </AnimatePresence>
    </div>
  )
}

export default StudentGroups

const studentColumns = [
  { label: 'ลำดับ', w: 'w-[120px]' },
  { label: 'ชื่อกลุ่ม', align: 'center', w: 'w-[160px]' },
  { label: 'นักศึกษา', align: 'left' },
  { label: 'ดำเนินการ', w: 'w-[140px]' },
]
