import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'

import THSarabun from '../../assets/fonts/THSarabun-normal'
import THSarabunBold from '../../assets/fonts/THSarabun-bold-normal'
import { LEVELS, NOT_SERVED, keyOf, mark } from './levels'
import { wrapped } from '../../lib/thaiWrap'

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
 * *Nothing is set below 14pt* - #103, which was opened by the walk that passed
 * the row above this one. TH Sarabun has a lower x-height than a Latin face at
 * the same point size and carries vowels above and below that need the room, so
 * 10pt was a document the owner had to lean into, on a file that is submitted as
 * quality-assurance evidence. Three sizes, measured on 8 October 2569: the body
 * and the date stamp at 14, the curriculum's name and the legend's heading at 16,
 * the title at 20. `20a` asks the saved bytes whether any text is drawn smaller
 * than 14, which is the one half of *too small to read* a machine can hold.
 *
 * *The page is as wide as the curriculum needs.* Since #100 the columns are
 * ข้อหลัก only, so the seed's thirteen fit A4 landscape with room to spare.
 * `OUTCOME_WIDTH` sizes the *page*, not the column: only column 0 is given a
 * width, and autoTable spreads the rest across whatever is left, so thirteen
 * outcomes on A4 get 15.0mm each - 17.4 for the four two-digit codes, which
 * autoTable widens for their content - against a `PLO-13` that is 11.1mm wide at
 * 14pt bold. Measured 8 October 2569, with the figures at 10pt beside them: the
 * same code was 7.9mm in a column of the same width - 15.1mm then against 15.0
 * now - so the paragraph this replaces
 * was wrong about both numbers in the same breath and right about the conclusion.
 *
 * `OUTCOME_WIDTH` is **14 and not 9** for the same measurement read the other
 * way. It is what the page grows by per column once thirteen stop fitting, and
 * at 9mm a column of a wider page gets less than a code needs: measured at this
 * size, twenty outcomes put every one of the twenty codes onto two lines, and
 * thirty did too. At 14 none of the thirty wraps. The old value was already short
 * at 10pt - it broke at twenty columns rather than at sixteen - so this is a
 * defect the fix walked into rather than one it caused. **Nothing proves the new
 * value**: at the seed's thirteen outcomes the page is held at the A4 floor either
 * way, so the two values give the same column to within 0.05mm and no row and no
 * mutant can tell them apart. #195 holds that, with the three ways in priced; the
 * owner chose to keep 14 and carry the ticket. The sentence below is
 * only true with the new value: the page is built to the table rather than the
 * table squeezed onto the page, A4 landscape when that is enough and wider by the
 * column count when it is not. A wide sheet is what a coverage matrix is printed
 * on.
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
 *
 * *The รายวิชา column is wrapped before autoTable sees it* — #117, whose fix
 * `assessmentPdf.js` carries the long version of. It is the only cell here that
 * can wrap: a mark is one character, `PLO-13` is ten millimetres in a nine
 * millimetre column that autoTable widens for it, and the outcome heading spans
 * everything but the รายวิชา column — never less than 205mm against the 26.2mm
 * its sentence draws, because `pageFor` will not make a page narrower than A4
 * landscape. Measured 25 September 2569; the รายวิชา column is the one that
 * carries a name somebody typed.
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
const OUTCOME_WIDTH = 14
const MARGIN = 10

/** Millimetres inside every cell, on each side — `styles.cellPadding` below. */
const CELL_PADDING = 1.2

/**
 * Points. Three sizes, none below 14 - #103, and the floor is the ticket's.
 *
 * The hierarchy is kept rather than flattened to the floor: a submitted document
 * whose title, its curriculum's name and its date stamp are all one size reads as
 * one block of text. What the raise cost is measured in the docstring above.
 */
const BODY = 14
const HEADING = 16
const TITLE = 20

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
  doc.setFontSize(TITLE)
  doc.text('การเชื่อมโยงผลการเรียนรู้ระดับหลักสูตรกับรายวิชา', width / 2, 14, {
    align: 'center',
  })
  doc.setFontSize(HEADING)
  doc.text(
    // label-code: the identity of the exported document, which has to say which curriculum
    // it is of to a reader who does not have the screen in front of them (#93)
    `หลักสูตร ${program.program_id} ${program.program_name_th}` +
      (program.revision_year ? ` (หลักสูตรปี ${program.revision_year})` : ''),
    width / 2,
    22,
    { align: 'center' }
  )
  doc.setFont(FAMILY, 'normal')
  doc.setFontSize(BODY)
  // The three baselines above are 14 / 22 / 29 rather than 12 / 19 / 25, because
  // a gap is read against the size of the line in it. At 16 / 13 / 10pt the old
  // spacing gave 1.53 and 1.70 ems of air; the same millimetres at the new sizes
  // give 1.24 and 1.21, which is where a Thai upper vowel and a tone mark go.
  // The new baselines give 1.42 and 1.42. Nothing overlapped at the old numbers -
  // measured, and said here rather than claiming a collision that did not happen.
  doc.text(`พิมพ์เมื่อ ${today()}`, width / 2, 29, { align: 'center' })

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

  // The face and the size the column is drawn in have to be the ones selected
  // while it is measured, so this happens after the headings above and before
  // the table below.
  doc.setFont(FAMILY, 'normal')
  doc.setFontSize(BODY)
  const subjectCell = subject =>
    wrapped(
      // label-code: a cell of the exported table, read away from the system, where the code
      // is how a reader finds the subject in the registrar's catalogue (#93)
      `${subject.subject_id} ${subject.subject_name_th}`,
      SUBJECT_WIDTH - CELL_PADDING * 2,
      one => doc.getTextWidth(one)
    )

  const body = subjects.map(subject => [
    subjectCell(subject),
    ...outcomes.map(outcome => {
      const set = level.get(keyOf(subject.subject_id, outcome.outcome_id))
      return set ? mark(set) : ''
    }),
  ])

  autoTable(doc, {
    startY: 34,
    margin: { left: MARGIN, right: MARGIN },
    head,
    body,
    theme: 'grid',
    styles: {
      font: FAMILY,
      fontStyle: 'normal',
      fontSize: BODY,
      cellPadding: CELL_PADDING,
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
  doc.setFontSize(HEADING)
  doc.text('คำอธิบายระดับ', MARGIN, legendY)
  doc.setFont(FAMILY, 'normal')
  // One `doc.text` with no width given, so nothing wraps it: at 14pt the line is
  // 272.4mm drawn from a 10mm margin, which clears the 287mm the table ends at by
  // 4.6mm on the narrowest page this document has. A sixth level, or a longer
  // sentence for one of the five, is what would run it off the page - which is
  // what `20a`'s `overflows` sees for a cell and nothing sees for a free line.
  doc.setFontSize(BODY)
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
