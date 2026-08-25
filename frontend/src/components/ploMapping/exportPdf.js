import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'

import THSarabun from '../../assets/fonts/THSarabun-normal'
import THSarabunBold from '../../assets/fonts/THSarabun-bold-normal'
import { LEVELS, NOT_SERVED, keyOf, mark } from './levels'

/**
 * The coverage grid as a PDF — #20's fifth criterion.
 *
 * Five things here are decisions rather than habit, and four of them are about
 * the one word in the criterion that does the work: *correctly*.
 *
 * *The font is embedded, not named.* jsPDF ships fourteen base-14 faces and not
 * one of them has a Thai glyph, so `doc.text('รายวิชา')` on the default font
 * writes a row of tofu — a PDF that opens, prints, and says nothing. The two
 * files imported above are TH Sarabun as base64 TTF, and the four calls below
 * are what put the glyphs in the file itself. That is why the assertions in
 * `20a-plo-mapping.spec.js` look inside the saved bytes for the face name *and*
 * for a `/FontFile2` to go with it: a PDF that names no embedded font is exactly
 * the failure this paragraph is about, and it looks fine from the outside.
 *
 * *Those four calls are the only registration there is, deliberately.* The two
 * vendored files arrived with a `jsPDF.API.events.push(['addFonts', ...])` tail
 * that registered TH Sarabun into every document the app would ever build, just
 * by being imported. That tail was cut — see the README beside them — because
 * an implicit global registration is one nobody can delete this code and notice:
 * with it in place, deleting every line below still produced a correct PDF, and
 * the mutant written to prove this row killed nothing at all.
 *
 * *Both faces go under one family.* Left to themselves the vendored files are
 * `THSarabun`/normal and `THSarabun Bold`/normal — two families, so
 * `setFont('THSarabun', 'bold')` would silently fall back. Registering the bold
 * bytes as the *bold style of the same family* is what makes `fontStyle: 'bold'`
 * in a header style mean anything.
 *
 * *The page is as wide as the curriculum needs.* A หลักสูตร with thirteen ข้อหลัก
 * and thirty-nine ข้อย่อย is fifty-two columns, and fifty-two columns on A4
 * landscape is about five millimetres each — narrower than the letter inside
 * them. So the page is built to the table rather than the table squeezed onto
 * the page: A4 landscape when that is enough, and wider by the column count when
 * it is not. A wide sheet is what a coverage matrix is printed on.
 *
 * *An empty cell and an `E` are drawn differently.* They are different rows in
 * the database — no row at all against a row saying this outcome is *not*
 * served — and a report that drew both blank would throw away the distinction
 * on the one document the distinction is for. Blank means nobody has said;
 * `–` means somebody said no. The legend says both.
 *
 * *The date is on it.* A coverage grid is submitted, argued over, and compared
 * against a later one, and two printouts of the same curriculum a year apart are
 * otherwise indistinguishable.
 */

/**
 * The English name beside each Thai one, for the four levels that are a degree
 * of teaching. `E` is not in here: it is not a degree of anything, and the line
 * above the list says what it means in a whole sentence.
 */
const IN_ENGLISH = {
  I: 'Introduced',
  D: 'Developed',
  P: 'Practiced',
  A: 'Assessed',
}

const FAMILY = 'THSarabun'

/** Millimetres. The subject column, one outcome column, and the two margins. */
const SUBJECT_WIDTH = 72
const OUTCOME_WIDTH = 9
const MARGIN = 10

/**
 * A page wide enough for the columns, never narrower than A4 landscape.
 *
 * Height stays A4's 210mm: the rows page over as normal, and it is only the
 * columns that cannot.
 */
const pageFor = outcomes => [
  Math.max(297, MARGIN * 2 + SUBJECT_WIDTH + OUTCOME_WIDTH * outcomes.length),
  210,
]

/** The Thai date a submission is stamped with. */
const today = () =>
  new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

export function exportGridToPdf({ program, subjects, outcomes, mappings }) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: pageFor(outcomes),
  })

  doc.addFileToVFS('THSarabun-normal.ttf', THSarabun)
  doc.addFont('THSarabun-normal.ttf', FAMILY, 'normal')
  doc.addFileToVFS('THSarabun-bold.ttf', THSarabunBold)
  doc.addFont('THSarabun-bold.ttf', FAMILY, 'bold')

  const width = doc.internal.pageSize.getWidth()

  doc.setFont(FAMILY, 'bold')
  doc.setFontSize(16)
  doc.text('การเชื่อมโยงผลการเรียนรู้ระดับหลักสูตรกับรายวิชา', width / 2, 12, {
    align: 'center',
  })
  doc.setFontSize(13)
  doc.text(
    `หลักสูตร ${program.program_id} ${program.program_name_th}` +
      (program.year ? ` (หลักสูตรปี ${program.year})` : ''),
    width / 2,
    19,
    { align: 'center' }
  )
  doc.setFont(FAMILY, 'normal')
  doc.setFontSize(10)
  doc.text(`พิมพ์เมื่อ ${today()}`, width / 2, 25, { align: 'center' })

  // The cells, by the pair that identifies them, so the body below is a lookup
  // rather than a scan of every mapping per square.
  const level = new Map(
    mappings.map(cell => [
      keyOf(cell.subject_id, cell.outcome_id),
      cell.mapping_level,
    ])
  )

  const head = [
    [
      {
        content: 'รายวิชา',
        rowSpan: 2,
        styles: { halign: 'left', valign: 'middle' },
      },
      { content: 'ผลการเรียนรู้ระดับหลักสูตร', colSpan: outcomes.length },
    ],
    outcomes.map(outcome => ({ content: outcome.outcome_code })),
  ]

  const body = subjects.map(subject => [
    `${subject.subject_id} ${subject.subject_name_th}`,
    ...outcomes.map(outcome => {
      const set = level.get(keyOf(subject.subject_id, outcome.outcome_id))
      return set ? mark(set) : ''
    }),
  ])

  autoTable(doc, {
    startY: 30,
    margin: { left: MARGIN, right: MARGIN },
    head,
    body,
    theme: 'grid',
    styles: {
      font: FAMILY,
      fontStyle: 'normal',
      fontSize: 10,
      cellPadding: 1.2,
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
      fillColor: [219, 234, 254],
      textColor: 20,
    },
    columnStyles: { 0: { halign: 'left', cellWidth: SUBJECT_WIDTH } },
  })

  const legendY = doc.lastAutoTable.finalY + 8
  doc.setFont(FAMILY, 'bold')
  doc.setFontSize(11)
  doc.text('คำอธิบายระดับ', MARGIN, legendY)
  doc.setFont(FAMILY, 'normal')
  doc.setFontSize(10)
  doc.text(
    [
      `ช่องว่าง = ยังไม่ได้ระบุ`,
      `${NOT_SERVED} = ระบุแล้วว่ารายวิชานี้ไม่ได้สอนผลการเรียนรู้ข้อนี้ (E)`,
      ...LEVELS.filter(([code]) => code !== 'E').map(
        ([code, word]) => `${code} = ${word} (${IN_ENGLISH[code]})`
      ),
    ].join('   ·   '),
    MARGIN,
    legendY + 6
  )

  doc.save(`plo-mapping-${program.program_id}.pdf`)
}
