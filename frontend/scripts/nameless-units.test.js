/**
 * The nameless-unit census's own fixtures - `node --test scripts/nameless-units.test.js`.
 *
 * Both directions (#141): too tight, and an option with no words on it reads
 * clean; too loose, and a name behind its own fallback reads as bare. The rows
 * that assert **nothing** is found are the spellings this census cannot see.
 * Its proof on real sites - eighteen bare reads at the commit before #298, a
 * fallback taken out of `SubjectStudents.js`, a file nobody had touched, and a
 * marker taken out of `Programs.js` - is in `docs/lessons.md` §#298 (#230).
 */
const test = require('node:test')
const assert = require('node:assert')

const { examine } = require('./nameless-units')

const one = code => {
  const found = examine(code)
  assert.equal(found.length, 1, 'expected exactly one drawn name')
  return found[0]
}
const none = code => assert.deepEqual(examine(code), [])

test('an option that is the name alone is bare', () => {
  const hit = one('const O = () => <option value={e.program_id}>{e.program_name_th}</option>')
  assert.equal(hit.column, 'program_name_th')
  assert.equal(hit.shape, 'bare')
  assert.equal(hit.marker, null)
})

test('a template holding Thai is a sentence, and the name in it is drawn', () => {
  assert.equal(one('const s = `ต้องการลบภาควิชา ${r.department_id} ${r.department_name_th} ใช่หรือไม่`').shape, 'bare')
})

test('the left of ?? or || is a name with a fallback', () => {
  assert.equal(one('const C = () => <td>{s.program_name_th ?? s.program_id}</td>').shape, 'fallback')
  assert.equal(one('const C = () => <td>{s.department_name_th || s.department_id}</td>').shape, 'fallback')
})

test('a ?: whose test reads the same column guards its consequent', () => {
  const hit = one(
    'const s = `ต้องการลบหลักสูตร ${r.program_id}${r.program_name_th ? ` ${r.program_name_th}` : ""} ใช่หรือไม่`'
  )
  assert.equal(hit.shape, 'tested')
})

test('a ?: whose test reads something else does not', () => {
  assert.equal(one('const C = () => <p>{shown ? r.program_name_th : "—"}</p>').shape, 'bare')
})

test('a marker with a reason and a ticket is read', () => {
  const hit = one(`const C = () => (
    <td>
      {/* unit-name: the managing table, its code beside it (#298) */}
      {r.department_name_th}
    </td>
  )`)
  assert.equal(hit.marker.ok, true)
})

test('a marker with no ticket is not enough', () => {
  const hit = one(`const C = () => (
    <td>
      {/* unit-name: the managing table, its code beside it */}
      {r.department_name_th}
    </td>
  )`)
  assert.equal(hit.marker.ok, false)
})

// What it cannot see, asserted so the count says what it is a count of.
test('a name handed to a call is not drawn here', () => none('const O = () => <option>{programNamed(e)}</option>'))
test('a name in an attribute is not seen', () => none('const C = () => <Panel name={o.program_name_th} />'))
test('a template with no Thai is not a sentence', () => none('const k = `${o.program_name_th}-key`'))
test('faculty_name_th is NOT NULL and not in the population', () =>
  none('const C = () => <td>{f.faculty_name_th}</td>'))
