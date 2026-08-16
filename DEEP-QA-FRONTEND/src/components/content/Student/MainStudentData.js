import React, { useState } from 'react'
import { FaSearch } from 'react-icons/fa'
import { PiStudentBold } from 'react-icons/pi'
import ContentTitle from '../../ContentTitle'
import ContentMotionDIV from '../../ContentMotionDIV'
import { IoMdAdd } from 'react-icons/io'
import { FaFileImport } from 'react-icons/fa6'
import TableHeader from '../../TableHeader'
import SelectDepartmentAndPrograms from '../../SelectDepartment'
import { DeleteBT, EditBT, SaveBT } from '../../../BT'
import { Pagination } from '@mui/material'
import SeachSection from '../../SeachSection'

const studentHeader = [
  { label: 'รหัสนักศึกษา' },
  { label: 'ชื่อนักศึกษา', align: 'left' },
  { label: 'ดำเนินการ' },
]
const students = [
  { id: '66015001', name: 'สมชาย ใจดี' },
  { id: '66015002', name: 'สมหญิง รักเรียน' },
  { id: '66015003', name: 'อนันต์ สบายใจ' },
  { id: '66015004', name: 'กมล ศรีสวย' },
  { id: '66015005', name: 'วิชัย พูดเก่ง' },
]

function MainStudentData() {
  const [showDialog, setShowDialog] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  const [editRow, setEditRow] = useState(null)
  const [formData, setFormData] = useState({})

  const handleEdit = department => {
    setEditRow(department.id)
    setFormData({ ...department })
  }

  const handleSave = () => {
    console.log('บันทึกข้อมูล:', formData)
    setEditRow(null)
  }

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-6 shadow">
      <ContentTitle titlename={'ข้อมูลนักศึกษากลาง'} icon={PiStudentBold} />
      <SelectDepartmentAndPrograms></SelectDepartmentAndPrograms>
      <SeachSection
        // onSearch={(value) => {
        //   setSearchText(value);
        //   setPage(1);
        // }}
        textImportBT="นักศึกษา"
        textAddBT="นักศึกษา"
        onCleckImport={() => setIsUploadOpen(true)}
        onCleckAdd={() => setShowDialog(true)}
      ></SeachSection>
      <div className="flex rounded-xl bg-white shadow">
        <div className="w-full overflow-x-auto rounded-lg">
          <table className="text-m min-w-full border-gray-300 text-center text-gray-700">
            <TableHeader columns={studentHeader} />
            <tbody>
              {students.map(student => (
                <tr
                  key={students.id}
                  className="border-b border-gray-200 bg-white hover:bg-gray-50"
                >
                  <td className="px-4 py-4">{student.id}</td>

                  <td className="px-4 py-4 text-left">
                    {editRow === student.id ? (
                      <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full rounded border py-1 ps-2 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      student.name
                    )}
                  </td>

                  <td className="flex justify-center gap-4 px-4 py-4">
                    {editRow === student.id ? (
                      <SaveBT item={student} onSave={handleSave}></SaveBT>
                    ) : (
                      <EditBT item={student} onEdit={handleEdit}></EditBT>
                    )}
                    <DeleteBT item={student} onDelete={handleEdit}></DeleteBT>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="inline-flex justify-between py-4">
        <div className="text-gray-600">1-5 of 5 items </div>
        <Pagination
          count={8}
          variant="outlined"
          shape="rounded"
          showFirstButton={true}
          showLastButton={true}
          color="primary"
        />
      </div>
    </ContentMotionDIV>
  )
}
export default MainStudentData
