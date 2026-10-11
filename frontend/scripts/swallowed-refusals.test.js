/**
 * The census's own fixtures — `node --test scripts/swallowed-refusals.test.js`.
 *
 * Every answer the instrument can give, asked of a snippet small enough to
 * read. Two of these rows are the mistakes its own drafting found rather than
 * mistakes somebody might make in `src`: a notice built as a name and handed on
 * (`SubjectStudents`), and a loader whose `catch` rethrows, which is not this
 * family at all.
 *
 * Its own fixtures pass either way until a real site is broken with it (#141),
 * so the four rows at the end are the blind spots this script's docstring
 * claims, held here as claims rather than as prose: a loader passed in as a
 * parameter, a `catch` the loader does not own, one setter's name, and a
 * sentence put on the screen some other way.
 */
const test = require('node:test')
const assert = require('node:assert')

const { examine } = require('./swallowed-refusals')

const sites = code => examine(code).sites
const one = code => {
  const found = sites(code)
  assert.equal(found.length, 1, 'expected exactly one call of a swallowing loader')
  return found[0]
}

/** A loader of the shape every one of these screens has, before #152. */
const SWALLOWS = `
  const load = async isCurrent => {
    try {
      const answer = await getRows(id)
      if (isCurrent()) setData(answer)
    } catch (error) {
      if (isCurrent()) setNotice({ error: true, message: error.message })
    }
  }
`

/** The same loader after #152: it says whether it drew. */
const ANSWERS = `
  const load = async isCurrent => {
    try {
      const answer = await getRows(id)
      if (isCurrent()) setData(answer)
      return true
    } catch (error) {
      if (isCurrent()) setNotice({ error: true, message: error.message })
      return false
    }
  }
`

test('a success sentence said around a loader whose answer nobody reads', () => {
  const site = one(`
    ${SWALLOWS}
    const save = async draft => {
      await createRow(draft)
      setNotice({ error: false, message: 'saved' })
      await load(() => true)
    }
  `)
  assert.equal(site.read, undefined)
  assert.equal(site.marker, null)
  assert.equal(site.loader, 'load')
})

test('the answer read in an `if` is the fix #152 made', () => {
  const site = one(`
    ${ANSWERS}
    const save = async draft => {
      await createRow(draft)
      if (await load(() => true)) setNotice({ error: false, message: 'saved' })
    }
  `)
  assert.equal(site.read, 'directly')
})

test('the answer bound to a name and read below it is read — the shape #201 wrote', () => {
  const site = one(`
    ${ANSWERS}
    const save = async draft => {
      await createRow(draft)
      const drew = await load(() => true)
      if (drew) setNotice({ error: false, message: 'saved' })
    }
  `)
  assert.equal(site.read, 'by name')
})

test('a name read through `!` and `&&` is still read', () => {
  const site = one(`
    ${ANSWERS}
    const save = async draft => {
      const sent = showing.current
      const drew = await load(() => true)
      if (drew && showing.current === sent) setNotice({ error: false, message: 'saved' })
    }
  `)
  assert.equal(site.read, 'by name')
})

test('an answer handed back by `return` is read by whoever asked', () => {
  const site = one(`
    ${ANSWERS}
    const save = async draft => {
      setNotice({ error: false, message: 'saved' })
      return await load(() => true)
    }
  `)
  assert.equal(site.read, 'directly')
})

test('a name awaited for its effect and then used for something else is not read', () => {
  const site = one(`
    ${SWALLOWS}
    const save = async draft => {
      setNotice({ error: false, message: 'saved' })
      const drew = await load(() => true)
      record(drew)
    }
  `)
  assert.equal(site.read, undefined)
})

test('a notice built as a name and handed on is a success sentence', () => {
  const site = one(`
    ${SWALLOWS}
    const save = async draft => {
      const said = { error: false, message: 'saved' }
      setNotice(said)
      await load(() => true)
    }
  `)
  assert.equal(site.read, undefined)
  assert.equal(site.marker, null)
})

test('a function that only says a refusal is not in this family', () => {
  assert.deepEqual(
    sites(`
      ${SWALLOWS}
      const save = async draft => {
        try {
          await createRow(draft)
        } catch (error) {
          setNotice({ error: true, message: error.message })
        }
        await load(() => true)
      }
    `),
    []
  )
})

