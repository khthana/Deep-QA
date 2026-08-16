function TeacherTag({ id, name }) {
  return (
    <div>
      <span
        id={id}
        className="text-m me-2 inline-flex items-center rounded-xl bg-slate-200 px-4 py-1 font-medium text-slate-800"
      >
        {name}
      </span>
    </div>
  )
}
export default TeacherTag
