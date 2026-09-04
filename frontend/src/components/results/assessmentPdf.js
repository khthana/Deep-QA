import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'

import THSarabun from '../../assets/fonts/THSarabun-normal'
import THSarabunBold from '../../assets/fonts/THSarabun-bold-normal'
import { criterionLines, figure, score, verdictLabel } from '../../lib/bands'

/**
 * The assessment report as a PDF — #40's fourth and fifth criteria.
 *
 * R075 asks for it and the ticket says why: this is what goes in the course
 * file. Everything below follows from that one fact — the document is read
 * away from the application, by people who cannot click anything, possibly
 * years later.
 *
 * *The font is embedded, not named.* jsPDF ships fourteen base-14 faces and
 * none of them has a Thai glyph, so `doc.text('ผลการเรียนรู้')` on the default
 * font writes a row of tofu: a PDF that opens, prints, and says nothing. The
 * four calls below are what put the glyphs in the file. `20a`'s assertions
 * look inside the saved bytes for the face name *and* a `/FontFile2`, and
 * `40a` does the same, because a PDF naming a font it did not embed looks
 * perfectly fine from the outside.
 *
 * *Both faces go under one family*, so `fontStyle: 'bold'` in a header style
 * means something rather than silently falling back. Left alone the two
 * vendored files register as two families.
 *
 * *Nothing is set below fourteen point.* That is
 * [#103](https://github.com/khthana/Deep-QA/issues/103), found by walking #20's
 * PDF: Thai has a lower x-height than Latin at the same point size and carries
 * vowels above and below that need the room, so the ten point that reads
 * acceptably in English is too small in Thai for a document filed as quality
 * evidence. #20's export is still at ten and has its own ticket; this one is
 * written knowing that, rather than repeating it and earning a second.
 *
 * *The verdict is a word, not a colour.* ผ่าน and ไม่ผ่าน are printed as text,
 * with the row shaded behind them. A report whose only statement of the
 * outcome is a fill colour says nothing on a monochrome printer, which is what
 * a course file is copied on.
 *
 * *The rule is on the page.* The criterion column repeats it per row, and the
 * line under the heading states it once in full. A reader holding this in five
 * years cannot ask what sixty per cent was of.
 *
 * *The date is on it*, for #20's reason: two printouts of the same Section a
 * term apart are otherwise indistinguishable.
 */

const FAMILY = 'THSarabun'

/**
 * Point sizes, floored at fourteen.
 *
 * Named rather than written at each call so that the floor is one number to
 * check against #103 rather than nine.
 */
const TITLE = 20
const HEADING = 16
const BODY = 14

/** Millimetres. */
const MARGIN = 12

/** The Thai date a submission is stamped with, as `exportPdf.js` stamps its own. */
const today = () =>
  new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

