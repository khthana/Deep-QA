import { useState, useMemo } from 'react'
import { FaBuilding } from 'react-icons/fa'
import { DeleteBT, EditBT, SaveBT, CancleBT } from '../../../BT'
import { motion } from 'framer-motion'
import { useDepartments } from '../../../../hooks/useDepartments'
import { useDepartmentActions } from '../../../../hooks/useDepartmentActions'
import ContentTitle from '../../../ContentTitle'
import ContentMotionDIV from '../../../ContentMotionDIV'
import TableHeader from '../../../TableHeader'
import SeachSection from '../../../SeachSection'
import usePagination from '../../../usePagination'
import PageNumber from '../../../PageNumber'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import ImportDepartmentDialog from './ImportDepartmentDilog'
import DeleteDialog from '../../../DeleteDialog'
import MotionTr from '../../../MotionTr'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '../../../../context/AuthContext'
import SessionExpiredDialog from '../../../SessionExpiredDialog'
import { isSessionExpired } from '../../../../utils/session'

function DepartmentTable({}) {
  const { profile } = useAuth()
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [isAddDept, setIsAddDept] = useState()
  const [sessionExpired, setSessionExpired] = useState(false)
  const { departments, fetchDepartments } = useDepartments({
    setSessionExpired,
    isSessionExpired,
  })
  const [searchText, setSearchText] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDept, setSelectedDept] = useState(null)
  const {
    addDepartment,
    editDepartment,
    deleteDepartment,
  } = useDepartmentActions(fetchDepartments)

  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  const [formData, setFormData] = useState({
    department_id: '',
    department_name_th: '',
    department_name_en: '',
    faculty_id: profile.role[0].scope_id,
  })

  const handleEdit = (department) => {
    setEditRow(department.department_id)
    setAlert({
      open: true,
      message: `กำลังแก้ไข ${department.department_name_th}`,
      severity: 'warning',
    })
    setFormData({ ...department })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const filteredUsers = useMemo(() => {
    if (!departments || departments.length === 0) return []
    if (searchText === '') return departments

    const lower = searchText.toLowerCase()
    return departments.filter((dept) =>
      Object.values(dept).some(
        (val) => val && val.toString().toLowerCase().includes(lower),
      ),
    )
  }, [searchText, departments])

  const handleDeleteClick = (department) => {
    setSelectedDept(department)
    setDialogOpen(true)
    console.log(department.department_name_th)
  }

  const handleConfirmDelete = async () => {
    setDialogOpen(false)
    await deleteDepartment(selectedDept, setAlert)
  }

  const resetForm = () =>
    setFormData({
      department_id: '',
      department_name_th: '',
      department_name_en: '',
      faculty_id: profile.role[0].scope_id,
    })

  const {
    page,
    setPage,
    currentData,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(filteredUsers, 10)

  return (
    <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-6 shadow">
      <ContentTitle titlename={'ข้อมูลภาควิชา'} icon={FaBuilding} />
      <SeachSection
        onSearch={(value) => {
          setSearchText(value)
          setPage(1)
        }}
        searchText="ค้นหาภาควิชา"
        textImportBT="ภาควิชา"
        textAddBT="ภาควิชา"
        onCleckImport={() => setIsUploadOpen(true)}
        onCleckAdd={() => {
          setIsAddDept(true)
        }}
      ></SeachSection>

      <div className="flex rounded-xl bg-white shadow">
        <div className="w-full overflow-x-auto rounded-lg">
          <table className="text-m min-w-full border-gray-300 text-center text-gray-700">
            <TableHeader columns={departmentColumns} />
            <tbody>
              <AnimatePresence>
                {isAddDept && (
                  <MotionTr className="border-b border-gray-200 bg-white transition hover:bg-gray-50">
                    <td className="w-1 px-2 py-2">
                      <input
                        type="text"
                        name="department_id"
                        value={formData.department_id}
                        onChange={handleChange}
                        className="w-full rounded border px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        name="department_name_th"
                        value={formData.department_name_th}
                        onChange={handleChange}
                        className="w-full rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        name="department_name_en"
                        value={formData.department_name_en}
                        onChange={handleChange}
                        className="w-full rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="flex justify-center gap-4 px-2 py-2">
                      <SaveBT
                        item={formData}
                        onSave={() =>
                          addDepartment(
                            formData,
                            setAlert,
                            resetForm,
                            setIsAddDept,
                          )
                        }
                      ></SaveBT>
                      <CancleBT onClick={() => setIsAddDept(false)} />
                    </td>
                  </MotionTr>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {currentData &&
                  currentData.map((department) => (
                    <motion.tr
                      key={department.department_id}
                      className="border-b border-gray-200 bg-white transition hover:bg-gray-50"
                    >
                      <td className="w-1 px-2 py-2 text-center">
                        {editRow === department.department_id ? (
                          <input
                            name="department_id"
                            value={formData.department_id}
                            onChange={handleChange}
                            className="w-full rounded border py-1 text-center transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          department.department_id
                        )}
                      </td>

                      <td className="px-2 py-2 text-left">
                        {editRow === department.department_id ? (
                          <input
                            name="department_name_th"
                            value={formData.department_name_th}
                            onChange={handleChange}
                            className="w-full rounded border px-2 py-1 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          department.department_name_th
                        )}
                      </td>

                      <td className="px-2 py-2 text-left">
                        {editRow === department.department_id ? (
                          <input
                            name="department_name_en"
                            value={formData.department_name_en}
                            onChange={handleChange}
                            className="w-full rounded border px-2 py-1 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          department.department_name_en
                        )}
                      </td>

                      <td className="flex justify-center gap-4 px-2 py-2">
                        {editRow === department.department_id ? (
                          <SaveBT
                            item={department}
                            onSave={() =>
                              editDepartment(
                                formData,
                                setAlert,
                                resetForm,
                                () => setEditRow(null),
                              )
                            }
                          ></SaveBT>
                        ) : (
                          <EditBT
                            item={department}
                            onEdit={handleEdit}
                          ></EditBT>
                        )}
                        <DeleteBT
                          // item={department}
                          // onDelete={() => deleteDepartment(department, setAlert)}
                          item={department}
                          onDelete={() => handleDeleteClick(department)}
                        ></DeleteBT>
                      </td>
                    </motion.tr>
                  ))}
              </AnimatePresence>
            </tbody>
          </table>
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
      </div>

      <PageNumber
        startIndex={startIndex}
        endIndex={endIndex}
        page={page}
        setPage={setPage}
        totalItems={totalItems}
        totalPages={totalPages}
      ></PageNumber>

      <ImportDepartmentDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        setAlert={setAlert}
        fetchDepartments={fetchDepartments}
      />

      <DeleteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        Name={selectedDept?.department_name_th}
      />

      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
export default DepartmentTable

const departmentColumns = [
  { label: 'รหัสภาควิชา' },
  { label: 'ชื่อภาควิชา (ไทย)', align: 'left' },
  { label: 'ชื่อภาควิชา (อังกฤษ)', align: 'left' },
  { label: 'ดำเนินการ' },
]
