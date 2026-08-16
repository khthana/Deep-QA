import { useState } from 'react'
import { motion } from 'framer-motion'
import { FaDownload } from 'react-icons/fa'
import { LuImport } from 'react-icons/lu'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

function ImportActivityScoresDialog({
  isOpen,
  onClose,
  setAlert,
  clo,
  groupType,
  section_id,
  cloMappings,
  fetchScoreData,
  selectedActivity,
  students,
  group_list,
}) {
  const [selectedFile, setSelectedFile] = useState(null)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  const handleDownloadScoreTemplate = () => {
    if (!selectedActivity) return

    const cloIds = cloMappings || []

    // header เริ่มต้น
    let headers = groupType === 'group' ? ['group_name'] : ['id', 'name']
    let rows = []

    // source data
    const source =
      groupType === 'group'
        ? group_list.map((g) => ({
            name: g.group_name,
          }))
        : students.map((s) => ({
            id: s.student_id,
            name: `${s.title_th}${s.full_name_th}`,
          }))

    // ===== CLO MODE =====
    if (clo === 'clo') {
      const cloHeaders = cloIds.map((item) => `CLO-${item.clo_number}`)
      headers = [...headers, ...cloHeaders]

      rows = source.map((item) => {
        const row =
          groupType === 'group'
            ? { group_name: item.name }
            : { id: item.id, name: item.name }

        cloHeaders.forEach((c) => (row[c] = 0))
        return row
      })
    }
    // ===== TOTAL MODE =====
    else {
      headers.push('total_score')

      rows = source.map((item) =>
        groupType === 'group'
          ? { group_name: item.name, total_score: 0 }
          : { id: item.id, name: item.name, total_score: 0 },
      )
    }

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers })

    // column width
    worksheet['!cols'] =
      groupType === 'group'
        ? [
            { wch: 35 }, // group_name
            ...headers.slice(1).map(() => ({ wch: 12 })),
          ]
        : [
            { wch: 10 },
            { wch: 30 },
            ...headers.slice(2).map(() => ({ wch: 12 })),
          ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Scores')

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    })

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    saveAs(
      blob,
      `score-template-${groupType}-${clo === 'clo' ? 'CLO' : 'total'}.xlsx`,
    )
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setAlert?.({
        open: true,
        message: 'กรุณาอัปโหลดไฟล์ ก่อนนำเข้าข้อมูล',
        severity: 'warning',
      })
      return
    }
    setAlert?.({
      open: true,
      message: `กำลังนำเข้าคะแนนกิจกรรม ${selectedActivity.activity_name}`,
      severity: 'info',
    })
    const scoreType = clo === 'clo' ? 'clo' : 'average'

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('activity_id', String(selectedActivity.activity_id))
    formData.append('section_id', String(section_id))
    formData.append('score_type', scoreType)
    formData.append('group', groupType === 'group' ? 'true' : 'false')
    // console.log(clo)
    onClose()
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/activityScore/import`,
        { method: 'POST', body: formData, credentials: 'include' },
      )
      let data = {}
      try {
        data = await res.json()
      } catch {}

      await sleep(1600)
      if (res.ok) {
        setAlert?.({
          open: true,
          message: 'นำเข้าคะแนน สำเร็จ',
          severity: 'success',
        })
      } else {
        console.log(data.errors)
        setAlert?.({
          open: true,
          message: data?.message || 'นำเข้ากลุ่มนักศึกษา ไม่สำเร็จ',
          severity: 'error',
        })
      }
      setSelectedFile(null)
      await fetchScoreData?.(selectedActivity.activity_id)
    } catch (e) {
      // console.error('Import grading weights failed:', e)
      setAlert?.({
        open: true,
        message: 'เกิดข้อผิดพลาดระหว่างนำเข้าไฟล์',
        severity: 'error',
      })
    }
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
    >
      <div className="mb-48 w-[90%] max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="text-center text-2xl text-secondary">
          อัปโหลดคะแนนกิจกรรม
        </div>

        <p className="text-center text-sm text-gray-600">
          คะแนนที่อัปโหลดจะถูกบันทึกตาม{' '}
          <span className=" text-secondary">กิจกรรมที่เลือก</span>
          <br />
          ไฟล์ตัวอย่างจะปรับเปลี่ยนตามรูปแบบการกรอกคะแนน
          <br />
          <span className=" text-secondary">
            ( แยกตาม CLO , คะแนนรวม , แบบกลุ่ม , แบบรายบุคคล )
          </span>
        </p>
        <div className="my-4 flex flex-col items-center">
          <button
            onClick={handleDownloadScoreTemplate}
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

        <div className="mt-4 flex flex-row items-center justify-between gap-2 rounded-lg bg-blue-100 px-4 py-3 text-xs shadow-sm">
          <span className="text-secondary">รูปแบบการนำเข้า</span>

          <div className="flex gap-2">
            <span className="rounded-full bg-white px-3 py-1 font-medium text-secondary shadow">
              {clo === 'clo' ? 'คะแนนแยกตาม CLO' : 'คะแนนรวมทั้งหมด'}
            </span>

            <span className="rounded-full bg-white px-3 py-1 font-medium text-secondary shadow">
              {groupType === 'group' ? 'แบบกลุ่ม' : 'แบบรายบุคคล'}
            </span>
          </div>
        </div>

        <div className="my-4 border-t border-gray-200" />

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
            นำเข้าข้อมูล
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default ImportActivityScoresDialog
