// assessmentPdfUtils.js
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
// ตรวจสอบ Path ฟอนต์ให้ตรงกับโปรเจกต์ของคุณ
import THSarabunNormal from '../../../../assets/Fonts/THSarabun-normal.js'
import THSarabunBold from '../../../../assets/Fonts/THSarabun Bold-normal.js'

export const exportAssessmentPDF = (result, section_id, selectedCourse) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })

  // 1. ลงทะเบียนฟอนต์ภาษาไทย
  doc.addFileToVFS('THSarabun-normal.ttf', THSarabunNormal)
  doc.addFont('THSarabun-normal.ttf', 'THSarabun', 'normal')
  doc.addFileToVFS('THSarabun-bold.ttf', THSarabunBold)
  doc.addFont('THSarabun-bold.ttf', 'THSarabun', 'bold')

  // 2. ตั้งค่าหัวกระดาษ
  doc.setFont('THSarabun', 'bold')
  doc.setFontSize(18)
  doc.text('รายงานการประเมินผลการเรียนรู้ (Assessment CLO)', 105, 15, {
    align: 'center',
  })

  doc.setFontSize(14)
  doc.text(
    `กลุ่มเรียนที่: ${selectedCourse.sections[0].section_number}`,
    14,
    25
  )

  doc.text(
    `วิชา: ${selectedCourse.subject_id} ${selectedCourse.subject_name_th}`,
    14,
    30
  )

  // 3. เตรียมข้อมูล Table Body
  const tableBody = []
  result.forEach(item => {
    item.indicators.forEach((ind, index) => {
      tableBody.push(
        [
          // คอลัมน์ CLO: แสดงเฉพาะแถวแรกของกลุ่ม (จำลอง Rowspan)
          index === 0
            ? {
                content: `CLO-${item.clo_number}: ${item.clo_detail}`,
                rowSpan: item.indicators.length,
              }
            : null,
          // คอลัมน์กิจกรรม
          ind.activity_name,
          // คอลัมน์จำนวนนักศึกษา
          {
            content: `${ind.pass_students} / ${ind.total_students}`,
            styles: { halign: 'center' },
          },
          // คอลัมน์เปอร์เซ็นต์
          { content: `${ind.pass_percent}%`, styles: { halign: 'center' } },
          // คอลัมน์ผลประเมิน
          { content: ind.result, styles: { halign: 'center' } },
          // คอลัมน์ Outcome/PLO: แสดงเฉพาะแถวแรก
          index === 0
            ? {
                content: item.outcome_code,
                rowSpan: item.indicators.length,
                styles: { halign: 'center', valign: 'middle' },
              }
            : null,
        ].filter(cell => cell !== null)
      ) // กรองค่า null ออกสำหรับแถวที่โดน rowspan
    })
  })

  // 4. สร้างตารางด้วย autoTable
  autoTable(doc, {
    startY: 35,
    head: [
      [
        { content: 'ผลการเรียนรู้ (CLO)', styles: { halign: 'center' } },
        { content: 'กิจกรรม/เครื่องมือประเมิน', styles: { halign: 'center' } },
        { content: 'จำนวนที่ผ่าน', styles: { halign: 'center' } },
        { content: 'ร้อยละ', styles: { halign: 'center' } },
        { content: 'ผลประเมิน', styles: { halign: 'center' } },
        { content: 'PLO', styles: { halign: 'center' } },
      ],
    ],
    body: tableBody,
    theme: 'grid',
    styles: {
      font: 'THSarabun',
      fontSize: 11,
      cellPadding: 2,
      lineColor: [180, 180, 180],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [0, 121, 107], // สีเขียวเข้มแบบเขื่อน/ทางการ
      textColor: 255,
      font: 'THSarabun',
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 60 }, // CLO
      1: { cellWidth: 'auto' }, // Activity
      2: { cellWidth: 25 }, // Pass
      3: { cellWidth: 15 }, // %
      4: { cellWidth: 20 }, // Result
      5: { cellWidth: 15 }, // PLO
    },
    // จัดการเรื่องฟอนต์ภาษาไทยใน Body
    didParseCell: data => {
      data.cell.styles.font = 'THSarabun'
    },
  })

  // 5. บันทึกไฟล์
  doc.save(`Assessment_Report_Section_${section_id}.pdf`)
}
