import { useState, useEffect } from 'react'
import { IoDocumentText } from 'react-icons/io5'
import { mapRole } from '../../../MapRole'
import { useDepartments } from '../../../../hooks/useDepartments'
import { DeleteBT, EditBT } from '../../../BT'
import ContentTitle from '../../../ContentTitle'
import ContentMotionDIV from '../../../ContentMotionDIV'
import TableHeader from '../../../TableHeader'
import SeachSection from '../../../SeachSection'
import SelectDepartment from '../../../SelectDepartment'
import ImportSubjectDialog from './ImportSubjectDilog'
import usePagination from '../../../usePagination'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import PageNumber from '../../../PageNumber'
import DeleteDialog from '../../../DeleteDialog'
import AddEditSubjectDialog from './AddEditSubjectDialog'
import { useSubjects } from '../../../../hooks/useSubjects'
import MotionTr from '../../../MotionTr'
import SessionExpiredDialog from '../../../SessionExpiredDialog.js'
import { isSessionExpired } from '../../../../utils/session.js'

function SubjectTable() {
  const [editRow, setEditRow] = useState(null)
  const Role = mapRole(localStorage.getItem('selectedRole'))
  const Scope = localStorage.getItem('scopeID')
  const [selectedDept, setSelectedDept] = useState('')

  const [isAddProg, setIsAddProg] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [filteredSubject, setfilteredSubject] = useState([])
  const [searchText, setSearchText] = useState('')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const { departments } = useDepartments({
    setSessionExpired,
    isSessionExpired,
  })

  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })
  const {
    subjectList,
    fetchSubjects,
    addSubject,
    editSubject,
    deleteSubject,
  } = useSubjects(selectedDept, setAlert, setIsAddProg)
  const handleEdit = (subject) => {
    setAlert({
      open: true,
      message: `กำลังแก้ไขรายวิชา ${subject.subject_id} ${subject.subject_name_th}`,
      severity: 'warning',
    })
    setEditRow(subject)
    setIsAddProg(true)
  }

  const handleAdd = () => {
    setEditRow('')
    setIsAddProg(true)
  }

  const handleDelete = (subject) => {
    setEditRow(subject)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    setIsDeleteDialogOpen(false)
    deleteSubject(editRow)
  }

  useEffect(() => {
    if (Array.isArray(subjectList)) {
      const filtered = subjectList.filter((subject) => {
        const search = searchText.toLowerCase()
        return Object.values(subject).some((value) => {
          if (value === null || value === undefined) return false
          return value.toString().toLowerCase().includes(search)
        })
      })
      setfilteredSubject(filtered)
    }
  }, [searchText, subjectList])

  useEffect(() => {
    if (!selectedDept) return
    fetchSubjects()
  }, [selectedDept])

  const {
    page,
    setPage,
    currentData,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(filteredSubject, 10)

  return (
    <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-6 shadow">
      <ContentTitle titlename={'ข้อมูลรายวิชา'} icon={IoDocumentText} />
      <SelectDepartment
        setSelectedDept={setSelectedDept}
        Role={Role}
        Scope={Scope}
        departments={departments}
        setSessionExpired={setSessionExpired}
      ></SelectDepartment>
      <SeachSection
        onSearch={(value) => {
          setSearchText(value)
          setPage(1)
        }}
        textImportBT="รายวิชา"
        textAddBT="รายวิชา"
        searchText="ค้นหารายวิชา"
        isDisable={!selectedDept}
        onCleckImport={() => setIsUploadOpen(true)}
        onCleckAdd={() => handleAdd()}
      ></SeachSection>

      <div className="flex rounded-xl bg-white shadow">
        <div className="w-full overflow-x-auto rounded-xl">
          <table className="text-m min-w-full border-gray-300 text-center text-gray-700">
            <TableHeader columns={subjectColumns} />
            <tbody>
              {currentData &&
                currentData.map((subject, index) => (
                  <MotionTr
                    key={subject.subject_id}
                    className="border-b border-gray-200 bg-white transition hover:bg-gray-50"
                  >
                    <td className="w-1 px-2 py-2">{subject.subject_id}</td>
                    <td className="px-2 py-2 text-left">
                      {subject.subject_name_th}
                    </td>

                    <td className="px-2 py-2 text-left">
                      {subject.subject_name_en}
                    </td>

                    <td className="w-10 px-2 py-2">{subject.credits}</td>

                    <td className="flex justify-center gap-4 px-2 py-2">
                      <EditBT item={subject} onEdit={handleEdit}></EditBT>
                      <DeleteBT
                        item={subject}
                        onDelete={handleDelete}
                      ></DeleteBT>
                    </td>
                  </MotionTr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
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

      <PageNumber
        startIndex={startIndex}
        endIndex={endIndex}
        page={page}
        setPage={setPage}
        totalItems={totalItems}
        totalPages={totalPages}
      ></PageNumber>

      <DeleteDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        Name={
          editRow ? `วิชา ${editRow.subject_id} ${editRow.subject_name_th}` : ''
        }
      />

      <AddEditSubjectDialog
        isOpen={isAddProg}
        subject={editRow}
        onClose={() => setIsAddProg(false)}
        onAdd={addSubject}
        onEdit={editSubject}
        selectedDept={selectedDept}
      ></AddEditSubjectDialog>

      <ImportSubjectDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        setAlert={setAlert}
        fetchSubjects={fetchSubjects}
        selectedDept={selectedDept}
      />

      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}

export default SubjectTable

const subjectColumns = [
  { label: 'รหัสภาควิชา' },
  { label: 'ชื่อรายวิชา (ไทย)', align: 'left' },
  { label: 'ชื่อรายวิชา (อังกฤษ)', align: 'left' },
  { label: 'หน่วยกิต' },
  { label: 'ดำเนินการ' },
]
