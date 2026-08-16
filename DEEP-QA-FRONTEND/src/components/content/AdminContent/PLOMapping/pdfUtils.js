// pdfUtils.js
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import THSarabunNormal from '../../../../assets/Fonts/THSarabun-normal.js'
import THSarabunBold from '../../../../assets/Fonts/THSarabun Bold-normal.js'

export const createThaiPDF = (ListPLO, MappingPloData, SelectedProg) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.addFileToVFS('THSarabun-normal.ttf', THSarabunNormal)
  doc.addFont('THSarabun-normal.ttf', 'THSarabun', 'normal')
  doc.addFileToVFS('THSarabun-bold.ttf', THSarabunBold)
  doc.addFont('THSarabun-bold.ttf', 'THSarabun', 'bold')

  // หัวกระดาษ
  doc.setFont('THSarabun', 'bold')
  doc.setFontSize(16)
  doc.text(
    'รายงานการ Mapping ผลการเรียนรู้ระดับหลักสูตร',
    doc.internal.pageSize.getWidth() / 2,
    12,
    { align: 'center' }
  )
  doc.setFontSize(14)
  doc.text(
    `หลักสูตร ${MappingPloData.program_name_th} (${MappingPloData.program_name_en}) ${SelectedProg?.program_year}`,
    doc.internal.pageSize.getWidth() / 2,
    20,
    { align: 'center' }
  )

  // หัวตาราง
  const tableHead = [
    [
      {
        content: 'รายวิชา',
        rowSpan: 2,
        styles: {
          halign: 'center',
          valign: 'middle',
          fillColor: [240, 240, 240],
          textColor: 0,
        },
      },
      {
        content: 'ผลการเรียนรู้ระดับหลักสูตร',
        colSpan: ListPLO.length,
        styles: { halign: 'center', fillColor: [240, 240, 240], textColor: 0 },
      },
    ],
    [
      ...ListPLO.map(plo => ({
        content: plo.outcome_code,
        styles: { halign: 'center', fillColor: [240, 240, 240], textColor: 0 },
      })),
    ],
  ]

  const getLevelStyle = level => {
    if (level === 'E') {
      return {
        textColor: 0,
        font: 'zapfdingbats', // ใช้ฟอนต์สัญลักษณ์ตรงนี้เลย
        fontStyle: 'normal',
        text: String.fromCharCode(52), // ✓ แท้
      }
    }
    if (['I', 'D', 'P', 'A'].includes(level)) {
      return { textColor: 0, font: 'THSarabun', fontStyle: 'bold', text: level }
    }
    return {
      textColor: 0,
      fillColor: [255, 255, 255],
      fontStyle: 'normal',
      text: '',
    }
  }

  // สร้าง body
  const tableBody = (MappingPloData.program_subject_mapping || []).map(
    subject => [
      `${subject.subject_id} ${subject.subject_name_th}`,
      ...(ListPLO || []).map(plo => {
        const map = (subject.subject_mapping || []).find(
          m => m.outcome_code === plo.outcome_code
        )
        let level = ''
        if (map) {
          level = map.mapping_level === 'E' ? 'E' : map.mapping_level
        }

        const style = getLevelStyle(level)
        return { content: style.text, styles: style }
      }),
    ]
  )

  autoTable(doc, {
    startY: 30,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      font: 'THSarabun',
      fontStyle: 'bold',
      halign: 'center',
      fillColor: [219, 234, 254],
      textColor: 0,
    },
    bodyStyles: {
      font: 'THSarabun',
      fontStyle: 'normal',
      halign: 'center',
      textColor: 0,
    },
    columnStyles: { 0: { halign: 'left', cellWidth: 'auto' } },
    styles: { lineColor: [180, 180, 180], lineWidth: 0.1 },

    didDrawCell: data => {
      if (data.section === 'body') {
        const { x, y, width, height } = data.cell
        const centerX = x + width / 2
        const centerY = y + height / 2

        if (data.cell.raw === 'drawTick') {
          doc.setFont('zapfdingbats', 'normal')
          doc.text(String.fromCharCode(52), centerX - 1.5, centerY + 2, {
            align: 'center',
          })
          doc.setFont('THSarabun', 'normal')
        }
      }
    },
  })

  // คำอธิบายระดับ
  const startY = doc.lastAutoTable.finalY + 10
  doc.setFont('THSarabun', 'bold')
  doc.setFontSize(12)

  // พิมพ์ข้อความนำ
  doc.text('คำอธิบาย:', 14, startY)

  // ใช้ ZapfDingbats ที่มีสัญลักษณ์ ✓ (code 52)
  doc.setFont('zapfdingbats', 'normal')
  doc.text(String.fromCharCode(52), 39, startY) // นี่คือ ✓ แบบแท้แน่นอน

  // กลับมาใช้ THSarabun ต่อ
  doc.setFont('THSarabun', 'bold')
  doc.text(
    ' - ค่าเริ่มต้น, I - Introduced (เริ่มสอน), D - Developed (พัฒนา), P - Practiced (ฝึกฝน), A - Assessed (ประเมินผล)',
    43,
    startY
  )

  doc.save(`PLO-Mapping-${MappingPloData.program_name_en}.pdf`)
}
