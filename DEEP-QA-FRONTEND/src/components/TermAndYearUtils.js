export function getCurrentTermAndYear() {
  const now = new Date()
  const month = now.getMonth() + 1 // JS เริ่ม 0
  let term, year

  // logic cutoff แบบตัวอย่าง: term 1 สิ้นสุด พ.ย., term 2 สิ้นสุด เม.ย.
  if (month >= 6 && month <= 11) {
    term = 1
    year = now.getFullYear() + 543
  } else if (month >= 12 || month <= 4) {
    term = 2
    year = month <= 4 ? now.getFullYear() + 543 - 1 : now.getFullYear() + 543
  } else {
    term = 3
    year = now.getFullYear() + 543 - 1
  }

  return { term, year }
}

export function generateTermOptions() {
  return [1, 2] // เทอมที่มี
}

export function generateYearOptions(startYear, endYear) {
  const years = []
  for (let y = endYear; y >= startYear; y--) {
    years.push(y)
  }
  return years
}
