/**
 * The two closed lists of #28, with their Thai display copy — R064 and R063
 * verbatim. The enum value is what travels; the label is what a person reads,
 * and it lives once so the form's dropdown and the row's tag cannot drift.
 */

export const COGNITIVE_LEVELS = [
  { value: 'remember', label: 'จำ' },
  { value: 'understand', label: 'เข้าใจ' },
  { value: 'apply', label: 'ประยุกต์ใช้' },
  { value: 'analyze', label: 'วิเคราะห์' },
  { value: 'evaluate', label: 'ประเมินค่า' },
  { value: 'create', label: 'สร้างสรรค์/ออกแบบ' },
]

export const LEARNING_ACTIVITIES = [
  { value: 'exam', label: 'ข้อสอบ' },
  { value: 'exercise', label: 'แบบฝึกหัด' },
  { value: 'homework', label: 'การบ้าน' },
  { value: 'assigned_work', label: 'งานที่มอบหมาย' },
]

const name = (list, value) => list.find(entry => entry.value === value)?.label ?? value

export const cognitiveLevelName = value => name(COGNITIVE_LEVELS, value)
export const learningActivityName = value => name(LEARNING_ACTIVITIES, value)
