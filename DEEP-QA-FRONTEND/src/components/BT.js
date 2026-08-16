import { MdOutlineRemoveRedEye } from 'react-icons/md'
import { RiDeleteBin6Line, RiEdit2Line } from 'react-icons/ri'
import { FaSave } from 'react-icons/fa'
import { RiMenuAddLine } from 'react-icons/ri'
import { IoTrendingUpOutline } from 'react-icons/io5'
import { RxCross2 } from 'react-icons/rx'

export function AddSubBT({ item, onAddSub }) {
  return (
    <button
      onClick={() => onAddSub(item)}
      className="cursor-pointer rounded-lg border border-blue-700 p-2 transition hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <RiMenuAddLine className="text-xl text-blue-700" />
    </button>
  )
}

export function DeleteBT({ item, onDelete }) {
  return (
    <button
      onClick={() => onDelete(item)}
      className="cursor-pointer rounded-lg border border-rose-700 p-2 transition hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <RiDeleteBin6Line className="text-xl text-rose-700" />
    </button>
  )
}

export function EditBT({ item, onEdit }) {
  return (
    <button
      onClick={() => onEdit(item)}
      className="cursor-pointer rounded-lg border border-green-600 p-2 transition hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <RiEdit2Line className="text-xl text-green-600" />
    </button>
  )
}

export function SaveBT({ item, onSave }) {
  return (
    <button
      onClick={() => onSave(item)}
      className="cursor-pointer rounded-lg border border-blue-700 p-2 transition hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <FaSave className="text-xl text-blue-700" />
    </button>
  )
}

export function ViewBT({ item, onView }) {
  return (
    <button
      onClick={() => onView(item)}
      className="cursor-pointer rounded-lg border border-blue-700 p-2 transition hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <MdOutlineRemoveRedEye className="text-xl text-blue-700" />
    </button>
  )
}

export function ViewAttentionBT({ item, onView }) {
  return (
    <button
      onClick={() => onView(item)}
      className="cursor-pointer rounded-lg border border-purple-700 p-2 transition hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <IoTrendingUpOutline className="text-xl text-purple-700" />
    </button>
  )
}

export function CancleBT({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-slate-400 p-2 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <RxCross2 className="text-xl text-slate-400" />
    </button>
  )
}
