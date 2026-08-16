import { useEffect, useState } from 'react'

function SelectSemesterAndSubject({
  selectedSemester,
  setSelectedSemester,
  selectedSubject,
  setSelectedSubject,
}) {
  const semesters = ['1', '2']
  const subjects = [
    {
      id: '01076401',
      name: 'Introduction to Computer Engineering',
      semester: '1',
    },
    {
      id: '01076402',
      name: 'Programming Fundamentals',
      semester: '1',
    },
    {
      id: '01076403',
      name: 'Data Structures and Algorithms',
      semester: '2',
    },
  ]

  const [filteredSubjects, setFilteredSubjects] = useState([])

  useEffect(() => {
    if (!selectedSemester) {
      setFilteredSubjects([])
      return
    }

    const filtered = subjects.filter(subj => subj.semester === selectedSemester)
    setFilteredSubjects(filtered)
  }, [selectedSemester])

  return (
    <div className="mt-4 flex w-full items-center justify-between rounded-lg border bg-white p-5 shadow">
      <div className="flex w-full flex-row items-center justify-start gap-6">
        <div className="inline-flex items-center gap-2">
          <span className="select-none text-gray-600">ภาคการศึกษา</span>
          <select
            className="rounded-lg border border-gray-300 bg-slate-100 px-3 py-2 text-gray-700 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedSemester}
            onChange={e => setSelectedSemester(e.target.value)}
          >
            <option value="">-- กรุณาเลือก --</option>
            {semesters.map(s => (
              <option key={s} value={s}>
                {s}/2568
              </option>
            ))}
          </select>
        </div>

        <div className="inline-flex items-center gap-2">
          <span className="select-none text-gray-600">รายวิชา</span>
          <select
            className="rounded-lg border border-gray-300 bg-slate-100 px-3 py-2 text-gray-700 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedSubject}
            onChange={e => {
              console.log(e.target.value)
              setSelectedSubject(e.target.value)
            }}
            disabled={!selectedSemester}
          >
            <option value="">-- กรุณาเลือก --</option>
            {filteredSubjects.map(subj => (
              <option key={subj.id} value={subj.id}>
                {subj.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

export default SelectSemesterAndSubject
