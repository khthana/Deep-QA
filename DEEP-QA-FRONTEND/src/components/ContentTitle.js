export default function ContentTitle({ titlename, icon: Icon }) {
  return (
    <div>
      <span className="inline-flex items-center text-2xl font-medium text-secondary">
        {Icon && <Icon className="me-2 h-6 w-6 text-secondary" />}

        {titlename}
      </span>
    </div>
  )
}
