import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaDownload } from 'react-icons/fa'
import { useAuth } from '../../../../context/AuthContext'
import { useImportUsers } from '../../../../hooks/useImportUsers'
import { LuImport } from 'react-icons/lu'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

function ImportUserDialog({ isOpen, onClose, setAlert, fetchUserList }) {
  const { profile } = useAuth()
  const [selectedFile, setSelectedFile] = useState(null)
  const [assignedBy, setAssignedBy] = useState('')
  const { importUsers } = useImportUsers(fetchUserList)

  useEffect(() => {
    if (profile?.email) {
      setAssignedBy(profile.email || '')
    }
  }, [profile])

  const handleUpload = async () => {
    if (!selectedFile) {
      setAlert({
        open: true,
        message: `กรุณาอัปโหลดไฟล์ ก่อนนำเข้าข้อมูล`,
        severity: 'warning',
      })
      return
    }
    importUsers(selectedFile, assignedBy, setAlert)
    onClose()
  }

  return (
    <div>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
        >
          <div className="relative mb-48 w-[90%] max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-2 text-center text-2xl text-secondary">
              อัปโหลดไฟล์ผู้ใช้งานระบบ
            </div>
            <p className="text-center text-sm text-gray-600">
              กรุณาอัปโหลดไฟล์{' '}
              <span className="font-medium">CSV, Excel หรือ JSON</span>
              <br />
              สำหรับเพิ่มผู้ใช้งานเข้าสู่ระบบ
            </p>

            <div className="my-4 flex flex-col items-center">
              <button
                onClick={handleDownloadStudentTemplate}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-green-700"
              >
                <FaDownload className="h-4 w-4" />
                ดาวน์โหลดไฟล์ตัวอย่าง
              </button>
            </div>
            <label className="block w-full cursor-pointer">
              <input
                type="file"
                accept=".csv,.xlsx,.json"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="hidden"
              />
              <div className="flex w-full flex-row justify-center rounded-lg border border-dashed border-blue-300 p-6 transition hover:bg-blue-50">
                {selectedFile ? (
                  <span className="text-sm font-medium text-gray-700">
                    📂 {selectedFile.name}
                  </span>
                ) : (
                  <span className="flex flex-col items-center justify-center text-sm text-gray-400">
                    <LuImport className="mb-4 h-12 w-12 text-blue-400" />
                    คลิกเพื่อเลือกไฟล์
                  </span>
                )}
              </div>
            </label>

            <div className="my-6 border-t border-gray-200"></div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  onClose()
                  setSelectedFile(null)
                }}
                className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800 transition hover:bg-gray-300"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleUpload}
                className="rounded-lg bg-secondary px-4 py-2 font-medium text-white shadow-md transition hover:bg-secondary"
              >
                นำเข้าผู้ใช้งาน
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default ImportUserDialog

const handleDownloadStudentTemplate = () => {
  const headers = [
    'title_th',
    'f_name_th',
    's_name_th',
    'title_en',
    'f_name_en',
    's_name_en',
    'email',
    'program_id',
    'role_id',
  ]

  // row ตัวอย่าง 1 แถว (ว่างๆ)
  const rows = [
    {
      title_th: '',
      f_name_th: '',
      s_name_th: '',
      title_en: '',
      f_name_en: '',
      s_name_en: '',
      email: '',
      program_name: '',
      role_id: '',
    },
  ]

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers })

  // ตั้งความกว้าง column
  worksheet['!cols'] = [
    { wch: 10 }, // title_th
    { wch: 18 }, // f_name_th
    { wch: 18 }, // s_name_th
    { wch: 10 }, // title_en
    { wch: 18 }, // f_name_en
    { wch: 18 }, // s_name_en
    { wch: 28 }, // email
    { wch: 12 }, // program_id
    { wch: 10 }, // role_id
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students')

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })

  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  saveAs(blob, 'student-template.xlsx')
}
