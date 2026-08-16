import { useState, useEffect } from 'react'
import { mapRole } from '../../../MapRole'
import { useAuth } from '../../../../context/AuthContext'
import { useAssignableRoles } from '../../../../hooks/useAssignableRoles'
import { useScope } from '../../../../hooks/useScope'
import { useAddUser } from '../../../../hooks/useAddUser'
import { titleMap, getThaiTitle, getEnglishTitle } from '../../../titleMap'
import ContentMotionDIV from '../../../ContentMotionDIV'
import { FiEye, FiEyeOff } from 'react-icons/fi'

function AddUserDialog({
  isOpen,
  onClose,
  Role,
  setAlert,
  fetchUserList,
  targetEmail,
}) {
  const { profile } = useAuth()
  const { scope, fetchScope } = useScope()
  const { addUser } = useAddUser(fetchUserList)
  const canAssignRole = useAssignableRoles(mapRole(Role, targetEmail))
  const [formData, setFormData] = useState({
    user_email: '',
    email: '',
    phone: '',
    title_th: '',
    first_name_th: '',
    last_name_th: '',
    title_en: '',
    first_name_en: '',
    last_name_en: '',
    department_name_th: '',
    program_name_th: '',
    password: '',
    role_id: '',
    scope_id: '',
  })

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      user_email: profile.email,
    }))
  }, [profile])

  const handleScopeChange = async (e) => {
    const scopeID = e.target.value
    setFormData({
      ...formData,
      scope_id: scopeID,
    })
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // console.log('--- Check Data Before Add ---')
    // console.log('Form Data:', formData)

    if (!formData.first_name_th) {
      console.error('Missing first name!')
      return
    }
    addUser(formData, profile, setAlert, onClose, setFormData)
  }

  const handleRoleChange = async (e) => {
    const role = e.target.value
    const scopeID = localStorage.getItem('scopeID')
    setFormData((prev) => ({
      ...prev,
      role_id: role,
    }))
    fetchScope(role, scopeID)
  }

  const handleChangeTitle = (e) => {
    const { name, value } = e.target

    if (name === 'title_th') {
      setFormData((prev) => ({
        ...prev,
        title_th: value,
        title_en: getEnglishTitle(value),
      }))
    } else if (name === 'title_en') {
      setFormData((prev) => ({
        ...prev,
        title_en: value,
        title_th: getThaiTitle(value),
      }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  return (
    <div>
      {isOpen && (
        <ContentMotionDIV className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="relative mb-10 max-h-[90vh] w-[95%] max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 text-center text-2xl text-secondary">
              เพิ่มผู้ใช้งานใหม่
            </div>
            <div className="my-6 border-t border-gray-200"></div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 text-gray-900 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <InputField
                    label="อีเมล"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  <DropdownField
                    label="คำนำหน้า (ไทย)"
                    name="title_th"
                    value={formData.title_th}
                    onChange={handleChangeTitle}
                    options={Object.keys(titleMap)}
                  />
                  <InputField
                    label="ชื่อ (ไทย)"
                    name="first_name_th"
                    value={formData.first_name_th}
                    onChange={handleChange}
                  />
                  <InputField
                    label="นามสกุล (ไทย)"
                    name="last_name_th"
                    value={formData.last_name_th}
                    onChange={handleChange}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <InputField
                    label="เบอร์โทรศัพท์"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />

                  <DropdownField
                    label="คำนำหน้า (อังกฤษ)"
                    name="title_en"
                    value={formData.title_en}
                    onChange={handleChangeTitle}
                    options={Object.values(titleMap)}
                  />
                  <InputField
                    label="ชื่อ (อังกฤษ)"
                    name="first_name_en"
                    value={formData.first_name_en}
                    onChange={handleChange}
                  />
                  <InputField
                    label="นามสกุล (อังกฤษ)"
                    name="last_name_en"
                    value={formData.last_name_en}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="my-2 mb-1 flex flex-col gap-2">
                <InputField
                  label="รหัสผ่าน"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                />

                <label className="text-sm text-gray-600">สิทธ์</label>
                <select
                  name="department_name_th"
                  value={formData.role_name}
                  onChange={handleRoleChange}
                  className="rounded-lg border p-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                >
                  <option value="">-- เลือกสิทธ์ --</option>
                  {canAssignRole.map((role) => (
                    <option key={role.role_id} value={role.role_id}>
                      {mapRole(role.role_id)}
                    </option>
                  ))}
                </select>

                <div className="flex flex-col">
                  <label className="text-sm text-gray-600">
                    ขอบเขต หลักสูตร หรือ ภาควิชา
                  </label>
                  <select
                    name="department_name_th"
                    value={formData.scope_id}
                    onChange={handleScopeChange}
                    className="rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                    disabled={!scope}
                  >
                    <option value="">-- เลือกขอบเขต --</option>
                    {scope &&
                      scope.map((scope) => (
                        <option key={scope.scope_id} value={scope.scope_id}>
                          {scope.nameTH}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="my-6 border-t border-gray-200"></div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800 transition hover:bg-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-secondary px-4 py-2 font-medium text-white shadow-md transition hover:bg-secondary"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </ContentMotionDIV>
      )}
    </div>
  )
}

const InputField = ({ label, name, value, onChange, type = 'text' }) => {
  const [show, setShow] = useState(false)

  const isPassword = type === 'password'

  return (
    <div className="flex flex-col text-gray-900">
      <label className="mb-1 text-sm text-gray-600">{label}</label>

      <div className="relative">
        <input
          type={isPassword ? (show ? 'text' : 'password') : type}
          name={name}
          value={value}
          onChange={onChange}
          className="w-full rounded-lg border p-2 pr-10 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          onInvalid={(e) => e.target.classList.add('border-red-500')}
          onInput={(e) => e.target.classList.remove('border-red-500')}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
          >
            {show ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        )}
      </div>
    </div>
  )
}

const DropdownField = ({ label, name, value, onChange, options }) => (
  <div className="mb-4 flex flex-col text-gray-900">
    <label className="mb-1 text-sm text-gray-600">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
      required
      onInvalid={(e) => e.target.classList.add('border-red-500')}
      onInput={(e) => e.target.classList.remove('border-red-500')}
    >
      <option value="" disabled hidden className="text-gray-400">
        -- เลือก {label} --
      </option>
      {options.map((opt, idx) => (
        <option key={idx} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
)

export default AddUserDialog
