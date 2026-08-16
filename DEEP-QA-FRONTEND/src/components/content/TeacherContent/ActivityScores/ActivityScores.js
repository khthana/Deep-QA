import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import { GrScorecard } from 'react-icons/gr'
import ContentTitle from '../../../ContentTitle'
import Switch from '@mui/material/Switch'
import MotionTr from '../../../MotionTr'
import TableHeader from '../../../TableHeader'
import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { LuImport } from 'react-icons/lu'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'
import ImportActivityScoresDialog from './ImportActivityScoresDialog'

function ActivityScores() {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const label = { inputProps: { 'aria-label': 'Switch demo' } }
  const [data, setData] = useState([])
  const navigate = useNavigate()
  const section_id = localStorage.getItem('section_id') || ''
  const [students, setStudents] = useState([])
  const [categories, setCategories] = useState([])
  const [scoreType, setScoreType] = useState('clo')
  const [selectedActivityId, setSelectedActivityId] = useState('')
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [selectAct, setSelectAct] = useState(null)
  const [cloMappings, setCloMappings] = useState([])
  const [isGroup, setIsGroup] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [studentScores, setStudentScores] = useState({})

  const [cloList, setCloList] = useState([])
  const [rows, setRows] = useState([])

  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  useEffect(() => {
    if (section_id) {
      fetchStudentCourses()
      fetchActivitiesForScore()
    }
  }, [])

  useEffect(() => {
    if (!selectedActivity || cloMappings.length === 0) return

    setSelectAct({
      ...selectAct,
      clo: cloMappings.map((c) => c.clo_number),
    })
  }, [cloMappings, selectedActivity])

  const studentColumns = !selectedActivity
    ? [
        { label: 'รหัสนักศึกษา' },
        { label: 'ชื่อ-สกุล', align: 'left' },
        { label: 'คะแนน' },
      ]
    : isGroup
    ? scoreType === 'total'
      ? [
          { label: 'ชื่อกลุ่ม', align: 'left' },
          { label: 'คะแนนรวม', w: 'w-[100px]' },
        ]
      : [
          { label: 'ชื่อกลุ่ม', align: 'left' },
          ...cloMappings.map((m, idx) => ({
            label: `CLO-${m.clo_number ?? idx + 1}`,
          })),
        ]
    : scoreType === 'total'
    ? [
        { label: 'รหัสนักศึกษา' },
        { label: 'ชื่อ-สกุล', align: 'left' },
        { label: 'คะแนนรวม', w: 'w-[100px]' },
      ]
    : [
        { label: 'รหัสนักศึกษา' },
        { label: 'ชื่อ-สกุล', align: 'left' },
        ...cloMappings.map((m, idx) => ({
          label: `CLO-${m.clo_number ?? idx + 1}`,
        })),
      ]

  useEffect(() => {
    if (selectedActivityId) {
      fetchScoreData(selectedActivityId, scoreType)
    }
  }, [scoreType, selectedActivityId])

  const handleEdit = () => {
    setAlert({
      open: true,
      message: 'กำลังแก้ไขคะแนนของกิจกรรม',
      severity: 'warning',
    })
    setEditMode(true)
  }

  const handleCancel = () => {
    setEditMode(false)
    if (selectedActivityId) fetchScoreData(selectedActivityId)
  }

  const handleSave = async () => {
    // console.log(cloList)
    const payload = {
      section_id,
      activity_id: Number(selectedActivityId),
      score_type: scoreType === 'clo' ? 'clo' : 'average',
      group: isGroup,
      clo: cloMappings.map((c) => c.clo_id),
      list_student: rows.map((r) => ({
        id: r.id,
        list_score: r.list_score || [],
      })),
    }

    // console.log('Save Payload:', payload)

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/activityScore/upsert`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.message || 'บันทึกไม่สำเร็จ')
      }

      setAlert({
        open: true,
        message: 'บันทึกคะแนนสำเร็จ',
        severity: 'success',
      })

      setEditMode(false)
      fetchScoreData(selectedActivityId)
    } catch (err) {
      console.error(err)
      setAlert({
        open: true,
        message: err.message || 'เกิดข้อผิดพลาดในการบันทึกคะแนน',
        severity: 'error',
      })
    }
  }

  const fetchStudentCourses = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/studentCourse/get/${section_id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()
      const sortedData = data.data.sort((a, b) => {
        return a.student_id.localeCompare(b.student_id, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      })

      setStudents(sortedData)
    } catch (err) {
      console.error('Error :', err)
      setStudents([])
    }
  }

  // const handleScoreChange = (studentId, cloIndex, value) => {
  //   setStudentScores((prev) => {
  //     const prevScores = prev[studentId] || []
  //     const updated = [...prevScores]
  //     updated[cloIndex] = Number(value)

  //     return {
  //       ...prev,
  //       [studentId]: updated,
  //     }
  //   })
  // }

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

  const fetchScoreData = async (activityId) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/activityScore/get`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            section_id,
            activity_id: Number(activityId),
            score_type: 'clo',
            group: isGroup,
          }),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()
      if (!res.ok) throw new Error('โหลดคะแนนไม่สำเร็จ')

      setSelectedActivity(true)
      setCloMappings(data.clo || [])

      let rows = data.list_student || []

      console.log(cloMappings)

      if (scoreType === 'total') {
        rows = rows.map((r) => ({
          ...r,
          list_score: [(r.list_score || []).reduce((sum, v) => sum + v, 0)],
        }))
      }

      if (isGroup) {
        if (data.list_student && data.list_student.length > 0) {
          setRows(rows)
        } else {
          // ถ้ายังไม่เคยกรอกคะแนน → ไปเอากลุ่มล้วนๆ มาแสดง
          fetchGroupsInSection()
        }
      } else {
        setRows(rows || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchGroupsInSection = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/studentGroup/get-all-groups-in-section/${section_id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()
      if (!res.ok) throw new Error('โหลดข้อมูลกลุ่มไม่สำเร็จ')

      // แปลงให้อยู่ format เดียวกับ rows
      const mappedRows = (data.result || []).map((g) => ({
        id: g.group_id,
        group_name: g.group_name,
        list_score: [], // จะค่อยเติมตอนกรอก / fetch score
      }))

      setRows(mappedRows)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchActivitiesForScore()
  }, [])

  const resetActivitySelection = () => {
    setSelectedActivityId('')
    setSelectedActivity(null)
    setSelectAct(null)
    setRows([])
    setCloList([])
    setEditMode(false)
  }

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentSubjectTitle></ContentSubjectTitle>
      <ContentMotionDIV className="flex h-full flex-col gap-4 rounded-xl bg-white p-6 shadow">
        <div className="inline-flex items-center justify-between align-middle">
          <ContentTitle
            titlename="คะแนนกิจกรรมการเรียนรู้"
            icon={GrScorecard}
          />
          <div className="inline-flex items-center gap-2">
            {' '}
            <button
              type="button"
              onClick={() => navigate('AssessmentCriteria')}
              className={
                'flex items-center justify-center rounded-lg bg-sky-500 px-5 py-2.5 font-medium text-white hover:bg-sky-600'
              }
            >
              แนบหลักฐาน
            </button>
            <div className="flex flex-row items-center gap-2">
              {/* นำเข้าข้อมูล */}
              <button
                type="button"
                disabled={!selectedActivity}
                className={`flex items-center justify-center rounded-lg px-5 py-2.5 text-center font-medium text-white transition ${
                  !selectedActivity
                    ? 'cursor-not-allowed bg-gray-400'
                    : 'bg-cyan-600 hover:bg-cyan-700'
                }`}
                onClick={() => setIsImportDialogOpen(true)}
              >
                <LuImport className="me-2 h-5 w-5" />
                นำเข้าข้อมูล
              </button>

              {/* โหมดแก้ไข / ปกติ */}
              {!editMode ? (
                <button
                  type="button"
                  onClick={handleEdit}
                  disabled={!selectedActivity}
                  className={`flex items-center justify-center rounded-lg px-5 py-2.5 text-center font-medium text-white transition ${
                    !selectedActivity
                      ? 'cursor-not-allowed bg-gray-400'
                      : 'bg-secondary hover:bg-secondary_hover'
                  }`}
                >
                  แก้ไขคะแนน
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="flex items-center justify-center rounded-lg bg-secondary px-5 py-2.5 font-medium text-white hover:bg-secondary_hover"
                  >
                    บันทึก
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center justify-center rounded-lg bg-gray-400 px-5 py-2.5 font-medium text-white hover:bg-gray-500"
                  >
                    ยกเลิก
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="inline-flex overflow-hidden rounded-lg border"></div>
        <div className="inline-flex w-full items-start justify-between align-top">
          <div className="flex flex-col gap-2">
            <label className="text-m text-gray-600">กิจกรรมการเรียนรู้</label>

            <select
              value={selectedActivityId}
              onChange={(e) => {
                const id = e.target.value

                setScoreType('clo')
                setSelectedActivityId(id)
                setEditMode(false)
                setSelectedActivity(null)
                setSelectAct(null)

                if (id) fetchScoreData(id)
                else {
                  setRows([])
                  setCloMappings([])
                }

                const act = categories
                  .flatMap((c) => c.activities)
                  .find((a) => a.activity_id == id)

                setSelectAct(act || null)
              }}
              className="text-m rounded-md border border-gray-300 px-3 py-1.5 text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 [&_option:contains('(กิจกรรมกลุ่ม)')]:text-slate-400 [&_option]:text-slate-700"
            >
              <option value="">-- เลือกกิจกรรมเพื่อแก้ไขคะแนน --</option>

              {categories.flatMap((cat) =>
                cat.activities
                  .filter(
                    (act) =>
                      isGroup
                        ? act.activity_type === 'group' // โหมดกลุ่ม: เอาเฉพาะกลุ่ม
                        : true, // โหมดเดี่ยว: เอาทุกกิจกรรม
                  )
                  .map((act) => (
                    <option key={act.activity_id} value={act.activity_id}>
                      {act.activity_name}
                      {act.activity_type === 'group' ? '  – กิจกรรมกลุ่ม' : ''}
                    </option>
                  )),
              )}
            </select>
          </div>

          <ContentMotionDIV className=" flex flex-col items-end gap-2">
            <label className="text-m text-gray-600">รูปแบบการกรอกคะแนน</label>

            <div className="inline-flex overflow-hidden rounded-lg border">
              <button
                type="button"
                onClick={() => {
                  if (isGroup) {
                    setIsGroup(false)
                    setScoreType('clo')
                    resetActivitySelection()
                  }
                }}
                className={`px-4 py-2 text-sm transition-all duration-200 ease-out ${
                  !isGroup
                    ? 'bg-secondary text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                กรอกคะแนนแบบเดี่ยว
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!isGroup) {
                    setIsGroup(true)
                    setScoreType('clo')
                    resetActivitySelection()
                  }
                }}
                className={`px-4 py-2 text-sm transition-all duration-200 ease-out ${
                  isGroup
                    ? 'bg-secondary text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                กรอกคะแนนแบบกลุ่ม
              </button>
            </div>

            {/* สวิตช์แยก CLO */}
            <div className="inline-flex items-center gap-2 text-sm text-gray-600">
              <span>คะแนนแยกตาม CLO</span>
              <Switch
                checked={scoreType === 'clo'}
                onChange={(e) =>
                  setScoreType(e.target.checked ? 'clo' : 'total')
                }
              />
            </div>
          </ContentMotionDIV>
        </div>
        <div className="mt-0 flex rounded-xl ">
          {selectedActivityId === '' ? (
            <ContentMotionDIV className="w-full py-10 text-center text-gray-400">
              กรุณาเลือกกิจกรรมเพื่อกรอกคะแนน
            </ContentMotionDIV>
          ) : (
            <div className="w-full overflow-x-auto rounded-lg bg-white shadow">
              <table className="text-m min-w-full border-gray-300 text-center text-gray-700">
                <TableHeader columns={studentColumns} />
                {selectedActivity && (
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-sm text-gray-500 ">
                      {
                        isGroup || (
                          <th className="px-4  text-right"></th>
                        ) /* ช่องว่างระหว่างรหัสกับชื่อ */
                      }
                      <th className="px-4 text-right">คะแนนเต็ม</th>

                      {scoreType === 'clo' ? (
                        cloMappings.map((m) => (
                          <th
                            key={m.clo_id}
                            className="border-e border-l text-center"
                          >
                            {m.max_score} คะแนน
                          </th>
                        ))
                      ) : (
                        <th className="border-e text-center">
                          {cloMappings
                            .reduce(
                              (sum, m) => sum + Number(m.max_score || 0),
                              0,
                            )
                            .toFixed(2)}{' '}
                          คะแนน
                        </th>
                      )}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {rows.map((row, idx) => (
                    <MotionTr
                      key={row.id}
                      className="border-b border-gray-200 bg-white hover:bg-gray-50"
                    >
                      {!isGroup && (
                        <td className="w-[160px] border-e text-center">
                          {row.id}
                        </td>
                      )}

                      {/* ชื่อ */}
                      <td className="border-e px-2 py-2 text-left">
                        {isGroup
                          ? row.group_name
                          : `${row.title_th || ''}${row.first_name} ${
                              row.last_name
                            }`}
                      </td>

                      {/* คะแนน */}
                      {scoreType === 'total' ? (
                        <td className="text-center">
                          {editMode ? (
                            <input
                              type="number"
                              max={row.max_score}
                              min={0}
                              className="w-24 rounded border px-2 py-1 text-center focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={row.list_score?.[0] ?? ''}
                              onChange={(e) => {
                                const raw = e.target.value

                                setRows((prev) =>
                                  prev.map((r) => {
                                    if (r.id !== row.id) return r

                                    if (raw === '') {
                                      return { ...r, list_score: [] }
                                    }

                                    let v = parseFloat(raw)
                                    if (isNaN(v)) return r

                                    if (v < 0) v = 0

                                    const max = cloMappings.reduce(
                                      (sum, m) =>
                                        sum + Number(m.max_score || 0),
                                      0,
                                    )

                                    if (v > max) v = max

                                    return {
                                      ...r,
                                      list_score: [v],
                                    }
                                  }),
                                )
                              }}
                            />
                          ) : (
                            <ContentMotionDIV>
                              {Number(row.list_score?.[0] ?? 0).toFixed(2)}
                            </ContentMotionDIV>
                          )}
                        </td>
                      ) : (
                        cloMappings.map((m, cIdx) => (
                          <td
                            key={cIdx}
                            className="w-[100px] border-e text-center"
                          >
                            {editMode ? (
                              <input
                                type="number"
                                max={m.max_score}
                                min={0}
                                className="w-20 rounded border px-2 py-1 text-center focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={row.list_score?.[cIdx] ?? ''}
                                onChange={(e) => {
                                  const raw = e.target.value

                                  setRows((prev) =>
                                    prev.map((r) => {
                                      if (r.id !== row.id) return r

                                      const scores = [...(r.list_score || [])]

                                      if (raw === '') {
                                        scores[cIdx] = undefined
                                        return { ...r, list_score: scores }
                                      }

                                      let v = parseFloat(raw)
                                      if (isNaN(v)) return r

                                      if (v < 0) v = 0
                                      if (v > m.max_score) v = m.max_score

                                      scores[cIdx] = v
                                      return { ...r, list_score: scores }
                                    }),
                                  )
                                }}
                              />
                            ) : (
                              <ContentMotionDIV>
                                {Number(row.list_score?.[cIdx] ?? 0).toFixed(2)}
                              </ContentMotionDIV>
                            )}
                          </td>
                        ))
                      )}
                    </MotionTr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ContentMotionDIV>

      <ImportActivityScoresDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        clo={scoreType}
        groupType={isGroup ? 'group' : 'individual'}
        section_id={section_id}
        fetchScoreData={fetchScoreData}
        selectedActivity={selectAct}
        students={students}
        group_list={rows}
        setAlert={setAlert}
        cloMappings={cloMappings}
        // fetchStudentGroup={fetchStudentGroup}
        // performed_by={profile?.user_id || ''}
      />

      <Snackbar
        open={alert.open}
        autoHideDuration={5000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <div className="flex flex-col gap-2">
          {Array.isArray(alert.message) ? (
            alert.message.map((e, i) => (
              <Alert
                key={i}
                onClose={() => setAlert({ ...alert, open: false })}
                severity={alert.severity}
                variant="filled"
              >
                ข้อมูลในแถวที่ {e.row}: {e.student_id} {e.error}
              </Alert>
            ))
          ) : (
            <Alert
              onClose={() => setAlert({ ...alert, open: false })}
              severity={alert.severity}
              variant="filled"
            >
              {alert.message ?? ''}
            </Alert>
          )}
        </div>
      </Snackbar>
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
export default ActivityScores
