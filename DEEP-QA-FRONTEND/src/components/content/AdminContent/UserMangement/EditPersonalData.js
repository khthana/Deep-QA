import ContentMotionDIV from '../../../ContentMotionDIV'
import { titleMap, getThaiTitle, getEnglishTitle } from '../../../titleMap'

function EditPerosonalData({
  isEditing,
  setPersonalFormData,
  personalFormData,
  fetchUserList,
}) {
  const handleChange = e => {
    const { name, value } = e.target
    setPersonalFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleChangeTitle = e => {
    const { name, value } = e.target

    if (name === 'title_th') {
      setPersonalFormData(prev => ({
        ...prev,
        title_th: value,
        title_en: getEnglishTitle(value),
      }))
    } else if (name === 'title_en') {
      setPersonalFormData(prev => ({
        ...prev,
        title_en: value,
        title_th: getThaiTitle(value),
      }))
    } else {
      setPersonalFormData(prev => ({ ...prev, [name]: value }))
    }
    // console.log(personalFormData)
  }

  return (
    <ContentMotionDIV>
      <div className="mx-auto rounded bg-white p-6 shadow">
        <div className="mb-6 text-2xl font-medium text-secondary">
          ข้อมูลส่วนตัว
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="mb-4">
            <label className="mb-1 block font-medium">อีเมล</label>
            <input
              type="email"
              name="email"
              value={personalFormData.email}
              onChange={handleChange}
              disabled={!isEditing}
              className={`w-full rounded border px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition${
                isEditing ? 'border-blue-500' : 'bg-gray-100'
              }`}
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block font-medium">เบอร์โทรศัพท์</label>
            <input
              type="text"
              name="phone"
              value={personalFormData.phone}
              onChange={handleChange}
              disabled={!isEditing}
              className={`w-full rounded border px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition${
                isEditing ? 'border-blue-500' : 'bg-gray-100'
              }`}
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block font-medium">คำนำหน้า (ไทย)</label>
            <DropdownField
              name="title_th"
              value={personalFormData.title_th}
              disabled={!isEditing}
              onChange={handleChangeTitle}
              options={Object.keys(titleMap)}
              className={`w-full rounded border px-3 py-2 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isEditing ? 'border-blue-500' : 'bg-gray-100'
              }`}
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block font-medium">คำนำหน้า (อังกฤษ)</label>
            <DropdownField
              name="title_en"
              value={personalFormData.title_en}
              disabled={!isEditing}
              onChange={handleChangeTitle}
              options={Object.values(titleMap)}
              className={`w-full rounded border px-3 py-2 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isEditing ? 'border-blue-500' : 'bg-gray-100'
              }`}
            />
          </div>

          {/* First Name Thai */}
          <div className="mb-4">
            <label className="mb-1 block font-medium">ชื่อ (ไทย)</label>
            <input
              type="text"
              name="first_name_th"
              value={personalFormData.first_name_th}
              onChange={handleChange}
              disabled={!isEditing}
              className={`w-full rounded border px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition${
                isEditing ? 'border-blue-500' : 'bg-gray-100'
              }`}
            />
          </div>
          <div className="mb-4">
            <label className="mb-1 block font-medium">ชื่อ (อังกฤษ)</label>
            <input
              type="text"
              name="first_name_en"
              value={personalFormData.first_name_en}
              onChange={handleChange}
              disabled={!isEditing}
              className={`w-full rounded border px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition${
                isEditing ? 'border-blue-500' : 'bg-gray-100'
              }`}
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block font-medium">นามสกุล (ไทย)</label>
            <input
              type="text"
              name="last_name_th"
              value={personalFormData.last_name_th}
              onChange={handleChange}
              disabled={!isEditing}
              className={`w-full rounded border px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition${
                isEditing ? 'border-blue-500' : 'bg-gray-100'
              }`}
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block font-medium">นามสกุล (อังกฤษ)</label>
            <input
              type="text"
              name="last_name_en"
              value={personalFormData.last_name_en}
              onChange={handleChange}
              disabled={!isEditing}
              className={`w-full rounded border px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition${
                isEditing ? 'border-blue-500' : 'bg-gray-100'
              }`}
            />
          </div>
        </div>
      </div>
    </ContentMotionDIV>
  )
}
export default EditPerosonalData

const DropdownField = ({ label, name, value, onChange, options, disabled }) => (
  <div className="mb-4 flex flex-col text-gray-900">
    <label className="mb-1 text-sm text-gray-600">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className={`w-full rounded border px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition${
        disabled ? 'border-blue-500' : 'bg-gray-100'
      }`}
      required
      disabled={disabled}
      onInvalid={e => e.target.classList.add('border-red-500')}
      onInput={e => e.target.classList.remove('border-red-500')}
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
