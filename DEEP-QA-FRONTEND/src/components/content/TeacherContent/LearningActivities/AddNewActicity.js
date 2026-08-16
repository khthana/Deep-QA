import { useEffect, useState } from 'react'
import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import ContentTitle from '../../../ContentTitle'
import MotionTr from '../../../MotionTr'
import TableHeader from '../../../TableHeader'
import { RiDeleteBin6Line } from 'react-icons/ri'
import { RiEdit2Line } from 'react-icons/ri'
import { useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useNavigate } from 'react-router-dom'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'

function AddNewActivity() {
  const [sessionExpired, setSessionExpired] = useState(false)
  const { state } = useLocation()
  const navigate = useNavigate()
  const activityId = state?.activity_id
  const section_id = localStorage.getItem('section_id') || ''

  const [isEdit, setIsEdit] = useState(false)
  const [clos, setClos] = useState([])
  const [scoreCategories, setScoreCategories] = useState([])
  const [items, setItems] = useState([])
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  useEffect(() => {
    if (activityId) {
      setIsEdit(true)
      fetchActivityById(activityId)
    } else {
      setIsEdit(false)
    }
  }, [activityId])

  const [formData, setFormData] = useState({
    activity: {
      activity_id: null,
      section_id: section_id,
      score_ratio_id: '',
      activity_type: '',
      activity_name: '',
      description: '',
    },
    clo_mappings: [],
  })

  useEffect(() => {
    const courseData = JSON.parse(localStorage.getItem('selectedCourse'))
    const sectionData = localStorage.getItem('section')
    const termData = localStorage.getItem('term')
    const yearData = localStorage.getItem('year')

    if (courseData && sectionData && termData && yearData) {
      fetchScoreCategories()
      fetchCLO()
      // console.log(activityId)
    }
  }, [])

  const handleAddMapping = () => {
    setFormData((prev) => ({
      ...prev,
      clo_mappings: [
        ...prev.clo_mappings,
        {
          activity_clo_map_id: null,
          sequence_order: prev.clo_mappings.length + 1,
          clo_id: '',
          weight: '',
          score: '',
          detail: '',
        },
      ],
    }))
  }

  const handleDelete = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveActivity = async () => {
    try {
      const result = await upsertActivity(formData)

      // console.log('save activity success:', result)

      setAlert({
        open: true,
        severity: 'success',
        message: 'บันทึกกิจกรรมเรียบร้อย',
      })
      navigate('../learningActivities', { replace: true })
    } catch (err) {
      console.error('save activity error:', err)
      setAlert({
        open: true,
        severity: 'error',
        message: err.message || 'เกิดข้อผิดพลาด',
      })
    }
  }

  const fetchActivityById = async (id) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/activity/get-clo-map/${id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()

      if (!res.ok) throw new Error('โหลดกิจกรรมไม่สำเร็จ')

      const mappedFormData = mapActivityToFormData(data.result)
      setFormData(mappedFormData)
      setIsEdit(true)
      // console.log('fetch activity success:', mappedFormData)
    } catch (err) {
      console.error('fetch activity error:', err)
    }
  }

  const mapActivityToFormData = (apiResult) => {
    const { activity, clo_mappings } = apiResult

    return {
      activity: {
        activity_id: activity.activity_id,
        section_id: activity.section,
        score_ratio_id: activity.score_ratio_id,
        activity_type: activity.activity_type,
        activity_name: activity.activity_name,
        description: activity.description,
      },
      clo_mappings: clo_mappings.map((m) => ({
        activity_clo_map_id: m.activity_clo_map_id,
        sequence_order: m.sequence_order,
        clo_id: m.clo?.clo_id || '',
        weight: m.weight,
        detail: m.detail || '',
        score: m.score,
      })),
    }
  }

  const fetchScoreCategories = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjectScore/get-category/${section_id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()
      setScoreCategories(data.data || [])
    } catch (err) {
      console.error(err)
      setScoreCategories([])
    }
  }

  const upsertActivity = async (payload) => {
    // console.log(payload)
    const res = await fetch(
      `${process.env.REACT_APP_API_URL}/api/activity/upsert`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        withCredentials: true,
        body: JSON.stringify(payload),
      },
    )
    if (isSessionExpired(res)) return setSessionExpired(true)
    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'บันทึกกิจกรรมไม่สำเร็จ')
    }

    return data
  }

  const fetchCLO = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjectClo/get/${section_id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()
      // console.log('CLO:', data)
      setClos(data.data || [])
    } catch (err) {
      console.error('fetch clo error:', err)
      setClos([])
    }
  }

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentSubjectTitle></ContentSubjectTitle>

      <ContentMotionDIV className="flex h-full flex-col gap-4 rounded-xl bg-white p-6 shadow">
        <div className="flex w-full items-center justify-between">
          <ContentTitle
            titlename={activityId ? 'แก้ไขกิจกรรม' : 'เพิ่มกิจกรรมใหม่'}
            icon={null}
          />

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-lg bg-gray-300 px-5 py-2 font-medium text-gray-700 hover:bg-gray-400"
              onClick={() => navigate(-1)}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              className="rounded-lg bg-secondary px-5 py-2 font-medium text-white hover:bg-secondary_hover"
              onClick={handleSaveActivity}
            >
              บันทึกกิจกรรม
            </button>
          </div>
        </div>
        <form className="mt-4 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              ชื่อกิจกรรม
            </label>
            <input
              type="text"
              className="w-full rounded border px-3 py-2 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="กรอกชื่อกิจกรรม"
              value={formData.activity.activity_name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  activity: {
                    ...prev.activity,
                    activity_name: e.target.value,
                  },
                }))
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              คำอธิบาย
            </label>
            <textarea
              rows="3"
              className="w-full rounded border px-3 py-2 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="อธิบายกิจกรรม"
              value={formData.activity.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  activity: {
                    ...prev.activity,
                    description: e.target.value,
                  },
                }))
              }
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 ">
                กิจกรรมเดี่ยว/กิจกรรมกลุ่ม
              </label>
              <select
                className="w-full rounded border px-3 py-2 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.activity.activity_type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    activity: {
                      ...prev.activity,
                      activity_type: e.target.value,
                    },
                  }))
                }
              >
                <option value="">-- เลือกประเภท --</option>
                <option value="group">กิจกรรมกลุ่ม</option>
                <option value="individual">กิจกรรมเดี่ยว</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                ประเภท
              </label>
              <select
                className="w-full rounded border px-3 py-2 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.activity.score_ratio_id}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    activity: {
                      ...prev.activity,
                      score_ratio_id: e.target.value,
                    },
                  }))
                }}
              >
                <option value="">-- เลือกประเภท --</option>
                {scoreCategories.map((item) => (
                  <option key={item.score_ratio_id} value={item.score_ratio_id}>
                    {item.score_category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-6">
            <div className="inline-flex w-full items-center justify-between">
              <div>
                <label className="text-xl text-secondary">
                  ความเชื่อมโยงกับผลการเรียนรู้
                </label>
              </div>
              <div className="inline-flex items-center gap-4">
                <div className="text-gray-600">
                  คะแนนทั้งหมด{' '}
                  {formData.clo_mappings.reduce(
                    (sum, m) => sum + (Number(m.score || 0) || 0),
                    0,
                  )}{' '}
                  คะแนน
                </div>
                <button
                  type="button"
                  className="rounded-lg bg-cyan-600 px-3 py-1.5 text-center text-white transition hover:bg-cyan-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={handleAddMapping}
                >
                  เพิ่มการเชื่อมโยง
                </button>{' '}
              </div>
            </div>

            <div className="mt-0 flex rounded-xl bg-white shadow">
              <div className="w-full rounded-lg ">
                <table className="text-m min-w-full rounded-lg border-gray-300 text-gray-700">
                  <TableHeader columns={cloColumns} />
                  <tbody className="relative">
                    <AnimatePresence>
                      {formData.clo_mappings.map((map, index) => (
                        <MotionTr
                          key={index}
                          className="w-full border-b border-gray-200 bg-white text-center hover:bg-gray-50"
                        >
                          {/* ลำดับ (sequence_order) */}
                          <td className="w-[60px] border-e px-3 py-2">
                            {index + 1}
                          </td>
                          <td className="w-[360px] border-e px-3 py-2">
                            <textarea
                              name="plo_code"
                              placeholder="กรอกเนื้อหาที่ประเมิน"
                              className=" w-[360px] rounded border px-2 py-1 text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={map.detail || ''}
                              onChange={(e) => {
                                const value = e.target.value
                                setFormData((prev) => {
                                  const updated = [...prev.clo_mappings]
                                  updated[index].detail = value
                                  return { ...prev, clo_mappings: updated }
                                })
                              }}
                            />
                          </td>

                          {!map.clo_id ? (
                            <td className="border-e px-3 py-2 text-left align-top">
                              <ContentMotionDIV>
                                <select
                                  className="w-full rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={map.clo_id}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setFormData((prev) => {
                                      const updated = [...prev.clo_mappings]
                                      const selected = clos.find(
                                        (c) => c.clo_id == value,
                                      )

                                      updated[index].clo_id = value
                                      updated[index].clo_detail =
                                        selected?.clo_detail || ''

                                      return { ...prev, clo_mappings: updated }
                                    })
                                  }}
                                >
                                  <option value="">-- เลือก CLO --</option>
                                  {clos.map((c) => (
                                    <option key={c.clo_id} value={c.clo_id}>
                                      CLO-{c.clo_number}: {c.clo_detail}
                                    </option>
                                  ))}
                                </select>
                              </ContentMotionDIV>
                            </td>
                          ) : (
                            <td className="border-e px-3 py-2 text-left align-top">
                              <AnimatePresence>
                                <ContentMotionDIV className="flex h-full items-center justify-between gap-4">
                                  <div className="text-gray-800">
                                    {clos.find((c) => c.clo_id == map.clo_id)
                                      ? `CLO-${
                                          clos.find(
                                            (c) => c.clo_id == map.clo_id,
                                          ).clo_number
                                        }: ${
                                          clos.find(
                                            (c) => c.clo_id == map.clo_id,
                                          ).clo_detail
                                        }`
                                      : 'ไม่พบข้อมูล CLO'}
                                  </div>

                                  <button
                                    type="button"
                                    className="text-red-600 transition hover:text-red-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    onClick={() => {
                                      setFormData((prev) => {
                                        const updated = [...prev.clo_mappings]
                                        updated[index].clo_id = ''
                                        updated[index].clo_detail = ''
                                        return {
                                          ...prev,
                                          clo_mappings: updated,
                                        }
                                      })
                                    }}
                                  >
                                    <RiDeleteBin6Line />
                                  </button>
                                </ContentMotionDIV>
                              </AnimatePresence>
                            </td>
                          )}

                          <td className="w-[60px] border-e px-3 py-2 align-top">
                            <ContentMotionDIV>
                              <input
                                type="number"
                                min={0}
                                className="w-24 rounded border px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={map.score}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setFormData((prev) => {
                                    const updated = [...prev.clo_mappings]
                                    updated[index].score = value
                                    return { ...prev, clo_mappings: updated }
                                  })
                                }}
                              />
                            </ContentMotionDIV>
                          </td>

                          {/* น้ำหนัก (weight) */}
                          <td className="border-e px-3 py-2 align-top">
                            <div className="flex items-center justify-center gap-2">
                              <input
                                type="number"
                                min={0}
                                className="w-24 rounded border px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={map.weight}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setFormData((prev) => {
                                    const updated = [...prev.clo_mappings]
                                    updated[index].weight = value
                                    return { ...prev, clo_mappings: updated }
                                  })
                                }}
                              />{' '}
                              %
                            </div>
                          </td>

                          {/* ปุ่มลบ */}
                          <td className="align-center border-e px-3 py-2">
                            <button
                              type="button"
                              className="h-full text-red-600 transition hover:text-red-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  clo_mappings: prev.clo_mappings
                                    .filter((_, i) => i !== index)
                                    .map((m, i) => ({
                                      ...m,
                                      sequence_order: i + 1,
                                    })),
                                }))
                              }}
                            >
                              <RiDeleteBin6Line />
                            </button>
                          </td>
                        </MotionTr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </form>
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
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}

export default AddNewActivity

const cloColumns = [
  { label: 'ลำดับ', w: 'w-[60px]' },
  { label: 'เนื้อหาที่ประเมิน', align: 'left' },
  { label: 'รายละเอียดผลการเรียนรู้ระดับรายวิชา', align: 'left' },
  { label: 'คะแนน' },
  { label: 'สัดส่วนต่อ CLO', w: 'w-[100px]' },
  { label: 'ดำเนินการ', w: 'w-[100px]' },
]
