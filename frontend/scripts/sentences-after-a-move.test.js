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

/**
 * #226 - what the ref it found can tell apart.
 *
 * `enclosed (ref)` says a guard is there; it never said the ref could tell one
 * subject from another. These rows are the two shapes this tree writes and the
 * two it does not, so the label is read off the writes rather than off a list
 * of ref names (#126).
 */

test('a ref written only where something opens says *something opened*', () => {
  const site = one(`
    function Screen() {
      const showing = useRef(null)
      const remove = async () => {
        const sent = showing.current
        await removeIt(id)
        if (showing.current === sent) setNotice({ error: false, message: 'done' })
      }
      return <button onClick={() => { showing.current = {} }}>แก้ไข</button>
    }
  `)
  assert.equal(site.guard, 'ref')
  assert.equal(site.tells, 'opened')
})

test('a ref written with the loader can tell one question from another', () => {
  const site = one(`
    function Screen() {
      const onScreen = useRef(load)
      useEffect(() => {
        onScreen.current = load
      }, [load])
      const add = async () => {
        const sent = onScreen.current
        const reloaded = await reload(said)
        if (reloaded && onScreen.current === sent) setNotice({ error: false, message: 'done' })
      }
    }
  `)
  assert.equal(site.guard, 'ref')
  assert.equal(site.tells, 'position')
})

test('a name bound to a fresh object is the same sentinel, one line along', () => {
  assert.equal(
    one(`
      function Screen() {
        const showing = useRef(null)
        const openEditor = async plo => {
          const ask = {}
          showing.current = ask
          await getPlo(plo.id)
        }
        const confirmRemoval = async () => {
          const sent = showing.current
          await deleteIt(id)
          if (showing.current === sent) setNotice({ error: false, message: 'done' })
        }
      }
    `).tells,
    'opened'
  )
})

test('a ref written both ways is neither, and the instrument says so', () => {
  assert.equal(
    one(`
      function Screen() {
        const showing = useRef(null)
        const openEditor = () => {
          showing.current = {}
        }
        const onPage = next => {
          showing.current = next
        }
        const remove = async () => {
          const sent = showing.current
          await removeIt(id)
          if (showing.current === sent) setNotice({ error: false, message: 'done' })
        }
      }
    `).tells,
    'mixed'
  )
})

test('a ref nothing in the file writes cannot be read either way', () => {
  assert.equal(
    one(`
      async function remove() {
        const sent = showing.current
        await removeIt(id)
        if (showing.current === sent) setNotice({ error: false, message: 'done' })
      }
    `).tells,
    'unwritten'
  )
})

test('the comparison bound to a name carries the same question about its ref', () => {
  const site = one(`
    function Screen() {
      const showing = useRef(null)
      const open = () => {
        showing.current = {}
      }
      const save = async draft => {
        const sent = showing.current
        const { offering } = await createOffering(draft)
        const mine = showing.current === sent
        if (mine) setNotice({ error: false, message: 'created' })
      }
    }
  `)
  assert.equal(site.guard, 'ref by name')
  assert.equal(site.tells, 'opened')
})

test('a predicate the function is handed is not a ref, so there is nothing to classify', () => {
  const site = one(`
    async function after(isCurrent) {
      await writeIt()
      if (isCurrent()) setNotice({ error: false, message: 'done' })
    }
  `)
  assert.equal(site.guard, 'flag')
  assert.equal(site.tells, undefined)
})


/**
 * #226's own species, found by the review of #226 - a ref born empty in a shape
 * `isSentinel` did not list read as a value, which is the strongest label.
 *
 * `useRef()` is the commonest of them and the one that would have arrived
 * silently: nothing in the tree is written that way today, which is why the
 * figures did not move when this was repaired, and the fixtures are what says
 * the repair is there (#141).
 */

const bornEmpty = init => `
  function Screen() {
    const showing = useRef(${init})
    const remove = async () => {
      const sent = showing.current
      await removeIt(id)
      if (showing.current === sent) setNotice({ error: false, message: 'done' })
    }
  }
`

test('a ref born with no argument at all carries no position', () => {
  assert.equal(one(bornEmpty('')).tells, 'opened')
})

test('a ref born false, zero or empty carries no position either', () => {
  for (const init of ['false', 'true', '0', "''", '``']) {
    assert.equal(one(bornEmpty(init)).tells, 'opened', init)
  }
})

test('a ref born holding a fresh empty collection is the species of `{}`', () => {
  for (const init of ['new Map()', 'new Set()', 'new WeakMap()']) {
    assert.equal(one(bornEmpty(init)).tells, 'opened', init)
  }
})

test('a ref born holding a value that is not empty still carries one', () => {
  for (const init of ['1', "'page-2'", 'new Map(rows)', 'load']) {
    assert.equal(one(bornEmpty(init)).tells, 'position', init)
  }
})
