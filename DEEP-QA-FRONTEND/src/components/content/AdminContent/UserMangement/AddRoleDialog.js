import { useState, useEffect } from 'react'
import { mapRole } from '../../../MapRole'
import { useAuth } from '../../../../context/AuthContext'
import { useAssignableRoles } from '../../../../hooks/useAssignableRoles'
import { useAddUserRole } from '../../../../hooks/useAddUserRole'
import { useScope } from '../../../../hooks/useScope'
import ContentMotionDIV from '../../../ContentMotionDIV'

function AddRoleDialog({
  setShowDialog,
  Role,
  selectedUserName,
  fetchUserRole,
  setAlert,
  fetchUserList,
}) {
  const { profile } = useAuth()
  const { scope, fetchScope } = useScope()
  const canAssignRole = useAssignableRoles(mapRole(Role), selectedUserName)
  const { addUserRole } = useAddUserRole(fetchUserRole)
  const [formData, setFormData] = useState({
    user_email: '',
    role_id: '',
    scope_id: '',
    assigned_by: '',
  })

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      user_email: selectedUserName.email,
      assigned_by: profile.email,
    }))
  }, [profile])

  const handleScopeChange = async e => {
    const scopeID = e.target.value
    setFormData({
      ...formData,
      scope_id: scopeID,
    })
  }

  const handleRoleChange = async e => {
    const role = e.target.value
    const scopeID = localStorage.getItem('scopeID')
    setFormData(prev => ({
      ...prev,
      role_id: role,
    }))
    fetchScope(role, scopeID, selectedUserName)
  }

  return (
    <ContentMotionDIV className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="mb-48 w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 text-center text-2xl font-medium text-secondary">
          เพิ่มสิทธ์ {selectedUserName.first_name_th}{' '}
          {selectedUserName.last_name_th}
        </div>
        <form
          className="space-y-4"
          onSubmit={e =>
            addUserRole(
              formData,
              selectedUserName,
              setAlert,
              setShowDialog,
              fetchUserList,
              e
            )
          }
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              สิทธิ์
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              onChange={handleRoleChange}
              required
            >
              <option key="0" value="">
                -- เลือกสิทธิ์ --
              </option>
              {canAssignRole.map(role => (
                <option key={role.role_id} value={role.role_id}>
                  {mapRole(role.role_id)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              ขอบเขต ภาควิชา หรือ หลักสูตร
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={formData.scope_id}
              onChange={handleScopeChange}
              required
              disabled={!scope}
            >
              <option value="">-- เลือกขอบเขต --</option>
              {scope &&
                scope.map(scope => (
                  <option key={scope.scope_id} value={scope.scope_id}>
                    {scope.scope_id} - {scope.nameTH} - {scope.year}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowDialog(false)}
              className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="rounded-md bg-secondary px-4 py-2 text-white hover:bg-secondary"
            >
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </ContentMotionDIV>
  )
}

export default AddRoleDialog