test('a loader that reports by throwing is not this family — the handler catches it', () => {
  assert.deepEqual(
    sites(`
      const load = async isCurrent => {
        try {
          setData(await getRows(id))
        } catch (error) {
          report(error)
          throw error
        }
      }
      const save = async draft => {
        await createRow(draft)
        setNotice({ error: false, message: 'saved' })
        await load(() => true)
      }
    `),
    []
  )
})

test('an await of something declared nowhere here is not a site', () => {
  assert.deepEqual(
    sites(`
      const save = async draft => {
        setNotice({ error: false, message: 'saved' })
        await refreshEverything()
      }
    `),
    []
  )
})

test('a marker with a reason and a ticket closes the site', () => {
  const site = one(`
    ${SWALLOWS}
    const save = async draft => {
      // swallowed-refusal: the loader draws nothing a saved sentence could
      // contradict, so it speaks first (#152)
      setNotice({ error: false, message: 'saved' })
      await load(() => true)
    }
  `)
  assert.equal(site.marker.ok, true)
  assert.match(site.marker.reason, /#152/)
  assert.match(site.marker.reason, /contradict, so it speaks first/)
})

test('a marker above the declaration counts — the shape `useCallback` forces', () => {
  const site = one(`
    ${SWALLOWS}
    // swallowed-refusal: this one is measured elsewhere and may speak (#152)
    const save = React.useCallback(async draft => {
      setNotice({ error: false, message: 'saved' })
      await load(() => true)
    }, [])
  `)
  assert.equal(site.marker.ok, true)
})

test('a marker with no ticket number is a problem of its own', () => {
  const site = one(`
    ${SWALLOWS}
    const save = async draft => {
      // swallowed-refusal: there is a good reason and it is written at length
      setNotice({ error: false, message: 'saved' })
      await load(() => true)
    }
  `)
  assert.equal(site.marker.ok, false)
})

test('a marker too short to be a reason is a problem of its own', () => {
  const site = one(`
    ${SWALLOWS}
    const save = async draft => {
      // swallowed-refusal: see #152
      setNotice({ error: false, message: 'saved' })
      await load(() => true)
    }
  `)
  assert.equal(site.marker.ok, false)
})

test('two awaits of the loader on one line are one site', () => {
  const found = sites(`
    ${SWALLOWS}
    const save = async draft => {
      setNotice({ error: false, message: 'saved' })
      await load(() => true); await load(() => true)
    }
  `)
  assert.equal(found.length, 1)
})

test('a notice shape it cannot classify is reported rather than dropped', () => {
  const found = examine(`
    ${SWALLOWS}
    const save = async draft => {
      setNotice({ error: false, message: 'saved' })
      setNotice(error.message)
      await load(() => true)
    }
  `)
  assert.equal(found.sites.length, 1)
  assert.equal(found.unreadable.length, 1)
})

test('clearing the notice says nothing about success', () => {
  assert.deepEqual(
    sites(`
      ${SWALLOWS}
      const save = async draft => {
        setNotice(null)
        await load(() => true)
      }
    `),
    []
  )
})

test('blind spot: a loader arriving as a parameter has no declaration to read', () => {
  assert.deepEqual(
    sites(`
      const save = async (draft, load) => {
        setNotice({ error: false, message: 'saved' })
        await load(() => true)
      }
    `),
    []
  )
})

test('blind spot: a `catch` the loader does not own counts as the loader’s', () => {
  const site = one(`
    const load = async isCurrent => {
      const retry = async () => {
        try {
          await getRows(id)
        } catch (error) {
          report(error)
        }
      }
      setData(await retry())
      return true
    }
    const save = async draft => {
      setNotice({ error: false, message: 'saved' })
      await load(() => true)
    }
  `)
  assert.equal(site.read, undefined)
})

test('blind spot: a sentence put on the screen by another setter is invisible', () => {
  assert.deepEqual(
    sites(`
      ${SWALLOWS}
      const save = async draft => {
        setSaved('saved')
        await load(() => true)
      }
    `),
    []
  )
})
