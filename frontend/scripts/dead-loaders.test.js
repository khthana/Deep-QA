/**
 * The census's own fixtures — `node --test scripts/dead-loaders.test.js`.
 *
 * Every answer the instrument can give, asked of a snippet small enough to
 * read. Two of these rows are the mistakes its own drafting found rather than
 * mistakes somebody might make in `src`: a fresh read whose guard still names
 * the dead loader, and a loader read off the ref under a *second* name
 * (`Offerings.js` calls one `reader`, so that a one-line mutant anchor is not
 * matched at two sites — #154).
 *
 * Its own fixtures pass either way until a real site is broken with it (#141),
 * so the last four rows here are the blind spots the script's docstring claims,
 * held as claims rather than as prose: a ref holding a coordinate instead of a
 * loader, a loader no ref holds, a loader handed in as a parameter, and a ref
 * shape the script cannot classify — which is a problem and not a pass.
 *
 * The whole-corpus red is recorded in the script's docstring: `Departments.js`
 * and `Users.js` put back to the closed-over `load`, 2 problems, by file and
 * line, exit 1.
 */
const test = require('node:test')
const assert = require('node:assert')

const { examine } = require('./dead-loaders')

const one = code => {
  const found = examine(code)
  assert.equal(found.sites.length, 1, 'expected exactly one call of a replaced loader')
  return found.sites[0]
}

/** The loader every one of these screens declares, keyed on what it reads. */
const LOADER = `
  const load = useCallback(
    async isCurrent => {
      try {
        const answer = await getRows(page)
        if (isCurrent()) setData(answer)
        return true
      } catch (error) {
        if (isCurrent()) setNotice({ error: true, message: error.message })
        return false
      }
    },
    [page]
  )
`

/** The effect that reads on arrival, and the one that keeps the live copy. */
const MOUNT = `
  useEffect(() => {
    let current = true
    load(() => current)
    return () => {
      current = false
    }
  }, [load])

  const onScreen = useRef(load)
  useEffect(() => {
    onScreen.current = load
  }, [load])
`

test('a handler that calls the loader it closed over is the defect', () => {
  const site = one(`
    ${LOADER}
    ${MOUNT}
    const remove = async id => {
      await destroy(id)
      const reloaded = await load(() => onScreen.current === load)
      if (reloaded) setNotice({ error: false, message: 'removed' })
    }
  `)
  assert.equal(site.read, 'from the closure')
  assert.equal(site.loader, 'load')
  assert.equal(site.marker, null)
})

test('the live loader read off the ref is the fix #208 made', () => {
  const site = one(`
    ${LOADER}
    ${MOUNT}
    const remove = async id => {
      await destroy(id)
      const drawing = onScreen.current
      const reloaded = await drawing(() => onScreen.current === drawing)
      if (reloaded) setNotice({ error: false, message: 'removed' })
    }
  `)
  assert.equal(site.read, 'through onScreen')
  assert.equal(site.loader, 'drawing')
  assert.equal(site.mismatch, false)
})

test('the name the ref is read under is not part of the claim', () => {
  const site = one(`
    ${LOADER}
    ${MOUNT}
    const copy = async id => {
      await duplicate(id)
      const reader = onScreen.current
      await reader(() => onScreen.current === reader)
    }
  `)
  assert.equal(site.read, 'through onScreen')
  assert.equal(site.loader, 'reader')
  assert.equal(site.mismatch, false)
})

test('the guard is read both ways round', () => {
  const site = one(`
    ${LOADER}
    ${MOUNT}
    const remove = async id => {
      await destroy(id)
      const drawing = onScreen.current
      await drawing(() => drawing === onScreen.current)
    }
  `)
  assert.equal(site.mismatch, false)
})

test('a fresh read guarded against the dead loader is the two halves disagreeing', () => {
  const site = one(`
    ${LOADER}
    ${MOUNT}
    const remove = async id => {
      await destroy(id)
      const drawing = onScreen.current
      await drawing(() => onScreen.current === load)
    }
  `)
  assert.equal(site.read, 'through onScreen')
  assert.equal(site.guard, 'load')
  assert.equal(site.mismatch, true)
})

