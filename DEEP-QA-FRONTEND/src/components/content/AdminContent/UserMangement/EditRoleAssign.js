import { useState } from 'react'
import { mapRole } from '../../../MapRole'
import { RiDeleteBin6Line } from 'react-icons/ri'
import { useDeleteUserRole } from '../../../../hooks/useDeleteUserRole'
import ContentMotionDIV from '../../../ContentMotionDIV'
import DeleteDialog from '../../../DeleteDialog'

function EditRoleAssign({
  selectedUserName,
  userRole,
  fetchUserRole,
  setAlert,
}) {
  const { deleteUserRole } = useDeleteUserRole(fetchUserRole)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDeletRole, setSelectedDeleteRole] = useState()

  console.log(userRole)

  const handleConfirmDelete = async () => {
    setDialogOpen(false)
    deleteUserRole(
      selectedUserName.first_name_th,
      selectedUserName.last_name_th,
      selectedUserName.email,
      selectedDeletRole.role_id,
      selectedDeletRole.scope_id,
      setAlert
    )
    // await deleteDepartment(selectedDept, setAlert)
  }

  const handleDeleteClick = role => {
    setDialogOpen(true)
    setSelectedDeleteRole(role)
  }

  return (
    <ContentMotionDIV className="w-full">
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
        {userRole.map((role, index) => (
          <ContentMotionDIV
            key={index}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow"
          >
            <div className="mb-2 flex items-center justify-between text-lg font-semibold text-secondary">
              {mapRole(role.role_id)}

              <div
                className={`inline-flex cursor-pointer items-center rounded-md font-medium ${
                  userRole.length === 1
                    ? 'cursor-not-allowed text-gray-400'
                    : 'text-rose-600 hover:text-orange-700'
                }`}
                onClick={() => {
                  if (userRole.length === 1) return
                  handleDeleteClick(role)
                }}
              >
                <RiDeleteBin6Line className="h-5 w-5" />
              </div>
            </div>

            <div className="text-m mb-4 flex flex-col text-gray-600">
              <div className="inline-flex items-center">
                <span className="me-2 flex h-2 w-2 rounded-full bg-secondary"></span>
                <span className="font-semibold">สิทธิ์ :</span>
              </div>
              <span className="ms-5">{mapRole(role.role_id)}</span>
            </div>

            {role.scope_name && (
              <div className="text-m mb-4 flex flex-col text-gray-700">
                <div className="inline-flex items-center">
                  <span className="me-2 flex h-2 w-2 rounded-full bg-secondary"></span>
                  <span className="font-semibold">
                    {role.role_id === 'FACULTY_ADMIN'
                      ? 'คณะ :'
                      : role.role_id === 'PROG_MANAGER'
                        ? 'หลักสูตร :'
                        : 'ภาควิชา :'}
                  </span>
                </div>
                <span className="ms-5">
                  {role.scope_name}
                  {role.year && ` - ${role.year}`}
                </span>
              </div>
            )}

            {role.program && (
              <div className="text-m mb-4 flex flex-col text-gray-700">
                <div className="inline-flex items-center">
                  <span className="me-2 flex h-2 w-2 rounded-full bg-secondary"></span>
                  <span className="font-semibold">หลักสูตร :</span>
                </div>
                <span className="ms-5">{role.program}</span>
              </div>
            )}
          </ContentMotionDIV>
        ))}
      </div>
      <DeleteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        Name={
          selectedDeletRole ? `สิทธ์${mapRole(selectedDeletRole.role_id)}` : ''
        }
      />
    </ContentMotionDIV>
  )
}
export default EditRoleAssign
