import { useEffect, useState, useRef } from 'react'
import { FaStar } from 'react-icons/fa'
import ContentMotionDIV from '../../../ContentMotionDIV'
import TableHeader from '../../../TableHeader'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { EditBT, SaveBT, DeleteBT, CancleBT } from '../../../BT'
import { AnimatePresence } from 'framer-motion'
import MotionTr from '../../../MotionTr'
import DeleteDialog from '../../../DeleteDialog'

import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'

export default function CourseOutcomeAttention() {
  const [sessionExpired, setSessionExpired] = useState(false)
  const savedCourse = JSON.parse(localStorage.getItem('selectedCourse'))
  const savedCLO = JSON.parse(localStorage.getItem('selectedCLO'))
  const [attention, setAttention] = useState([])
  const [selectedAttention, setSelectedAttention] = useState(null)
  const section = localStorage.getItem('section_number') || ''
  const section_id = localStorage.getItem('section_id') || ''
  const term = localStorage.getItem('term') || ''
  const year = localStorage.getItem('year') || ''
  const [isAddMode, setIsAddMode] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [DeleteMsg, SetDeleteMsg] = useState('')

  const [editId, setEditId] = useState(null)
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })
  const [formData, setFormData] = useState()

  const levelOptions = ['ดีเยี่ยม', 'ดี', 'พอใช้', 'ต้องปรับปรุง']

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
        criteria_no: attention.length + 1,
        achievement_level: levelOptions[0],
        criteria_detail: '',
        criteria_description: '',
        section_id: section_id,
      }))
      fetchAttention()
    }
  }, [])

  const handleConfirmDelete = () => {
    setDialogOpen(false)
    fetchDeleteBehavior()
  }

  const handleAddRow = () => {
    if (editId) return
    setIsAddMode(true)
    setFormData(prev => ({
      ...prev,
      criteria_no: attention.length + 1,
      achievement_level: levelOptions[0],
      criteria_detail: '',
      criteria_description: '',
    }))
  }

  const handleSaveAddRow = () => {
    fetchAddAttention()
    setIsAddMode(false)
    setFormData(prev => ({
      ...prev,
      criteria_no: attention.length + 1,
      achievement_level: levelOptions[0],
      criteria_detail: '',
      criteria_description: '',
    }))
  }

  const handleEdit = row => {
    if (isAddMode) return
    setEditId(row.id)
    setFormData({
      ...formData,
      id: row.id,
      achievement_level: row.achievement_level,
      criteria_detail: row.criteria_detail || '',
      criteria_description: row.criteria_description || '',
    })
  }

  const handleSave = () => {
    // console.log(formData)
    fetchEditAttention()
    setEditId(null)
  }

  const columns = [
    { label: 'ลำดับที่', w: 'w-[80px]' },
    { label: 'ระดับการบรรลุผล', align: 'left', w: 'w-[140px]' },
    { label: 'เกณฑ์การประเมิน', align: 'left' },
    { label: 'คำอธิบาย', align: 'left' },
    { label: 'ดำเนินการ', w: 'w-[140px]' },
  ]

  const textRefs = useRef([])

  useEffect(() => {
    if (!isAddMode && !editId) return

    const syncHeight = () => {
      requestAnimationFrame(() => {
        const maxHeight = Math.max(
          ...textRefs.current.map(el => el?.scrollHeight || 0)
        )

        textRefs.current.forEach(el => {
          if (el) el.style.height = `${maxHeight}px`
        })
      })
    }

    syncHeight()

    const observers = textRefs.current.map(el => {
      if (!el) return null
      const ro = new ResizeObserver(syncHeight)
      ro.observe(el)
      return ro
    })

    return () => observers.forEach(ro => ro?.disconnect())
  }, [isAddMode, editId])

  const fetchAddAttention = async () => {
    console.log(formData)
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjectCloAch/create`,
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
          message: `เพิ่มข้อมูลระดับการบรรลุผลพฤติกรรม สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `เพิ่มข้อมูลระดับการบรรลุผลพฤติกรรม ไม่สำเร็จ`,
          severity: 'error',
        })
      }
      fetchAttention()
    } catch (err) {
      console.error(err)
    }
  }

  const fetchAttention = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjectCloAch/get/${section_id}/${savedCLO.clo_id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()
      setAttention(data.data)
      console.log(data.data)
    } catch (err) {
      console.error(err)
      setAttention([])
    }
  }
  const fetchEditAttention = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjectCloAch/update`,
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
          message: `บันทึกข้อมูลระดับการบรรลุผลพฤติกรรม สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `บันทึกลบข้อมูลระดับการบรรลุผลพฤติกรรม ไม่สำเร็จ`,
          severity: 'error',
        })
      }
      fetchAttention()
    } catch (err) {
      console.error(err)
    }
  }

  const fetchDeleteBehavior = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjectCloAch/delete/${selectedAttention.id}`,
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
          message: `ลบข้อมูลระดับการบรรลุผลพฤติกรรม สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `ลบข้อมูลระดับการบรรลุผลพฤติกรรม ไม่สำเร็จ`,
          severity: 'error',
        })
      }
      fetchAttention()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-4 rounded-xl bg-white p-6 shadow">
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-lg font-bold text-gray-600">
          <FaStar className="text-blue-500" />
          ระดับการบรรลุผลพฤติกรรม
        </div>
        <button
          onClick={handleAddRow}
          className="rounded-lg bg-secondary px-4 py-2  text-white shadow-sm transition duration-150 hover:bg-secondary_hover"
        >
          + เพิ่มระดับการบรรลุ
        </button>
      </div>

      <div className="text-m cursor-pointer rounded-lg border border-purple-200 bg-purple-50 p-3 text-purple-800 transition-all duration-200 hover:border-blue-400 hover:bg-blue-100 hover:shadow-md">
        <span className="font-bold">CLO-{savedCLO.clo_number} </span>:{' '}
        {savedCLO.clo_detail}
      </div>

      <div className="w-full overflow-x-auto rounded-xl bg-white shadow">
        <table className="min-w-full border-gray-300 text-center text-gray-700">
          <TableHeader columns={columns} />
          <tbody>
            <AnimatePresence>
              {isAddMode && (
                <MotionTr className="border-b">
                  <td className="border-x px-2 py-2 text-center align-top">
                    <input
                      type="number"
                      className="w-[80px] rounded border px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.criteria_no}
                      onChange={e =>
                        setFormData(p => ({
                          ...p,
                          criteria_no: Number(e.target.value),
                        }))
                      }
                    />
                  </td>

                  <td className="border-x px-2 py-2 text-left align-top">
                    <select
                      className="w-[140px] rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.achievement_level}
                      onChange={e =>
                        (formData.achievement_level = e.target.value)
                      }
                    >
                      {levelOptions.map(opt => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>

                  <td className="border-x px-2 py-2">
                    <textarea
                      ref={el => (textRefs.current[0] = el)}
                      className="min-h-24 w-full resize-none rounded border px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ระบุเกณฑ์การประเมิน"
                      value={formData.criteria_detail || ''}
                      onChange={e => {
                        let val = e.target.value

                        val = val
                          .split('\n')
                          .map(line =>
                            line.startsWith('●') ? line : '● ' + line
                          )
                          .join('\n')

                        setFormData(prev => ({
                          ...prev,
                          criteria_detail: val,
                        }))
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()

                          const textarea = e.target
                          const { selectionStart, selectionEnd } = textarea
                          const value = textarea.value

                          const before = value.slice(0, selectionStart)
                          const after = value.slice(selectionEnd)

                          const newValue = before + '\n● ' + after

                          setFormData(prev => ({
                            ...prev,
                            criteria_detail: newValue,
                          }))

                          setTimeout(() => {
                            textarea.selectionStart = textarea.selectionEnd =
                              selectionStart + 3
                          }, 0)
                        }
                      }}
                    />
                  </td>

                  <td className="border-x px-4 py-2">
                    <textarea
                      ref={el => (textRefs.current[1] = el)}
                      className="min-h-24 w-full resize-none rounded border px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ระบุคำอธิบาย"
                      value={formData.criteria_description || ''}
                      onChange={e => {
                        let val = e.target.value

                        val = val
                          .split('\n')
                          .map(line =>
                            line.startsWith('●') ? line : '● ' + line
                          )
                          .join('\n')

                        setFormData(prev => ({
                          ...prev,
                          criteria_description: val,
                        }))
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()

                          const textarea = e.target
                          const { selectionStart, selectionEnd } = textarea
                          const value = textarea.value

                          const before = value.slice(0, selectionStart)
                          const after = value.slice(selectionEnd)

                          const newValue = before + '\n● ' + after

                          setFormData(prev => ({
                            ...prev,
                            criteria_description: newValue,
                          }))

                          setTimeout(() => {
                            textarea.selectionStart = textarea.selectionEnd =
                              selectionStart + 3
                          }, 0)
                        }
                      }}
                    />
                  </td>

                  <td className="flex items-center justify-center gap-2 border-x px-2 py-2 text-center">
                    <SaveBT onSave={handleSaveAddRow} />
                    <CancleBT onClick={() => setIsAddMode(false)} />
                  </td>
                </MotionTr>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {attention.map((row, index) => (
                <MotionTr
                  key={row.id}
                  className="border-b border-gray-200 bg-white hover:bg-gray-50"
                >
                  <td className="border-x px-2 py-2 text-center">
                    {row.criteria_no}
                  </td>

                  <td className="border-x px-2 py-2 text-left align-top">
                    {editId === row.id ? (
                      <select
                        className="w-[140px]  rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={row.title}
                        onChange={e =>
                          (formData.achievement_level = e.target.value)
                        }
                      >
                        {levelOptions.map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <ContentMotionDIV className="font-medium">
                        {row.achievement_level}
                      </ContentMotionDIV>
                    )}
                  </td>

                  <td className="border-x px-2 py-2 text-left align-top">
                    {editId === row.id ? (
                      <textarea
                        ref={el => (textRefs.current[0] = el)}
                        rows={3}
                        className="min-h-24 w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.criteria_detail || ''}
                        placeholder="ระบุเกณฑ์การประเมินแต่ละข้อ"
                        onChange={e => {
                          let val = e.target.value
                            .split('\n')
                            .map(l => (l.startsWith('●') ? l : '● ' + l))
                            .join('\n')

                          setFormData(prev => ({
                            ...prev,
                            criteria_detail: val,
                          }))
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const { selectionStart, selectionEnd, value } =
                              e.target
                            const newValue =
                              value.slice(0, selectionStart) +
                              '\n● ' +
                              value.slice(selectionEnd)

                            setFormData(prev => ({
                              ...prev,
                              criteria_detail: newValue,
                            }))

                            setTimeout(() => {
                              e.target.selectionStart = e.target.selectionEnd =
                                selectionStart + 3
                            }, 0)
                          }
                        }}
                      />
                    ) : (
                      <ContentMotionDIV className="whitespace-pre-line">
                        {row.criteria_detail}
                      </ContentMotionDIV>
                    )}
                  </td>

                  <td className="border-x px-2 py-2 text-left align-top">
                    {editId === row.id ? (
                      <textarea
                        ref={el => (textRefs.current[1] = el)}
                        rows={4}
                        className="min-h-24 w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.criteria_description || ''}
                        placeholder="ระบุคำอธิบายประกอบ"
                        onChange={e => {
                          let val = e.target.value
                            .split('\n')
                            .map(l => (l.startsWith('●') ? l : '● ' + l))
                            .join('\n')

                          setFormData(prev => ({
                            ...prev,
                            criteria_description: val,
                          }))
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const { selectionStart, selectionEnd, value } =
                              e.target
                            const newValue =
                              value.slice(0, selectionStart) +
                              '\n● ' +
                              value.slice(selectionEnd)

                            setFormData(prev => ({
                              ...prev,
                              criteria_description: newValue,
                            }))

                            setTimeout(() => {
                              e.target.selectionStart = e.target.selectionEnd =
                                selectionStart + 3
                            }, 0)
                          }
                        }}
                      />
                    ) : (
                      <ContentMotionDIV className="whitespace-pre-line">
                        {row.criteria_description}
                      </ContentMotionDIV>
                    )}
                  </td>

                  <td className="w-[160px] border-x py-2 align-middle">
                    <div className="flex justify-center gap-2">
                      {editId === row.id ? (
                        <div className="flex items-center justify-center gap-2 px-2 py-2 text-center">
                          <SaveBT item={row} onSave={handleSave} />
                          <CancleBT onClick={() => setEditId(null)} />
                        </div>
                      ) : (
                        <div className="flex justify-center gap-2">
                          <EditBT item={row} onEdit={handleEdit} />
                          <DeleteBT
                            item={row}
                            onDelete={() => {
                              setDialogOpen(true)
                              SetDeleteMsg(
                                'ระดับการบรรลุผลพฤติกรรมที่ ' + (index + 1)
                              )
                              setSelectedAttention(row)
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

      <Snackbar
        open={alert.open}
        autoHideDuration={2800}
        onClose={() => setAlert(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setAlert(s => ({ ...s, open: false }))}
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
        onConfirm={handleConfirmDelete}
        Name={DeleteMsg}
      />
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
