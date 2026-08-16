import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import ContentTitle from '../../../ContentTitle'
import { GrScorecard } from 'react-icons/gr'
import TableHeader from '../../../TableHeader'
import MotionTr from '../../../MotionTr'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EditBT, DeleteBT } from '../../../BT'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import { AnimatePresence } from 'framer-motion'

function AssessmentCriteria() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sessionExpired, setSessionExpired] = useState(false)
  const [selectedActivityId, setSelectedActivityId] = useState('')
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [semesterCourses, setSemesterCourses] = useState([])
  const [selectAct, setSelectAct] = useState(null)
  const scopeID = localStorage.getItem('scopeID')
  const subjectId = searchParams.get('evidence')
  const year = searchParams.get('year')
  const subjectName = searchParams.get('subjectName')
  const [categories, setCategories] = useState([])
  const [evidenceList, setEvidenceList] = useState({})
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  const buildPreviewUrl = (filePath) => {
    if (!filePath) return null
    const staticPath = filePath.replace('/data/evidence', '/static')
    return `${process.env.REACT_APP_API_URL}${staticPath}`
  }

  useEffect(() => {
    if (subjectId) {
      fetchActivities()
    }
  }, [subjectId])

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

  const fetchActivities = async () => {
    try {
      const activityRes = await fetch(
        `${process.env.REACT_APP_API_URL}/api/activity/${subjectId}/${scopeID}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        },
      )

      if (!activityRes.ok) return

      if (isSessionExpired(activityRes)) {
        setSessionExpired(true)
        return
      }

      const activityResult = await activityRes.json()
      const activities = activityResult.data || []

      setCategories(activities)

      // หา section ไม่ซ้ำ
      const sections = []
      activities.forEach((a) => {
        if (!sections.includes(a.section_id)) {
          sections.push(a.section_id)
        }
      })

      let allEvidence = []

      // วนยิงทีละ section แบบตรง ๆ
      for (let i = 0; i < sections.length; i++) {
        const res = await fetch(
          `${process.env.REACT_APP_API_URL}/api/envidence/section/${sections[i]}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          },
        )

        if (!res.ok) continue

        const data = await res.json()
        allEvidence = allEvidence.concat(data)
      }

      // 2. จัดเรียง allEvidence ด้วย 2 เงื่อนไข
      allEvidence.sort((a, b) => {
        // เงื่อนไขแรก: เรียงตาม activity_id (น้อยไปมาก)
        if (a.activity_id !== b.activity_id) {
          return a.activity_id - b.activity_id
        }

        // เงื่อนไขที่สอง: ถ้า activity_id เท่ากัน ให้เรียงตามประเภทหลักฐานที่กำหนดไว้
        const priorityA = typePriority[a.evidence_type] || 99
        const priorityB = typePriority[b.evidence_type] || 99
        return priorityA - priorityB
      })

      // console.log(allEvidence)

      const activityMap = {}
      activities.forEach((a) => {
        activityMap[a.activity_id] = a.activity_name
      })

      const groupedEvidence = {}

      allEvidence.forEach((item) => {
        const name = activityMap[item.activity_id] || 'ไม่ทราบกิจกรรม'

        if (!groupedEvidence[name]) {
          groupedEvidence[name] = []
        }

        groupedEvidence[name].push(item)
      })

      setEvidenceList(groupedEvidence)
      // console.log(groupedEvidence)
    } catch (err) {
      console.error(err)
    }
  }

  if (!subjectId) return null

  return (
    <ContentMotionDIV className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <ContentMotionDIV className="flex h-[80vh] w-[90vw] flex-col gap-2 rounded-xl bg-white p-6 shadow">
        <div className="flex items-start justify-between border-b pb-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl  text-secondary">
              หลักฐานการประเมินรายวิชา
            </h2>
            <span className=" text-gray-500">
              {subjectId} {subjectName}
            </span>
          </div>

          <button
            onClick={() => setSearchParams({})}
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
        <ContentMotionDIV className="max-h-[70vh] overflow-x-auto overflow-y-auto rounded-lg">
          {Object.entries(evidenceList).map(([activityName, evidences]) => (
            <div key={activityName} className="mb-12">
              <div className="relative mb-2 overflow-hidden rounded-2xl  border  border-gray-200 p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-1 rounded-full border bg-secondary"></div>

                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-600">
                        กิจกรรมการเรียนรู้
                      </p>
                      <h3 className="text-xl  tracking-tight text-secondary">
                        {activityName}
                      </h3>
                    </div>
                  </div>

                  <ContentMotionDIV className="rounded-full px-4 py-1.5 text-sm  text-secondary  ">
                    จำนวน {evidences.length} รายการ
                  </ContentMotionDIV>
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white ">
                <table className="w-full table-fixed border-collapse">
                  {/* ใช้ table-fixed เพื่อให้เราคุมความกว้างแต่ละคอลัมน์ได้แม่นยำ */}
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      <th className="w-[20%] border px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        ประเภทหลักฐาน
                      </th>
                      <th className="w-[70%] border px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        รายละเอียด
                      </th>
                      <th className="w-[10%] border px-6 py-4 text-center text-sm font-semibold text-gray-600">
                        ดำเนินการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {evidences.map((item) => (
                      <tr
                        key={item.evidence_id}
                        className="group transition-colors hover:bg-blue-50/30 "
                      >
                        <td className="vertical-top border-e px-6  py-2">
                          <span className="inline-flex items-center  font-medium text-gray-600 transition-colors group-hover:bg-white">
                            {evidenceTypeMap[item.evidence_type] || '-'}
                          </span>
                        </td>

                        <td className="break-words border-e  px-6  py-2 leading-relaxed text-gray-700">
                          {item.description || (
                            <span className="italic text-gray-400">
                              ไม่มีคำอธิบาย
                            </span>
                          )}
                        </td>

                        <td className="flex items-center justify-center px-6  py-2">
                          <button
                            type="button"
                            disabled={isPreviewLoading}
                            onClick={() => {
                              const url = buildPreviewUrl(item.file_path)
                              setPreviewFile(url)
                            }}
                            className="px- flex items-center justify-center rounded-lg bg-secondary px-3 py-1 font-medium text-white hover:bg-secondary"
                          >
                            <span>เรียกดู</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </ContentMotionDIV>
        <AnimatePresence>
          {previewFile && (
            <ContentMotionDIV
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur md:p-8"
              onClick={() => setPreviewFile(null)}
            >
              <div
                className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <h2 className="text-lg font-bold text-secondary">
                    หลักฐานประกอบการประเมิน - ตัวอย่างผลงาน
                  </h2>

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

                <div className="flex-1 bg-gray-200">
                  <iframe
                    src={`${previewFile}#toolbar=1&navpanes=0`}
                    title="PDF Preview"
                    className="h-full w-full"
                  />
                </div>
              </div>
            </ContentMotionDIV>
          )}
        </AnimatePresence>
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

export default AssessmentCriteria

const studentColumns = [
  { label: 'ประเภท' },
  { label: 'ข้อมูล', align: 'left' },

  { label: 'ดำเนินการ', align: 'center', w: 'w-[130px]' },
]
