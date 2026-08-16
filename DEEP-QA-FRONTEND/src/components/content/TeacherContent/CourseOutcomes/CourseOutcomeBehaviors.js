import { useState, useMemo, useRef, useEffect } from 'react'
import { FaListCheck } from 'react-icons/fa6'
import ContentMotionDIV from '../../../ContentMotionDIV'
import { EditBT, SaveBT, DeleteBT, CancleBT } from '../../../BT'
import TableHeader from '../../../TableHeader'
import MotionTr from '../../../MotionTr'
import { AnimatePresence } from 'framer-motion'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import DeleteDialog from '../../../DeleteDialog'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'
const activityOptions = [
  'ข้อสอบ',
  'แบบฝึกหัด/การบ้าน',
  'งานที่มอบหมาย (Assignment)',
]
const levelOptions = [
  'ความจำ',
  'เข้าใจ',
  'ประยุกต์',
  'วิเคราะห์',
  'ประเมินค่า',
  'ออกแบบ/สร้างสรรค์',
]

function CourseOutcomeBehaviors() {
  const [sessionExpired, setSessionExpired] = useState(false)
  const savedCourse = JSON.parse(localStorage.getItem('selectedCourse'))
  const savedCLO = JSON.parse(localStorage.getItem('selectedCLO'))
  const [behaviors, setBehaviors] = useState([])
  const [editRow, setEditRow] = useState(null)
  const section = localStorage.getItem('section_number') || ''
  const section_id = localStorage.getItem('section_id') || ''
  const term = localStorage.getItem('term') || ''
  const year = localStorage.getItem('year') || ''
  const [isAddMode, setIsAddMode] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [DeleteMsg, SetDeleteMsg] = useState('')
  const [selectedBehavior, setSelectedBehavior] = useState(null)

  const [formData, setFormData] = useState({
    id: null,
    behavior: '',
    activity: '',
    level: '',
  })
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  useEffect(() => {
    const courseData = JSON.parse(localStorage.getItem('selectedCourse'))
    const sectionData = localStorage.getItem('section')
    const termData = localStorage.getItem('term')
    const yearData = localStorage.getItem('year')

    if (courseData && sectionData && termData && yearData && savedCLO) {
      setFormData(prev => ({
        ...prev,
        subject_id: courseData.subject_id,
        year: yearData,
        semester: termData,
        section: sectionData,
        clo_id: savedCLO.clo_id,
        section_id: section_id,
      }))
      fetchBehavior()
    }
  }, [])

  const handleEdit = b => {
    if (isAddMode) return
    setEditRow(b.id)
    setFormData({ ...b })
    setAlert({
      open: true,
      message: 'กำลังแก้ไขข้อมูลพฤติกรรมที่วัดผลได้ตาม CLO',
      severity: 'warning',
    })
  }

  const handleSave = item => {
    setEditRow(null)
    fetchEditBehavior()
    // console.log('Saved data:', formData)
  }

  const handleAddStart = () => {
    if (editRow !== null) return
    setIsAddMode(true)
    setEditRow(null)
    setFormData(prev => ({
      ...prev,
      behavior_no: behaviors.length + 1,
      behavior_detail: '',
      learning_activity: '',
      cognitive_level: '',
    }))
  }

  const handleAddSave = () => {
    fetchAddBehavior()
    setIsAddMode(false)
  }

  const handleAddCancel = () => {
    setIsAddMode(false)
  }

  const handleEditCancel = () => {
    setIsAddMode(false)
    setEditRow(null)
  }

  const handleConfirmDelete = () => {
    setDialogOpen(false)
    fetchDeleteBehavior()
  }

  const { ref, handleChange, handleEnter, handleBlur } = useNumberList(
    formData,
    setFormData,
    'behavior_detail'
  )

  const fetchAddBehavior = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjectBe/create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify(formData),
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (res.ok) {
        setAlert({
          open: true,
          message: `เพิ่มข้อมูลพฤติกรรมที่วัดผลได้ตาม CLO สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `เพิ่มข้อมูลพฤติกรรมที่วัดผลได้ตาม CLO ไม่สำเร็จ`,
          severity: 'error',
        })
      }
      fetchBehavior()
    } catch (err) {
      console.error(err)
    }
  }

  const fetchDeleteBehavior = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjectBe/delete/${selectedBehavior.id}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (res.ok) {
        setAlert({
          open: true,
          message: `ลบข้อมูลพฤติกรรมที่วัดผลได้ตาม CLO สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `ลบข้อมูลพฤติกรรมที่วัดผลได้ตาม CLO ไม่สำเร็จ`,
          severity: 'error',
        })
      }
      fetchBehavior()
    } catch (err) {
      console.error(err)
    }
  }

  const fetchEditBehavior = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjectBe/update`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify(formData),
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (res.ok) {
        setAlert({
          open: true,
          message: `บันทึกข้อมูลพฤติกรรมที่วัดผลได้ตาม CLO สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `บันทึกลบข้อมูลพฤติกรรมที่วัดผลได้ตาม CLO ไม่สำเร็จ`,
          severity: 'error',
        })
      }
      fetchBehavior()
    } catch (err) {
      console.error(err)
    }
  }

  const fetchBehavior = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjectBe/get/${section_id}/${savedCLO.clo_id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()
      setBehaviors(data.data || [])
    } catch (err) {
      console.error(err)
      setBehaviors([])
    }
  }

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-4 rounded-xl bg-white p-6 shadow">
      {/* Title and Add Button */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-lg font-bold text-gray-600">
          <FaListCheck className="text-blue-500" />
          พฤติกรรมที่วัดผลได้ตาม CLO
        </div>
        <button
          onClick={handleAddStart}
          className="rounded-lg bg-secondary px-4 py-2  text-white shadow-sm transition duration-150 hover:bg-secondary_hover"
        >
          + เพิ่มพฤติกรรม
        </button>
      </div>

      <div className="text-m cursor-pointer rounded-lg border border-blue-200 bg-blue-50 p-3 text-secondary transition-all duration-200 hover:border-blue-400 hover:bg-blue-100 hover:shadow-md">
        <span className="font-bold">CLO-{savedCLO.clo_number} </span>:{' '}
        {savedCLO.clo_detail}
      </div>

      <div className="overflow-x-auto rounded-xl shadow">
        <table className="min-w-full text-center text-gray-700">
          <TableHeader columns={columns} />
          <tbody>
            <AnimatePresence>
              {isAddMode && (
                <MotionTr className="border-x border-b bg-white">
                  <td className="w-[60px] p-2 align-top text-gray-400">
                    <input
                      type="number"
                      className="w-full rounded border px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.behavior_no}
                      onChange={e =>
                        setFormData(p => ({
                          ...p,
                          behavior_no: Number(e.target.value),
                        }))
                      }
                    />
                  </td>
                  <td className=" w-[200px] border-x p-2 align-top">
                    <div className="flex items-center align-middle">
                      <select
                        className="w-full rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.learning_activity}
                        onChange={e =>
                          setFormData(p => ({
                            ...p,
                            learning_activity: e.target.value,
                          }))
                        }
                      >
                        <option value="">--</option>
                        {activityOptions.map(a => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="border-x px-2 py-2 text-left">
                    <div className=" flex items-center justify-center">
                      <textarea
                        ref={ref}
                        value={formData.behavior_detail || ''}
                        onChange={handleChange}
                        onKeyDown={handleEnter}
                        onBlur={handleBlur}
                        className="w-full rounded border p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="ระบุเกณฑ์การประเมิน"
                      />
                    </div>
                  </td>
                  <td className="w-[180px] border-x px-2 py-2 text-left align-top">
                    <select
                      className="w-full rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.cognitive_level}
                      onChange={e =>
                        setFormData(p => ({
                          ...p,
                          cognitive_level: e.target.value,
                        }))
                      }
                    >
                      <option value="">--</option>
                      {levelOptions.map(l => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2  align-top">
                    <div className="flex items-center justify-center gap-2">
                      <SaveBT onSave={handleAddSave} />
                      <CancleBT onClick={handleAddCancel} />
                    </div>
                  </td>
                </MotionTr>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {behaviors.map((row, index) => (
                <MotionTr
                  key={row.id}
                  className="h-full border-b bg-white hover:bg-gray-50 "
                >
                  <td className="w-[80px] border-x px-2 py-2 text-center  align-middle">
                    {index + 1}
                  </td>

                  <td className="px-2 py-2 text-left align-top">
                    {editRow === row.id ? (
                      <select
                        className="w-full rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.learning_activity}
                        onChange={e =>
                          setFormData(p => ({
                            ...p,
                            learning_activity: e.target.value,
                          }))
                        }
                      >
                        <option value="">--</option>
                        {activityOptions.map(a => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <ContentMotionDIV>
                        {row.learning_activity}
                      </ContentMotionDIV>
                    )}
                  </td>

                  <td className="border-x px-2 py-2 text-left  align-top">
                    {editRow === row.id ? (
                      <textarea
                        ref={ref}
                        className="w-full rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.behavior_detail || ''}
                        onChange={handleChange}
                        onKeyDown={handleEnter}
                        onBlur={handleBlur}
                      />
                    ) : (
                      <ContentMotionDIV className="whitespace-pre-line">
                        {row.behavior_detail}
                      </ContentMotionDIV>
                    )}
                  </td>

                  <td className="border-x px-2 py-2 align-top">
                    {editRow === row.id ? (
                      <select
                        className="rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.cognitive_level}
                        onChange={e =>
                          setFormData(p => ({
                            ...p,
                            cognitive_level: e.target.value,
                          }))
                        }
                      >
                        <option value="">--</option>
                        {levelOptions.map(l => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <ContentMotionDIV className="text-left">
                        {row.cognitive_level}
                      </ContentMotionDIV>
                    )}
                  </td>

                  <td className="w-[160px] py-2 align-middle">
                    <div className="flex justify-center gap-2">
                      {editRow === row.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <SaveBT item={row} onSave={handleSave} />
                          <CancleBT onClick={handleEditCancel} />
                        </div>
                      ) : (
                        <div className="flex justify-center gap-2">
                          <EditBT item={row} onEdit={handleEdit} />
                          <DeleteBT
                            item={row}
                            onDelete={() => {
                              setDialogOpen(true)
                              SetDeleteMsg('พฤติกรรมที่ ' + (index + 1))
                              setSelectedBehavior(row)
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                </MotionTr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* <PageNumber
        startIndex={startIndex}
        endIndex={endIndex}
        page={page}
        setPage={setPage}
        totalItems={totalItems}
        totalPages={totalPages}
      /> */}

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
        >
          {alert.message}
        </Alert>
      </Snackbar>

      <DeleteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        Name={DeleteMsg}
      />
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}

export default CourseOutcomeBehaviors

const columns = [
  { label: 'ลำดับที่', w: 'w-[80px]' },
  { label: 'กิจกรรมการเรียนรู้', align: 'left', w: 'w-[200px]' },
  { label: 'พฤติกรรม', align: 'left' },
  { label: 'ระดับ', align: 'left', w: 'w-[180px]' },
  { label: 'ดำเนินการ', w: 'w-[140px]' },
]

function useNumberList(formData, setFormData, field) {
  const ref = useRef()

  const applyNumbering = text => {
    const lines = text.split('\n').filter(l => l.trim() !== '')

    return lines
      .map((line, i) => {
        return `${i + 1}) ${line.replace(/^\d+\)\s*/, '')}`
      })
      .join('\n')
  }

  const handleChange = e => {
    const val = e.target.value

    // เริ่มพิมพ์ครั้งแรก ใส่ข้อ 1 ทันที
    if (!formData[field]) {
      setFormData(prev => ({
        ...prev,
        [field]: `1) ${val.replace(/^1\)\s*/, '')}`,
      }))
      return
    }

    // ถ้าแก้ไขปกติ ให้ใส่เฉพาะเนื้อหา เดี๋ยวเรา re-number ตอน blur
    setFormData(prev => ({
      ...prev,
      [field]: val,
    }))
  }

  const handleEnter = e => {
    if (e.key !== 'Enter') return
    e.preventDefault()

    const el = e.target
    const { value, selectionStart, selectionEnd } = el

    const before = value.slice(0, selectionStart)
    const after = value.slice(selectionEnd)
    const count = value.split('\n').filter(x => x.trim() !== '').length

    const newVal = `${before}\n${count + 1}) ${after}`

    setFormData(prev => ({
      ...prev,
      [field]: newVal,
    }))

    setTimeout(() => {
      el.selectionStart = el.selectionEnd = before.length + 5
    })
  }

  const handleBlur = () => {
    const text = formData[field] || ''
    const fixed = applyNumbering(text)
    setFormData(prev => ({
      ...prev,
      [field]: fixed,
    }))
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [formData[field]])
  return { ref, handleChange, handleEnter, handleBlur }
}
