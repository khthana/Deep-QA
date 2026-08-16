import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import ContentTitle from '../../../ContentTitle'
import { GrScorecard } from 'react-icons/gr'
import TableHeader from '../../../TableHeader'
import MotionTr from '../../../MotionTr'
import { useState, useEffect, useRef } from 'react'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import { RiDeleteBin6Line, RiEdit2Line } from 'react-icons/ri'
import DeleteDialog from '../../../DeleteDialog'
import {
  EditBT,
  SaveBT,
  DeleteBT,
  ViewBT,
  ViewAttentionBT,
  CancleBT,
} from '../../../BT'
import { AnimatePresence } from 'framer-motion'

function AssessmentCriteria() {
  const [sessionExpired, setSessionExpired] = useState(false)
  const [categories, setCategories] = useState([])
  const [selectedActivityId, setSelectedActivityId] = useState('')
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [selectAct, setSelectAct] = useState(null)
  const section_id = localStorage.getItem('section_id') || ''
  const [evidenceList, setEvidenceList] = useState([])
  const [data, setData] = useState([])
  const [previewFile, setPreviewFile] = useState(null)
  const [previewError, setPreviewError] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState({ id: null, index: null })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState('')
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  const evidenceTypeMap = {
    1: 'ตัวอย่างผลงานระดับดีเยี่ยม',
    2: 'ตัวอย่างผลงานระดับดี',
    3: 'ตัวอย่างผลงานระดับปานกลาง',
    4: 'ตัวอย่างผลงานระดับต้องปรับปรุง',
    5: 'โจทย์',
  }

  const typePriority = {
    '5': 1, // โจทย์
    '1': 2, // ดีเยี่ยม
    '2': 3, // ดี
    '3': 4, // ปานกลาง
    '4': 5, // ต้องปรับปรุง
  }

  useEffect(() => {
    if (section_id) {
      fetchActivitiesForScore()
      fetchEvidenceBySection()
    }
  }, [])

  useEffect(() => {
    if (!selectedActivityId) {
      setData([])
      return
    }

    const mappedData = evidenceList
      .filter(
        (item) => item.activity_id == selectedActivityId && !item.is_deleted,
      )
      .map((item) => ({
        id: item.evidence_id,
        type: item.evidence_type,
        data: item.description,
        file_name: item.file_name,
        file_path: item.file_path,
        isNew: false,
        isEditing: false,
      }))

    setData(mappedData)
    // console.log('Mapped data for activity', selectedActivityId, mappedData)
  }, [selectedActivityId, evidenceList])

  const fetchActivitiesForScore = async () => {
    try {
      const section_id = localStorage.getItem('section_id')
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/activity/get/${section_id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()
      setCategories(data.result || [])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchEvidenceBySection = async () => {
    try {
      const section_id = localStorage.getItem('section_id')

      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/envidence/section/${section_id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
        },
      )

      if (isSessionExpired(res)) return setSessionExpired(true)

      const result = await res.json()

      result.sort((a, b) => {
        if (a.activity_id !== b.activity_id) {
          return a.activity_id - b.activity_id
        }

        const priorityA = typePriority[a.evidence_type] || 99
        const priorityB = typePriority[b.evidence_type] || 99
        return priorityA - priorityB
      })

      setEvidenceList(result || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpload = async (idx) => {
    const item = data[idx]

    if (!item.file) {
      setAlert({
        open: true,
        message: 'กรุณานำเข้าไฟล์ข้อมูลเพื่อบันทึก',
        severity: 'warning',
      })
      return
    }

    // console.log('Uploading evidence with data:', {
    //   section_id: section_id,
    //   activity_id: selectedActivityId,
    //   evidence_type: item.type,
    //   description: item.data,
    //   file: item.file,
    // })

    try {
      const item = data[idx]

      const formData = new FormData()
      formData.append('file', item.file)
      formData.append('section_id', section_id)
      formData.append('activity_id', selectedActivityId)
      formData.append('evidence_type', item.type)
      formData.append('description', item.data)

      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/envidence`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
          withCredentials: true,
        },
      )

      if (isSessionExpired(res)) return setSessionExpired(true)

      const result = await res.json()
      // console.log(result)
      if (res.ok) {
        setAlert({
          open: true,
          message: 'เพิ่มหลักฐานการประเมินสำเร็จ',
          severity: 'success',
        })
      } else {
      }

      setData((prev) => {
        const newData = [...prev]
        newData[idx].isNew = false
        newData[idx].id = result.id
        return newData
      })
      fetchEvidenceBySection()
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpdate = async (idx) => {
    const item = data[idx]

    try {
      const formData = new FormData()

      if (item.file) {
        formData.append('file', item.file)
      } else {
        formData.append('file', null)
      }

      formData.append('description', item.data)
      formData.append('evidence_type', item.type)

      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/envidence/${item.id}/replace`,
        {
          method: 'PUT',
          body: formData,
          credentials: 'include',
        },
      )

      if (isSessionExpired(res)) return setSessionExpired(true)

      if (res.ok) {
        const result = await res.json()
        const updatedInfo = result.data

        setData((prev) => {
          const newData = [...prev]
          newData[idx] = {
            ...newData[idx],
            id: updatedInfo.evidence_id,
            type: updatedInfo.evidence_type,
            data: updatedInfo.description,
            file_name: updatedInfo.file_name,
            file_path: updatedInfo.file_path,
            isEditing: false,
            file: null,
          }
          return newData
        })

        setAlert({
          open: true,
          message: 'อัปเดตข้อมูลสำเร็จ',
          severity: 'success',
        })
      }
      fetchEvidenceBySection()
    } catch (err) {
      console.error(err)
      setAlert({
        open: true,
        message: 'เกิดข้อผิดพลาดในการอัปเดต',
        severity: 'error',
      })
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget.id) return

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/envidence/${deleteTarget.id}/delete`,
        {
          method: 'DELETE',
          credentials: 'include',
          withCredentials: true,
        },
      )

      if (isSessionExpired(res)) return setSessionExpired(true)

      if (res.ok) {
        setData((prev) => prev.filter((_, i) => i !== deleteTarget.index))

        setAlert({
          open: true,
          message: 'ลบข้อมูลสำเร็จ',
          severity: 'success',
        })
      } else {
        throw new Error('Delete failed')
      }
      fetchEvidenceBySection()
    } catch (err) {
      console.error(err)
      setAlert({
        open: true,
        message: 'ไม่สามารถลบข้อมูลได้',
        severity: 'error',
      })
    } finally {
      setDialogOpen(false)
      setDeleteTarget({ id: null, index: null })
    }
  }
  const buildPreviewUrl = (filePath) => {
    if (!filePath) return null

    const staticPath = filePath.replace('/data/evidence', '/static')

    return `${process.env.REACT_APP_API_URL}${staticPath}`
  }

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentSubjectTitle></ContentSubjectTitle>

      <ContentMotionDIV className="flex h-full flex-col gap-4 rounded-xl bg-white p-6 shadow">
        <div className="inline-flex items-center justify-between align-middle ">
          <ContentTitle titlename="หลักฐานการประเมิน" icon={GrScorecard} />
          <div className="inline-flex items-center gap-4">
            <button
              type="button"
              onClick={() =>
                setData([
                  ...data,
                  {
                    type: '5',
                    data: '',
                    file: null,
                    isNew: true,
                  },
                ])
              }
              className={
                'flex items-center justify-center rounded-lg bg-cyan-600 px-5 py-2.5 font-medium text-white hover:bg-cyan-700'
              }
            >
              เพิ่มข้อมูล
            </button>
          </div>
        </div>

        <div className="inline-flex w-full items-center justify-between align-middle">
          <div className="flex flex-col gap-2">
            <label className="text-m text-gray-600">กิจกรรมการเรียนรู้</label>
            <select
              value={selectedActivityId}
              onChange={(e) => {
                const id = e.target.value

                setSelectedActivityId(id)

                setSelectedActivity(null)
                setSelectAct(null)

                const act = categories
                  .flatMap((c) => c.activities)
                  .find((a) => a.activity_id == id)

                setSelectAct(act || null)
              }}
              className="text-m rounded-md border border-gray-300 px-3 py-1.5 text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 [&_option:contains('(กิจกรรมกลุ่ม)')]:text-slate-400 [&_option]:text-slate-700"
            >
              <option value="">-- เลือกกิจกรรมเพื่อแก้ไขคะแนน --</option>

              {categories.flatMap((cat) =>
                cat.activities.map((act) => (
                  <option key={act.activity_id} value={act.activity_id}>
                    {act.activity_name}
                  </option>
                )),
              )}
            </select>
          </div>
        </div>

        <div>
          {!selectedActivityId ? (
            <ContentMotionDIV className="w-full py-10 text-center text-gray-400">
              กรุณาเลือกกิจกรรมเพื่อแนบหลักฐานการประเมินคะแนน
            </ContentMotionDIV>
          ) : (
            <div className="mt-0 flex rounded-xl bg-white shadow">
              <ContentMotionDIV className="w-full overflow-x-auto rounded-lg">
                <table className="text-m min-w-full border-gray-300 text-center text-gray-700">
                  <TableHeader columns={studentColumns} />
                  <tbody>
                    <AnimatePresence>
                      {data.map((item, idx) => (
                        <MotionTr
                          key={idx}
                          className="border-b border-gray-200 bg-white hover:bg-gray-50"
                        >
                          <td className="w-[150px] border-e px-2 py-2">
                            {item.isEditing || item.isNew ? (
                              <select
                                value={item.type}
                                onChange={(e) => {
                                  const newData = [...data]
                                  newData[idx].type = e.target.value
                                  setData(newData)
                                }}
                                className="rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="5">โจทย์</option>
                                <option value="1">
                                  ตัวอย่างผลงานระดับดีเยี่ยม
                                </option>
                                <option value="2">ตัวอย่างผลงานระดับดี</option>
                                <option value="3">
                                  ตัวอย่างผลงานระดับปานกลาง
                                </option>
                                <option value="4">
                                  ตัวอย่างผลงานระดับต้องปรับปรุง
                                </option>
                              </select>
                            ) : (
                              <span>{evidenceTypeMap[item.type] || '-'}</span>
                            )}
                          </td>

                          <td className="border-e px-2 py-2 text-left">
                            {item.isEditing || item.isNew ? (
                              <textarea
                                value={item.data}
                                onChange={(e) => {
                                  const newData = [...data]
                                  newData[idx].data = e.target.value
                                  setData(newData)
                                }}
                                rows={3}
                                className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              <span>{item.data}</span>
                            )}
                          </td>

                          <td className="border-e px-2 py-2">
                            {item.isEditing || item.isNew ? (
                              <div className="flex flex-col items-center gap-2">
                                {/* 1. แสดงชื่อไฟล์ที่มีอยู่ (จากเครื่องผู้ใช้ หรือ จาก Server) */}
                                {item.file || item.file_name ? (
                                  <div className="flex items-center gap-2">
                                    <span className="max-w-[120px] truncate text-sm text-gray-600">
                                      {item.file
                                        ? item.file.name
                                        : item.file_name}
                                    </span>
                                    {/* 2. ปุ่มลบไฟล์: จะเคลียร์ทั้งสถานะไฟล์ในเครื่องและชื่อไฟล์เดิม */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newData = [...data]
                                        newData[idx].file = null
                                        newData[idx].file_name = null
                                        // ถ้ามี file_path เดิม อาจจะเก็บไว้ใน trash หรือเคลียร์ทิ้งตาม logic back-end
                                        newData[idx].file_path = null
                                        setData(newData)
                                      }}
                                      className="focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <RiDeleteBin6Line className="text-xl text-rose-700" />
                                    </button>
                                  </div>
                                ) : (
                                  /* 3. ปุ่มนำเข้า: แสดงเฉพาะเมื่อไม่มีไฟล์ */
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        document
                                          .getElementById(`file-input-${idx}`)
                                          .click()
                                      }
                                      className="rounded-lg bg-cyan-600 px-3 py-1 text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      นำเข้า
                                    </button>
                                    <input
                                      id={`file-input-${idx}`}
                                      type="file"
                                      className="hidden"
                                      onChange={(e) => {
                                        if (
                                          e.target.files &&
                                          e.target.files[0]
                                        ) {
                                          const newData = [...data]
                                          newData[idx].file = e.target.files[0]
                                          newData[idx].file_name =
                                            e.target.files[0].name
                                          setData(newData)
                                        }
                                      }}
                                    />
                                  </>
                                )}
                              </div>
                            ) : item.file_name ? (
                              /* โหมดแสดงผลปกติ (Read-only) */
                              <span className="text-sm text-gray-600">
                                {item.file_name}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>

                          <td className="border-e px-2 py-2">
                            <ContentMotionDIV className="flex w-full items-center justify-center">
                              <button
                                type="button"
                                onClick={async () => {
                                  const url = buildPreviewUrl(item.file_path)
                                  console.log('Preview URL:', url)
                                  if (!url) {
                                    console.error(
                                      'Invalid file path:',
                                      item.file_path,
                                    )
                                    return
                                  }

                                  try {
                                    const res = await fetch(url, {
                                      method: 'HEAD',
                                    })

                                    if (!res.ok) {
                                      setAlert({
                                        open: true,
                                        message:
                                          'ไม่สามารถดูตัวอย่างเอกสารได้ในขณะนี้',
                                        severity: 'error',
                                      })
                                      return
                                    }

                                    setPreviewFile(url)
                                  } catch (err) {
                                    setAlert({
                                      open: true,
                                      message:
                                        'ไม่สามารถดูตัวอย่างเอกสารได้ในขณะนี้',
                                      severity: 'error',
                                    })
                                  }
                                }}
                                className="px- flex items-center justify-center rounded-lg bg-secondary px-3 py-1 font-medium text-white hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                เรียกดู
                              </button>
                            </ContentMotionDIV>
                          </td>

                          <td className="px-2 py-2">
                            <div className="inline-flex gap-2">
                              <AnimatePresence mode="wait">
                                {/* NEW */}
                                {item.isNew && (
                                  <ContentMotionDIV
                                    key="new"
                                    className="flex gap-2"
                                  >
                                    <SaveBT onSave={() => handleUpload(idx)} />
                                    <CancleBT
                                      onClick={() =>
                                        setData(
                                          data.filter((_, i) => i !== idx),
                                        )
                                      }
                                    />
                                  </ContentMotionDIV>
                                )}

                                {/* EDIT MODE */}
                                {!item.isNew && item.isEditing && (
                                  <ContentMotionDIV
                                    key="edit"
                                    className="flex gap-2"
                                  >
                                    <SaveBT onSave={() => handleUpdate(idx)} />
                                    <CancleBT
                                      onClick={() => {
                                        const newData = [...data]
                                        newData[idx].isEditing = false
                                        setData(newData)
                                        fetchEvidenceBySection()
                                      }}
                                    />
                                  </ContentMotionDIV>
                                )}

                                {/* NORMAL VIEW */}
                                {!item.isNew && !item.isEditing && (
                                  <ContentMotionDIV
                                    key="view"
                                    className="flex gap-2"
                                  >
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
                                          id: item.id,
                                          index: idx,
                                        })
                                        console.log(item)
                                        setDeleteMsg(item.data)
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
                <AnimatePresence>
                  {previewError && (
                    <ContentMotionDIV className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600">
                      <span className="text-lg">⚠️</span>{' '}
                      ไม่พบเอกสารที่ต้องการแสดง
                    </ContentMotionDIV>
                  )}

                  {previewFile && (
                    <ContentMotionDIV className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur md:p-8">
                      <div
                        className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between border-b bg-white px-6 py-4">
                          <div className="flex flex-col">
                            <h2 className="text-xl font-bold text-secondary">
                              หลักฐานการประเมิน
                            </h2>
                            <p className="text-xs uppercase tracking-wider text-gray-500">
                              กิจกรรมการเรียนรู้{' '}
                              {selectAct?.activity_name || 'กิจกรรมการเรียนรู้'}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <a
                              href={previewFile}
                              download
                              className="hidden items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 sm:flex"
                            >
                              ดาวน์โหลดเอกสาร
                            </a>
                            <button
                              onClick={() => setPreviewFile(null)}
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="relative flex-1 bg-gray-200/50">
                          <iframe
                            src={`${previewFile}#toolbar=1&navpanes=0`}
                            title="Document Preview"
                            className="h-full w-full border-none"
                          />
                        </div>
                      </div>
                    </ContentMotionDIV>
                  )}
                </AnimatePresence>
              </ContentMotionDIV>
            </div>
          )}
        </div>
      </ContentMotionDIV>
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
        onConfirm={handleConfirmDelete}
        Name={deleteMsg}
      />
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
export default AssessmentCriteria

const studentColumns = [
  { label: 'ประเภท' },
  { label: 'ข้อมูล', align: 'left' },
  { label: 'นำเข้าข้อมูล', align: 'center', w: 'w-[130px]' },
  { label: 'เรียกดู', align: 'center', w: 'w-[130px]' },
  { label: 'ดำเนินการ', align: 'center', w: 'w-[130px]' },
]
