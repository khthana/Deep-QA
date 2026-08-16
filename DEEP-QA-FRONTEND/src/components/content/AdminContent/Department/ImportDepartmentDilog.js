import { useState } from 'react'
import { FaDownload } from 'react-icons/fa'
import { LuImport } from 'react-icons/lu'
import ContentMotionDIV from '../../../ContentMotionDIV'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { useAuth } from '../../../../context/AuthContext'

function ImportDepartmentDialog({
  isOpen,
  onClose,
  setAlert,
  fetchDepartments,
}) {
  const [selectedFile, setSelectedFile] = useState(null)
  const { profile } = useAuth()
  const handleUpload = async () => {
    if (!selectedFile) {
      setAlert({
        open: true,
        message: `กรุณาอัปโหลดไฟล์ ก่อนนำเข้าข้อมูล`,
        severity: 'info',
      })
      return
    }
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('scope', profile.role[0].scope_id)
    onClose()
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/department/import-departments`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
        }
      )

      const data = await res.json()
      if (res.ok) {
        setAlert({
          open: true,
          message: `นำเข้าไฟล์ภาควิชา สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `นำเข้าไฟล์ภาควิชา ไม่สำเร็จ`,
          severity: 'error',
        })
      }
      console.log('Import success:', data)
      fetchDepartments()
      setSelectedFile(null)
      onClose()
    } catch (error) {
      console.error('Import file failed:', error)
    }
  }

  return (
    <div>
      {isOpen && (
        <ContentMotionDIV className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="relative mb-48 w-[90%] max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-2 text-center text-2xl text-secondary">
              อัปโหลดไฟล์ภาควิชา
            </div>
            <p className="text-center text-sm text-gray-600">
              กรุณาอัปโหลดไฟล์{' '}
              <span className="font-medium">CSV หรือ Excel</span>
              <br />
              สำหรับเพิ่มภาควิชา
            </p>
            <div className="my-4 flex flex-col items-center">
              <button
                onClick={handleDownloadDepartmentTemplate}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-green-700"
              >
                <FaDownload className="h-4 w-4" /> ดาวน์โหลดไฟล์ตัวอย่าง
              </button>
            </div>
            <label className="block w-full cursor-pointer">
              <input
                type="file"
                accept=".csv,.xlsx,.json"
                onChange={e => setSelectedFile(e.target.files[0])}
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
                นำเข้าไฟล์ภาควิชา
              </button>
            </div>
          </div>
        </ContentMotionDIV>
      )}
    </div>
  )
}

export default ImportDepartmentDialog

const handleDownloadDepartmentTemplate = () => {
  const headers = ['department_id', 'department_name_en', 'department_name_th']

  const rows = [
    {
      department_id: '',
      department_name_en: '',
      department_name_th: '',
    },
  ]

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers })

  worksheet['!cols'] = [
    { wch: 14 }, // department_id
    { wch: 28 }, // department_name_en
    { wch: 28 }, // department_name_th
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Departments')

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })

  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  saveAs(blob, 'department-template.xlsx')
}
