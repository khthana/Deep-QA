/**
 * The census's own fixtures - `node --test scripts/sentences-after-a-move.test.js`.
 *
 * An instrument nobody has seen fail is the same species as the hand-kept
 * numbers it replaces (#124, #123). Four of these rows are the mistakes #202's
 * two hand counters actually made rather than mistakes somebody might make in
 * `src`: the one-line `if` above a sentence, the guard on the sentence's own
 * line, the guard below it, and #152's flag reading as a ref comparison.
 *
 * Its own fixtures passing either way is the trap (#141), so the run that
 * matters is the one against the tree with a real guard taken out: on
 * 12 October 2569, removing `SubjectStudents.add`'s guard moved the report from
 * `enclosed 35 .. marked 8 .. problems 0` to `enclosed 34 .. problems 1`,
 * naming that line.
 */
const test = require('node:test')
const assert = require('node:assert')

const { examine } = require('./sentences-after-a-move')

const sites = code => examine(code).sites
const one = code => {
  const found = sites(code)
  assert.equal(found.length, 1, 'expected exactly one sentence after an await')
  return found[0]
}

test('a sentence after an await with nothing asking anything', () => {
  const site = one(`
    async function remove() {
      await removeIt(id)
      setNotice({ error: false, message: 'done' })
    }
  `)
  assert.equal(site.guard, undefined)
  assert.equal(site.marker, null)
})

test('a sentence named first is the same site - the shape reading the literal misses', () => {
  const site = one(`
    async function add() {
      await addIt(id)
      const said = { error: false, message: 'done' }
      setNotice(said)
    }
  `)
  assert.equal(site.guard, undefined)
})

test('a sentence with no await before it cannot be late', () => {
  assert.deepEqual(
    sites(`
      function open() {
        setNotice({ error: false, message: 'ready' })
      }
    `),
    []
  )
})

test('an await that comes after the sentence is not before it', () => {
  assert.deepEqual(
    sites(`
      async function remove() {
        setNotice({ error: false, message: 'working' })
        await removeIt(id)
      }
    `),
    []
  )
})

test('a refusal is not this family', () => {
  assert.deepEqual(
    sites(`
      async function remove() {
        await removeIt(id)
        setNotice({ error: true, message: 'no' })
      }
    `),
    []
  )
})

test('a block the sentence is inside of, asking the ref', () => {
  assert.equal(
    one(`
      async function remove() {
        const sent = showing.current
        await removeIt(id)
        if (showing.current === sent) {
          setNotice({ error: false, message: 'done' })
        }
      }
    `).guard,
    'ref'
  )
})

test('the comparison is read both ways round (#141)', () => {
  assert.equal(
    one(`
      async function remove() {
        const sent = showing.current
        await removeIt(id)
        if (sent === showing.current) setNotice({ error: false, message: 'done' })
      }
    `).guard,
    'ref'
  )
})

test("a guard on the sentence's own line is a guard - what a window above cannot see", () => {
  assert.equal(
    one(`
      async function add() {
        const sent = onScreen.current
        const reloaded = await reload(said)
        if (reloaded && onScreen.current === sent) setNotice({ error: false, message: 'done' })
      }
    `).guard,
    'ref'
  )
})

test('a one-line `if` above the sentence guards its own line and not the sentence (#202)', () => {
  const site = one(`
    async function save() {
      const asked = activityId
      const answer = await saveScores(asked)
      if (onScreen.current === asked) setData(answer)
      setNotice({ error: false, message: 'saved' })
    }
  `)
  assert.equal(site.guard, undefined)
  assert.equal(site.marker, null)
})

test('a block above the sentence is the same mistake, one brace along', () => {
  assert.equal(
    one(`
      async function add() {
        const asked = user.user_id
        const { roles } = await grantRole(asked, draft)
        if (onScreen.current === asked) {
          setGrants(roles)
          setDraft(EMPTY)
        }
        setNotice({ error: false, message: 'granted' })
      }
    `).guard,
    undefined
  )
})

test('the comparison bound to a name the test reads is one guard in two lines', () => {
  assert.equal(
    one(`
      async function save(draft) {
        const sent = showing.current
        const { offering } = await createOffering(draft)
        const mine = showing.current === sent
        if (mine) setNotice({ error: false, message: 'created' })
      }
    `).guard,
    'ref by name'
  )
})

test("#152's flag is not a guard - it means the read was not refused", () => {
  const site = one(`
    async function save() {
      await saveWeights(draft)
      const reloaded = await load(() => onScreen.current === load)
      if (reloaded) setNotice({ error: false, message: 'saved' })
    }
  `)
  assert.equal(site.guard, undefined)
  assert.equal(site.marker, null)
})

test('a predicate the function is handed and calls is a guard (#133)', () => {
  assert.equal(
    one(`
      async function after(isCurrent) {
        await writeIt()
        if (isCurrent()) setNotice({ error: false, message: 'done' })
      }
    `).guard,
    'flag'
  )
})

test('a call to something that is not a parameter is not that question', () => {
  assert.equal(
    one(`
      async function after() {
        await writeIt()
        if (stillHere()) setNotice({ error: false, message: 'done' })
      }
    `).guard,
    undefined
  )
})

test('the question asked by leaving rather than by enclosing', () => {
  assert.equal(
    one(`
      async function remove() {
        const sent = showing.current
        await removeIt(id)
        if (showing.current !== sent) return
        setNotice({ error: false, message: 'done' })
      }
    `).guard,
    'ref by leaving'
  )
})

test('an `if` that leaves and asks nothing of the ref leaves the sentence bare', () => {
  assert.equal(
    one(`
      async function remove() {
        await removeIt(id)
        if (!data) return
        setNotice({ error: false, message: 'done' })
      }
    `).guard,
    undefined
  )
})

test('a marker with a reason and a ticket', () => {
  const site = one(`
    async function remove() {
      await removeIt(id)
      // sentence-after-a-move: the notice is about the write the person ordered
      // and not about the panel in front of them (#139)
      setNotice({ error: false, message: 'done' })
    }
  `)
  assert.equal(site.guard, undefined)
  assert.equal(site.marker.ok, true)
  assert.match(site.marker.reason, /#139/)
})

test('a marker that names no ticket is not a marker yet', () => {
  assert.equal(
    one(`
      async function remove() {
        await removeIt(id)
        // sentence-after-a-move: it just does not matter here, honestly
        setNotice({ error: false, message: 'done' })
      }
    `).marker.ok,
    false
  )
})

test('a marker directly above the declaration counts - where this tree writes reasons', () => {
  assert.equal(
    one(`
      // sentence-after-a-move: the form replaces the table and disables every
      // control while the write is out, so nothing can take the screen (#97)
      const save = async draft => {
        await updateIt(draft)
        setNotice({ error: false, message: 'saved' })
      }
    `).marker.ok,
    true
  )
})
