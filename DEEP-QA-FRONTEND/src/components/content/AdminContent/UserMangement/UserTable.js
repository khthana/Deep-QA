import { useState, useMemo, useEffect } from 'react'
import { FaUserGroup } from 'react-icons/fa6'
import { FaUserEdit } from 'react-icons/fa'
import { mapRole } from '../../../MapRole'
import { useOutletContext, useNavigate } from 'react-router-dom'
import AddUserDialog from './AddUserDialog'
import ImportUserDialog from './ImportUserDilog'
import TableHeader from '../../../TableHeader'
import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentTitle from '../../../ContentTitle'
import PageNumber from '../../../PageNumber'
import StatusTag from '../../../StatusTag'
import SeachSection from '../../../SeachSection'
import usePagination from '../../../usePagination'
import Switch from '@mui/material/Switch'
import MotionTr from '../../../MotionTr'
import { AnimatePresence } from 'framer-motion'
import { LuHistory } from 'react-icons/lu'
import { RiDeleteBin6Line } from 'react-icons/ri'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import { getCurrentTermAndYear } from '../../../TermAndYearUtils'
import {
  IoWarningOutline,
  IoTrashOutline,
  IoInformationCircleOutline,
} from 'react-icons/io5'

function UserTable() {
  const {
    userList,
    Role,
    fetchUserList,
    setSelectedUser,
    setAlert,
  } = useOutletContext()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [statusModal, setStatusModal] = useState({ open: false, user: null })
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null })
  const [year, setYear] = useState(null)
  const navigate = useNavigate()

  const goToEdit = (user) => {
    setSelectedUser(user)
    navigate(`edit-user/`)
  }

  useEffect(() => {
    const { term: currentTerm, year: currentYear } = getCurrentTermAndYear()
    setYear(currentYear)
  }, [])

  const filteredUsers = useMemo(() => {
    if (!userList || userList.length === 0) return []
    if (!searchText) return userList

    const lower = searchText.toLowerCase()

    return userList.filter((user) => {
      return Object.entries(user).some(([key, val]) => {
        if (!val) return false

        if (Array.isArray(val)) {
          if (key === 'role_list') {
            return val.some((role) =>
              mapRole(role).toLowerCase().includes(lower),
            )
          }
          return val.some((item) =>
            item.toString().toLowerCase().includes(lower),
          )
        }

        return val.toString().toLowerCase().includes(lower)
      })
    })
  }, [searchText, userList])

  const {
    page,
    setPage,
    currentData,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(filteredUsers, 10)

  const handleStatusChange = async (user, checked) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active'

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/user/swap-status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            user_id: user.user_id,
            status: newStatus,
          }),
        },
      )
      const data = await res.json()
      // console.log(data)
      setAlert({
        open: true,
        message: `ปิดการใช้งาน ${user.first_name_th} ${user.last_name_th}`,
        severity: 'warning',
      })

      if (res.ok) {
        if (newStatus === 'active') {
          setAlert({
            open: true,
            message: `เปิดการใช้งาน ${user.first_name_th} ${user.last_name_th}`,
            severity: 'warning',
          })
        } else {
          setAlert({
            open: true,
            message: `ปิดการใช้งาน ${user.first_name_th} ${user.last_name_th}`,
            severity: 'warning',
          })
        }
      } else {
      }
      fetchUserList()
    } catch (err) {
      console.error(err)
    }
  }

  const confirmDelete = async () => {
    const user = deleteModal.user
    if (!user) return

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/user/delete/${user.user_id}?academic_year=${year}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        },
      )

      if (res.ok) {
        setAlert({
          open: true,
          message: `ลบผู้ใช้งาน ${user.first_name_th} ${user.last_name_th} เรียบร้อยแล้ว`,
          severity: 'success',
        })
        fetchUserList() // โหลดข้อมูลใหม่ในตาราง
      } else {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Failed to delete')
      }
    } catch (err) {
      console.error('Delete error:', err)
      setAlert({
        open: true,
        message: 'เกิดข้อผิดพลาดในการลบข้อมูล: ' + err.message,
        severity: 'error',
      })
    } finally {
      // ปิด Modal และล้างค่า User ที่เลือก
      setDeleteModal({ open: false, user: null })
    }
  }

  const confirmStatus = async () => {
    await handleStatusChange(statusModal.user)
    setStatusModal({ open: false, user: null })
  }

  return (
    <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-6 shadow">
      <ContentMotionDIV className="flex flex-row justify-between">
        <ContentTitle titlename={'ผู้ใช้งานระบบ'} icon={FaUserGroup} />
        <button
          onClick={() => navigate('user-history')}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-800 hover:shadow-sm active:scale-95"
        >
          <LuHistory className="h-4 w-4" />
          แสดงประวัติการใช้งาน
        </button>
      </ContentMotionDIV>
      <SeachSection
        textImportBT={'ผู้ใช้งาน'}
        textAddBT={'ผู้ใช้งาน'}
        searchText={'ค้นหาผู้ใช้งาน'}
        onSearch={(value) => {
          setSearchText(value)
          setPage(1)
        }}
        onCleckImport={() => setIsImportOpen(true)}
        onCleckAdd={() => setIsAddOpen(true)}
      ></SeachSection>

      <ContentMotionDIV className="flex h-full rounded-xl bg-white shadow">
        <div className="w-full overflow-x-auto rounded-xl">
          <table className="text-m min-w-full border-gray-300 text-center text-gray-700">
            <TableHeader columns={userColumns} />
            <tbody>
              <AnimatePresence>
                {currentData &&
                  currentData.map((user, index) => (
                    <MotionTr
                      key={user.user_id}
                      className="border-b border-gray-200 bg-white hover:bg-gray-50"
                    >
                      <td className="px-2 py-2">{index + 1}</td>
                      <td className="px-2 py-2">{user.user_id}</td>
                      <td className="px-2 py-2 text-left">
                        {user.first_name_th} {user.last_name_th}
                      </td>
                      <td className="px-2 py-2 text-left">
                        {user.first_name_en} {user.last_name_en}
                      </td>
                      <td className="px-2 py-2 text-left">{user.email}</td>
                      <td className="px-2 py-2">
                        <Switch
                          checked={user.status === 'active'}
                          // onChange={() => handleStatusChange(user)}
                          onClick={() =>
                            setStatusModal({ open: true, user: user })
                          }
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-row gap-2 justify-center items-center align-middle">
                          <button onClick={() => goToEdit(user)}>
                            <FaUserEdit className="text-2xl text-gray-600" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteModal({ open: true, user: user })
                            }
                            className="text-gray-400 hover:text-red-600 transition"
                            title="ลบผู้ใช้"
                          >
                            <RiDeleteBin6Line className="text-2xl" />
                          </button>
                        </div>
                      </td>
                    </MotionTr>
                  ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </ContentMotionDIV>

      <PageNumber
        startIndex={startIndex}
        endIndex={endIndex}
        page={page}
        setPage={setPage}
        totalItems={totalItems}
        totalPages={totalPages}
      ></PageNumber>

      <AddUserDialog
        isOpen={isAddOpen}
        Role={Role}
        onClose={() => setIsAddOpen(false)}
        setAlert={setAlert}
        fetchUserList={fetchUserList}
      />

      <ImportUserDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        setAlert={setAlert}
        fetchUserList={fetchUserList}
      />

      <StatusConfirmModal
        isOpen={statusModal.open}
        user={statusModal.user}
        onClose={() => setStatusModal({ open: false, user: null })}
        onConfirm={confirmStatus}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.open}
        userName={`${deleteModal.user?.title_th}${deleteModal.user?.first_name_th} ${deleteModal.user?.last_name_th}`}
        onClose={() => setDeleteModal({ open: false, user: null })}
        onConfirm={confirmDelete}
      />
    </ContentMotionDIV>
  )
}

