/**
 * The content-title census's own fixtures - `node --test scripts/content-titles.test.js`.
 *
 * Both directions (#141). Its proof on real sites - 112 problems at the commit
 * before #309, `Plos.js` given its old `h1` back, and a new file in `pages/`
 * nobody had touched - is in `docs/lessons.md` §#309 (#230).
 */
const test = require('node:test')
const assert = require('node:assert')

const { examine } = require('./content-titles')

test('a screen with ContentTitle and CARD is a titled card', () => {
  const found = examine(
    // eslint-disable-next-line no-template-curly-in-string
    'const S = () => <div className={`space-y-4 ${CARD}`}><ContentTitle icon={I}>x</ContentTitle></div>'
  )
  assert.deepEqual(found.rawH1, [])
  assert.equal(found.titled, true)
  assert.equal(found.carded, true)
})

test('the four card classes written out count as the card', () => {
  assert.equal(examine('const S = () => <div className="space-y-6 rounded-xl border bg-white p-6 shadow" />').carded, true)
})

test('three of the four do not', () => {
  assert.equal(examine('const S = () => <div className="rounded-xl bg-white shadow" />').carded, false)
  assert.equal(examine('const S = () => <div className="rounded-xl bg-white p-6 shadow-sm" />').carded, false)
})

test('a hand-written h1 is reported by its line, even beside ContentTitle', () => {
  const found = examine('const S = () => (\n  <div>\n    <ContentTitle>x</ContentTitle>\n    <h1>y</h1>\n  </div>\n)')
  assert.deepEqual(found.rawH1, [4])
})

test('an h2 is not a title', () => {
  const found = examine('const S = () => <h2>x</h2>')
  assert.deepEqual(found.rawH1, [])
  assert.equal(found.titled, false)
})

test('a marker run over several // lines is read whole (#233)', () => {
  const found = examine('const S = () => null\n// content-title: not a screen, the\n// shell (#309).\n')
  assert.equal(found.marker.ok, true)
})

test('a marker with no ticket is not ok', () => {
  assert.equal(examine('// content-title: not a screen\nconst S = () => null').marker.ok, false)
})
