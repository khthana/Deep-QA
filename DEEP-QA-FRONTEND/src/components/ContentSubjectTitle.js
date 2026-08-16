export default function ContentSubjectTitle() {
  const savedCourse = JSON.parse(localStorage.getItem('selectedCourse'))
  const section = localStorage.getItem('section') || ''
  const term = localStorage.getItem('term') || ''
  const year = localStorage.getItem('year') || ''
  const subject = savedCourse?.subject_name_th || ''

  return (
    <div
      className="inline-flex w-full cursor-pointer flex-col items-center gap-4 rounded-xl border-l-4 border-secondary bg-blue-100 px-5 py-3 text-xl text-secondary shadow-sm transition-all duration-200
    ease-in-out hover:scale-[1] hover:bg-blue-200
    hover:text-blue-900 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="">รายวิชา {subject}</div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Tag: กลุ่มเรียน */}
        <div className="inline-flex items-center rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-500"></span>
          กลุ่ม {section}
        </div>

        {/* Tag: ปีการศึกษา */}
        <div className="inline-flex items-center rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
          ภาคเรียน {term}/{year}
        </div>
      </div>
    </div>
  )
}
