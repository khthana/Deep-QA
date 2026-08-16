import { useState } from 'react'
import { AnimatePresence, frameData, motion } from 'framer-motion'
import { FaDownload } from 'react-icons/fa'
import { LuImport } from 'react-icons/lu'
import ContentMotionDIV from '../../../ContentMotionDIV'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

function ImportSubjectStudentsDialog({
  isOpen,
  onClose,
  setAlert,
  fetchStudents,
}) {
  const [selectedFile, setSelectedFile] = useState(null)
  const section_id = localStorage.getItem('section_id') || ''

  const handleUpload = async () => {
    console.log('Selected file:', section_id)
    if (!selectedFile) {
      setAlert({
        open: true,
        message: 'กรุณาอัปโหลดไฟล์ก่อนนำเข้าข้อมูล',
        severity: 'warning',
      })
      return
    }

    onClose()

    const fd = new FormData()
    fd.append('file', selectedFile)
    fd.append('section_id', section_id)

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/studentCourse/import`,
        {
          method: 'POST',
          body: fd,
          credentials: 'include',
        },
      )

      let data = {}
      try {
        data = await res.json()
      } catch {}

      if (res.ok) {
        setAlert?.({
          open: true,
          message: 'นำเข้านักศึกษาในรายวิชา สำเร็จ',
          severity: 'success',
        })
      } else {
        setAlert?.({
          open: true,
          message: data?.message || 'นำเข้ากลุ่มนักศึกษา ไม่สำเร็จ',
          severity: 'error',
        })
      }

      fetchStudents()
      setSelectedFile(null)
    } catch (error) {
      console.error('Import file failed:', error)
      setAlert({
        open: true,
        message: 'เกิดข้อผิดพลาดระหว่างนำเข้าไฟล์',
        severity: 'error',
      })
    }
  }

  return (
    <div>
      <AnimatePresence>
        {isOpen && (
          <ContentMotionDIV className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="relative mb-48 w-[90%] max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-2 text-center text-2xl text-secondary">
                อัปโหลดรายชื่อนักศึกษาในรายวิชา
              </div>

              <p className="text-center text-sm text-gray-600">
                กรุณาอัปโหลดไฟล์{' '}
                <span className="font-medium">CSV หรือ Excel</span>
                <br />
                สำหรับเพิ่มรายชื่อนักศึกษาในรายวิชา
              </p>

              <div className="my-4 flex flex-col items-center">
                <button
                  onClick={handleDownloadStudentMiniTemplate}
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
                  onChange={(e) => {
                    setSelectedFile(e.target.files[0])
                  }}
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

              <div className="my-6 border-t border-gray-200" />

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
                  นำเข้ารายชื่อนักศึกษา
                </button>
              </div>
            </div>
          </ContentMotionDIV>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ImportSubjectStudentsDialog

const handleDownloadStudentMiniTemplate = () => {
  const headers = ['student_id', 'first_name_th', 'last_name_th']

  const rows = [
    {
      student_id: '',
      first_name_th: '',
      last_name_th: '',
    },
  ]

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers })

  worksheet['!cols'] = [
    { wch: 16 }, // student_id
    { wch: 22 }, // first_name_th
    { wch: 22 }, // last_name_th
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

  saveAs(blob, 'student-mini-template.xlsx')
}
