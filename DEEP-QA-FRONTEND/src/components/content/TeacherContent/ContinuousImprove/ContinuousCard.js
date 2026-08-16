import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import ContentTitle from '../../../ContentTitle'
import { GrPlan } from 'react-icons/gr'
import { IoMdAdd, IoMdCheckmark, IoMdClose } from 'react-icons/io'
import { RiDeleteBin6Line } from 'react-icons/ri'
import { RiEdit2Line } from 'react-icons/ri'
import TableHeader from '../../../TableHeader'
import { useState } from 'react'
import { FaSave } from 'react-icons/fa'
import MotionTr from '../../../MotionTr'
import { AnimatePresence } from 'framer-motion'
import DeleteDialog from '../../../DeleteDialog'

function ContinuousCard({
  title,
  data,
  type,
  onSave,
  onDelete,
  cloOptions,
  currentYear,
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ clo_id: '', detail: '' })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const handleOpenDelete = (item) => {
    setSelectedItem(item)
    setDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    onDelete(selectedItem.plan_detail_id)
    setDialogOpen(false)
    setSelectedItem(null)
  }

  const handleStartAdd = () => {
    setFormData({ clo_id: cloOptions[0]?.id || '', detail: '' })
    setIsAdding(true)
    setEditingId(null)
  }

  const handleStartEdit = (item) => {
    setEditingId(item.plan_detail_id)
    setFormData({
      clo_id: item.clo_id,
      detail: item.detail,
      year: item.year,
    })
    setIsAdding(false)
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({ clo_id: '', detail: '', year: '' })
  }

  const onSubmit = (id = null) => {
    onSave({
      plan_detail_id: id,
      detailType: type,
      clo_id: parseInt(formData.clo_id),
      detail: formData.detail,
      year: formData.year,
    })
    handleCancel()
  }

  return (
    <ContentMotionDIV className="flex w-full flex-col gap-4 rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
      <div className="flex w-full items-center justify-between">
        <h3 className="text-xl font-medium text-secondary">{title}</h3>
        {!isAdding && !editingId && type !== 'IMPROVEMENT' && (
          <button
            onClick={handleStartAdd}
            className="flex items-center rounded-lg bg-secondary px-4 py-2 text-white transition-colors hover:bg-secondary_hover"
          >
            <IoMdAdd className="me-2 h-5 w-5" />
            เพิ่มข้อมูล
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-center text-gray-700">
          <thead className="bg-gray-50 text-sm">
            <tr>
              <th className="w-16 px-4 py-3">ลำดับ</th>
              <th className="px-4 py-3 text-left">รายละเอียด (CLO : ข้อมูล)</th>
              {type !== 'IMPROVEMENT' && (
                <th className="w-28 px-4 py-3">ดำเนินการ</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            <AnimatePresence>
              {isAdding && (
                <MotionTr className="bg-blue-50/30">
                  <td className="px-4 py-4 text-sm text-gray-500">ใหม่</td>
                  <td className="px-4 py-4">
                    <ContentMotionDIV className="flex flex-col gap-2">
                      <select
                        value={formData.clo_id}
                        onChange={(e) =>
                          setFormData({ ...formData, clo_id: e.target.value })
                        }
                        className="w-full rounded border p-1 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {cloOptions.map((opt) => (
                          <option key={opt.clo_id} value={opt.clo_id}>
                            CLO-{opt.clo_number} : {opt.clo_detail}
                          </option>
                        ))}
                      </select>
                      <input
                        className="flex-1 rounded border p-1 px-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.detail}
                        onChange={(e) =>
                          setFormData({ ...formData, detail: e.target.value })
                        }
                        placeholder="ระบุรายละเอียดผลการประเมิน.."
                        autoFocus
                      />
                    </ContentMotionDIV>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => onSubmit()}
                        className="text-blue-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <FaSave size={20} />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <IoMdClose size={20} />
                      </button>
                    </div>
                  </td>
                </MotionTr>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {data.map((item, idx) => (
                <MotionTr
                  key={item.plan_detail_id || idx}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-4">{idx + 1}</td>
                  <td className="px-4 py-4 text-left">
                    <AnimatePresence>
                      {editingId === item.plan_detail_id &&
                      type !== 'IMPROVEMENT' ? (
                        <ContentMotionDIV className="flex flex-col gap-2">
                          <ContentMotionDIV className="flex w-full flex-col gap-1">
                            <select
                              value={formData.clo_id}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  clo_id: e.target.value,
                                })
                              }
                              className="w-full rounded border p-1 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {cloOptions.map((opt) => (
                                <option key={opt.clo_id} value={opt.clo_id}>
                                  CLO-{opt.clo_number} : {opt.clo_detail}
                                </option>
                              ))}
                            </select>
                          </ContentMotionDIV>
                          <ContentMotionDIV className="flex w-full flex-col gap-1">
                            <input
                              className="flex-1 rounded border p-1 px-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500  "
                              value={formData.detail}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  detail: e.target.value,
                                })
                              }
                            />
                          </ContentMotionDIV>
                        </ContentMotionDIV>
                      ) : (
                        <ContentMotionDIV className="flex flex-col gap-1">
                          <ContentMotionDIV className="flex items-center gap-2">
                            <strong className="text-sm font-light text-gray-500">
                              {(() => {
                                const found = cloOptions.find(
                                  (opt) => opt.clo_id === item.clo_id,
                                )
                                return found
                                  ? `CLO-${found.clo_number}: ${found.clo_detail}`
                                  : `CLO-${item.clo}`
                              })()}
                              :
                            </strong>
                          </ContentMotionDIV>
                          <ContentMotionDIV>
                            ผลการประเมิน : {item.detail}
                          </ContentMotionDIV>
                        </ContentMotionDIV>
                      )}
                    </AnimatePresence>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center gap-4">
                      {editingId === item.plan_detail_id &&
                      type !== 'IMPROVEMENT' ? (
                        <>
                          <button
                            onClick={() => onSubmit(item.plan_detail_id)}
                            className="text-blue-700"
                          >
                            <FaSave size={20} />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-gray-400"
                          >
                            <IoMdClose size={20} />
                          </button>
                        </>
                      ) : (
                        type !== 'IMPROVEMENT' && (
                          <>
                            <button onClick={() => handleStartEdit(item)}>
                              <RiEdit2Line className="text-xl text-green-600 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </button>
                            <button onClick={() => handleOpenDelete(item)}>
                              <RiDeleteBin6Line className="text-xl text-red-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </button>
                          </>
                        )
                      )}
                    </div>
                  </td>
                </MotionTr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      <DeleteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        Name={
          selectedItem
            ? `การปรับบปรุง CLO-${
                cloOptions.find((opt) => opt.clo_id === selectedItem.clo_id)
                  ?.clo_number
              }: ${selectedItem.detail}`
            : ''
        }
      />
    </ContentMotionDIV>
  )
}
export default ContinuousCard

const Columns = [
  { label: 'ลำดับ', w: 'w-[90px]' },
  { label: 'รายละเอียด', align: 'left' },
  { label: 'ดำเนินการ', align: 'center' },
]
