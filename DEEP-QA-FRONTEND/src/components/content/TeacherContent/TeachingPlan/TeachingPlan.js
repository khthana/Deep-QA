import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import ContentTitle from '../../../ContentTitle'
import { GrPlan } from 'react-icons/gr'
import { IoMdAdd } from 'react-icons/io'
import TableHeader from '../../../TableHeader'
import { RiDeleteBin6Line } from 'react-icons/ri'
import { RiEdit2Line } from 'react-icons/ri'
import { EditBT, SaveBT, DeleteBT, ViewBT, CancleBT } from '../../../BT'
import DeleteDialog from '../../../DeleteDialog'
import { useState, useEffect } from 'react'
import { useAuth } from '../../../../context/AuthContext'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import { AnimatePresence } from 'framer-motion'
import MotionTr from '../../../MotionTr'

function TeachingPlan() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState({ id: null, index: null })
  const { profile } = useAuth()
  const [sessionExpired, setSessionExpired] = useState(false)
  const section_id = localStorage.getItem('section_id')
  const user_identifier = profile?.user_id
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  // --- 1. GET DATA ---
  const fetchData = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/courseSyllabus/get/${section_id}`,
        { credentials: 'include' }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)

      const result = await res.json()
      // ปรับการเข้าถึงข้อมูลตามโครงสร้าง response ที่คุณให้มา (result.data)
      const mappedData = (result.data || []).map(item => ({
        ...item,
        isEditing: false,
        temp_title: item.title || '',
        temp_description: item.description || '',
        temp_week_no: item.week_no || 0,
        temp_remark: item.remark || '',
      }))
      setData(mappedData)
    } catch (err) {
      console.error('Fetch error:', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // --- 2. UPSERT ---
  const handleUpsert = async idx => {
    const item = data[idx]
    const payload = {
      course_syllabus_id: item.course_syllabus_id || null,
      section_id: section_id,
      week_no: parseInt(item.temp_week_no),
      title: item.temp_title,
      description: item.temp_description,
      remark: item.temp_remark,
      created_by: user_identifier,
    }

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/courseSyllabus/upsert`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
        }
      )

      if (isSessionExpired(res)) return setSessionExpired(true)

      if (res.ok) {
        setAlert({
          open: true,
          message: 'บันทึกข้อมูลสำเร็จ',
          severity: 'success',
        })
        fetchData()
      } else {
        throw new Error()
      }
    } catch (err) {
      setAlert({
        open: true,
        message: 'บันทึกข้อมูลไม่สำเร็จ',
        severity: 'error',
      })
    }
  }

  // --- 3. DELETE ---
  const handleConfirmDelete = async () => {
    if (!deleteTarget.id) return
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/courseSyllabus/delete/${deleteTarget.id}`,
        { method: 'DELETE', credentials: 'include' }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)

      if (res.ok) {
        setData(prev => prev.filter((_, i) => i !== deleteTarget.index))
        setAlert({ open: true, message: 'ลบข้อมูลสำเร็จ', severity: 'success' })
      }
    } catch (err) {
      setAlert({ open: true, message: 'ลบข้อมูลไม่สำเร็จ', severity: 'error' })
    } finally {
      setDialogOpen(false)
      setDeleteTarget({ id: null, index: null })
    }
  }

  const handleAddNew = () => {
    const newRow = {
      course_syllabus_id: null,
      isEditing: true,
      isNew: true,
      temp_week_no: data.length + 1,
      temp_title: '',
      temp_description: '',
      temp_remark: '',
    }
    setData([newRow, ...data])
  }

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentSubjectTitle />

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

      <ContentMotionDIV className="flex h-full flex-col gap-4 rounded-xl bg-white p-6 shadow">
        <div className="inline-flex items-center justify-between">
          <ContentTitle titlename="แผนการสอน" icon={GrPlan} />
          <button
            onClick={handleAddNew}
            className="flex items-center justify-center rounded-lg bg-secondary px-5 py-2.5 font-medium text-white transition-colors hover:bg-secondary_hover"
          >
            <IoMdAdd className="me-2 h-5 w-5" />
            เพิ่มข้อมูล
          </button>
        </div>

        <div className="mt-0 flex rounded-xl border border-gray-100 bg-white shadow">
          <div className="w-full overflow-x-auto rounded-lg">
            <table className="w-full min-w-[1000px] border-collapse text-gray-700">
              <TableHeader columns={Columns} />
              <tbody>
                <AnimatePresence>
                  {data.map((item, idx) => (
                    <MotionTr
                      key={idx}
                      className="border-t border-gray-100 transition-colors hover:bg-gray-50"
                    >
                      <td className="w-[100px] border-e px-2 py-2 text-center">
                        {item.isEditing ? (
                          <input
                            type="number"
                            className="w-full rounded border px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={item.temp_week_no}
                            onChange={e => {
                              const newData = [...data]
                              newData[idx].temp_week_no = e.target.value
                              setData(newData)
                            }}
                          />
                        ) : (
                          <span className="">{item.week_no}</span>
                        )}
                      </td>

                      <td className="min-w-[400px] border-e px-2 py-2 text-left">
                        {item.isEditing ? (
                          <div className="flex flex-col gap-2">
                            <input
                              placeholder="หัวข้อการสอน"
                              className="w-full rounded border px-3 py-1.5 font-medium  focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={item.temp_title}
                              onChange={e => {
                                const newData = [...data]
                                newData[idx].temp_title = e.target.value
                                setData(newData)
                              }}
                            />
                            <textarea
                              placeholder="รายละเอียด (ถ้ามี)"
                              rows={2}
                              className="w-full rounded border px-3 py-1.5 text-sm  focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={item.temp_description}
                              onChange={e => {
                                const newData = [...data]
                                newData[idx].temp_description = e.target.value
                                setData(newData)
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 ">
                            <span className=" text-gray-800">{item.title}</span>
                            <p className="text-sm leading-relaxed text-gray-500">
                              {item.description || (
                                <span className="text-gray-300 ">
                                  ไม่มีรายละเอียด
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="w-[250px] border-e px-2 py-2 text-left">
                        {item.isEditing ? (
                          <textarea
                            placeholder="หมายเหตุเพิ่มเติม"
                            className="w-full rounded border px-3 py-1.5  focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            value={item.temp_remark}
                            onChange={e => {
                              const newData = [...data]
                              newData[idx].temp_remark = e.target.value
                              setData(newData)
                            }}
                          />
                        ) : (
                          <span className=" block max-w-[200px] break-words italic text-gray-500">
                            {item.remark || '-'}
                          </span>
                        )}
                      </td>

                      <td className="w-[150px] border-e px-2 py-2">
                        <div className="flex items-center justify-center gap-3">
                          <AnimatePresence>
                            {item.isEditing ? (
                              <ContentMotionDIV className="flex items-center justify-center gap-3">
                                <SaveBT onSave={() => handleUpsert(idx)} />
                                <CancleBT
                                  onClick={() => {
                                    if (item.isNew) {
                                      setData(data.filter((_, i) => i !== idx))
                                    } else {
                                      const newData = [...data]
                                      newData[idx].isEditing = false
                                      // Reset ค่า temp กลับเป็นค่าเดิม
                                      newData[idx].temp_title = item.title
                                      newData[idx].temp_description =
                                        item.description
                                      newData[idx].temp_remark = item.remark
                                      newData[idx].temp_week_no = item.week_no
                                      setData(newData)
                                    }
                                  }}
                                />
                              </ContentMotionDIV>
                            ) : (
                              <ContentMotionDIV className="flex items-center justify-center gap-3">
                                <EditBT
                                  onEdit={() => {
                                    const newData = [...data]
                                    newData[idx].isEditing = true
                                    setData(newData)
                                  }}
                                />
                                <DeleteBT
                                  onDelete={() => {
                                    setDeleteTarget({
                                      id: item.course_syllabus_id,
                                      index: idx,
                                    })
                                    setDialogOpen(true)
                                  }}
                                />
                              </ContentMotionDIV>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    </MotionTr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </ContentMotionDIV>

      <DeleteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        Name={data[deleteTarget.index]?.title}
      />
    </ContentMotionDIV>
  )
}
export default TeachingPlan

const Columns = [
  { label: 'สัปดาห์ที่', w: 'w-[90px]' },
  { label: 'หัวข้อ', align: 'left' },
  { label: 'หมายเหตุ', align: 'center' },
  { label: 'ดำเนินการ', align: 'center' },
]
