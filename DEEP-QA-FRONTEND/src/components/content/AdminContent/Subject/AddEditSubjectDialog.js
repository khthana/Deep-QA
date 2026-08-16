import { useState, useEffect } from 'react'
import ContentMotionDIV from '../../../ContentMotionDIV'
import { useAuth } from '../../../../context/AuthContext'

function AddEditSubjectDialog({
  isOpen,
  subject,
  onClose,
  onEdit,
  onAdd,
  selectedDept,
}) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    subject_id: '',
    subject_name_en: '',
    subject_name_th: '',
    credits: 0,
    description_th: '',
    description_en: '',
  })

  useEffect(() => {
    if (subject) {
      const {
        subject_id,
        subject_name_en,
        subject_name_th,
        credits,
        description_th,
        description_en,
      } = subject

      setForm({
        subject_id,
        subject_name_en,
        subject_name_th,
        credits,
        description_th,
        description_en,
        email: profile.email,
        department: selectedDept,
      })
    } else {
      setForm({
        subject_id: '',
        subject_name_en: '',
        subject_name_th: '',
        credits: 0,
        description_th: '',
        description_en: '',
        email: profile.email,
        department_id: selectedDept,
      })
    }
  }, [subject, isOpen])

  const handleChange = e => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleCreditsChange = e => {
    setForm(prev => ({ ...prev, credits: parseInt(e.target.value) }))
  }

  const handleSubmit = () => {
    if (subject) {
      onEdit(form)
    } else {
      onAdd(form)
    }
  }

  return (
    <div>
      {isOpen && (
        <ContentMotionDIV className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-2 w-full text-center text-2xl text-secondary">
              {subject ? 'แก้ไขรายวิชา' : 'เพิ่มรายวิชา'}
            </div>
            <div className="mb-3 inline-flex w-full gap-4">
              <div className="flex-1">
                <InputField
                  label="รหัสวิชา"
                  name="subject_id"
                  value={form.subject_id}
                  onChange={handleChange}
                />
              </div>
              <div className="flex-1">
                <InputField
                  label="หน่วยกิต"
                  type="number"
                  name="credits"
                  value={form.credits}
                  onChange={handleCreditsChange}
                />
              </div>
            </div>
            <div className="space-y-3">
              <InputField
                label="ชื่อวิชา (ไทย)"
                name="subject_name_th"
                value={form.subject_name_th}
                onChange={handleChange}
              />

              <InputField
                label="ชื่อวิชา (อังกฤษ)"
                name="subject_name_en"
                value={form.subject_name_en}
                onChange={handleChange}
              />

              <div>
                <label className="mb-1 text-sm text-gray-600">
                  คำอธิบาย (ไทย)
                </label>
                <textarea
                  name="description_th"
                  value={form.description_th}
                  onChange={handleChange}
                  placeholder="คำอธิบาย (ไทย)"
                  className="w-full rounded border p-2 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 text-sm text-gray-600">
                  คำอธิบาย (อังกฤษ)
                </label>
                <textarea
                  name="description_en"
                  value={form.description_en}
                  onChange={handleChange}
                  placeholder="คำอธิบาย (อังกฤษ)"
                  className="w-full rounded border p-2 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800 transition hover:bg-gray-300"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                className="rounded-lg bg-secondary px-4 py-2 font-medium text-white shadow-md transition hover:bg-secondary"
              >
                {subject ? 'บันทึกการแก้ไข' : 'เพิ่มรายวิชา'}
              </button>
            </div>
          </div>
        </ContentMotionDIV>
      )}
    </div>
  )
}
export default AddEditSubjectDialog

const InputField = ({ label, name, value, onChange, type = 'text' }) => (
  <div className="flex flex-col text-gray-900">
    <label className="mb-1 text-sm text-gray-600">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className="rounded-lg border p-2 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
      required
      onInvalid={e => e.target.classList.add('border-red-500')}
      onInput={e => e.target.classList.remove('border-red-500')}
    />
  </div>
)
