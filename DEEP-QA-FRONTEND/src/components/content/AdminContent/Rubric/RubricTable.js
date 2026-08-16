import React, { useState, useEffect } from 'react'
import ContentMotionDIV from '../../../ContentMotionDIV'
import TableHeader from '../../../TableHeader'
import { DeleteBT, EditBT, SaveBT, ViewBT, CancleBT } from '../../../BT'
import SelectPrograms from '../../../SelectProgram'
import usePagination from '../../../usePagination'
import { useOutletContext, useNavigate } from 'react-router-dom'
import ContentTitle from '../../../ContentTitle'
import { FaBook } from 'react-icons/fa'
import MotionTr from '../../../MotionTr'
import { useAuth } from '../../../../context/AuthContext'
import DeleteDialog from '../../../DeleteDialog'
import { AnimatePresence } from 'framer-motion'

function RubricTable() {
  const navigate = useNavigate()
  const [rubrics, setRubrics] = useState([])
  const [editRow, setEditRow] = useState(null)
  const [formData, setFormData] = useState({})
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAdd, setIsAdd] = useState(false)

  const { profile } = useAuth()
  const {
    setAlert,
    setSelectedRubric,
    selectedRubric,
    SelectedProg,
    setSelectedProg,
    setSessionExpired,
    isSessionExpired,
  } = useOutletContext()

  const {
    page,
    setPage,
    currentData,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination([], 10)

  const handleEditRubricDetail = (rubric) => {
    setSelectedRubric(rubric)
    navigate(`edit-rubric/`)
  }

  const addRubric = () => {
    setIsAdd(true)
    setFormData({ name: '' })
  }

  const handleAddRubric = () => {
    const display_order =
      rubrics.length > 0 ? rubrics[rubrics.length - 1].display_order + 1 : 1
    const newRubric = {
      ...formData,
      email: profile.email,
      program_id: SelectedProg.program_id,
      display_order: display_order,
      rubric_code: `RUB${SelectedProg.program_id}${display_order}`,
    }
    console.log(formData)
    handleCreateRubric(newRubric)
    setIsAdd(false)
  }

  const handleEdit = (rubric) => {
    setAlert({
      open: true,
      message: `กำลังแก้ไข Rubric`,
      severity: 'warning',
    })
    setEditRow(rubric.id)
    setFormData({
      ...rubric,
    })
  }

  const handleSaveEdit = () => {
    setRubrics(rubrics.map((r) => (r.id === editRow ? { ...r } : r)))
    const updateRubric = {
      ...formData,
      email: profile.email,
    }

    handleUpdateRubric(updateRubric)
    setEditRow(null)
  }

  const handleDelete = (rubric) => {
    setSelectedRubric(rubric)
    setIsDeleteDialogOpen(true)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleUpdateRubric = async (updateRubric) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/rubrics/update`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify(updateRubric),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (res.ok) {
        setAlert({
          open: true,
          message: `แก้ไข Rubric สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `แก้ไข Rubric ไม่สำเร็จ`,
          severity: 'error',
        })
      }
      const data = await res.json()
      setFormData({})
      fetchRubricsByProgram()
    } catch (err) {
      console.error('Error creating rubric:', err)
    }
  }
  const handleDeleteProgramSubject = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/rubrics/delete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({ rubric_code: selectedRubric.rubric_code }),
        },
      )

      if (res.ok) {
        setAlert({
          open: true,
          message: `ลบ Rubric สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `ลบ Rubric ไม่สำเร็จ`,
          severity: 'error',
        })
      }
      const data = await res.json()
      setSelectedRubric(null)
      setIsDeleteDialogOpen(false)
      fetchRubricsByProgram()
    } catch (err) {
      console.error('Error creating rubric:', err)
    }
  }

  const handleCreateRubric = async (newRubric) => {
    console.log(newRubric)
    if (
      !newRubric.rubric_name_th?.trim() ||
      !newRubric.rubric_name_en?.trim()
    ) {
      setAlert({
        open: true,
        message: `กรุณากรอกชื่อ rubric เพื่อเพิ่มข้อมูล`,
        severity: 'info',
      })
      return
    }

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/rubrics/create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify(newRubric),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (res.ok) {
        setAlert({
          open: true,
          message: `เพิ่ม Rubric สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `เพิ่ม Rubric ไม่สำเร็จ`,
          severity: 'error',
        })
      }
      const data = await res.json()
      setFormData({})
      fetchRubricsByProgram()
    } catch (err) {
      console.error('Error creating rubric:', err)
    }
  }

  const fetchRubricsByProgram = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/rubrics/get-by-program`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({ program_id: SelectedProg.program_id }),
        },
      )

      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) {
        throw new Error(`Failed to fetch rubrics: ${res.status}`)
      }

      const data = await res.json()
      setRubrics(data.data)
    } catch (err) {
      console.error('Error fetching rubrics by program:', err)
      return null
    }
  }

  useEffect(() => {
    if (!SelectedProg?.program_id) return
    fetchRubricsByProgram()
  }, [SelectedProg])

  return (
    <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-6 shadow">
      <ContentTitle titlename={'ข้อมูล Rubric กลาง'} icon={FaBook} />
      <SelectPrograms
        setSelectedProg={setSelectedProg}
        setPage={setPage}
        SelectedProg={SelectedProg}
        addAddBT={true}
        onAdd={addRubric}
      ></SelectPrograms>

      <div className="flex rounded-xl bg-white shadow">
        <div className="w-full overflow-x-auto rounded-xl">
          <table className="text-m min-w-full border-gray-300 text-center text-gray-700">
            <TableHeader columns={RubricColumns} />
            <tbody>
              <AnimatePresence>
                {isAdd && (
                  <MotionTr
                    key={'add'}
                    className="border-b border-gray-200 bg-white transition hover:bg-gray-50"
                  >
                    <td className="px-2 py-2">{rubrics.length + 1}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-col gap-2">
                        <input
                          placeholder="ชื่อ Rubric (ไทย)"
                          name="rubric_name_th"
                          value={formData.rubric_name_th}
                          onChange={handleChange}
                          className="w-full rounded border px-2 py-1 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          placeholder="ชื่อ Rubric (อังกฤษ)"
                          name="rubric_name_en"
                          value={formData.rubric_name_en}
                          onChange={handleChange}
                          className="w-full rounded border px-2 py-1 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-2 ">
                      <div className="inline-flex items-center gap-4">
                        <SaveBT item={''} onSave={handleAddRubric}></SaveBT>

                        <CancleBT onClick={() => setIsAdd(false)} />
                      </div>
                    </td>
                  </MotionTr>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {rubrics.map((rubric, index) => (
                  <MotionTr
                    key={rubric.id}
                    className="border-b border-gray-200 bg-white transition hover:bg-gray-50"
                  >
                    <td className="px-2 py-2">{index + 1}</td>
                    <td className="px-2 py-2 text-left">
                      {editRow === rubric.id ? (
                        <div className="flex flex-col gap-2">
                          <input
                            name="rubric_name_th"
                            value={formData.rubric_name_th}
                            onChange={handleChange}
                            className="w-full rounded border px-2 py-1 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            name="rubric_name_en"
                            value={formData.rubric_name_en}
                            onChange={handleChange}
                            className="w-full rounded border px-2 py-1 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span>{rubric.rubric_name_th}</span>
                          <span className="text-gray-500">
                            {rubric.rubric_name_en}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex h-full items-center justify-center gap-4">
                        <ViewBT
                          item={rubric}
                          onView={handleEditRubricDetail}
                        ></ViewBT>

                        {editRow === rubric.id ? (
                          <SaveBT
                            item={rubric}
                            onSave={handleSaveEdit}
                          ></SaveBT>
                        ) : (
                          <EditBT item={rubric} onEdit={handleEdit}></EditBT>
                        )}
                        <DeleteBT
                          item={rubric}
                          onDelete={handleDelete}
                        ></DeleteBT>
                      </div>
                    </td>
                  </MotionTr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <DeleteDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteProgramSubject}
        Name={selectedRubric ? `Rubric ${selectedRubric.rubric_name_th} ` : ''}
      />
    </ContentMotionDIV>
  )
}
export default RubricTable

const RubricColumns = [
  { label: 'ลำดับ' },
  { label: 'ชื่อ Rubric', align: 'left' },
  { label: 'ดำเนินการ' },
]
