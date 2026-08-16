export const titleMap = {
  นาย: 'Mr.',
  นาง: 'Mrs.',
  นางสาว: 'Miss',
  'ดร.': 'Dr.',
  'ผศ.': 'Asst. Prof.',
  'ผศ.ดร.': 'Asst. Prof. Dr.',
  'รศ. ดร.': 'Assoc. Prof.',
  ศาสตราจารย์: 'Prof.',
  อาจารย์: 'Instructor',
  อาจารย์พิเศษ: 'Visiting Lecturer',
  //   ผู้ช่วยวิจัย: 'Asst. Researcher',
  //   นักวิจัย: 'Researcher',
  //   อาจารย์ประจำ: 'Lecturer',
  //   อาจารย์ร่วม: 'Co-Instructor',
}

export const getThaiTitle = english => {
  return Object.keys(titleMap).find(key => titleMap[key] === english) || ''
}

export const getEnglishTitle = thai => {
  return titleMap[thai] || ''
}
