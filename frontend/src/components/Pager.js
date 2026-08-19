/**
 * The paging control every list on this system draws — ticket #57.
 *
 * Five screens had written it out by hand — ผู้ใช้งานระบบ, ประวัติการใช้งาน,
 * ข้อมูลภาควิชา, ข้อมูลหลักสูตร and ข้อมูลรายวิชา — and #16 made it six.
 * `docs/acceptance/14-departments.md` said to revisit it "at the third or
 * fourth screen"; #57 is the ticket that does, before #17 and #18 make it
 * seven and eight.
 *
 * The five copies were the same markup with the same numbers in it, which is
 * exactly the kind of duplication that stops being harmless the moment one of
 * them is fixed and the others are not: the ends-disabled rule and the
 * `Math.max(1, …)` floor are one-line invariants that a sixth typing gets
 * subtly wrong.
 *
 * Two page numbers, deliberately, because the screens were already using two.
 * `page` is what the screen has asked for and is what the buttons are enabled
 * against; `shown` is what the server confirmed it sent, and is what the line
 * reads out. They differ only for the moment a page is in flight, and reading
 * the confirmed one there is what stops the label saying "หน้า 3" over the rows
 * of page 2.
 *
 * How many pages there are is computed here rather than passed in: it is
 * `total` and `perPage` and nothing else, and every screen was deriving it
 * identically. The floor of one is what keeps an empty list reading
 * "หน้า 1 จาก 1" rather than "หน้า 1 จาก 0".
 */

export default function Pager({ page, shown, total, perPage = 10, onPage, className = '' }) {
  const pages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div className={`flex items-center justify-between text-sm text-slate-600 ${className}`}>
      <span>
        ทั้งหมด {total} รายการ · หน้า {shown ?? page} จาก {pages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-40"
        >
          ก่อนหน้า
        </button>
        <button
          type="button"
          onClick={() => onPage(Math.min(pages, page + 1))}
          disabled={page >= pages}
          className="rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-40"
        >
          ถัดไป
        </button>
      </div>
    </div>
  )
}
