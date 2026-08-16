import TableHeader from '../../../TableHeader'
import React, { useState, useEffect } from 'react'
import { DeleteBT, EditBT, SaveBT, AddSubBT, CancleBT } from '../../../BT'
import MotionTr from '../../../MotionTr'
import { FiChevronRight } from 'react-icons/fi'
import DeleteDialog from '../../../DeleteDialog'
import { useAuth } from '../../../../context/AuthContext'
import ContentMotionDIV from '../../../ContentMotionDIV'
import { BsDot } from 'react-icons/bs'
import { IoMdAdd } from 'react-icons/io'
import { AnimatePresence } from 'framer-motion'

function PLOtable({
  setAlert,
  setSelectedRubric,
  selectedRubric,
  SelectedProg,
  setSelectedProg,
  setSessionExpired,
  isSessionExpired,
}) {
  const [ListPLO, setListPLO] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [openMains, setOpenMains] = useState(new Set())
  const [editOutcome, setEditOutcome] = useState(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedPlo, setSelectedPLO] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isEditing, setIsEditing] = useState(null)
  const [editing, setEditing] = useState(null)
  const { profile } = useAuth()

  const addMainItem = () => {
    if (isAdding) return
    console.log(SelectedProg)
    const newId =
      ListPLO.length > 0
        ? Math.max(...ListPLO.map(plo => plo.outcome_id)) + 1
        : 1
    const newItem = {
      outcome_id: newId,
      outcome_code: `PLO-`,
      program_id: SelectedProg.program_id,
      outcome_title: '',
      outcome_description: null,
      outcome_type: 'character',
      parent_outcome_code: '',
      children: [],
      email: profile.email,
    }
    setListPLO([...ListPLO, newItem])
    setEditing({ type: 'main', outcome_id: newId })
    setIsAdding(true)
    setInputValue('')
  }

  const addSubItem = main => {
    if (isAdding) return

    if (!openMains.has(main.outcome_id)) {
      toggleOpenMain(main.outcome_id, main)
    }

    setListPLO(prev => {
      const newList = [...prev]
      const mainPLO = newList.find(p => p.outcome_id === main.outcome_id)
      if (!mainPLO) return newList

      if (mainPLO.children.some(c => c.outcome_title === '')) return newList

      const newId =
        mainPLO.children.length > 0
          ? Math.max(...mainPLO.children.map(c => c.outcome_id)) + 1
          : 1

      const newItem = {
        outcome_id: newId,
        outcome_code: `${main.outcome_code}-`,
        program_id: SelectedProg.program_id,
        outcome_title: '',
        outcome_description: null,
        outcome_type: 'character',
        parent_outcome_code: mainPLO.outcome_code,
        children: [],
        email: profile.email,
      }

      mainPLO.children.push(newItem)
      setIsAdding(true)
      setEditing({ type: 'sub', outcome_id: newId })
      setIsAdding(true)
      return newList
    })
  }

  const handleEdit = outcome => {
    if (isAdding) return
    console.log(outcome)
    setIsAdding(true)
    setIsEditing(true)
    setAlert({
      open: true,
      message: `กำลังแก้ไข ผลการเรียนรู้ ${outcome.outcome_title} `,
      severity: 'warning',
    })
    setEditing(outcome)
    setEditOutcome(outcome)
  }

  const handleChange = e => {
    setEditOutcome({
      ...editOutcome,
      [e.target.name]: e.target.value,
    })
  }

  const resetVariable = () => {
    setEditing(null)
    setIsAdding(false)
    setIsEditing(null)
    setEditOutcome(null)
  }

  const handleDelete = outcome => {
    setSelectedPLO(outcome)
    setIsDeleteDialogOpen(true)
    resetVariable()
  }

  const toggleOpenMain = id => {
    setOpenMains(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCancelMain = async addPLO => {
    // setListPLO(
    //   ListPLO.filter((item) => item.outcome_code !== addPLO.outcome_code),
    // )
    fetchPLOByProgram()
    resetVariable()
    return
  }

  const handleSaveMainPLO = async addPLO => {
    if (addPLO.outcome_title === '') {
      setListPLO(
        ListPLO.filter(item => item.outcome_code !== addPLO.outcome_code)
      )
      setAlert({
        open: true,
        message: `กรุณากรอกข้อมูลเพื่อเพิ่มผลการเรียนรู้`,
        severity: 'info',
      })
      setIsAdding(false)
      return
    }

    if (isEditing) {
      console.log('edit')
      const updatedOutcome = {
        ...ListPLO.find(plo => plo.outcome_code === editOutcome.outcome_code),
        email: profile.email,
      }
      resetVariable()
      await fetchUpdatePLO(updatedOutcome)
    } else {
      console.log('add')
      resetVariable()
      await fetchCreatePLO(addPLO)
    }
  }

  const handleCancelSub = async data => {
    fetchPLOByProgram()
    resetVariable()
    return
  }

  const handleSaveSubPLO = async data => {
    const main = data[1]
    const sub = data[0]

    const mainPLO = ListPLO.find(p => p.outcome_id === main.outcome_id)
    if (!mainPLO) return

    const subItem = mainPLO.children.find(c => c.outcome_id === sub.outcome_id)
    if (!subItem) return

    if (subItem.outcome_title === '') {
      setListPLO(prev =>
        prev.map(p =>
          p.outcome_id === main.outcome_id
            ? {
                ...p,
                children: p.children.filter(
                  c => c.outcome_id !== sub.outcome_id
                ),
              }
            : p
        )
      )
      setAlert({
        open: true,
        message: 'กรุณากรอกข้อมูลเพื่อเพิ่มข้อย่อยผลการเรียนรู้',
        severity: 'info',
      })
      setIsAdding(false)
      return
    }

    if (isEditing) {
      const updatedSub = { ...subItem, email: profile.email }
      await fetchUpdatePLO(updatedSub)
      resetVariable()
    } else {
      await fetchCreatePLO(subItem)
      resetVariable()
    }
  }

  const fetchUpdatePLO = async updatedOutcome => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/plo/update-plo`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify(updatedOutcome),
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (res.ok) {
        setAlert({
          open: true,
          message: `แก้ไขผลการเรียนรู้ ${editing.outcome_title} สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `แก้ไขผลการเรียนรู้ ${editing.outcome_title} ไม่สำเร็จ`,
          severity: 'error',
        })
      }

      const data = await res.json()
      setEditOutcome(null)
      setEditing(null)
      setIsAdding(false)
      await fetchPLOByProgram()
    } catch (err) {
      console.error('Error fetching rubrics by program:', err)
      return null
    }
  }

  const fetchCreatePLO = async addPLO => {
    console.log(addPLO)
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/plo/create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify(addPLO),
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (res.ok) {
        setAlert({
          open: true,
          message: `สร้างผลการเรียนรู้ ${addPLO.outcome_title} สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `สร้างผลการเรียนรู้ ${addPLO.outcome_title} ไม่สำเร็จ`,
          severity: 'error',
        })
      }

      const data = await res.json()
      setEditOutcome(null)
      setIsAdding(false)
      setIsEditing(false)
      await fetchPLOByProgram()
    } catch (err) {
      console.error('Error fetching rubrics by program:', err)
      return null
    }
  }

  const fetchDeletePLO = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/plo/delete-plo`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({
            program_id: SelectedProg.program_id,
            outcome_code: selectedPlo.outcome_code,
          }),
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (res.ok) {
        setAlert({
          open: true,
          message: `ลบผลการเรียนรู้่สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `ลบผลการเรียนรู้ไม่สำเร็จ`,
          severity: 'error',
        })
      }
      const data = await res.json()
      await fetchPLOByProgram()
      setIsDeleteDialogOpen(false)
      setEditOutcome(null)
    } catch (err) {
      console.error('Error fetching rubrics by program:', err)
      return null
    }
  }

  const fetchPLOByProgram = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/plo/get-plo-by-program-id`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({ program_id: SelectedProg.program_id }),
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
      console.error('Error fetching rubrics by program:', err)
      setListPLO([])
    }
  }

  useEffect(() => {
    if (!SelectedProg?.program_id) return
    fetchPLOByProgram()
  }, [SelectedProg])

  return (
    <ContentMotionDIV className="rounded-lg bg-slate-100 p-2 shadow">
      <div className="flex flex-row justify-between p-2">
        <div className="p-2 text-xl text-secondary">ผลการเรียนรู้</div>
        <button
          onClick={addMainItem}
          className="flex items-center justify-center rounded-lg bg-secondary px-5 py-2.5 font-medium text-white hover:bg-secondary_hover"
        >
          <IoMdAdd className="me-2 h-5 w-5" />
          เพิ่มผลการเรียนรู้
        </button>
      </div>
      <div className="rounded-lg bg-white px-4 py-6">
        <div className="w-full overflow-x-auto rounded-lg shadow">
          <table className="text-m w-full border-gray-300 text-center text-gray-700">
            <TableHeader columns={Columns} />
            <tbody>
              <AnimatePresence>
                {(ListPLO || []).map(main => (
                  <React.Fragment key={main.outcome_id}>
                    {/* ################################# MAIN ROW START ################################# */}

                    <MotionTr className="cursor-pointer items-center border-b border-gray-300 bg-blue-50 text-left transition duration-200 hover:bg-blue-100">
                      <td
                        className="h-full border-s-4 border-blue-400"
                        onClick={e => toggleOpenMain(main.outcome_id, e)}
                      >
                        <div className="flex h-full flex-row items-center gap-1 whitespace-nowrap px-2">
                          <button className="rounded text-xl transition hover:bg-blue-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <FiChevronRight
                              className={`h-5 w-5 transition-transform duration-300 ${
                                openMains.has(main.outcome_id)
                                  ? 'rotate-90 text-blue-700'
                                  : 'rotate-0 text-gray-700'
                              }`}
                            />
                          </button>
                          {editing?.outcome_id === main.outcome_id ? (
                            <input
                              type="text"
                              className="w-auto rounded border px-2 py-1 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={main?.outcome_code || ''}
                              onChange={e => {
                                const value = e.target.value
                                const outcomeCode = main.outcome_code

                                setListPLO(prevList =>
                                  prevList.map(plo =>
                                    plo.outcome_code === outcomeCode
                                      ? { ...plo, outcome_code: value }
                                      : plo
                                  )
                                )
                              }}
                              placeholder="ลำดับ PLO"
                              autoFocus
                            />
                          ) : (
                            <span className="inline-flex">
                              {main.outcome_code}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="w-full py-2">
                        {editing?.outcome_id === main.outcome_id ? (
                          <div className="flex w-full flex-col gap-1">
                            <input
                              type="text"
                              className="rounded border px-2 py-1 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={main?.outcome_title || ''}
                              onChange={e => {
                                const value = e.target.value
                                const outcomeId = main.outcome_id

                                setListPLO(prevList =>
                                  prevList.map(plo =>
                                    plo.outcome_id === outcomeId
                                      ? { ...plo, outcome_title: value }
                                      : plo
                                  )
                                )
                              }}
                              placeholder="ชื่อหัวข้อการเรียนรู้"
                              autoFocus
                            />
                            <textarea
                              name={''}
                              value={main?.outcome_description || ''}
                              onChange={e => {
                                const value = e.target.value
                                const outcomeId = main.outcome_id

                                setListPLO(prevList =>
                                  prevList.map(plo =>
                                    plo.outcome_id === outcomeId
                                      ? { ...plo, outcome_description: value }
                                      : plo
                                  )
                                )
                              }}
                              placeholder="รายละเอียด"
                              className="min-h-[120px] w-full resize-y overflow-auto rounded border p-2 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        ) : (
                          <div
                            className="flex flex-col"
                            onClick={e => toggleOpenMain(main.outcome_id, e)}
                          >
                            <span className="text-secondary">
                              {main.outcome_title}
                            </span>
                            <span className="px-4 text-sm text-gray-500">
                              {main.outcome_description}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="w-full min-w-52 px-2 py-2">
                        <div className="flex h-full items-center justify-center">
                          {editing?.outcome_id === main.outcome_id ? (
                            <div className="flex gap-4">
                              <SaveBT item={main} onSave={handleSaveMainPLO} />
                              <CancleBT
                                onClick={() => handleCancelMain(main)}
                              />
                            </div>
                          ) : (
                            <div className="flex gap-4">
                              <AddSubBT item={main} onAddSub={addSubItem} />
                              <EditBT item={main} onEdit={handleEdit} />
                              <DeleteBT item={main} onDelete={handleDelete} />
                            </div>
                          )}
                        </div>
                      </td>
                    </MotionTr>
                    {/* ################################# MAIN ROW END ################################# */}
                    {/* ################################ SUB ROW START ################################# */}
                    <AnimatePresence>
                      {openMains.has(main.outcome_id) &&
                        main.children.map(sub => (
                          <MotionTr
                            key={sub.outcome_id}
                            className="cursor-pointer border-b border-gray-300 text-left transition duration-200 hover:bg-slate-50"
                          >
                            <td className="border-collapse whitespace-nowrap border-blue-100 py-2 pl-6">
                              <div className="flex flex-row items-center gap-1">
                                <BsDot className="text-xl text-blue-700" />
                                {editing?.outcome_id === sub.outcome_id ? (
                                  <input
                                    type="text"
                                    className="w-auto rounded border px-2 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={sub.outcome_code || ''}
                                    onChange={e => {
                                      const value = e.target.value
                                      setListPLO(prevList =>
                                        prevList.map(mainPLO =>
                                          mainPLO.outcome_id === main.outcome_id
                                            ? {
                                                ...mainPLO,
                                                children: mainPLO.children.map(
                                                  c =>
                                                    c.outcome_id ===
                                                    sub.outcome_id
                                                      ? {
                                                          ...c,
                                                          outcome_code: value,
                                                        }
                                                      : c
                                                ),
                                              }
                                            : mainPLO
                                        )
                                      )
                                    }}
                                    autoFocus
                                  />
                                ) : (
                                  <span>{sub.outcome_code}</span>
                                )}
                              </div>
                            </td>

                            <td className="py-2 pl-4">
                              {editing?.outcome_id === sub.outcome_id ? (
                                <div className="flex w-full flex-col gap-1">
                                  <input
                                    type="text"
                                    className="w-full rounded border px-2 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={sub.outcome_title || ''}
                                    placeholder="ชื่อหัวข้อการเรียนรู้"
                                    onChange={e => {
                                      const value = e.target.value
                                      setListPLO(prevList =>
                                        prevList.map(mainPLO =>
                                          mainPLO.outcome_id === main.outcome_id
                                            ? {
                                                ...mainPLO,
                                                children: mainPLO.children.map(
                                                  c =>
                                                    c.outcome_id ===
                                                    sub.outcome_id
                                                      ? {
                                                          ...c,
                                                          outcome_title: value,
                                                        }
                                                      : c
                                                ),
                                              }
                                            : mainPLO
                                        )
                                      )
                                    }}
                                  />
                                  <textarea
                                    className="min-h-[80px] w-full resize-y overflow-auto rounded border p-2 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={sub.outcome_description || ''}
                                    onChange={e => {
                                      const value = e.target.value
                                      setListPLO(prevList =>
                                        prevList.map(mainPLO =>
                                          mainPLO.outcome_id === main.outcome_id
                                            ? {
                                                ...mainPLO,
                                                children: mainPLO.children.map(
                                                  c =>
                                                    c.outcome_id ===
                                                    sub.outcome_id
                                                      ? {
                                                          ...c,
                                                          outcome_description:
                                                            value,
                                                        }
                                                      : c
                                                ),
                                              }
                                            : mainPLO
                                        )
                                      )
                                    }}
                                    placeholder="รายละเอียด"
                                  />
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  <span>{sub.outcome_title}</span>
                                  <span className="px-4 text-sm text-gray-500">
                                    {sub.outcome_description}
                                  </span>
                                </div>
                              )}
                            </td>

                            <td className="w-full min-w-52 px-2 py-2">
                              <div className="flex h-full items-center justify-center">
                                {editing?.outcome_id === sub.outcome_id ? (
                                  <div className="grid grid-cols-3 gap-4">
                                    <div></div>
                                    <SaveBT
                                      item={[sub, main]}
                                      onSave={handleSaveSubPLO}
                                    />
                                    <CancleBT
                                      onClick={() =>
                                        handleCancelSub([sub, main])
                                      }
                                    />
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-3 gap-4">
                                    <div></div>
                                    <EditBT item={sub} onEdit={handleEdit} />
                                    <DeleteBT
                                      item={sub}
                                      onDelete={handleDelete}
                                    />
                                  </div>
                                )}
                              </div>
                            </td>
                          </MotionTr>
                        ))}
                    </AnimatePresence>
                    {/* ################################ SUB ROW END ################################# */}
                  </React.Fragment>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
      <DeleteDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={fetchDeletePLO}
        Name={selectedPlo ? `ผลการเรียนรู้ ${selectedPlo.outcome_title} ` : ''}
      />
    </ContentMotionDIV>
  )
}
export default PLOtable

const Columns = [
  { label: 'ข้อ', align: 'left' },
  { label: 'ชื่อผลการเรียนรู้', align: 'left' },
  { label: 'ดำเนินการ', align: 'center' },
]
