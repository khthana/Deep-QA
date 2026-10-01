/**
 * The census's own fixtures - `node --test scripts/superseded-answers.test.js`.
 *
 * An instrument nobody has seen fail is the same species as the hand-kept
 * numbers it replaces (#124, #123): every answer it can give is asked for here
 * of a snippet small enough to read, and three of these rows are the mistakes
 * its own first draft made rather than mistakes somebody might make in `src`.
 */
const test = require('node:test')
const assert = require('node:assert')

const { examine } = require('./superseded-answers')

const sites = code => examine(code).sites
const one = code => {
  const found = sites(code)
  assert.equal(found.length, 1, 'expected exactly one drawing site')
  return found[0]
}

test('an answer handed straight to a setter, with nothing to guard it', () => {
  const site = one(`
    async function load() {
      setRows(await listRows(id))
    }
  `)
  assert.equal(site.guard, undefined)
  assert.equal(site.marker, null)
})

test('an answer that is named first is the same site - the shape a grep misses', () => {
  const site = one(`
    async function load() {
      const { rows } = await listRows(id)
      setRows(rows)
    }
  `)
  assert.equal(site.guard, undefined)
})

test('an answer nobody draws is not this family at all', () => {
  assert.deepEqual(
    sites(`
      async function download() {
        saveAsFile(await fetchTemplate(), name)
      }
    `),
    []
  )
})

test('two awaits on one line are one place where one answer is drawn', () => {
  const found = sites(`
    async function upload(file) {
      const result = await send(await file.text())
      setReport(result)
    }
  `)
  assert.equal(found.length, 1)
})

test('a predicate the function is handed and calls is a guard', () => {
  assert.equal(
    one(`
      async function load(isCurrent) {
        const { rows } = await listRows(id)
        if (isCurrent()) setRows(rows)
      }
    `).guard,
    'flag'
  )
})

test('a parameter called for its effect is not a guard', () => {
  // `GrantsPanel` read as guarded with every `isCurrent()` in it replaced by
  // `true`, because `onError(error)` is a call to a parameter as well. A census
  // that answers *guarded* whatever the code says is the one thing this must not
  // be, so the value has to decide something.
  assert.equal(
    one(`
      async function load(onError, onDone) {
        const { rows } = await listRows(id)
        setRows(rows)
        onDone(rows)
      }
    `).guard,
    undefined
  )
})

test('being an operand of || is not deciding anything', () => {
  // The looseness one layer down from the one above: `cached || onDone()` has a
  // parameter called inside a logical operator, and counting the operator itself
  // reads it as a guard. Both of these measured the same on the real tree -
  // 54 guarded sites either way - so nothing here was relying on either reading.
  assert.equal(
    one(`
      async function load(onDone, cached) {
        const { rows } = await listRows(id)
        setRows(rows)
        cached || onDone(rows)
      }
    `).guard,
    undefined
  )
  assert.equal(
    one(`
      async function load(isCurrent) {
        const { rows } = await listRows(id)
        if (stale || isCurrent()) setRows(rows)
      }
    `).guard,
    'flag'
  )
})

test('a call to something that is not a parameter is not a guard', () => {
  assert.equal(
    one(`
      async function load() {
        const { rows } = await listRows(id)
        if (stillHere()) setRows(rows)
      }
    `).guard,
    undefined
  )
})

test('a ticket compared against a ref is a guard, written either way round', () => {
  const left = `
    async function load() {
      const ticket = latest.current + 1
      const { rows } = await listRows(id)
      if (ticket !== latest.current) return
      setRows(rows)
    }
  `
  // The same guard with the operands swapped. Matching only the first of these
  // is what made the first pass at this census report two guarded screens as
  // bare (#141), which is why both are rows here and not one.
  const right = left.replace('ticket !== latest.current', 'latest.current !== ticket')
  assert.equal(one(left).guard, 'ref')
  assert.equal(one(right).guard, 'ref')
})

test('a marker in the comment above a useCallback is found, JSDoc and all', () => {
  const site = one(`
    /**
     * superseded-answer: nothing on the screen can ask for a second one of
     * these while this is out (#141)
     */
    const load = useCallback(async () => {
      const { rows } = await listRows(id)
      setRows(rows)
    }, [id])
  `)
  assert.ok(site.marker)
  assert.equal(site.marker.ok, true)
  assert.match(site.marker.reason, /^nothing on the screen/)
})

test('a marker is read to the end of its comment, not to the end of its line', () => {
  // The reason is a paragraph, and the ticket number is usually in its last
  // sentence: reading one line rejected all six of the real markers.
  assert.equal(
    one(`
      async function load() {
        // superseded-answer: there is no second request for this answer to be
        // the wrong one of, because the call is handed nothing at all (#133)
        const { rows } = await listRows()
        setRows(rows)
      }
    `).marker.ok,
    true
  )
})

test('a marker that names no ticket is not a marker', () => {
  assert.equal(
    one(`
      async function load() {
        // superseded-answer: cannot happen as far as anybody knows
        const { rows } = await listRows(id)
        setRows(rows)
      }
    `).marker.ok,
    false
  )
})

test('a marker with no reason of its own is not a marker', () => {
  assert.equal(
    one(`
      async function load() {
        // superseded-answer: #141
        const { rows } = await listRows(id)
        setRows(rows)
      }
    `).marker.ok,
    false
  )
})

test("a marker on the function above does not cover the one below it", () => {
  // The two are separated by code, so the comment leads only the first.
  const found = sites(`
    /** superseded-answer: this one is the unreachable one, measured (#141) */
    async function first() {
      const { rows } = await listRows(id)
      setRows(rows)
    }
    async function second() {
      const { rows } = await listRows(id)
      setRows(rows)
    }
  `)
  assert.equal(found.length, 2)
  assert.equal(found[0].marker.ok, true)
  assert.equal(found[1].marker, null)
})

test('a file it cannot parse raises rather than reading as clean', () => {
  assert.throws(() => examine('const = ;'))
})
