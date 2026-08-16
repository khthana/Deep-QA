import { useState, useEffect, useMemo } from 'react'
import { FaWeight } from 'react-icons/fa'
import { AnimatePresence } from 'framer-motion'
import ContentTitle from '../../../ContentTitle'
import ContentMotionDIV from '../../../ContentMotionDIV'
import TableHeader from '../../../TableHeader'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import DeleteDialog from '../../../DeleteDialog'
import { EditBT, SaveBT, DeleteBT, CancleBT } from '../../../BT'
import ImportGradingWeightsDialog from './ImportGradingWeightsDialog'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import MotionTr from '../../../MotionTr'
import { LuImport } from 'react-icons/lu'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'

function GradingWeights() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  const [sessionExpired, setSessionExpired] = useState(false)
  const savedCourse = JSON.parse(localStorage.getItem('selectedCourse'))
  const section = localStorage.getItem('section_number') || ''
  const section_id = localStorage.getItem('section_id') || ''
  const term = localStorage.getItem('term') || ''
  const year = localStorage.getItem('year') || ''
  const [backupScores, setBackupScores] = useState([])
  const [scores, setScores] = useState([])
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({})

  useEffect(() => {
    const courseData = JSON.parse(localStorage.getItem('selectedCourse'))
    const termData = localStorage.getItem('term')
    const yearData = localStorage.getItem('year')

    if (courseData && termData && yearData) {
      const payload = {
        year: yearData,
        semester: termData,
        subject_id: courseData.subject_id,
        section_id: section_id,
      }
      // console.log('Fetching scores with payload:', payload)
      setFormData(payload)
      fetchScore()
    }
  }, [])

  const handleAddRow = () => {
    setScores(prev => [
      ...prev,
      {
        score_ratio_id: null,
        sequence_order: prev.length + 1,
        score_category: '',
        weight: 0,
      },
    ])
  }

  const handleCancel = () => {
    setEditMode(false)
    fetchScore()
  }

  const handleDelete = data => {
    setScores(prev =>
      prev.filter(row => row.sequence_order !== data.sequence_order)
    )
    fetchDeleteScore(data.score_ratio_id)
  }

  const handleChangeRow = (id, field, value) => {
    setScores(prev =>
      prev.map(row =>
        row.sequence_order === id ? { ...row, [field]: value } : row
      )
    )
  }

  const handleEdit = () => {
    setEditMode(true)
    setAlert({
      open: true,
      message: `กำลังแก้ไขสัดส่วนคะแนน`,
      severity: 'warning',
    })
  }

  const handleSave = () => {
    const total = scores.reduce((s, r) => s + Number(r.weight || 0), 0)

    if (total !== 100 && scores.length > 0) {
      setAlert({
        open: true,
        message: 'กรุณากกรอกปรับสัดส่วนคะแนน ให้ผลรวมเท่ากับ 100 คะแนน ',
        severity: 'warning',
      })
      return
    }

    const payload = {
      year,
      semester: term,
      subject_id: savedCourse.subject_id,
      section_id: section_id,
      subject_score: scores,
    }

    // console.log(payload)
    fetchCreateScore(payload)
    setEditMode(false)
  }

  const fetchCreateScore = async payload => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjectScore/upsert`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (res.ok) {
        setAlert({
          open: true,
          message: 'บันทึกสัดส่วนคะแนนสำเร็จ',
          severity: 'success',
        })
      }

      fetchScore(payload)
    } catch (err) {
      console.error(err)
      setAlert({
        open: true,
        message: 'บันทึกสัดส่วนคะแนนไม่สำเร็จ',
        severity: 'error',
      })
    }
  }

  const fetchScore = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjectScore/get/${section_id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()
      // console.log('Fetched scores:', data)
      setScores(data.data.subject_score || [])
    } catch (err) {
      setScores([])
    }
  }

  const fetchDeleteScore = async id => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjectScore/delete/${id}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()
      // console.log('Delete response:', res.status)
      if (res.ok) {
        setAlert({
          open: true,
          message: 'ลบสัดส่วนคะแนนสำเร็จ',
          severity: 'success',
        })
      }
    } catch (err) {
      // console.error(err)
      setAlert({
        open: true,
        message: 'ลบสัดส่วนคะแนนไม่สำเร็จ',
        severity: 'error',
      })
    }
  }

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentSubjectTitle />
      <ContentMotionDIV className="flex h-full flex-col gap-2 rounded-xl bg-white p-6 shadow">
        <div className="inline-flex w-full justify-between align-middle">
          <ContentTitle titlename="สัดส่วนคะแนน" icon={FaWeight} />
          <div className="flex flex-row gap-2">
            <button
              type="button"
              className="flex items-center justify-center rounded-lg bg-cyan-600 px-5 py-2.5 text-center font-medium text-white hover:bg-cyan-700"
              onClick={() => setImportDialogOpen(true)}
            >
              <LuImport className="me-2 h-5 w-5" />
              นำเข้าข้อมูล
            </button>
            {!editMode ? (
              <button
                onClick={() => handleEdit()}
                type="button"
                className="flex items-center justify-center rounded-lg bg-secondary px-5 py-2.5 font-medium text-white hover:bg-secondary_hover
              "
              >
                แก้ไขสัดส่วนคะแนน
              </button>
            ) : (
              <div className="flex flex-row gap-2">
                <button
                  onClick={() => handleSave()}
                  type="button"
                  className="flex items-center justify-center rounded-lg bg-secondary px-5 py-2.5 font-medium text-white hover:bg-secondary_hover
              "
                >
                  บันทึก
                </button>
                <button
                  onClick={handleCancel}
                  type="button"
                  className="flex items-center justify-center rounded-lg bg-gray-400 px-5 py-2.5 font-medium text-white hover:bg-gray-500
              "
                >
                  ยกเลิก
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="mt-0 w-full overflow-x-auto rounded-xl">
          <table className="text-m min-w-full border-gray-300 text-center text-gray-700">
            <TableHeader
              columns={[
                { label: 'ลำดับที่', w: 'w-[100px]' },
                { label: 'ชื่อสัดส่วนคะแนน', align: 'left' },
                { label: 'น้ำหนัก (%)', w: 'w-[120px]' },
                editMode && { label: 'ดำเนินการ', w: 'w-[100px]' },
              ].filter(Boolean)}
            />
            <tbody>
              <AnimatePresence>
                {scores.map((row, idx) => (
                  <MotionTr
                    key={row.sequence_order}
                    className="border-b border-gray-200 bg-white hover:bg-gray-50"
                  >
                    <td className="border-l px-2 py-2">{idx + 1}</td>
                    <td className="px-2 py-2 text-left">
                      {editMode ? (
                        <input
                          value={row.score_category}
                          onChange={e =>
                            handleChangeRow(
                              row.sequence_order,
                              'score_category',
                              e.target.value
                            )
                          }
                          className="w-full rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        row.score_category
                      )}
                    </td>
                    <td className="border-r px-2 py-2">
                      {editMode ? (
                        <input
                          type="number"
                          min={0}
                          value={row.weight}
                          onChange={e =>
                            handleChangeRow(
                              row.sequence_order,
                              'weight',
                              Number(e.target.value)
                            )
                          }
                          className="w-20 rounded border px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        row.weight
                      )}
                    </td>
                    {editMode && (
                      <td className=" border-r px-2 py-2">
                        <ContentMotionDIV className="flex justify-center gap-4">
                          <DeleteBT
                            item={row}
                            onDelete={() => handleDelete(row)}
                          />
                        </ContentMotionDIV>
                      </td>
                    )}
                  </MotionTr>
                ))}
              </AnimatePresence>
              <AnimatePresence>
                {editMode && (
                  <MotionTr className="bg-slate-50">
                    <td colSpan={4} className="px-4 py-2">
                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="w-full rounded-lg border border-dashed border-slate-400 px-3 py-2 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        + เพิ่มสัดส่วนคะแนน
                      </button>
                    </td>
                  </MotionTr>
                )}
              </AnimatePresence>
              {scores.length > 0 && (
                <tr className="bg-blue-100 font-semibold ">
                  <td
                    className="whitespace-nowrap px-4 py-3 text-left  "
                    colSpan={2}
                  >
                    คะแนนรวมทั้งหมด
                  </td>
                  <td
                    className={`px-4 py-3 font-bold ${
                      scores.reduce(
                        (sum, item) => sum + Number(item.weight || 0),
                        0
                      ) !== 100
                        ? 'text-red-500'
                        : 'text-green-600'
                    }`}
                  >
                    {scores.reduce(
                      (sum, item) => sum + Number(item.weight || 0),
                      0
                    )}
                  </td>
                  {editMode && <td>คะแนน</td>}
                </tr>
              )}
            </tbody>
          </table>
        </div>

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

        <DeleteDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          // onConfirm={confirmDelete}
          // Name={selectedItem?.criteria}
        />

        <ImportGradingWeightsDialog
          isOpen={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
          section_id={section_id}
          semesterId={term}
          subjectId={savedCourse.subject_id}
          setAlert={setAlert}
          fetchGradingWeights={fetchScore}
        />
      </ContentMotionDIV>
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}

export default GradingWeights
