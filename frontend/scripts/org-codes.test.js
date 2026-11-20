/**
 * The organisation-code census's own fixtures - `node --test scripts/org-codes.test.js`.
 *
 * Both directions a rule like this goes wrong are rows (#141): too tight, and a
 * screen that draws a code reads clean; too loose, and a React key or a file
 * name reads as a label. The rows that assert **nothing** is found are the
 * spellings this census cannot see, so the next reader of the count knows what
 * it is a count of. Its proof on real sites - a marker removed from
 * `Programs.js`, a code put back into `Students.js`, and the three sites #294
 * fixed read at `HEAD` - is in `docs/lessons.md` §#294, not here (#230).
 */
const test = require('node:test')
const assert = require('node:assert')

const { examine } = require('./org-codes')

const one = code => {
  const found = examine(code)
  assert.equal(found.length, 1, 'expected exactly one drawn code')
  return found[0]
}
const none = code => assert.deepEqual(examine(code), [])

test('a JSX child that is the code alone', () => {
  const hit = one('const Row = () => <p>หลักสูตร {offering.program_id}</p>')
  assert.equal(hit.column, 'program_id')
  assert.equal(hit.fallback, false)
  assert.equal(hit.marker, null)
})

test('a template holding Thai is a sentence, and the code in it is drawn', () => {
  assert.equal(one('const s = `ออกจากหลักสูตร ${removing.program_id} ใช่หรือไม่`').column, 'program_id')
})

test('every one of the four columns', () => {
  for (const name of ['program_id', 'department_id', 'faculty_id', 'scope_id'])
    assert.equal(one(`const C = () => <td>{row.${name}}</td>`).column, name)
})

test('both branches of a conditional are drawn', () => {
  const found = examine('const C = () => <td>{a ? row.program_id : row.department_id}</td>')
  assert.deepEqual(found.map(hit => hit.column), ['program_id', 'department_id'])
})

test('a code after a name, in brackets, is drawn', () => {
  // The shape #93's census could not ask about and #294 found by hand.
  assert.equal(one('const s = `ภาควิชา · ${scope.label} (${scope.scope_id})`').column, 'scope_id')
})

test('the code as a name\'s fallback is counted apart and needs no marker', () => {
  const hit = one('const C = () => <td>{student.program_name_th ?? student.program_id}</td>')
  assert.equal(hit.fallback, true)
  assert.equal(hit.marker, null)
})

test('a template in a drawn place is drawn, Thai or not - the fallback with a space', () => {
  const hit = one('const C = () => <p>{programName ?? ` ${offering.program_id}`}</p>')
  assert.equal(hit.fallback, true)
})

test('a Thai template inside a drawn expression is counted once', () => {
  assert.equal(examine('const C = () => <p>{a ? `ลบ ${row.program_id}` : null}</p>').length, 1)
})

test('a marker within reach, with a reason and a ticket, is read', () => {
  const hit = one(`
    const C = () => (
      <td>
        {/* org-code: the record's own key on the screen that manages it (#294) */}
        {program.program_id}
      </td>
    )
  `)
  assert.equal(hit.marker.ok, true)
})

test('a run of // lines is one marker, the ticket on its last line', () => {
  const hit = one(`
    const s = ok
      // org-code: the screen that manages departments keeps the code in
      // this question, which names the record about to go (#294)
      ? \`ต้องการลบภาควิชา \${removing.department_id} ใช่หรือไม่\`
      : ''
  `)
  assert.equal(hit.marker.ok, true)
})

test('a marker with no ticket is not a marker', () => {
  const hit = one(`
    // org-code: because it is the key and the key is what it is
    const C = () => <td>{program.program_id}</td>
  `)
  assert.equal(hit.marker.ok, false)
})

test('a marker too far above is not this hit\'s', () => {
  const hit = one(`
    // org-code: the record's own key on the screen that manages it (#294)
    const a = 1
    const b = 2
    const c = 3
    const d = 4
    const e = 5
    const f = 6
    const C = () => <td>{program.program_id}</td>
  `)
  assert.equal(hit.marker, null)
})

// --- what is not a drawn code ------------------------------------------------

test('a React key is not drawn', () => {
  none('const C = () => <tr key={`${grant.role_id}-${grant.scope_id}`}><td /></tr>')
})

test('an attribute is not a JSX child (and is not seen - a limit)', () => {
  none('const C = () => <option value={program.program_id} title={program.program_id} />')
})

test('a template with no Thai in it is not a sentence - the PDF file name', () => {
  none('doc.save(`plo-mapping-${program.program_id}.pdf`)')
})

test('a call is handed the code, it does not draw it', () => {
  none('const C = () => <td>{nameOf(plo.program_id)}</td>')
})

test('a column outside the four is not an organisation unit', () => {
  none('const C = () => <td>{student.student_id} {subject.subject_id}</td>')
})

test('a code drawn through a helper is not seen - a limit', () => {
  none('const scopeOf = grant => grant.scope_id')
})

test('a concatenation is not seen - a limit', () => {
  none("const s = 'หลักสูตร ' + program.program_id")
})
