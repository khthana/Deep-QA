import { MdBlock, MdOutlineCheckCircle, MdOutlineRemoveRedEye } from 'react-icons/md'
import { Link } from 'react-router-dom'
import { RiDeleteBin6Line, RiEdit2Line } from 'react-icons/ri'

/**
 * One action in a list's ดำเนินการ column, drawn as an icon - #271.
 *
 * The owner's answer of 10 November 2569 restores the delivered system's
 * column (`DEEP-QA-FRONTEND/src/components/BT.js`): an icon in a bordered
 * square instead of a word. The icons, the colours, the hover shades and the
 * gap between buttons (`gap-4`, its tables' cells) are that file's, plus two
 * the delivered system never had because it drew the account status as a
 * switch in its own column - `suspend` and `restore`, for ข้อมูลผู้ใช้งาน,
 * answered the same day.
 *
 * **The word is still the button's name.** `label` becomes `aria-label`, so a
 * screen reader hears แก้ไข or นำออก where a sighted person sees a pencil or a
 * trash can, and every spec that presses by name presses the same button it
 * did. Four different actions share the trash can - ลบ, นำออก, ยกเลิกการเปิด,
 * ยกเลิกบทบาท - and the name is the only thing that tells them apart.
 *
 * **The word is also the tooltip**, unless the caller hands a `title` of its
 * own. Two callers do, and only while the button is disabled: the reason a
 * person cannot suspend their own account or revoke their own grant was
 * already a tooltip, and it says more than the word would.
 *
 * **A place is drawn as a link** (#273). Handed `to` instead of `onClick`, it
 * renders a router `<Link>` in the same square, because LearningActivities'
 * หลักฐาน goes somewhere rather than doing something (#35) and its role is
 * what the specs and a screen reader read it by.
 *
 * `e2e/tests/271a-action-icons.spec.js` holds the three claims on every
 * administration screen that draws one, and `273a-teacher-row-actions.spec.js`
 * on the teacher screens (#273), whose names say what the act is done to and so
 * make a longer tooltip; `mutation/271-action-icons.py` breaks each here.
 */
const KINDS = {
  edit: {
    Icon: RiEdit2Line,
    tone: 'border-green-600 text-green-600 hover:bg-green-200',
  },
  remove: {
    Icon: RiDeleteBin6Line,
    tone: 'border-rose-700 text-rose-700 hover:bg-red-200',
  },
  open: {
    Icon: MdOutlineRemoveRedEye,
    tone: 'border-blue-700 text-blue-700 hover:bg-blue-200',
  },
  suspend: {
    Icon: MdBlock,
    tone: 'border-orange-600 text-orange-600 hover:bg-orange-200',
  },
  restore: {
    Icon: MdOutlineCheckCircle,
    tone: 'border-green-600 text-green-600 hover:bg-green-200',
  },
}

export default function RowAction({ kind, label, title, onClick, to, disabled = false }) {
  const { Icon, tone } = KINDS[kind]
  // One element whichever it is, so the name, the tooltip and the icon are
  // written once for both and a mutant of any of them reaches the link too.
  const Square = to ? Link : 'button'
  const how = to ? { to } : { type: 'button', onClick, disabled }
  return (
    <Square
      {...how}
      aria-label={label}
      title={title ?? label}
      className={`inline-flex rounded-lg border p-2 transition focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${tone}`}
    >
      <Icon aria-hidden="true" className="text-xl" />
    </Square>
  )
}

/** The cell the actions sit in, centred under a header that reads ดำเนินการ. */
export function RowActions({ children }) {
  return <div className="flex items-center justify-center gap-4">{children}</div>
}
