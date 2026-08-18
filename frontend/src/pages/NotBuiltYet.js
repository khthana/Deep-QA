import ContentMotionDIV from '../components/ContentMotionDIV'

/**
 * The placeholder behind a menu entry whose screen has not been built yet.
 *
 * The shell is #10 and the screens are #11 onwards, so for one phase the
 * sidebar can reach paths that have nothing behind them. Saying so plainly
 * beats a blank page or a wrong "not found": the entry is real, the screen is
 * on its way, and the ticket number says which one.
 */
export default function NotBuiltYet({ ticket }) {
  return (
    <ContentMotionDIV className="flex h-full items-center justify-center py-24">
      <div className="text-center">
        <p className="text-lg font-medium text-primary">หน้านี้กำลังพัฒนา</p>
        <p className="mt-2 text-sm text-slate-500">
          {ticket ? `จะพร้อมใช้งานในงาน ${ticket}` : 'จะพร้อมใช้งานในงานถัดไป'}
        </p>
      </div>
    </ContentMotionDIV>
  )
}
