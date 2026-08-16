import { useState, useEffect } from 'react'
import { IoDocument } from 'react-icons/io5'
import { DeleteBT, EditBT, SaveBT, CancleBT } from '../../../BT'
import { mapRole } from '../../../MapRole'
import { useDepartments } from '../../../../hooks/useDepartments'
import { motion } from 'framer-motion'
import { usePrograms } from '../../../../hooks/usePrograms.js'
import { useProgramsActions } from '../../../../hooks/useProgramsActions.js'
import ContentTitle from '../../../ContentTitle'
import ContentMotionDIV from '../../../ContentMotionDIV'
import TableHeader from '../../../TableHeader'
import SeachSection from '../../../SeachSection'
import SelectDepartment from '../../../SelectDepartment'
import usePagination from '../../../usePagination'
import PageNumber from '../../../PageNumber'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import ImportProgramDialog from './ImportProgramDilog'
import DeleteDialog from '../../../DeleteDialog'
import MotionTr from '../../../MotionTr.js'
import { AnimatePresence } from 'framer-motion'
import SessionExpiredDialog from '../../../SessionExpiredDialog.js'
import { isSessionExpired } from '../../../../utils/session.js'

function ProgramsTable() {
  const Role = mapRole(localStorage.getItem('selectedRole'))
  const Scope = localStorage.getItem('scopeID')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [formData, setFormData] = useState({})
  const [isAddProg, setIsAddProg] = useState()
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedProg, setSelectedProg] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const { departments, fetchDepartments } = useDepartments({
    setSessionExpired,
    isSessionExpired,
  })
  const [filteredPrograms, setFilteredPrograms] = useState([])
  const { programs, fetchPrograms } = usePrograms(selectedDept)
  const { addProgram, editProgram, deleteProgram } = useProgramsActions(
    selectedDept,
    fetchPrograms,
  )
  const [searchText, setSearchText] = useState('')
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  useEffect(() => {
    if (Array.isArray(programs)) {
      const filtered = programs.filter((program) => {
        const search = searchText.toLowerCase()
        return Object.values(program).some((value) => {
          if (value === null || value === undefined) return false
          return value.toString().toLowerCase().includes(search)
        })
      })
      setFilteredPrograms(filtered)
    }
  }, [searchText, programs])

  useEffect(() => {
    if (!selectedDept) return
    fetchPrograms()
  }, [selectedDept])

  const handleEdit = (program) => {
    setAlert({
      open: true,
      message: `กำลังแก้ไขหลักสูตร ${program.program_name_th}`,
      severity: 'warning',
    })
    setEditRow(program.program_id)
    setFormData({ ...program })
  }

  const resetForm = () =>
    setFormData({
      program_id: '',
      program_name_en: '',
      program_name_th: '',
      department_id: selectedDept,
      year: '',
    })

  const handleDeleteClick = (program) => {
    setSelectedProg(program)
    setDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    setDialogOpen(false)
    deleteProgram(
      selectedProg.program_id,
      selectedProg.program_name_th,
      setAlert,
    )
  }

  const handleAdd = () => {
    const payload = { ...formData, department_id: selectedDept }
    addProgram(payload, resetForm, setAlert, setIsAddProg)
  }

  const handleSave = () => {
    const payload = { ...formData }
    editProgram(payload, resetForm, setAlert, setEditRow)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const {
    page,
    setPage,
    currentData,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(filteredPrograms, 10)

  return (
    <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-6 shadow">
      <ContentTitle titlename={'ข้อมูลหลักสูตร'} icon={IoDocument} />
      <SelectDepartment
        setSelectedDept={setSelectedDept}
        Role={Role}
        Scope={Scope}
        departments={departments}
        setSessionExpired={setSessionExpired}
      ></SelectDepartment>

      <SeachSection
        onSearch={(value) => {
          setSearchText(value)
          setPage(1)
        }}
        searchText="ค้นหาหลักสูตร"
        textImportBT="หลักสูตร"
        textAddBT="หลักสูตร"
        onCleckImport={() => setIsUploadOpen(true)}
        onCleckAdd={() => setIsAddProg(true)}
        isDisable={!selectedDept}
      ></SeachSection>

      <div className="flex rounded-xl bg-white shadow">
        <div className="w-full overflow-x-auto rounded-xl">
          <table className="text-m min-w-full border-gray-300 text-center text-gray-700">
            <TableHeader columns={courseColumns} />
            <tbody>
              <AnimatePresence>
                {isAddProg && (
                  <MotionTr className="border-b border-gray-200 bg-white transition hover:bg-gray-50">
                    <td className="w-1 px-2 py-2">
                      <input
                        type="text"
                        name="program_id"
                        value={formData.program_id}
                        onChange={handleChange}
                        className="w-full rounded border px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        name="program_name_th"
                        value={formData.program_name_th}
                        onChange={handleChange}
                        className="w-full rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        name="program_name_en"
                        value={formData.program_name_en}
                        onChange={handleChange}
                        className="w-full rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        name="year"
                        value={formData.year}
                        onChange={handleChange}
                        className="w-full rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="flex justify-center gap-4 px-2 py-2">
                      <SaveBT
                        item={formData}
                        onSave={() => handleAdd()}
                      ></SaveBT>

                      <CancleBT onClick={() => setIsAddProg(false)} />
                    </td>
                  </MotionTr>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {currentData.map((program, index) => (
                  <MotionTr
                    key={index}
                    className="border-b border-gray-200 bg-white transition hover:bg-gray-50"
                  >
                    <td className="w-1 px-2 py-2">{program.program_id}</td>
                    <td className="px-2 py-2 text-left">
                      {editRow === program.program_id ? (
                        <input
                          name="program_name_th"
                          value={formData.program_name_th}
                          onChange={handleChange}
                          className="w-full rounded border px-2 py-1 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        program.program_name_th
                      )}
                    </td>

                    <td className="px-2 py-2 text-left">
                      {editRow === program.program_id ? (
                        <input
                          name="program_name_en"
                          value={formData.program_name_en}
                          onChange={handleChange}
                          className="w-full rounded border px-2 py-1 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        program.program_name_en
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {editRow === program.program_id ? (
                        <input
                          name="year"
                          value={formData.year}
                          onChange={handleChange}
                          className="rounded border px-2 py-1 text-center transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        program.year
                      )}
                    </td>
                    <td className="flex justify-center gap-4 px-2 py-2">
                      {editRow === program.program_id ? (
                        <SaveBT item={program} onSave={handleSave}></SaveBT>
                      ) : (
                        <EditBT item={program} onEdit={handleEdit}></EditBT>
                      )}
                      <DeleteBT
                        item={program}
                        onDelete={() => handleDeleteClick(program)}
                      ></DeleteBT>
                    </td>
                  </MotionTr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
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

      <PageNumber
        startIndex={startIndex}
        endIndex={endIndex}
        page={page}
        setPage={setPage}
        totalItems={totalItems}
        totalPages={totalPages}
      ></PageNumber>

      <DeleteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        Name={selectedProg?.program_name_th}
      />

      <ImportProgramDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        setAlert={setAlert}
        fetchPrograms={fetchPrograms}
        selectedDept={selectedDept}
      />

      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
export default ProgramsTable

const courseColumns = [
  { label: 'รหัสหลักสูตร' },
  { label: 'ชื่อหลักสูตร (ไทย)', align: 'left' },
  { label: 'ชื่อหลักสูตร (อังกฤษ)', align: 'left' },
  { label: 'ปี' },
  { label: 'ดำเนินการ' },
]
