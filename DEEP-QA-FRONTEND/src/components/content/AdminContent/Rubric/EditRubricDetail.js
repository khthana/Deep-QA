import { useState, useEffect, useRef } from 'react'
import ContentMotionDIV from '../../../ContentMotionDIV'
import TableHeader from '../../../TableHeader'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { FaSave } from 'react-icons/fa'
import { IoMdAdd } from 'react-icons/io'
import MotionTr from '../../../MotionTr'
import { DeleteBT, EditBT, SaveBT } from '../../../BT'
import { useAuth } from '../../../../context/AuthContext'
import { AnimatePresence } from 'framer-motion'

function EditRubricDetail() {
  const {
    setAlert,
    setSelectedRubric,
    selectedRubric,
    SelectedProg,
    setSessionExpired,
    isSessionExpired,
  } = useOutletContext()
  const [rubricDetail, setRubricDetail] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [isAdd, setIsAdd] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const { profile } = useAuth()

  const [formData, setFormData] = useState({
    rubric_code: selectedRubric?.rubric_code,
    email: profile.email,
    detail: [],
  })

  const navigate = useNavigate()

  const handleAddCriteria = () => {
    const hasEmpty = formData.detail.some(
      (d) =>
        !d.criteria_name_en.trim() &&
        !d.criteria_name_th.trim() &&
        !d.level_4_description.trim() &&
        !d.level_3_description.trim() &&
        !d.level_2_description.trim() &&
        !d.level_1_description.trim() &&
        d.weight === 0,
    )

    if (hasEmpty) {
      return
    }

    setFormData((prev) => ({
      ...prev,
      detail: [
        ...prev.detail,
        {
          criteria_name_en: '',
          criteria_name_th: '',
          level_4_description: '',
          level_3_description: '',
          level_2_description: '',
          level_1_description: '',
          weight: 0,
          display_order: prev.detail.length + 1,
        },
      ],
    }))
  }

  const handleDetailChange = (e, index, field) => {
    const value = e.target.value
    setFormData((prev) => {
      const newDetail = [...prev.detail]
      newDetail[index][field] = value
      return { ...prev, detail: newDetail }
    })
  }

  const isEmptyCriteria = (c) => {
    return (
      !c.criteria_name_en?.trim() &&
      !c.criteria_name_th?.trim() &&
      !c.level_4_description?.trim() &&
      !c.level_3_description?.trim() &&
      !c.level_2_description?.trim() &&
      !c.level_1_description?.trim()
    )
  }

  const prepareRubricPayloads = () => {
    const existingIds = rubricDetail.map((d) => d.id)
    const newIds = formData.detail.map((d) => d.id)

    const toAdd = formData.detail
      .filter((d) => !d.id || !existingIds.includes(d.id))
      .filter((d) => !isEmptyCriteria(d))

    const toUpdate = formData.detail.filter(
      (d) => d.id && existingIds.includes(d.id),
    )

    const toDelete = formData.detail.filter((d) => d.id && isEmptyCriteria(d))

    const base = {
      email: formData.email,
      rubric_code: formData.rubric_code,
    }

    return {
      addPayload: { ...base, detail: toAdd },
      updatePayload: { ...base, detail: toUpdate },
      deletePayload: { ...base, detail: toDelete },
    }
  }

  const handleDelete = (detail) => {
    if (detail?.id) {
      fetchDeleteRubric(detail.id)
      fetchRubricDetailsByCode()
    } else {
      setFormData((prev) => ({
        ...prev,
        detail: prev.detail.filter(
          (d) => d.display_order !== detail.display_order,
        ),
      }))
    }
  }

  const handleSave = async () => {
    rubricColumns.pop({
      label: 'ดำเนินการ',
      align: 'center',
    })
    const { addPayload, updatePayload, deletePayload } = prepareRubricPayloads()
    console.log(addPayload, updatePayload)

    if (addPayload.detail.length > 0) {
      fetchCreateRubric(addPayload)
    }

    if (updatePayload.detail.length > 0) {
      fetchUpdateRubric(updatePayload)
    }

    if (deletePayload.detail.length > 0) {
    }
  }

  const fetchCreateRubric = async (addPayload) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/rubricDetails/create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify(addPayload),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (res.ok) {
        setAlert({
          open: true,
          message: `เพิ่ม Rubric Detail สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `เพิ่ม Rubric Detail ไม่สำเร็จ`,
          severity: 'error',
        })
      }

      const data = await res.json()
      // console.log('Rubric detail created:', data)
      fetchRubricDetailsByCode()
    } catch (err) {
      console.error('Error creating rubric detail:', err)
    }
  }

  const fetchUpdateRubric = async (updatePayload) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/rubricDetails/update`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify(updatePayload),
        },
      )

      if (res.ok) {
        setAlert({
          open: true,
          message: `แก้ไขข้อมูล Rubric Detail สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `แก้ไขข้อมูล Rubric Detail ไม่สำเร็จ`,
          severity: 'error',
        })
      }
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()
      fetchRubricDetailsByCode()
    } catch (err) {
      console.error('Error creating rubric detail:', err)
    }
  }

  const fetchDeleteRubric = async (id) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/rubricDetails/delete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({ id: id }),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (res.ok) {
        setAlert({
          open: true,
          message: `ลบ Rubric Detail สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `ลบ Rubric Detail ไม่สำเร็จ`,
          severity: 'error',
        })
      }

      const data = await res.json()
      // console.log('Rubric detail created:', data)
      fetchRubricDetailsByCode()
    } catch (err) {
      console.error('Error creating rubric detail:', err)
    }
  }

  const fetchRubricDetailsByCode = async () => {
    if (!selectedRubric) return []

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/rubricDetails/get-by-code`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rubric_code: selectedRubric.rubric_code }),
          credentials: 'include',
          withCredentials: true,
        },
      )

      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) throw new Error('Failed to fetch rubric details')

      const data = await res.json()
      setRubricDetail(data.data)
      setFormData((prev) => ({
        ...prev,
        detail: [...data.data],
      }))
      console.log(formData)
    } catch (err) {
      console.error('Error fetching rubric details:', err)
      return []
    }
  }

  useEffect(() => {
    const loadDetails = async () => {
      if (!selectedRubric?.rubric_code) return
      fetchRubricDetailsByCode()
    }

    loadDetails()
  }, [selectedRubric?.rubric_code])
  if (!selectedRubric) {
    return
  }

  return (
    <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-6 shadow">
      {selectedRubric && (
        <div className="flex flex-col gap-4">
          <div className="inline-flex w-full cursor-default items-center justify-between rounded-lg border-l-4 border-blue-700 bg-blue-100 px-6 py-4">
            <div className="flex flex-col">
              <span className="text-2xl text-blue-700">
                {selectedRubric.rubric_name_th} -{' '}
                {selectedRubric.rubric_name_en}
              </span>
              <span className="text-gray-500">
                หลักสูตร {SelectedProg.program_name_th} -{' '}
                {SelectedProg.program_year}
              </span>
            </div>

            <div>
              {!isEditing ? (
                <button
                  onClick={() => {
                    setIsEditing(true)
                    setAlert({
                      open: true,
                      message: `กำลังแก้ไขข้อมูล rubric Detail`,
                      severity: 'warning',
                    })
                    rubricColumns.push({
                      label: 'ดำเนินการ',
                      align: 'center',
                    })
                    // onEdit(selectedUser.first_name_th, selectedUser.last_name_th)
                  }}
                  className="flex items-center justify-center rounded-lg bg-secondary px-5 py-2.5 font-medium text-white transition hover:bg-secondary_hover"
                >
                  แก้ไขข้อมูล
                </button>
              ) : (
                <ContentMotionDIV className="inline-flex gap-2">
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setIsAdd(false)
                      handleSave()
                    }}
                    className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-2.5 font-medium text-white transition hover:bg-secondary_hover"
                  >
                    <FaSave className="text-2xl text-white" />
                    บันทึกข้อมูล
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setIsAdd(false)
                      fetchRubricDetailsByCode()
                      rubricColumns.pop({
                        label: 'ดำเนินการ',
                        align: 'center',
                      })
                    }}
                    className="flex items-center justify-center rounded-lg bg-slate-500 px-5 py-2.5 font-medium text-white hover:bg-slate-600"
                  >
                    ยกเลิก
                  </button>
                </ContentMotionDIV>
              )}
            </div>
          </div>
          <div className="flex h-full rounded-xl bg-white shadow">
            <div className="w-full overflow-x-auto rounded-xl">
              <table className="text-m min-w-full border-gray-300 text-left text-gray-700">
                <TableHeader columns={rubricColumns} />
                <tbody>
                  <AnimatePresence>
                    {formData.detail.map((item, index) => (
                      <MotionTr
                        key={index}
                        className="border-b border-gray-200 bg-white transition hover:bg-gray-50"
                      >
                        <td className="w-auto border px-4 py-3 transition">
                          <div className="flex flex-col gap-2 transition">
                            {isEditing ? (
                              <>
                                <input
                                  name={'criteria_name_th'}
                                  value={item.criteria_name_th}
                                  onChange={(e) =>
                                    handleDetailChange(
                                      e,
                                      index,
                                      'criteria_name_th',
                                    )
                                  }
                                  placeholder="ชื่อ (ไทย)"
                                  className="w-full rounded border p-2 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                  name={'criteria_name_en'}
                                  value={item.criteria_name_en}
                                  onChange={(e) =>
                                    handleDetailChange(
                                      e,
                                      index,
                                      'criteria_name_en',
                                    )
                                  }
                                  placeholder="ชื่อ (อังกฤษ)"
                                  className="w-full rounded border p-2 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </>
                            ) : (
                              <div className="flex flex-col gap-2 text-center transition">
                                <span className="">
                                  {item.criteria_name_th}
                                </span>
                                <span className="text-gray-500">
                                  {item.criteria_name_en}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <DescriptionRow
                          form={item}
                          handleChange={handleDetailChange}
                          index={index}
                          isEditing={isEditing}
                        />
                        {isEditing && (
                          <td className="px-2 py-2">
                            <div className="flex h-full items-center justify-center gap-4">
                              <DeleteBT
                                item={item}
                                onDelete={handleDelete}
                              ></DeleteBT>
                            </div>
                          </td>
                        )}
                      </MotionTr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              <AnimatePresence>
                {isEditing && (
                  <div className="p-2">
                    <ContentMotionDIV>
                      <button
                        onClick={() => {
                          setIsAdd(true)
                          setIsEditing(true)
                          handleAddCriteria()
                        }}
                        className="flex w-full justify-center rounded-lg border border-dashed border-slate-400 px-3 py-2 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <IoMdAdd className="me-2 h-5 w-5" />
                        เพิ่มข้อมูล
                      </button>
                    </ContentMotionDIV>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </ContentMotionDIV>
  )
}
export default EditRubricDetail

const rubricColumns = [
  { label: 'เกณฑ์การประเมิน', align: 'center' },
  { label: '4 - ดีเยี่ยม', align: 'center' },
  { label: '3 - ดีมาก', align: 'center' },
  { label: '2 - ปานกลาง', align: 'center' },
  { label: '1 - ต้องปรับปรุง', align: 'center' },
]

const DescriptionRow = ({ form, handleChange, index, isEditing }) => {
  const fields = [
    'level_4_description',
    'level_3_description',
    'level_2_description',
    'level_1_description',
  ]

  const textRefs = useRef([])

  const syncHeight = () => {
    const maxHeight = Math.max(
      ...textRefs.current.map((el) => el?.scrollHeight || 0),
    )
    textRefs.current.forEach((el) => {
      if (el) el.style.height = `${maxHeight}px`
    })
    console.log(maxHeight)
  }

  useEffect(() => {
    if (!isEditing) return

    const observers = textRefs.current.map((el) => {
      if (!el) return null
      const ro = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          const maxHeight = Math.max(
            ...textRefs.current.map((e) => e?.scrollHeight || 0),
          )
          textRefs.current.forEach((e) => {
            if (e && parseInt(e.style.height) !== maxHeight) {
              e.style.height = `${maxHeight}px`
            }
          })
        })
      })
      ro.observe(el)
      return ro
    })

    return () => {
      observers.forEach((ro) => ro?.disconnect())
    }
  }, [isEditing])

  return (
    <>
      {fields.map((name, i) => (
        <td key={name} className="h-full border px-4 py-3">
          {isEditing ? (
            <textarea
              ref={(el) => (textRefs.current[i] = el)}
              name={name}
              value={form[name]}
              onChange={(e) => {
                handleChange(e, index, name)
                syncHeight()
              }}
              onInput={syncHeight}
              placeholder="รายละเอียด"
              className="min-h-[120px] w-full resize-y overflow-auto rounded border p-2 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                height: `${textRefs.current[i]?.scrollHeight || 120}px`,
              }}
            />
          ) : (
            form[name]
          )}
        </td>
      ))}
    </>
  )
}
