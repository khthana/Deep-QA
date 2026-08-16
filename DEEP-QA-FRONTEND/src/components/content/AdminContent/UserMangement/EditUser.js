import { useState } from 'react'
import { FaUserAlt } from 'react-icons/fa'
import { IoSettings } from 'react-icons/io5'
import { MdAssignmentAdd } from 'react-icons/md'
import { FaSave } from 'react-icons/fa'
import { useOutletContext } from 'react-router-dom'
import { useUpdateUser } from '../../../../hooks/useUpdateUser'
import { useUserRoles } from '../../../../hooks/useUserRoles'
import Alert from '@mui/material/Alert'
import AddRoleDialog from './AddRoleDialog'
import Snackbar from '@mui/material/Snackbar'
import ContentMotionDIV from '../../../ContentMotionDIV'
import EditPerosonalData from './EditPersonalData'
import EditRoleAssign from './EditRoleAssign'
import { useNavigate } from 'react-router-dom'
import { FaUserGroup } from 'react-icons/fa6'

function EditUser() {
  const [activeTab, setActiveTab] = useState('personal')
  const [showDialog, setShowDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const { Role, selectedUser, fetchUserList } = useOutletContext()
  const { updateUser } = useUpdateUser()
  const { userRoles, fetchUserRole } = useUserRoles(selectedUser)
  const navigate = useNavigate()
  const { department_id, user_id, status, program_id, ...initialData } =
    selectedUser || {}
  const [personalFormData, setPersonalFormData] = useState(initialData)
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  const onEdit = async (fnameTH, lnameTH) => {
    const msg = `กำลังแก้ไขข้อมูล ของ ${fnameTH} ${lnameTH}`
    setAlert({
      open: true,
      message: `${msg}`,
      severity: 'warning',
    })
  }

  const handleUpdatePersionalData = async (fnameTH, lnameTH) => {
    updateUser(personalFormData, setAlert, fnameTH, lnameTH, setIsEditing)
    fetchUserList()
  }

  return (
    <ContentMotionDIV className="rounded-xl border bg-white p-6 shadow">
      <ContentMotionDIV className=" mb-4 ms-2 flex flex-row items-center justify-between align-middle">
        <div className="flex flex-col gap-1">
          <div className="text-2xl font-medium text-secondary">
            แก้ไขข้อมูลผู้ใช้งานระบบ
          </div>
          <div className="text-sm text-gray-700">
            {selectedUser.title_th} {selectedUser.first_name_th}{' '}
            {selectedUser.last_name_th}
          </div>
        </div>

        <button
          onClick={() => navigate('/main/users')}
          className="flex max-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-800 hover:shadow-sm active:scale-95"
        >
          <FaUserGroup className="h-4 w-4" />
          แสดงรายชื่อผู้ใช้งานทั้งหมด
        </button>
      </ContentMotionDIV>

      <div className="flex flex-row items-center justify-between border-b border-gray-200">
        <div className="-mb-px flex flex-wrap text-center text-lg font-medium text-gray-500">
          <div className="me-2 transition">
            <button
              onClick={() => setActiveTab('personal')}
              className={`group inline-flex items-center rounded-t-lg border-b-2 p-3 ${
                activeTab === 'personal'
                  ? 'border-blue-800 bg-blue-100 text-secondary'
                  : 'border-transparent text-gray-500 hover:text-blue-900'
              }`}
            >
              <FaUserAlt className="me-2" />
              ข้อมูลทั่วไป
            </button>
          </div>
          <div className="me-2 inline-flex transition">
            <button
              onClick={() => setActiveTab('role')}
              className={`group inline-flex items-center justify-center rounded-t-lg border-b-2 p-3 ${
                activeTab === 'role'
                  ? 'border-blue-800 bg-blue-100 text-secondary'
                  : 'border-transparent text-gray-500 hover:text-blue-900'
              }`}
            >
              <IoSettings className="me-2" />
              สิทธิ์ของระบบ
            </button>
          </div>
        </div>
        {activeTab === 'role' ? (
          <div>
            <button
              onClick={() => {
                setShowDialog(true)
              }}
              type="button"
              className="flex items-center justify-center rounded-lg bg-secondary px-5 py-2.5 font-medium text-white hover:bg-secondary"
            >
              <MdAssignmentAdd className="me-2 h-5 w-5" />
              เพิ่มสิทธ์
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            {!isEditing ? (
              <button
                onClick={() => {
                  setIsEditing(true)
                  onEdit(selectedUser.first_name_th, selectedUser.last_name_th)
                }}
                className="flex items-center justify-center rounded-lg bg-secondary px-5 py-2.5 font-medium text-white hover:bg-secondary_hover"
              >
                แก้ไขข้อมูล
              </button>
            ) : (
              <>
                <button
                  onClick={() =>
                    handleUpdatePersionalData(
                      selectedUser.first_name_th,
                      selectedUser.last_name_th
                    )
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-2.5 font-medium text-white hover:bg-secondary"
                >
                  <FaSave className="text-2xl text-white" />
                  บันทึกข้อมูล
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                  }}
                  className="flex items-center justify-center rounded-lg bg-gray-200 px-5 py-2.5 font-medium text-gray-800 hover:bg-gray-300"
                >
                  ยกเลิก
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="mt-6">
          {activeTab === 'personal' && (
            <EditPerosonalData
              selectedUserName={selectedUser}
              setIsEditing={setIsEditing}
              isEditing={isEditing}
              setPersonalFormData={setPersonalFormData}
              personalFormData={personalFormData}
            />
          )}
          {activeTab === 'role' && (
            <EditRoleAssign
              selectedUserName={selectedUser}
              Role={Role}
              fetchUserRole={fetchUserRole}
              userRole={userRoles}
              setAlert={setAlert}
            />
          )}
        </div>
      </div>
      {showDialog && (
        <AddRoleDialog
          Role={Role}
          setShowDialog={setShowDialog}
          selectedUserName={selectedUser}
          setAlert={setAlert}
          fetchUserRole={fetchUserRole}
          fetchUserList={fetchUserList}
        />
      )}

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
    </ContentMotionDIV>
  )
}
export default EditUser
