/**
 * The label census's own fixtures - `node --test scripts/label-codes.test.js`.
 *
 * An instrument nobody has seen fail is the species of assertion #124 is about,
 * and its own fixtures pass either way unless they are written to catch the two
 * ways a rule like this goes wrong (#141): too tight, and it reports a screen
 * that draws the code as clean; too loose, and it reports a screen that draws
 * nothing of the kind. Both directions are rows here.
 *
 * The rows that assert **nothing** is found are not padding. Each one is a
 * spelling this census cannot see, written down as a row so that the next person
 * to read the count knows what it is a count of.
 */
const test = require('node:test')
const assert = require('node:assert')

const { examine } = require('./label-codes')

const one = code => {
  const found = examine(code)
  assert.equal(found.length, 1, 'expected exactly one label drawing a code')
  return found[0]
}
const none = code => assert.deepEqual(examine(code), [])

test('JSX children: the code, a space, and the name', () => {
  const hit = one(`
    const Picker = () => (
      <option value={program.program_id}>
        {program.program_id} {program.program_name_th}
      </option>
    )
  `)
  assert.equal(hit.entity, 'program')
  assert.equal(hit.marker, null)
})

test('a template literal is the same label', () => {
  assert.equal(one('const label = `${entry.department_id} ${entry.department_name_th}`').entity, 'department')
})

test('a concatenation is the same label', () => {
  assert.equal(one("const label = subject.subject_id + ' ' + subject.subject_name_th").entity, 'subject')
})

test('the English name is the same label as the Thai one', () => {
  // The first version of this rule read `_name_th` only, and the seven eyebrow
  // lines above the teacher screens' headings - each one `{…subject_id}
  // {…subject_name_en}` - came back clean until a review asked by hand.
  assert.equal(
    one('const label = `${data.section.subject_id} ${data.section.subject_name_en}`').entity,
    'subject',
  )
  // Still the same entity on both halves, and still nothing else.
  none('const label = `${program.program_id} ${subject.subject_name_en}`')
  none('const label = `${row.subject_id} ${row.subject_title_en}`')
})

test('an index and a question mark are read through', () => {
  // `programs[0].program_id` and `picked?.department_id` are both in the tree.
  assert.equal(one('const label = `${programs[0].program_id} ${programs[0].program_name_th}`').entity, 'program')
  assert.equal(one('const label = `${picked?.department_id} ${picked?.department_name_th}`').entity, 'department')
})

test('a computed read is not a column this can name', () => {
  none("const label = `${row[key]} ${row.program_name_th}`")
})

test('two different entities are not a record naming itself', () => {
  none('const label = `${program.program_id} ${department.department_name_th}`')
})

test("a student's code beside their name is not this family", () => {
  // `full_name_th` does not share the prefix, and #37 says in its own words why
  // two students called กมลชนก need their codes. A rule that caught them would
  // have to be told which screens to skip, which is what #126 is about.
  none('const label = `${student.student_id} ${student.full_name_th}`')
})

test("a rubric's code beside its name is not this family either", () => {
  // `rubric_code` is not an `_id`, and the code *is* the rubric's name to the
  // people who use it.
  none('const label = `${rubric.rubric_code} ${rubric.rubric_name_th}`')
})

test('the name first is a spelling this census cannot see', () => {
  none('const label = `${program.program_name_th} ${program.program_id}`')
})

test('anything but whitespace between them is a spelling this census cannot see', () => {
  none('const label = `${program.program_id} · ${program.program_name_th}`')
})

test('a marker above the line is the way to keep one on purpose', () => {
  const hit = one(`
    const message = removing
      // label-code: the sentence names the record about to be destroyed, where
      // two curricula sharing a name is the whole reason the code is here (#93)
      ? \`ลบ \${removing.program_id} \${removing.program_name_th} ไหม\`
      : ''
  `)
  assert.equal(hit.marker.ok, true)
  assert.match(hit.marker.reason, /^the sentence names/)
})

test('among JSX children the marker has to be a JSX comment', () => {
  // The trap this row exists for: `//` between two tags is JSXText. The parser
  // sees no comment at all and the browser draws the words on the screen, so a
  // marker written that way covers nothing - which is how the first run of this
  // census reported three marked sites as bare.
  const drawn = `
    const Heading = () => (
      <h2>
        // label-code: a reason long enough to count, naming a ticket (#93)
        {offering.subject_id} {offering.subject_name_th}
      </h2>
    )
  `
  assert.equal(one(drawn).marker, null)

  const commented = `
    const Heading = () => (
      <h2>
        {/* label-code: the heading of the offering this panel is working on,
            which is the screen's identity and not a label (#93) */}
        {offering.subject_id} {offering.subject_name_th}
      </h2>
    )
  `
  assert.equal(one(commented).marker.ok, true)
})

test('a marker further above than the reach does not cover the line', () => {
  const far = `
    // label-code: a reason long enough to count, naming a ticket (#93)
    const a = 1
    const b = 2
    const c = 3
    const d = 4
    const e = 5
    const f = 6
    const label = \`\${program.program_id} \${program.program_name_th}\`
  `
  assert.equal(one(far).marker, null)
})

test('a marker that names no ticket is not a marker', () => {
  assert.equal(
    one(`
      // label-code: this one is special, as far as anybody knows
      const label = \`\${program.program_id} \${program.program_name_th}\`
    `).marker.ok,
    false
  )
})

test('a marker with no reason of its own is not a marker', () => {
  assert.equal(
    one(`
      // label-code: #93
      const label = \`\${program.program_id} \${program.program_name_th}\`
    `).marker.ok,
    false
  )
})

test('a file it cannot parse raises rather than reading as clean', () => {
  assert.throws(() => examine('const = ;'))
})
