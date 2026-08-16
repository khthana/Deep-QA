import React, { useState, useEffect } from 'react'
import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentTitle from '../../../ContentTitle'
import { FaBookBookmark } from 'react-icons/fa6'
import SelectPrograms from '../../../SelectProgram'
import TableHeader from '../../../TableHeader'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import { RiDeleteBin6Line } from 'react-icons/ri'
import { FaSave } from 'react-icons/fa'
import { BiSolidFileExport } from 'react-icons/bi'
import { useAuth } from '../../../../context/AuthContext'
import MotionTr from '../../../MotionTr'
import { AnimatePresence } from 'framer-motion'
import jsPDF from 'jspdf'
import { createThaiPDF } from './pdfUtils'
import DeleteDialog from '../../../DeleteDialog'
import SessionExpiredDialog from '../../../SessionExpiredDialog.js'
import { isSessionExpired } from '../../../../utils/session.js'

function MappingPLO() {
  const [SelectedProg, setSelectedProg] = useState([])
  const [Page, setPage] = useState(1)
  const [MappingPloData, setMappingPloData] = useState([])
  const [ReportData, setReportData] = useState([])
  const [ListPLO, setListPLO] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const { profile } = useAuth()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteData, setDeleteData] = useState('')
  const [sessionExpired, setSessionExpired] = useState(false)
  const [activeInput, setActiveInput] = useState(null)

  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  const [inputs, setInputs] = useState(
    MappingPloData.reduce((acc, subj) => {
      acc[subj.id] = {
        filteredPlos: [],
        subject_map_list: [],
      }
      return acc
    }, {}),
  )

  const fetchAutoUpdatePLO = async (payload, info = '') => {
    console.log(payload)

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/plo-mapping/create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        },
      )

      if (isSessionExpired(res)) return setSessionExpired(true)

      if (res.ok) {
        setAlert({
          open: true,
          message: `บันทึกสำเร็จ: ${info}`,
          severity: 'success',
        })
        fetchSubjectMappingPLO()
      }
    } catch (err) {
      console.error('Auto Save Error:', err)
    }
  }

  const handleAutoSave = (currentInputs, info) => {
    if (!SelectedProg?.program_id || !profile?.email) {
      return
    }

    const payload = {
      program_id: SelectedProg.program_id,
      email: profile.email,
      plo_detail: Object.entries(currentInputs).map(([subjectId, subjData]) => {
        let mapList = subjData.subject_map_list || []
        const hasReal = mapList.some((item) => item.outcome_id !== null)
        if (hasReal) {
          mapList = mapList.filter((item) => item.outcome_id !== null)
        } else if (mapList.length === 0) {
          mapList.push({
            mapping_id: null,
            outcome_id: null,
            mapping_level: null,
          })
        }

        return {
          subject_id: subjectId,
          subject_map_list: mapList.map((item) => ({
            mapping_id: item.mapping_id || null,
            outcome_id: item.outcome_id || null,
            mapping_level: item.mapping_level || null,
          })),
        }
      }),
    }

    fetchAutoUpdatePLO(payload, info)
  }

  function onSelectPlo(subjId, plo) {
    setInputs((prev) => {
      const prevAdded = prev[subjId].subject_map_list || []
      if (prevAdded.some((item) => item.outcome_code === plo.plo)) {
        // ... Alert แจ้งเตือนว่ามีแล้ว ...
        return prev
      }

      const nextState = {
        ...prev,
        [subjId]: {
          ...prev[subjId],
          subject_map_list: [
            ...prevAdded,
            { ...plo, mapping_level: 'E', outcome_code: plo.plo }, // ใส่ค่าเริ่มต้นเป็น I
          ],
          ploInput: '',
          filteredPlos: [],
        },
      }

      // สั่ง Save ทันที
      const infoMsg = `เพิ่ม ${plo.plo} เข้าวิชา ${subjId}`
      handleAutoSave(nextState, infoMsg)
      return nextState
    })
  }
  function deletePlo() {
    setInputs((prev) => {
      const prevAdded = prev[deleteData.subjId]?.subject_map_list || []
      const nextState = {
        ...prev,
        [deleteData.subjId]: {
          ...prev[deleteData.subjId],
          subject_map_list: prevAdded.filter(
            (item) =>
              item.outcome_code !== (deleteData.plo || deleteData.outcome_code),
          ),
        },
      }

      const infoMsg = `ลบ PLO จากวิชา ${deleteData.subjId}`
      handleAutoSave(nextState, infoMsg)
      return nextState
    })
    setIsDeleteDialogOpen(false)
    setDeleteData({})
  }
  const onChangeRelation = (subjectId, ploId_1, ploId_2, newRelation) => {
    const ploId = ploId_1 || ploId_2
    setInputs((prev) => {
      const prevSubject = prev[subjectId]
      if (!prevSubject) return prev

      const nextState = {
        ...prev,
        [subjectId]: {
          ...prevSubject,
          subject_map_list: prevSubject.subject_map_list.map((item) =>
            item.outcome_code === ploId
              ? { ...item, mapping_level: newRelation }
              : item,
          ),
        },
      }

      const infoMsg = `อัปเดตระดับ ${ploId} วิชา ${subjectId} เป็น [${newRelation}]`
      handleAutoSave(nextState, infoMsg)
      return nextState
    })
  }

  // function onSelectPlo(subjId, plo) {
  //   setInputs((prev) => {
  //     const prevAdded = prev[subjId].subject_map_list || []
  //     if (prevAdded.some((item) => item.outcome_code === plo.plo)) {
  //       setAlert({
  //         open: true,
  //         message: `ผลการเรียนรู้ถูกเพิ่มในรายวิชาแล้ว`,
  //         severity: 'info',
  //       })
  //       return prev
  //     }

  //     return {
  //       ...prev,
  //       [subjId]: {
  //         ...prev[subjId],
  //         subject_map_list: [
  //           ...prevAdded,
  //           {
  //             ...plo,
  //             mapping_level: prev[subjId].mapping_level,
  //             outcome_code: plo.plo,
  //           },
  //         ],
  //         ploInput: '',
  //         filteredPlos: [],
  //       },
  //     }
  //   })
  // }

  // function deletePlo() {
  //   // console.log(deleteData)
  //   const ploId = deleteData.plo || deleteData.outcome_code

  //   setInputs((prev) => {
  //     const prevAdded = prev[deleteData.subjId]?.subject_map_list || []
  //     return {
  //       ...prev,
  //       [deleteData.subjId]: {
  //         ...prev[deleteData.subjId],
  //         subject_map_list: prevAdded.filter(
  //           (item) => item.outcome_code !== ploId,
  //         ),
  //       },
  //     }
  //   })
  //   setIsDeleteDialogOpen(false)
  //   setDeleteData({})
  // }

  //   const onChangeRelation = (subjectId, ploId_1, ploId_2, newRelation) => {
  //   const ploId = ploId_1 || ploId_2
  //   // console.log(subjectId, ploId, newRelation)
  //   setInputs((prev) => {
  //     const prevSubject = prev[subjectId]
  //     if (!prevSubject) return prev

  //     const updatedAddedList = prevSubject.subject_map_list.map((item) =>
  //       item.outcome_code === ploId
  //         ? { ...item, mapping_level: newRelation }
  //         : item,
  //     )

  //     return {
  //       ...prev,
  //       [subjectId]: {
  //         ...prevSubject,
  //         subject_map_list: updatedAddedList,
  //       },
  //     }
  //   })

  //   // console.log(inputs)
  // }

  const onChangePloInput = (subjectId, value) => {
    const keyword = value.toLowerCase()
    const currentAllPlos = flattenPlo()
    const filtered =
      value.trim() !== ''
        ? currentAllPlos.filter(
            (p) =>
              p.plo.toLowerCase().includes(keyword) ||
              p.name.toLowerCase().includes(keyword),
          )
        : currentAllPlos

    setInputs((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        ploInput: value,
        filteredPlos: filtered,
        selectedPlo: null,
      },
    }))
  }

  const flattenPlo = () => {
    let list = []
    for (const main of ListPLO) {
      list.push({
        outcome_id: main.outcome_id,
        plo: main.outcome_code,
        name: main.outcome_title,
        description: main.outcome_description,
      })
      main.children.forEach((sub) => {
        list.push({
          outcome_id: main.outcome_id,
          plo: sub.outcome_code,
          name: sub.outcome_title,
          description: sub.outcome_description,
        })
      })
    }
    return list
  }

  const allPlos = flattenPlo()

  const handleSave = () => {
    // console.log(inputs)
    const payload = {
      program_id: SelectedProg.program_id,
      email: profile.email,
      plo_detail: Object.entries(inputs).map(([subjectId, subjData]) => {
        let mapList = subjData.subject_map_list || []
        const hasReal = mapList.some((item) => item.outcome_id !== null)

        if (hasReal) {
          mapList = mapList.filter((item) => item.outcome_id !== null)
        } else if (mapList.length === 0) {
          mapList.push({
            mapping_id: null,
            outcome_id: null,
            mapping_level: null,
          })
        }

        return {
          subject_id: subjectId,
          subject_map_list: mapList.map((item) => ({
            mapping_id: item.mapping_id || null,
            outcome_id: item.outcome_id || null,
            mapping_level: item.mapping_level || null,
          })),
        }
      }),
    }

    // console.log('final payload:', payload)
    fetchUpdatePLO(payload)
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (!e.target.closest('.plo-input-wrapper')) {
        setActiveInput(null) // 🔥 ตัวจริง
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])
  const handleClickGenReport = () => {
    createThaiPDF(ListPLO, ReportData, SelectedProg)
  }

  const createSubjectMapItem = (m) => {
    let matched = ListPLO.find(
      (main) =>
        main.outcome_code === m.outcome_code ||
        main.children?.some((sub) => sub.outcome_code === m.outcome_code),
    )
    if (matched && matched.outcome_code !== m.outcome_code) {
      matched = matched.children.find(
        (sub) => sub.outcome_code === m.outcome_code,
      )
    }

    const item = {
      mapping_id: m.mapping_id,
      outcome_id: matched?.outcome_id || null,
      outcome_code: m.outcome_code,
      outcome_description: m.outcome_description,
      mapping_level: m.mapping_level || null,
    }

    if (!item.outcome_id && !item.outcome_code) {
      return null
    }

    return item
  }

  const fetchSubjectMappingPLO = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/plo-mapping/get-subject-plo-mapping`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({ program_id: SelectedProg.program_id }),
        },
      )

      if (!res.ok) {
        throw new Error(`Failed to fetch rubrics: ${res.status}`)
      }
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()

      console.log(data)
      setMappingPloData(data.program_subject_mapping)
      setReportData(data)
    } catch (err) {
      console.error('Error fetching rubrics by program:', err)
      setMappingPloData([])
    }
  }

  const fetchUpdatePLO = async (payload) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/plo-mapping/create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify(payload),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (res.ok) {
        setAlert({
          open: true,
          message: `บันทึกข้อมูลการ mapping ผลการเรียนรู้สำเร็จ`,
          severity: 'success',
        })
      } else {
        setAlert({
          open: true,
          message: `บันทึกข้อมูลไม่สำเร็จ`,
          severity: 'error',
        })
      }

      const data = await res.json()
      fetchSubjectMappingPLO()
    } catch (err) {
      console.error('Error fetching rubrics by program:', err)
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
        },
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
    fetchSubjectMappingPLO()
    fetchPLOByProgram()
  }, [SelectedProg])

  useEffect(() => {
    if (!ListPLO.length) return

    setInputs((prev) => {
      const updated = { ...prev }

      Object.keys(updated).forEach((id) => {
        if (updated[id] && updated[id].filteredPlos?.length === 0) {
          updated[id].filteredPlos = flattenPlo()
        }
      })

      return updated
    })
  }, [ListPLO])

  useEffect(() => {
    const newInputs = MappingPloData.reduce((acc, subj) => {
      acc[subj.subject_id] = {
        filteredPlos: [],
        subject_map_list: subj.subject_mapping
          .map(createSubjectMapItem)
          .filter(Boolean),
      }
      return acc
    }, {})
    setInputs(newInputs)
  }, [MappingPloData])

  const renderPloItem = (subjId, item) => {
    if (!item.outcome_id && !item.outcome_code) {
      return null
    }
    let matchedPlo = ListPLO.find(
      (main) =>
        main.outcome_code === item.outcome_code ||
        main.children?.some((sub) => sub.outcome_code === item.outcome_code),
    )

    if (matchedPlo) {
      if (matchedPlo.outcome_code !== item.outcome_code) {
        matchedPlo = matchedPlo.children.find(
          (sub) => sub.outcome_code === item.outcome_code,
        )
      }
    }

    return (
      <ContentMotionDIV
        key={item.outcome_code}
        className="flex items-center justify-between rounded-md border-l-4 border-blue-300 bg-slate-100 p-2 py-2 hover:bg-blue-50"
      >
        <div className="flex flex-row items-center gap-2">
          <div className="whitespace-nowrap">
            <span className="text-gray-700">
              {matchedPlo ? matchedPlo.outcome_code : item.plo}
            </span>{' '}
            :{' '}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-700">
              {matchedPlo ? matchedPlo.outcome_title : item.name}
            </span>
            <span className="text-gray-500">
              {matchedPlo ? matchedPlo.outcome_description : item.description}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 italic text-gray-600">
          <AnimatePresence>
            {isEditing && (
              <ContentMotionDIV>
                <button
                  onClick={() => {
                    setIsDeleteDialogOpen(true)
                    setDeleteData({
                      subjId: subjId,
                      outcome_code: item.outcome_code,
                      plo: item.plo,
                    })
                  }}
                  className="text-red-600 hover:text-red-800"
                >
                  <RiDeleteBin6Line className="text-l me-2 text-rose-700" />
                </button>
              </ContentMotionDIV>
            )}
          </AnimatePresence>
        </div>
      </ContentMotionDIV>
    )
  }

  return (
    <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-8 shadow">
      <ContentTitle
        titlename={'การเชื่อมโยงผลการเรียนรู้กับรายวิชา'}
        icon={FaBookBookmark}
      ></ContentTitle>
      <SelectPrograms
        setSelectedProg={setSelectedProg}
        SelectedProg={SelectedProg}
        setPage={setPage}
      ></SelectPrograms>
      <div className="flex justify-end gap-2 pb-4">
        <button
          onClick={handleClickGenReport}
          className="flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 font-medium text-white hover:bg-cyan-700"
        >
          <BiSolidFileExport className="text-2xl" />
          รายงานกระจายผลการเรียนรู้สู่รายวิชา
        </button>
        {!isEditing ? (
          <AnimatePresence>
            <ContentMotionDIV>
              <button
                onClick={() => {
                  const newInputs = MappingPloData.reduce((acc, subj) => {
                    acc[subj.subject_id] = {
                      filteredPlos: [],
                      subject_map_list: subj.subject_mapping
                        .map(createSubjectMapItem)
                        .filter(Boolean),
                    }
                    return acc
                  }, {})
                  setAlert({
                    open: true,
                    message: `กำลังแก้ไข Maping ผลการเรียนรู้กับรายวิชา`,
                    severity: 'warning',
                  })
                  setInputs(newInputs)
                  setIsEditing(true)
                }}
                className="flex items-center justify-center rounded-lg bg-secondary px-5 py-2.5 font-medium text-white transition hover:bg-secondary_hover"
              >
                แก้ไขข้อมูล
              </button>
            </ContentMotionDIV>
          </AnimatePresence>
        ) : (
          <AnimatePresence>
            <ContentMotionDIV className="inline-flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false)
                  // setIsAdd(false)
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
                }}
                className="flex items-center justify-center rounded-lg bg-slate-500 px-5 py-2.5 font-medium text-white hover:bg-slate-600"
              >
                ยกเลิก
              </button>
            </ContentMotionDIV>
          </AnimatePresence>
        )}
      </div>

      <div className="w-full rounded-lg shadow">
        <table className="text-m min-w-full border-gray-300 text-center text-gray-700">
          <TableHeader columns={Columns} />
          <tbody>
            {MappingPloData.map((subj) => {
              const {
                ploInput = '',
                filteredPlos = [],
                subject_map_list = subj.subject_mapping,
              } = inputs[subj.subject_id] || {}
              const allPlos = flattenPlo()

              const displayPlos = allPlos.filter((p) => {
                if (!ploInput.trim()) return true

                const keyword = ploInput.toLowerCase()
                return (
                  p.plo.toLowerCase().includes(keyword) ||
                  p.name.toLowerCase().includes(keyword)
                )
              })
              return (
                <MotionTr
                  key={subj.subject_id}
                  className="border-b border-gray-300 transition duration-200 hover:bg-slate-50"
                >
                  <td className="w-60 cursor-pointer px-4 py-3 text-center">
                    <div className="flex flex-col">
                      <span className="font-semibold">{subj.subject_id}</span>
                      <span className="text-sm text-gray-500">
                        {subj.subject_name_en}
                      </span>
                    </div>
                  </td>

                  <td className="relative px-4 py-2 text-left">
                    <div className="relative flex flex-col gap-2 plo-input-wrapper">
                      {subject_map_list.length > 0 && (
                        <ContentMotionDIV className="flex cursor-pointer flex-col gap-2 ">
                          <AnimatePresence>
                            {subject_map_list.map((item) =>
                              renderPloItem(subj.subject_id, item),
                            )}
                          </AnimatePresence>
                        </ContentMotionDIV>
                      )}
                      <AnimatePresence>
                        {isEditing && (
                          <ContentMotionDIV>
                            <input
                              type="text"
                              placeholder="พิมพ์ PLO เช่น PLO1 หรือ PLO1.1 เพื่อเพิ่ม PLO ของวิชา"
                              value={ploInput}
                              onFocus={() => setActiveInput(subj.subject_id)}
                              onChange={(e) =>
                                onChangePloInput(
                                  subj.subject_id,
                                  e.target.value,
                                )
                              }
                              className="w-full rounded border border-gray-300 px-2 py-1 transition duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoComplete="off"
                            />
                          </ContentMotionDIV>
                        )}
                      </AnimatePresence>
                      {isEditing && activeInput === subj.subject_id && (
                        <ul className="absolute left-0 top-full z-10 mt-1 max-h-72 w-auto overflow-y-auto rounded border bg-white text-left shadow-md focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {displayPlos.map((p) => (
                            <li
                              key={p.plo}
                              className="cursor-pointer px-2 py-1 hover:bg-blue-100"
                              onClick={() => {
                                onSelectPlo(subj.subject_id, p)
                                setActiveInput(null) // ปิดหลังเลือก
                              }}
                            >
                              <span className="font-semibold">{p.plo}</span> -{' '}
                              {p.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </td>

                  <td className="relative px-4 py-3">
                    <div
                      key={subj.subject_id}
                      className="absolute inset-0 flex flex-col justify-between px-4 py-6 "
                    >
                      {subject_map_list
                        .filter((item) => item.outcome_code !== null)
                        .map((item) => (
                          <div key={item.plo} className="">
                            <select
                              value={item.mapping_level}
                              disabled={!isEditing}
                              onChange={(e) =>
                                onChangeRelation(
                                  subj.subject_id,
                                  item.outcome_code,
                                  item.plo,
                                  e.target.value,
                                )
                              }
                              className="w-full cursor-pointer rounded border border-gray-300 px-2 py-1"
                            >
                              <option value="E">E - Empty</option>
                              <option value="I">I - Introduced</option>
                              <option value="D">D - Developed</option>
                              <option value="P">P - Practiced</option>
                              <option value="A">A - Assessed</option>
                            </select>
                          </div>
                        ))}
                      <AnimatePresence>
                        {isEditing && <div></div>}
                      </AnimatePresence>
                    </div>
                  </td>
                </MotionTr>
              )
            })}
          </tbody>
        </table>
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
      <DeleteDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={deletePlo}
        Name={`การเชื่อมโยงผลการเรียนรู้`}
      />
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
export default MappingPLO

const Columns = [
  { label: 'รายวิชา', align: 'center' },
  { label: 'ผลการเรียนรู้', align: 'center' },
  { label: 'ระดับการเรียนรู้', align: 'center' },
]
