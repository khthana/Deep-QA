import { AnimatePresence, motion } from 'framer-motion'
import ContentTitle from '../../ContentTitle'
import { MdErrorOutline } from 'react-icons/md'

function CourseList({ text }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col rounded-xl bg-white p-8 shadow"
    >
      <ContentTitle titlename={text} icon={MdErrorOutline} />
    </motion.div>
  )
}
export default CourseList
