import React, { useEffect, useState } from 'react'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentTitle from '../../../ContentTitle'
import { IoDocumentTextOutline } from 'react-icons/io5'
import TableHeader from '../../../TableHeader'
import { RiDeleteBin6Line } from 'react-icons/ri'
import { RiEdit2Line } from 'react-icons/ri'
import { time } from 'framer-motion'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'
import { exportAssessmentPDF } from './assessmentPdfUtils'

function AssessmentCLO() {
  const [sessionExpired, setSessionExpired] = useState(false)
  const section_id = localStorage.getItem('section_id') || ''
  const selectedCourse = JSON.parse(localStorage.getItem('selectedCourse'))
  const [result, setResult] = useState([])

  useEffect(() => {
    if (section_id) {
      fetchCLOEva()
    }
  }, [section_id])

  const handlePrintReport = () => {
    if (result && result.length > 0) {
      console.log('Exporting PDF with data:', selectedCourse)
      exportAssessmentPDF(result, section_id, selectedCourse)
    } else {
      alert('ไม่พบข้อมูลสำหรับการออกรายงาน')
    }
  }

  const fetchCLOEva = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/cloEva/get/${section_id}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      )
      if (isSessionExpired(res)) return setSessionExpired(true)

      const data = await res.json()
      setResult(data.data)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentSubjectTitle></ContentSubjectTitle>

      <ContentMotionDIV className="flex h-full flex-col gap-4 rounded-xl bg-white p-6 shadow">
        <div className="inline-flex items-center justify-between  ">
          <ContentTitle
            titlename="การประเมินผลการเรียนรู้"
            icon={IoDocumentTextOutline}
          />
          <button
            type="button"
            onClick={handlePrintReport}
            className={
              'flex items-center justify-center rounded-lg bg-cyan-600 px-5 py-2.5 font-medium text-white hover:bg-cyan-700 '
            }
          >
            พิมพ์รายงาน
          </button>
        </div>
        <div className="mt-0 flex rounded-xl bg-white shadow">
          <div className="w-full overflow-x-auto rounded-lg">
            <table className="text-m min-w-full border-gray-300 text-center text-gray-700">
              <TableHeader columns={Columns} />
              <tbody>
                {result.map(item =>
                  item.indicators.map((ind, index) => (
                    <tr
                      key={`${item.clo_id}-${index}`}
                      className="border transition hover:bg-gray-50"
                    >
                      {index === 0 && (
                        <td
                          rowSpan={item.indicators.length}
                          className="border border-gray-300 px-2 py-2 text-left align-top"
                        >
                          <span className="font-black">
                            CLO-{item.clo_number}
                          </span>{' '}
                          : {item.clo_detail}
                        </td>
                      )}

                      <td className="border border-gray-300 px-2 py-2 text-left">
                        {ind.activity_name}
                      </td>

                      <td className="cursor-pointer border px-2 py-2 transition hover:bg-gray-50">
                        <div className="grid grid-cols-2 items-center divide-x hover:divide-gray-400">
                          <span className="pr-2 text-center transition">
                            {ind.pass_students} of {ind.total_students}
                          </span>

                          <span className="min-w-[60px] cursor-pointer pl-2 text-center text-gray-400 transition hover:text-blue-600">
                            {ind.pass_percent}%
                          </span>
                        </div>
                      </td>

                      <td className="border border-gray-300 px-2 py-2 text-center">
                        {ind.result}
                      </td>

                      {index === 0 && (
                        <td
                          rowSpan={item.indicators.length}
                          className="border border-gray-300 px-2 py-2 text-center"
                        >
                          {item.outcome_code}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ContentMotionDIV>
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
export default AssessmentCLO

const Columns = [
  { label: 'ผลการเรียนรู้', w: 'w-[400px]', align: 'left' },
  { label: 'ข้อบ่งชี้ผลการเรียนรู้', align: 'left' },
  { label: 'การประเมินผลการเรียนรู้', align: 'center' },
  { label: 'บรรลุ', align: 'center' },
  { label: 'PLOs', align: 'center' },
]