test('the read inside the effect keyed on the loader is not a site', () => {
  const found = examine(`
    ${LOADER}
    ${MOUNT}
  `)
  assert.equal(found.sites.length, 0)
  assert.equal(found.mounts.length, 1)
  assert.equal(found.loaders, 1)
  assert.equal(found.refs, 1)
})

test('a hook whose dependencies do not name the loader is not its own effect', () => {
  const site = one(`
    ${LOADER}
    ${MOUNT}
    useEffect(() => {
      load(() => true)
    }, [page])
  `)
  assert.equal(site.read, 'from the closure')
})

test('a callback handed to a child is a site, the wait being the child’s', () => {
  const site = one(`
    ${LOADER}
    ${MOUNT}
    const panel = (
      <ImportPanel
        onImported={() => {
          if (page === 1) load(() => onScreen.current === load)
          else setPage(1)
        }}
      />
    )
  `)
  assert.equal(site.read, 'from the closure')
})

test('a marker with a reason and a ticket licences a stale read', () => {
  const found = examine(`
    ${LOADER}
    ${MOUNT}
    const remove = async id => {
      // dead-loader: nothing on this screen can move it while the removal is
      // out, the dialog trapping focus (#999)
      await destroy(id)
      await load(() => onScreen.current === load)
    }
  `)
  assert.equal(found.sites.length, 1)
  assert.ok(found.sites[0].marker.ok)
  assert.match(found.sites[0].marker.reason, /trapping focus/)
})

test('a marker that names no ticket is not a reason', () => {
  const site = one(`
    ${LOADER}
    ${MOUNT}
    const remove = async id => {
      // dead-loader: nothing can move this screen while the removal is out
      await destroy(id)
      await load(() => onScreen.current === load)
    }
  `)
  assert.equal(site.marker.ok, false)
})

test('a marker above the declaration is the function’s own', () => {
  const site = one(`
    ${LOADER}
    ${MOUNT}
    // dead-loader: the screen cannot move while this is out, the route holding
    // it open (#999)
    const remove = async id => {
      await destroy(id)
      await load(() => onScreen.current === load)
    }
  `)
  assert.ok(site.marker.ok)
})

// The blind spots the docstring claims, as claims.

test('a ref holding a coordinate instead of a loader puts nothing in the population', () => {
  const found = examine(`
    ${LOADER}
    useEffect(() => {
      let current = true
      load(() => current)
      return () => {
        current = false
      }
    }, [load])

    const onScreen = useRef(program)
    useEffect(() => {
      onScreen.current = program
    }, [program])

    const remove = async id => {
      await destroy(id)
      await load(() => onScreen.current === program)
    }
  `)
  assert.equal(found.loaders, 0)
  assert.equal(found.sites.length, 0)
  assert.equal(found.unreadable.length, 0)
})

test('a coordinate built by a call is a value, not an unreadable shape', () => {
  const found = examine(`
    const onScreen = useRef(null)
    useEffect(() => {
      onScreen.current = String(activityId)
    }, [activityId])
  `)
  assert.equal(found.unreadable.length, 0)
  assert.equal(found.loaders, 0)
})

test('a loader no ref holds is invisible', () => {
  const found = examine(`
    ${LOADER}
    useEffect(() => {
      let current = true
      load(() => current)
      return () => {
        current = false
      }
    }, [load])

    const remove = async id => {
      await destroy(id)
      await load(() => true)
    }
  `)
  assert.equal(found.loaders, 0)
  assert.equal(found.sites.length, 0)
})

test('a loader handed in as a parameter has no declaration to read', () => {
  const found = examine(`
    export default function Panel({ load, onScreen }) {
      const remove = async id => {
        await destroy(id)
        await load(() => onScreen.current === load)
      }
      return remove
    }
  `)
  assert.equal(found.loaders, 0)
  assert.equal(found.sites.length, 0)
})

test('a ref shape it cannot classify is a problem, not a pass', () => {
  const found = examine(`
    ${LOADER}
    const onScreen = useRef(load)
    useEffect(() => {
      onScreen.current = isCurrent => load(isCurrent)
    }, [load])
  `)
  assert.equal(found.unreadable.length, 1)
  assert.equal(found.unreadable[0].shape, 'ArrowFunctionExpression')
})