export default UserTable

const userColumns = [
  { label: 'ลำดับ' },
  { label: 'รหัสผู้ใช้งาน' },
  { label: 'ชื่อ สกุล (ไทย)', align: 'left' },
  { label: 'ชื่อ สกุล (อังกฤษ)', align: 'left' },
  { label: 'อีเมล', align: 'left' },
  { label: 'สถานะ' },
  { label: 'ดำเนินการ' },
]

const StatusConfirmModal = ({ isOpen, onClose, onConfirm, user }) => {
  if (!isOpen || !user) return null

  const isGoingToActive = user.status !== 'active'

  return (
    <AnimatePresence>
      {isOpen && (
        <ContentMotionDIV className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
            <div className="flex flex-col items-center p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                <IoInformationCircleOutline className="text-4xl" />
              </div>

              <h3 className="text-xl  text-orange-600">
                ยืนยันการเปลี่ยนสถานะ
              </h3>

              <div className="mt-2 text-gray-600">
                ต้องการ{' '}
                {isGoingToActive ? (
                  <span className="font-bold text-green-600 text-lg">
                    เปิดการใช้งาน
                  </span>
                ) : (
                  <span className="font-bold text-red-500 text-lg">
                    ปิดการใช้งาน
                  </span>
                )}{' '}
                การใช้งานบัญชีของ <br />
                <span className="font-semibold text-gray-700  decoration-blue-200">
                  {user.first_name_th} {user.last_name_th}
                </span>{' '}
                ใช่หรือไม่?
              </div>
            </div>

            <div className="flex border-t border-gray-100 bg-gray-50/50 p-4 gap-3 justify-end">
              <button
                onClick={onConfirm}
                className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800 transition hover:bg-orange-600 hover:text-white"
              >
                ยืนยันการเปลี่ยน
              </button>
              <button
                onClick={onClose}
                className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800 transition hover:bg-gray-300"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </ContentMotionDIV>
      )}
    </AnimatePresence>
  )
}

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, userName }) => {
  if (!isOpen) return null

  return (
    <ContentMotionDIV className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm text-left">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <IoWarningOutline className="text-2xl" />
          </div>
          <div>
            <h2 className="text-lg  text-red-600">
              ยืนยันการลบข้อมูลผู้ใช้งาน
            </h2>
            <p className="text-sm text-gray-500">
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-red-100 bg-red-50/50 p-4 text-gray-600">
          คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลของ <br />
          <span className="mt-1 block text-lg font-bold text-red-600">
            "{userName}"
          </span>
        </div>

        <p className="text-sm mt-2 text-gray-500">
          การลบข้อมูลผู้ใช้งานที่เป็นอาจารย์
          จะต้องไม่มีหน้าที่สอนและรับผิดชอบรายวิชา หรือ
          ถ้าหากผู้ใช้งานเป็นนักศึกษา จะต้องไม่มีชื่ออยู่ในรายวิชา
        </p>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-lg bg-gray-200 px-6 py-2.5 text-sm  text-gray-800  hover:bg-red-600 hover:text-white"
          >
            <IoTrashOutline className="text-lg" />
            ลบข้อมูลถาวร
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800 transition hover:bg-gray-300"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </ContentMotionDIV>
  )
}