export function exportAssessmentToPdf({ section, subject, rule, clos }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  doc.addFileToVFS('THSarabun-normal.ttf', THSarabun)
  doc.addFont('THSarabun-normal.ttf', FAMILY, 'normal')
  doc.addFileToVFS('THSarabun-bold.ttf', THSarabunBold)
  doc.addFont('THSarabun-bold.ttf', FAMILY, 'bold')

  const width = doc.internal.pageSize.getWidth()

  doc.setFont(FAMILY, 'bold')
  doc.setFontSize(TITLE)
  doc.text('รายงานการประเมินผลการเรียนรู้ระดับรายวิชา', width / 2, 16, {
    align: 'center',
  })

  // The ticket's fifth criterion, and all four of its parts are here on one
  // line: a report that names only the subject is a report somebody has to
  // guess the year of.
  doc.setFontSize(HEADING)
  doc.text(
    `${subject.subject_id} ${subject.subject_name_th}`,
    width / 2,
    24,
    { align: 'center' }
  )
  doc.setFont(FAMILY, 'normal')
  doc.setFontSize(BODY)
  doc.text(
    `ตอนเรียน ${section.section_number} · ภาคการศึกษา ${section.semester} · ปีการศึกษา ${section.academic_year}`,
    width / 2,
    31,
    { align: 'center' }
  )

  const [line, share] = criterionLines(rule)
  doc.text(`เกณฑ์การบรรลุ: ${line} และ${share}`, width / 2, 38, {
    align: 'center',
  })
  doc.text(`พิมพ์เมื่อ ${today()}`, width / 2, 45, { align: 'center' })

  autoTable(doc, {
    startY: 50,
    margin: { left: MARGIN, right: MARGIN },
    head: [
      [
        { content: 'ผลการเรียนรู้', styles: { halign: 'left' } },
        { content: 'เกณฑ์การบรรลุ', styles: { halign: 'left' } },
        { content: 'ผ่าน / ผู้มีคะแนน' },
        { content: 'ร้อยละ' },
        { content: 'คะแนนเฉลี่ย' },
        { content: 'ผลการประเมิน' },
      ],
    ],
    body: clos.map(clo => [
      `${clo.clo_number}\n${clo.clo_detail}`,
      // The same sentence on every row, because it is the same rule on every
      // row. Repeating it rather than writing it once at the top and leaving
      // the column blank is what makes a single row legible when it is quoted
      // out of the table, which is how a course file gets read.
      `${line}\nและ${share}`,
      `${clo.passed_count} / ${clo.student_count}`,
      figure(clo.pass_rate, '%'),
      score(clo.mean),
      verdictLabel(clo.passed),
    ]),
    theme: 'grid',
    styles: {
      font: FAMILY,
      fontStyle: 'normal',
      fontSize: BODY,
      cellPadding: 1.6,
      halign: 'center',
      valign: 'middle',
      textColor: 20,
      lineColor: [180, 180, 180],
      lineWidth: 0.1,
      overflow: 'linebreak',
    },
    headStyles: {
      font: FAMILY,
      fontStyle: 'bold',
      fontSize: BODY,
      fillColor: [15, 42, 96],
      textColor: 255,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 52, halign: 'left' },
      1: { cellWidth: 44, halign: 'left' },
      2: { cellWidth: 24 },
      3: { cellWidth: 17 },
      4: { cellWidth: 22 },
      5: { cellWidth: 27 },
    },
    // The shading is a second reading of the verdict, never the only one: the
    // word is in the cell either way, so a monochrome copy loses nothing.
    didParseCell: data => {
      if (data.section !== 'body' || data.column.index !== 5) return
      const { passed } = clos[data.row.index]
      if (passed === false) data.cell.styles.fillColor = [254, 226, 226]
      if (passed === true) data.cell.styles.fillColor = [220, 252, 231]
    },
  })

  // The rubric, as an appendix. A reader of the report should be able to see
  // what the levels say without opening #29's editor — but it is printed apart
  // from the judgement, because none of these sentences is what decided a row
  // above.
  //
  // Keyed by outcome and not printed once, which matters even though the seed
  // gives every outcome the same four sentences: `subject_clo_achievement_criteria`
  // is per CLO, #29's editor writes them per CLO, and a single table headed
  // *the rubric* would be a claim about outcomes it had not read the moment two
  // of them differ. An outcome whose criteria nobody has written yet says so
  // rather than being left out, for the reason it is not left out of the table
  // above.
  const rubric = clos.flatMap(clo =>
    clo.criteria.length === 0
      ? [[clo.clo_number, '—', 'ยังไม่ได้กำหนดเกณฑ์การบรรลุผล']]
      : clo.criteria.map(one => [
          clo.clo_number,
          one.achievement_level,
          one.criteria_detail,
        ])
  )

  if (rubric.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      margin: { left: MARGIN, right: MARGIN },
      head: [[{ content: 'เกณฑ์การบรรลุผลสี่ระดับของแต่ละข้อ (อ้างอิง)', colSpan: 3 }]],
      body: rubric,
      theme: 'grid',
      styles: {
        font: FAMILY,
        fontStyle: 'normal',
        fontSize: BODY,
        cellPadding: 1.6,
        valign: 'middle',
        textColor: 20,
        lineColor: [180, 180, 180],
        lineWidth: 0.1,
        overflow: 'linebreak',
      },
      headStyles: {
        font: FAMILY,
        fontStyle: 'bold',
        fontSize: BODY,
        fillColor: [100, 116, 139],
        textColor: 255,
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 28 },
        2: { cellWidth: 'auto' },
      },
    })
  }

  doc.save(
    `assessment-${subject.subject_id}-sec${section.section_number}-${section.academic_year}.pdf`
  )
}
