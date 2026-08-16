import { useState, useRef, useEffect } from 'react'
import { FaBookOpen } from 'react-icons/fa'
import ContentTitle from '../../../ContentTitle'
import ContentMotionDIV from '../../../ContentMotionDIV'
import TableHeader from '../../../TableHeader'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import DeleteDialog from '../../../DeleteDialog'
import usePagination from '../../../usePagination'
import { AnimatePresence } from 'framer-motion'
import SearchSectionTeacher from '../../../SearchSectionTeacher'
import { useNavigate } from 'react-router-dom'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import { useAuth } from '../../../../context/AuthContext'
import MotionTr from '../../../MotionTr'
import { RiDeleteBin6Line } from 'react-icons/ri'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'
import {
  EditBT,
  SaveBT,
  DeleteBT,
  ViewBT,
  ViewAttentionBT,
  CancleBT,
} from '../../../BT'

function CourseOutcomes() {
  const [sessionExpired, setSessionExpired] = useState(false)
  const savedCourse = JSON.parse(localStorage.getItem('selectedCourse'))
  const section = localStorage.getItem('section_number') || ''
  const section_id = localStorage.getItem('section_id') || ''
  const term = localStorage.getItem('term') || ''
  const year = localStorage.getItem('year') || ''
  const [ListPLO, setListPLO] = useState([])
  const [clos, setClos] = useState([])
  const [editRow, setEditRow] = useState(null)
  const [formData, setFormData] = useState({})
  const [inputValue, setInputValue] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const { profile } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedClo, setSelectedClo] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const navigate = useNavigate()
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

    if (courseData && sectionData && termData && yearData) {
      setFormData(prev => ({
        ...prev,
        subject_id: courseData.subject_id,
        year: yearData,
        semester: termData,
        section_id: section_id,
        performed_by: profile.user_id,
        clo_id: '',
        clo_number: '',
        clo_detail: '',
        teaching_method: '',
        assessment_method: '',
        created_by: profile.user_id,
        plo_list: [],
      }))

      fetchCLO()
      fetchPLOinCourse()
    }
  }, [])

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleEdit = clo => {
    if (isAdding) return
    const key = clo.tempKey || clo.clo_id
    setEditRow(key)
    setFormData(prev => ({
      ...prev,
      ...clo,
      plo_code: clo.plo_code || '', // สำคัญ
    }))
    setAlert({
      open: true,
      message: `กำลังแก้ไขข้อมูลของ CLO-${clo.clo_number}`,
      severity: 'warning',
    })
  }

  const handleSaveAdd = () => {
    fetchCreateCLO()
  }

  const handleUpdateCLO = () => {
    console.log('Updating CLO with data:', formData)
    fetchUpdateCLO()
  }

  const getNextCloId = () => {
    if (clos.length === 0) return 1
    const numbers = clos.map(c => parseInt(c.clo_number))
    const maxNumber = Math.max(...numbers)
    return maxNumber + 1
  }

  const handleAddNewCLO = () => {
    if (isAdding || editRow) return
    setIsAdding(true)
    const newCloId = getNextCloId()
    setFormData({
      section_id: section_id,
      clo_number: newCloId,
      clo_detail: '',
      teaching_method: '',
      assessment_method: '',
      created_by: profile.user_id,
      plo_code: '', // ตัวเดียวพอ
    })
  }

  const handleDeleteClick = clo => {
    setSelectedClo(clo)
    setDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    const key = selectedClo.tempKey || selectedClo.clo_id
    setClos(clos.filter(c => (c.tempKey || c.clo_id) !== key))
    setDialogOpen(false)
    fetchDeleteCLO()
  }

  const handleViewBehaviors = cloId => {
    const slug = savedCourse.subject_name_en.replace(/\s+/g, '-')
    navigate(
      `/teacher/teacherDashboard/${slug}-Section-${section}/courseOutcomes/CLO-${cloId}/behaviors`
    )
  }

  const handleViewAttention = cloId => {
    const slug = savedCourse.subject_name_en.replace(/\s+/g, '-')
    navigate(
      `/teacher/teacherDashboard/${slug}-Section-${section}/courseOutcomes/CLO-${cloId}/attention`
    )
  }

  const filteredList = ListPLO.filter(
    plo =>
      String(plo.outcome_code)
        .toLowerCase()
        .includes(inputValue.toLowerCase()) &&
      plo.outcome_code !== formData.plo_code
  )

  const {
    page,
    setPage,
    currentData,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(clos, 10)

  const editTextRefs = useRef([])

  const handleEditTextareaChange = e => {
    const { name, value } = e.target
    let val = value

    if (name === 'teaching_method' || name === 'assessment_method') {
      val = val
        .split('\n')
        .map(line =>
          line.startsWith('●') || line.trim() === '' ? line : '● ' + line
        )
        .join('\n')
    }

    setFormData(prev => ({ ...prev, [name]: val }))
  }

  useEffect(() => {
    if (!editRow) return

    const syncHeight = () => {
      requestAnimationFrame(() => {
        const maxHeight = Math.max(
          ...editTextRefs.current.map(el => el?.scrollHeight || 0)
        )
        editTextRefs.current.forEach(el => {
          if (el) el.style.height = `${maxHeight}px`
        })
      })
    }

    syncHeight()

    const observers = editTextRefs.current.map(el => {
      if (!el) return null
      const ro = new ResizeObserver(syncHeight)
      ro.observe(el)
      return ro
    })

    return () => observers.forEach(ro => ro?.disconnect())
  }, [editRow])

  const fetchPLOinCourse = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/plo-mapping/get-mapping-in-subject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({
            program_id: '0501',
            subject_id: savedCourse?.subject_id || '',
          }),
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) {
        throw new Error(`Failed to fetch rubrics: ${res.status}`)
      }

      const data = await res.json()
      const sortedData = data.data.sort((a, b) => {
        const numA = parseInt(a.outcome_code.split('-')[1])
        const numB = parseInt(b.outcome_code.split('-')[1])
        return numA - numB
      })
      setListPLO(sortedData)
    } catch (err) {
      console.error(err)
      setListPLO([])
    }
  }

  const fetchCreateCLO = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjectClo/create`,
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
          message: `สร้างผลการเรียนรู้ระดับรายวิชาสำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `สร้างผลการเรียนรู้ระดับรายวิชาไม่สำเร็จ`,
          severity: 'error',
        })
      }

      setFormData(prev => ({
        ...prev,
        clo_id: '',
        clo_detail: '',
        teaching_method: '',
        assessment_method: '',
        plo_list: [],
      }))
      setIsAdding(false)
      fetchCLO()
    } catch (err) {
      console.error(err)
      setListPLO([])
    }
  }

  const fetchDeleteCLO = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjectClo/delete/${selectedClo.clo_id}`,
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
          message: `ลบผลการเรียนรู้ระดับรายวิชาสำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `ลบผลการเรียนรู้ระดับรายวิชาไม่สำเร็จ`,
          severity: 'error',
        })
      }

      setFormData(prev => ({
        ...prev,
        clo_id: '',
        clo_detail: '',
        teaching_method: '',
        assessment_method: '',
        plo_list: [],
      }))
      setIsAdding(false)
      fetchCLO()
    } catch (err) {
      console.error(err)
      setListPLO([])
    }
  }
  const fetchUpdateCLO = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjectClo/update`,
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
          message: `บันทึกการแก้ไขผลการเรียนรู้ระดับรายวิชาสำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `บันทึกการแก้ไขผลการเรียนรู้ระดับรายวิชาไม่สำเร็จ`,
          severity: 'error',
        })
      }
      setFormData(prev => ({
        ...prev,
        clo_id: '',
        clo_detail: '',
        teaching_method: '',
        assessment_method: '',
        plo_list: [],
      }))
      setEditRow(null)
      fetchCLO()
    } catch (err) {
      console.error(err)
      setListPLO([])
    }
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
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()
      setClos(data.data || [])
    } catch (err) {
      console.error(err)
      setClos([])
    }
  }

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentSubjectTitle />
      <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-6 shadow">
        <ContentTitle titlename="ผลการเรียนรู้รายวิชา" icon={FaBookOpen} />

        <SearchSectionTeacher
          onSearch={() => {}}
          searchText="ค้นหาผลการเรียนรู้"
          showImport={false}
          showAdd={true}
          textAddBT="ผลการเรียนรู้"
          onCleckAdd={handleAddNewCLO}
        />

        <div className="mt-0 flex rounded-xl bg-white shadow">
          <div className="w-full rounded-lg ">
            <table className="text-m min-w-full rounded-lg border-gray-300 text-gray-700">
              <TableHeader columns={cloColumns} />
              <tbody className="relative">
                <AddRow
                  isAdding={isAdding}
                  formData={formData}
                  handleChange={handleChange}
                  handleSave={handleSaveAdd}
                  setIsAdding={setIsAdding}
                  setFormData={setFormData}
                  ListPLO={ListPLO}
                />

                <AnimatePresence>
                  {currentData.map(clo => {
                    const rowKey = clo.tempKey || clo.clo_id
                    return (
                      <MotionTr
                        key={clo.clo_id}
                        className="border-b border-gray-200 bg-white hover:bg-gray-50"
                      >
                        <td className="border-x px-2 py-2 text-center">
                          CLO-{clo.clo_number}
                        </td>

                        {[
                          'clo_detail',
                          'teaching_method',
                          'assessment_method',
                        ].map((name, i) => (
                          <td
                            key={name}
                            className="max-w-md border-x px-2 py-2 text-left align-top"
                          >
                            {editRow === rowKey ? (
                              <textarea
                                ref={el => (editTextRefs.current[i] = el)}
                                name={name}
                                value={formData[name] || ''}
                                onChange={handleEditTextareaChange}
                                onKeyDown={e => {
                                  if (
                                    (name === 'teaching_method' ||
                                      name === 'assessment_method') &&
                                    e.key === 'Enter'
                                  ) {
                                    e.preventDefault()
                                    const textarea = e.target
                                    const { selectionStart, selectionEnd } =
                                      textarea
                                    const value = formData[name] || ''

                                    const before = value.slice(
                                      0,
                                      selectionStart
                                    )
                                    const after = value.slice(selectionEnd)

                                    const newValue = before + '\n● ' + after

                                    setFormData(prev => ({
                                      ...prev,
                                      [name]: newValue,
                                    }))

                                    setTimeout(() => {
                                      textarea.selectionStart =
                                        textarea.selectionEnd =
                                          selectionStart + 3
                                    }, 0)
                                  }
                                }}
                                className="w-full rounded border p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : name === 'clo_detail' ? (
                              <div className="whitespace-normal ">
                                {clo[name]}
                              </div>
                            ) : (
                              <div
                                className=""
                                dangerouslySetInnerHTML={{
                                  __html: (clo?.[name] ?? '').replace(
                                    /\n/g,
                                    '<br/>'
                                  ),
                                }}
                              />
                            )}
                          </td>
                        ))}
                        <td className="border-x px-2 py-2 text-center">
                          {editRow === rowKey ? (
                            <div className="relative flex flex-col items-center text-center">
                              <AnimatePresence>
                                {formData.plo_code ? (
                                  <ContentMotionDIV className="mb-2 flex items-center gap-2 whitespace-nowrap rounded-lg bg-slate-200 px-2 py-1 text-gray-700">
                                    {formData.plo_code}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setFormData(prev => ({
                                          ...prev,
                                          plo_code: '',
                                          plo_id: '',
                                        }))
                                      }
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <RiDeleteBin6Line />
                                    </button>
                                  </ContentMotionDIV>
                                ) : (
                                  <span className="mb-2 text-gray-400"></span>
                                )}
                              </AnimatePresence>

                              <AnimatePresence>
                                {!formData.plo_code && (
                                  <ContentMotionDIV>
                                    <input
                                      name="plo_code"
                                      value={inputValue}
                                      onChange={e =>
                                        setInputValue(e.target.value)
                                      }
                                      placeholder="กรอก PLO"
                                      className="mb-2 w-24 rounded border px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      onFocus={() => setShowDropdown(true)}
                                      onBlur={() =>
                                        setTimeout(
                                          () => setShowDropdown(false),
                                          100
                                        )
                                      }
                                      onKeyDown={e => {
                                        if (
                                          e.key === 'Enter' &&
                                          filteredList.length > 0
                                        ) {
                                          e.preventDefault()
                                          setFormData(prev => ({
                                            ...prev,
                                            plo_code:
                                              filteredList[0].outcome_code,
                                          }))
                                          setInputValue('')
                                        }
                                      }}
                                    />
                                  </ContentMotionDIV>
                                )}
                              </AnimatePresence>

                              {showDropdown && filteredList.length > 0 && (
                                <ul
                                  style={{ minWidth: '300px' }}
                                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-auto rounded border bg-white shadow"
                                >
                                  {filteredList.map(plo => (
                                    <li
                                      key={plo.outcome_code}
                                      className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap px-2 py-1 text-left hover:bg-gray-200"
                                      onMouseDown={() => {
                                        setFormData(prev => ({
                                          ...prev,
                                          plo_id: plo.outcome_id, // ตั้งค่า ID
                                          plo_code: plo.outcome_code, // ตั้งค่า CODE
                                        }))
                                        setInputValue('')
                                        setShowDropdown(false)
                                      }}
                                      title={`${plo.outcome_code} - ${plo.outcome_title}`}
                                    >
                                      <span className="font-bold">
                                        {plo.outcome_code}
                                      </span>
                                      <span className="text-gray-500">
                                        {' '}
                                        - {plo.outcome_title}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              {clo.plo_code ? (
                                <span className="rounded-lg bg-slate-200 px-2 py-1">
                                  {clo.plo_code}
                                </span>
                              ) : (
                                <span className="text-gray-400"></span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className=" border-x px-2 py-2">
                          <AnimatePresence>
                            {editRow === rowKey ? (
                              <ContentMotionDIV className="flex w-full justify-center gap-2">
                                <SaveBT item={clo} onSave={handleUpdateCLO} />
                                <CancleBT
                                  onClick={() => {
                                    setIsAdding(false)
                                    setEditRow(null)
                                    setFormData({
                                      clo_id: '',
                                      clo_description: '',
                                      teaching_method: '',
                                      assessment_method: '',
                                      plo_list: '',
                                    })
                                  }}
                                />
                              </ContentMotionDIV>
                            ) : (
                              <ContentMotionDIV className="flex w-full justify-center gap-2">
                                <EditBT
                                  item={clo}
                                  onEdit={() => handleEdit(clo)}
                                />

                                <ViewBT
                                  item={clo}
                                  onView={() => {
                                    localStorage.setItem(
                                      'selectedCLO',
                                      JSON.stringify(clo)
                                    )
                                    handleViewBehaviors(clo.clo_number)
                                  }}
                                />

                                <ViewAttentionBT
                                  item={clo}
                                  onView={() => {
                                    localStorage.setItem(
                                      'selectedCLO',
                                      JSON.stringify(clo)
                                    )
                                    handleViewAttention(clo.clo_number)
                                  }}
                                />
                                <DeleteBT
                                  item={clo}
                                  onDelete={() => handleDeleteClick(clo)}
                                />
                              </ContentMotionDIV>
                            )}
                          </AnimatePresence>
                        </td>
                      </MotionTr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
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
          Name={`CLO-${selectedClo?.clo_number}`}
          massage="ไม่สามารถลบรายการนี้ได้หากมีการใช้งานอยู่ กรุณาตรวจสอบความเกี่ยวข้องก่อนดำเนินการ"
        />
      </ContentMotionDIV>
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}

export default CourseOutcomes

const AddRow = ({
  isAdding,
  formData,
  handleChange,
  handleSave,
  setIsAdding,
  setFormData,
  ListPLO,
}) => {
  const textRefs = useRef([])

  const [inputValue, setInputValue] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // เลือกได้ตัวเดียว
  const handleAdd = ploCode => {
    setFormData(prev => ({
      ...prev,
      plo_code: ploCode,
    }))
    setInputValue('')
  }

  const handleRemove = () => {
    setFormData(prev => ({
      ...prev,
      plo_code: '',
    }))
  }

  const filteredList = ListPLO.filter(
    plo =>
      String(plo.outcome_code)
        .toLowerCase()
        .includes(inputValue.toLowerCase()) &&
      plo.outcome_code !== formData.plo_code
  )

  useEffect(() => {
    if (!isAdding) return

    const sync = () => {
      requestAnimationFrame(() => {
        const maxHeight = Math.max(
          ...textRefs.current.map(el => el?.scrollHeight || 0)
        )
        textRefs.current.forEach(el => {
          if (el) el.style.height = `${maxHeight}px`
        })
      })
    }

    sync()

    const observers = textRefs.current.map(el => {
      if (!el) return null
      const ro = new ResizeObserver(sync)
      ro.observe(el)
      return ro
    })

    return () => observers.forEach(ro => ro?.disconnect())
  }, [isAdding])

  const placeholders = {
    clo_detail: 'ระบุผลการเรียนรู้ระดับรายวิชา',
    teaching_method: 'ระบุวิธีการจัดการเรียนการสอน ',
    assessment_method: 'ระบุวิธีการวัดและประเมินผล ',
  }

  return (
    <AnimatePresence>
      {isAdding && (
        <MotionTr className="relative border-b border-gray-200 bg-white hover:bg-gray-50 ">
          <td className="border-x px-2 py-2 text-center">
            <div className="flex items-center">
              <input
                className="w-[80px] rounded border px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={`CLO-${formData.clo_number}`}
                onChange={e =>
                  setFormData({
                    ...formData,
                    clo_number: e.target.value.replace(/^CLO-/, ''),
                  })
                }
              />
            </div>
          </td>

          {['clo_detail', 'teaching_method', 'assessment_method'].map(
            (name, i) => (
              <td
                key={name}
                className="items-center border-x px-2 py-2 text-left"
              >
                <textarea
                  ref={el => (textRefs.current[i] = el)}
                  name={name}
                  value={formData[name]}
                  placeholder={placeholders[name]}
                  onChange={e => {
                    let val = e.target.value

                    if (
                      name === 'teaching_method' ||
                      name === 'assessment_method'
                    ) {
                      val = val
                        .split('\n')
                        .map(line =>
                          line.startsWith('●') ? line : '● ' + line
                        )
                        .join('\n')
                    }

                    setFormData(prev => ({ ...prev, [name]: val }))
                  }}
                  onKeyDown={e => {
                    if (
                      (name === 'teaching_method' ||
                        name === 'assessment_method') &&
                      e.ctrlKey &&
                      e.key === 'Enter'
                    ) {
                      e.preventDefault()
                      const textarea = e.target
                      const { selectionStart, selectionEnd } = textarea
                      const value = formData[name]

                      const before = value.slice(0, selectionStart)
                      const after = value.slice(selectionEnd)

                      const newValue = before + '\n● ' + after

                      setFormData(prev => ({ ...prev, [name]: newValue }))

                      setTimeout(() => {
                        textarea.selectionStart = textarea.selectionEnd =
                          selectionStart + 3
                      }, 0)
                    }
                  }}
                  className="h-full min-h-24 w-full overflow-hidden rounded border p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </td>
            )
          )}

          {/* ----------- PLO CODE SINGLE ----------- */}
          <td className="relative h-full overflow-visible border-x px-2 py-2">
            <div className="relative flex flex-col items-center text-center">
              <AnimatePresence>
                {formData.plo_code ? (
                  <AnimatePresence>
                    {formData.plo_code ? (
                      <ContentMotionDIV className="mb-2 flex items-center gap-2 whitespace-nowrap rounded-lg bg-slate-200 px-2 py-1 text-gray-700">
                        {formData.plo_code}
                        <button
                          type="button"
                          onClick={() =>
                            setFormData(prev => ({
                              ...prev,
                              plo_code: '',
                              plo_id: '',
                            }))
                          }
                          className="text-red-500 hover:text-red-700"
                        >
                          <RiDeleteBin6Line />
                        </button>
                      </ContentMotionDIV>
                    ) : (
                      <span className="mb-2 text-gray-400"></span>
                    )}
                  </AnimatePresence>
                ) : (
                  <ContentMotionDIV>
                    <input
                      name="plo_code"
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      placeholder="กรอก PLO"
                      className="mb-2 w-24 rounded border px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onFocus={() => setShowDropdown(true)}
                      onBlur={() =>
                        setTimeout(() => setShowDropdown(false), 100)
                      }
                      onKeyDown={e => {
                        if (e.key === 'Enter' && filteredList.length > 0) {
                          e.preventDefault()
                          const first = filteredList[0]
                          setFormData(prev => ({
                            ...prev,
                            plo_id: first.outcome_id,
                            plo_code: first.outcome_code,
                          }))
                          setInputValue('')
                          setShowDropdown(false)
                        }
                      }}
                    />

                    {/* Dropdown */}
                    {showDropdown && filteredList.length > 0 && (
                      <ul
                        style={{ minWidth: '300px' }}
                        className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-auto rounded border bg-white shadow"
                      >
                        {filteredList.map(plo => (
                          <li
                            key={plo.outcome_code}
                            className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap px-2 py-1 text-left hover:bg-gray-200"
                            onMouseDown={() => {
                              setFormData(prev => ({
                                ...prev,
                                plo_id: plo.outcome_id,
                                plo_code: plo.outcome_code,
                              }))
                              setInputValue('')
                              setShowDropdown(false)
                            }}
                            title={`${plo.outcome_code} - ${plo.outcome_title}`}
                          >
                            <span className="font-bold">
                              {plo.outcome_code}
                            </span>
                            <span className="text-gray-500">
                              {' '}
                              - {plo.outcome_title}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </ContentMotionDIV>
                )}
              </AnimatePresence>
            </div>
          </td>

          <td className="border-x px-2 py-2">
            <div className="flex w-full justify-center gap-2 ">
              <SaveBT item={null} onSave={handleSave} />
              <CancleBT
                onClick={() => {
                  setIsAdding(false)
                  setFormData({
                    clo_id: '',
                    clo_description: '',
                    teaching_method: '',
                    assessment_method: '',
                    plo_code: '',
                  })
                }}
              />
            </div>
          </td>
        </MotionTr>
      )}
    </AnimatePresence>
  )
}

const cloColumns = [
  { label: 'ลำดับ', w: 'w-[80px]' },
  { label: 'รายละเอียดผลการเรียนรู้ระดับรายวิชา', align: 'left' },
  { label: 'วิธีการสอน', align: 'left' },
  { label: 'วิธีการประเมินผล', align: 'left' },
  { label: 'PLO', w: 'w-[100px]' },
  { label: 'ดำเนินการ', w: 'w-[150px]' },
]
