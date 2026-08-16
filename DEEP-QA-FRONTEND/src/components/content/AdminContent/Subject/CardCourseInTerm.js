import TableHeader from '../../../TableHeader'
import TeacherTag from '../../../TeacherTag'
import ContentMotionDIV from '../../../ContentMotionDIV'
import { useEffect, useState } from 'react'
import { useAuth } from '../../../../context/AuthContext'
import { FaSave } from 'react-icons/fa'
import { AnimatePresence, frameData } from 'framer-motion'
import { RiDeleteBin6Line, RiEdit2Line } from 'react-icons/ri'
import DeleteDialog from '../../../DeleteDialog'
import MotionTr from '../../../MotionTr'

function CardCourseInterm({
  courses,
  SubjectInProg,
  year,
  term,
  setAdding,
  fetchSemesterCourses,
  setAlert,
  semesterCourses,
  teacherList,
}) {
  const [suggestions, setSuggestions] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [formData, setFormData] = useState({})
  const { profile } = useAuth()
  const Scope = localStorage.getItem('scopeID')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleteSectionDialogOpen, setIsDeleteSectionDialogOpen] =
    useState(false)

  const [addingCourseId, setAddingCourseId] = useState(null)
  const [selectedTeachers, setSelectedTeachers] = useState([])
  const [teacherInput, setTeacherInput] = useState('')
  const [editingSectionId, setEditingSectionId] = useState(null)
  const [selectedSecDelete, setselectedSecDelete] = useState({})

  const [addSectionFormData, setSectionFormData] = useState({
    semester_course_id: courses?.semester_course_id,
    section_number: '',
    teacher_emails: [],
  })

  const [teachers, setTeachers] = useState([])

  const handleChangeAddChang = e => {
    const value = e.target.value
    setFormData({ ...formData, subject_id: value })

    setSelectedSubject(null)

    if (value.trim() === '') {
      setSuggestions([])
      return
    }

    const filtered = SubjectInProg.filter(
      p =>
        p.subject_id.toLowerCase().includes(value.toLowerCase()) &&
        !semesterCourses.some(c => c.subject_id === p.subject_id)
    )

    setSuggestions(filtered)
  }

  const handleSelect = subject => {
    setSelectedSubject(subject)
    setFormData({
      ...subject,
      subject_type: 'required',
      email: profile.email,
      program_id: Scope,
      academic_year: year,
      semester: term,
    })
    setSuggestions([])
  }

  const handleAddCourses = () => {
    console.log(formData)
    setAdding(false)
    fetchAddSemesterCourses()
  }
  const handleAddSection = course => {
    if (addingCourseId) return
    // const hasActionCol = Columns.some((col) => col.label === 'ดำเนินการ')
    // if (!hasActionCol) {
    //   Columns.push({
    //     label: 'ดำเนินการ',
    //     align: 'center',
    //   })
    // }

    setFormData({
      semester_course_id: course.semester_course_id,
      section_number: '',
      teacher_emails: [],
    })

    setAddingCourseId(course.semester_course_id)
  }
  const handleSaveAddSection = () => {
    if (!addSectionFormData.section_number.trim()) {
      setAlert({
        open: true,
        message: `กรุณากรอกเลขกลุ่มเรียน เพื่อบันทึกข้อมูล`,
        severity: 'info',
      })
    }
    console.log(addSectionFormData)
    fetchAddSemesterCoursesSection()
    handleCancelAdd()
    setSelectedTeachers([])
    setSectionFormData({
      semester_course_id: courses.semester_course_id,
      section_number: '',
      teacher_emails: [],
    })
  }

  const handleCancelAdd = () => {
    // Columns.pop({
    //   label: 'ดำเนินการ',
    //   align: 'center',
    // })
    setAddingCourseId(null)
  }

  const handleSectionChange = e => {
    setSectionFormData({
      ...addSectionFormData,
      section_number: e.target.value,
    })
  }

  const handleSectionUpdateChange = e => {
    setSectionFormData({
      ...addSectionFormData,
      new_section_number: e.target.value,
    })
  }

  const handleUpdateSec = sec => {
    setAlert({
      open: true,
      message: `กำลังแก้ไขกลุ่มเรียน`,
      severity: 'warning',
    })
    setTeacherInput('')
    setEditingSectionId(sec.section_id)

    const newFormData = {
      ...addSectionFormData,
      section_id: sec.section_id,
      new_section_number: sec.section_number,
      teacher_emails: sec.teachers.map(t => t.email),
    }

    setSectionFormData(newFormData)
    setSelectedTeachers(sec.teachers)

    // console.log(newFormData)
  }

  const handleSelectTeacher = teacher => {
    console.log(teacher)
    if (
      !addSectionFormData.teacher_emails.includes(teacher.email) &&
      !selectedTeachers.some(t => t.email === teacher.email)
    ) {
      setSectionFormData({
        ...addSectionFormData,
        teacher_emails: [...addSectionFormData.teacher_emails, teacher.email],
      })
      setSelectedTeachers([...selectedTeachers, teacher])
    }
    setTeacherInput('')
    console.log(selectedTeachers)
  }

  // ลบอาจารย์
  const handleRemoveTeacher = email => {
    setSectionFormData({
      ...addSectionFormData,
      teacher_emails: addSectionFormData.teacher_emails.filter(
        t => t !== email
      ),
    })
    setSelectedTeachers(selectedTeachers.filter(t => t.email !== email))
  }

  const handleSaveSection = () => {
    setSectionFormData({
      ...addSectionFormData,
      teacher_emails: selectedTeachers.map(t => t.email),
    })

    setEditingSectionId(null)
    // console.log(addSectionFormData)
    fetchUpdateSemesterCourses()
    setSelectedTeachers([])
  }

  const handleDeleteSection = section => {
    setIsDeleteSectionDialogOpen(true)
    // console.log(section.section_id)
    setselectedSecDelete(section)
  }

  const fetchAddSemesterCourses = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/semesterCourses/create`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      )

      if (res.ok) {
        setAlert({
          open: true,
          message: `เปิดรายวิชาในภาคการศึกษา สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `เปิดรายวิชาในภาคการศึกษา ไม่สำเร็จ`,
          severity: 'error',
        })
      }

      const data = await res.json()
      fetchSemesterCourses()
    } catch (err) {
      console.error('Error :', err)
    }
  }

  const fetchAddSemesterCoursesSection = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/coursSections/create-section-teacher`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(addSectionFormData),
        }
      )

      if (res.ok) {
        setAlert({
          open: true,
          message: `สร้างกลุ่มเรียนในรายวิชา ${courses?.subject_name_th} สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `สร้างกลุ่มเรียนในรายวิชา ${courses?.subject_name_th} ไม่สำเร็จ`,
          severity: 'error',
        })
      }

      const data = await res.json()
      fetchSemesterCourses()
    } catch (err) {
      console.error('Error :', err)
    }
  }

  const fetchDeleteSemesterCourses = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/semesterCourses/delete`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            semester_course_id: courses.semester_course_id,
          }),
        }
      )

      if (res.ok) {
        setAlert({
          open: true,
          message: `ลบรายวิชา สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `ลบรายวิชา ไม่สำเร็จ`,
          severity: 'error',
        })
      }

      const data = await res.json()
      fetchSemesterCourses()
    } catch (err) {
      console.error('Error :', err)
    }
  }

  const fetchUpdateSemesterCourses = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/coursSections/update-section-teachers`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: [addSectionFormData],
          }),
        }
      )

      if (res.ok) {
        setAlert({
          open: true,
          message: `แก้ไขข้อมูลของกลุ่มเรียน สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `แก้ไขข้อมูลของกลุ่มเรียน ไม่สำเร็จ`,
          severity: 'error',
        })
      }

      const data = await res.json()
      fetchSemesterCourses()
    } catch (err) {
      console.error('Error :', err)
    }
  }

  const fetchDeleteSemesterCoursesSection = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/coursSections/delete`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section_id: selectedSecDelete.section_id,
          }),
        }
      )

      if (res.ok) {
        setAlert({
          open: true,
          message: `ลบกลุ่มเรียน สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `ลบกลุ่มเรียน ไม่สำเร็จ`,
          severity: 'error',
        })
      }

      const data = await res.json()
      fetchSemesterCourses()
      setIsDeleteSectionDialogOpen(false)
    } catch (err) {
      console.error('Error :', err)
    }
  }

  useEffect(() => {
    setTeachers(teacherList)
  }, [teacherList])
  return (
    <ContentMotionDIV className="relative overflow-visible rounded-lg bg-white shadow">
      <div className="relative flex flex-row justify-between overflow-visible rounded-t-lg bg-blue-50 px-4 py-4">
        <div className="relative inline-flex w-full items-center gap-4 overflow-visible">
          <AnimatePresence>
            {!courses ? (
              <ContentMotionDIV className="inline-flex w-full items-center gap-4">
                <div className="relative inline-flex flex-col items-start gap-1">
                  <input
                    name="subject_id"
                    value={formData.subject_id}
                    onChange={handleChangeAddChang}
                    placeholder="กรอกรหัสวิชา"
                    className="w-auto rounded-lg border p-1 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {suggestions.length > 0 && (
                    <ul className="absolute left-0 top-full z-10 mt-1 max-h-60 w-auto overflow-y-auto whitespace-nowrap rounded border bg-white text-left shadow-md">
                      {suggestions.map(s => (
                        <li
                          key={s.subject_id}
                          onClick={() => handleSelect(s)}
                          className="cursor-pointer px-3 py-1 hover:bg-blue-100"
                        >
                          {s.subject_id} - {s.subject_name_th}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <AnimatePresence>
                  {selectedSubject ? (
                    <ContentMotionDIV className="inline-flex w-full items-center justify-between">
                      <ContentMotionDIV>
                        <span>
                          {selectedSubject.subject_name_th} {' - '}
                          {selectedSubject.subject_name_en}
                        </span>
                      </ContentMotionDIV>
                      <ContentMotionDIV className="">
                        <button
                          onClick={() => {
                            handleAddCourses()
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-secondary px-3 py-1 text-white hover:bg-secondary_hover"
                        >
                          <FaSave></FaSave>
                          บันทึก
                        </button>
                      </ContentMotionDIV>
                    </ContentMotionDIV>
                  ) : (
                    <ContentMotionDIV className="inline-flex w-full items-center justify-end">
                      <button
                        onClick={() => {
                          setAdding(false)
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-500 px-3 py-1 text-white hover:bg-slate-600"
                      >
                        ยกเลิก
                      </button>
                    </ContentMotionDIV>
                  )}
                </AnimatePresence>
              </ContentMotionDIV>
            ) : (
              <div className="inline-flex w-full items-center justify-between ">
                <ContentMotionDIV>
                  <div className="flex flex-col ">
                    <span className="font-semibold text-gray-700">
                      {courses?.subject_id}
                    </span>
                    <span className="text-gray-600">
                      {courses?.subject_name_th} {' - '}
                      {courses?.subject_name_en}
                    </span>
                  </div>
                </ContentMotionDIV>
                <ContentMotionDIV className="">
                  <div className="inline-flex items-center gap-4">
                    <button
                      onClick={() => {
                        handleAddSection(courses)
                      }}
                      disabled={
                        addingCourseId &&
                        addingCourseId !== courses.semester_course_id
                      }
                      className={`rounded-md px-3 py-1 text-white ${
                        addingCourseId &&
                        addingCourseId !== courses.semester_course_id
                          ? 'cursor-not-allowed bg-gray-400'
                          : 'bg-cyan-600 hover:bg-cyan-700'
                      }`}
                    >
                      เพิ่มกลุ่มเรียน
                    </button>
                    <button
                      className="rounded-md"
                      onClick={() => {
                        setIsDeleteDialogOpen(true)
                      }}
                    >
                      <RiDeleteBin6Line className="text-xl text-rose-700"></RiDeleteBin6Line>
                    </button>
                  </div>
                </ContentMotionDIV>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="relative w-full overflow-visible">
        <table className="text-m relative min-w-full overflow-visible border-gray-300 text-center text-gray-700">
          <TableHeader columns={Columns} />
          <tbody>
            <AnimatePresence>
              {addingCourseId === courses?.semester_course_id && (
                <MotionTr className="border border-gray-200">
                  <td className=" w-auto px-4 py-4 text-left">
                    <input
                      type="text"
                      placeholder="เลขกลุ่ม"
                      value={addSectionFormData.section_number}
                      onChange={handleSectionChange}
                      className="rounded border px-2 py-1 text-center focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-4 text-left ">
                    <div className="relative">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <AnimatePresence>
                          {selectedTeachers.map(t => (
                            <ContentMotionDIV
                              key={t.email}
                              className="text-m inline-flex items-center gap-2 rounded-xl bg-blue-100 px-3 py-1"
                            >
                              {t.title_th} {t.first_name_th} {t.last_name_th}
                              <button
                                onClick={() => handleRemoveTeacher(t.email)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <RiDeleteBin6Line className=" text-rose-700"></RiDeleteBin6Line>
                              </button>
                            </ContentMotionDIV>
                          ))}
                        </AnimatePresence>
                      </div>

                      <input
                        type="text"
                        value={teacherInput}
                        onChange={e => setTeacherInput(e.target.value)}
                        placeholder="เพิ่มอาจารย์"
                        className="w-full rounded border px-2 py-1 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      {teacherInput && (
                        <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto border bg-white">
                          {(teacherInput
                            ? teachers.filter(t =>
                                Object.values(t).some(val =>
                                  String(val)
                                    .toLowerCase()
                                    .includes(teacherInput.toLowerCase())
                                )
                              )
                            : teachers
                          ).map(t => (
                            <li
                              key={t.email}
                              onClick={() => handleSelectTeacher(t)}
                              className="cursor-pointer px-3 py-1 hover:bg-blue-100"
                            >
                              {t.title_th} {t.first_name_th} {t.last_name_th}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-left">
                    <div className="flex w-full items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          handleSaveAddSection()
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-secondary px-3 py-1 text-white hover:bg-secondary_hover"
                      >
                        <FaSave></FaSave>
                        บันทึก
                      </button>
                      <button
                        onClick={handleCancelAdd}
                        className="rounded-md bg-slate-500 px-3 py-1 text-white hover:bg-slate-600"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </td>
                </MotionTr>
              )}
            </AnimatePresence>

            {courses?.sections.map(sec => {
              const isEditing = editingSectionId === sec.section_id
              return (
                <tr
                  key={sec.section_id}
                  className="relative overflow-visible border border-gray-200 bg-white hover:bg-gray-50"
                >
                  <td className="px-4 py-4 text-center">
                    <AnimatePresence>
                      {isEditing ? (
                        <ContentMotionDIV>
                          <input
                            value={addSectionFormData.new_section_number}
                            onChange={e => handleSectionUpdateChange(e)}
                            className="rounded border px-2 py-1 text-center focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </ContentMotionDIV>
                      ) : (
                        <ContentMotionDIV>
                          {sec.section_number}
                        </ContentMotionDIV>
                      )}
                    </AnimatePresence>
                  </td>

                  <td className="relative flex w-full flex-wrap px-4 py-4 text-left">
                    <AnimatePresence>
                      {isEditing ? (
                        <ContentMotionDIV className="w-full">
                          <div className="mb-2 flex w-full flex-wrap gap-2">
                            <AnimatePresence>
                              {selectedTeachers.map((t, idx) => (
                                <ContentMotionDIV
                                  key={t.email || idx}
                                  className="text-m inline-flex items-center gap-2 rounded-xl bg-blue-100 px-3 py-1"
                                >
                                  {t.title_th} {t.first_name_th}{' '}
                                  {t.last_name_th}
                                  <button
                                    onClick={() => handleRemoveTeacher(t.email)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <RiDeleteBin6Line className=" text-rose-700" />
                                  </button>
                                </ContentMotionDIV>
                              ))}
                            </AnimatePresence>
                          </div>

                          <ContentMotionDIV className="w-full">
                            <input
                              type="text"
                              value={teacherInput}
                              onChange={e => setTeacherInput(e.target.value)}
                              placeholder="เพิ่มอาจารย์"
                              className="w-full rounded border px-2 py-1 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </ContentMotionDIV>

                          {teacherInput && (
                            <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto border bg-white">
                              {(teacherInput
                                ? teachers.filter(t =>
                                    Object.values(t).some(val =>
                                      String(val)
                                        .toLowerCase()
                                        .includes(teacherInput.toLowerCase())
                                    )
                                  )
                                : teachers
                              ).map((t, idx) => (
                                <li
                                  key={t.email || idx}
                                  onClick={() => handleSelectTeacher(t)}
                                  className="cursor-pointer px-3 py-1 hover:bg-blue-100"
                                >
                                  {t.title_th} {t.first_name_th}{' '}
                                  {t.last_name_th}
                                </li>
                              ))}
                            </ul>
                          )}
                        </ContentMotionDIV>
                      ) : (
                        <AnimatePresence>
                          {sec.teachers.map((t, idx) => (
                            <ContentMotionDIV key={t.email || idx}>
                              <TeacherTag
                                name={`${t.title_th} ${t.first_name_th} ${t.last_name_th}`}
                              />
                            </ContentMotionDIV>
                          ))}
                        </AnimatePresence>
                      )}
                    </AnimatePresence>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <AnimatePresence>
                      {isEditing ? (
                        <ContentMotionDIV className="flex justify-center gap-2">
                          <button
                            onClick={() => handleSaveSection(sec.section_id)}
                            className="inline-flex items-center gap-1 rounded-md bg-secondary px-3 py-1 text-white hover:bg-secondary_hover"
                          >
                            <FaSave />
                          </button>

                          <button
                            onClick={() => handleDeleteSection(sec)}
                            className="inline-flex  items-center rounded-md bg-rose-700 px-3  py-1 text-white"
                          >
                            <RiDeleteBin6Line></RiDeleteBin6Line>
                          </button>
                          <button
                            onClick={() => {
                              setEditingSectionId(null)
                            }}
                            className="rounded-md bg-slate-500 px-3 py-1 text-white hover:bg-slate-600"
                          >
                            ยกเลิก
                          </button>
                        </ContentMotionDIV>
                      ) : (
                        <ContentMotionDIV className="inline-flex items-center gap-4">
                          <button
                            onClick={() => {
                              handleUpdateSec(sec)
                            }}
                            className="flex cursor-pointer justify-center"
                          >
                            <RiEdit2Line className="text-2xl text-green-600" />
                          </button>
                        </ContentMotionDIV>
                      )}
                    </AnimatePresence>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <DeleteDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={fetchDeleteSemesterCourses}
        Name={courses ? `การเปิดรายวิชา ${courses.subject_name_th} ` : ''}
      />
      <DeleteDialog
        open={isDeleteSectionDialogOpen}
        onClose={() => setIsDeleteSectionDialogOpen(false)}
        onConfirm={fetchDeleteSemesterCoursesSection}
        Name={courses ? `กลุ่มเรียน ${selectedSecDelete?.section_number} ` : ''}
      />
    </ContentMotionDIV>
  )
}

export default CardCourseInterm

const Columns = [
  { label: 'กลุ่มเรียน', align: 'center', w: 'w-[150px]' },
  { label: 'อาจารย์ผู้สอน', align: 'left' },
  { label: 'ดำเนินการ', align: 'center', w: 'w-[160px]' },
]
