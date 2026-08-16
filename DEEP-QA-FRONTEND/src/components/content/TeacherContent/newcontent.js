import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import ContentTitle from '../../../ContentTitle'
import { GrPlan } from 'react-icons/gr'

function TestContent() {
  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentSubjectTitle></ContentSubjectTitle>

      <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-6 shadow">
        <ContentTitle titlename="แผนการสอน" icon={GrPlan} />
      </ContentMotionDIV>
    </ContentMotionDIV>
  )
}
export default TestContent
