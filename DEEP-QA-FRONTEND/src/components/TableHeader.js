import MotionTr from './MotionTr'

function TableHeader({ columns }) {
  return (
    <thead className="border border-t border-gray-200 bg-slate-100">
      <MotionTr>
        {columns.map((col, idx) => (
          <th
            key={idx}
            className={`whitespace-nowrap px-2 py-3 ${
              col.align === 'left'
                ? 'text-left'
                : col.align === 'right'
                  ? 'text-right'
                  : 'text-center'
            } ${col.w ? col.w : ''}`}
          >
            {col.label}
          </th>
        ))}
      </MotionTr>
    </thead>
  )
}
export default TableHeader
