/**
 * The form-identity census's own fixtures - `node --test
 * scripts/forms-cleared-by-identity.test.js`.
 *
 * Written both ways round, because a rule like this fails in two directions and
 * only one of them looks like a failure (#141): too tight, and the shape #232
 * found is reported as clean; too loose, and a form that cannot lose anything
 * is reported as a defect, which is how a census teaches people to ignore it.
 *
 * The rows that assert **nothing is found** are not padding. Each one is a
 * spelling this census cannot see, written down so that whoever reads the count
 * knows what it is a count of - and the guarded row is the one branch of the
 * three that nothing in `src/` takes, so these fixtures are the only thing
 * holding it (26 October 2569).
 */
const test = require('node:test')
const assert = require('node:assert')

const { examine, classify } = require('./forms-cleared-by-identity')

/** The one site in a snippet. */
const one = code => {
  const { sites } = examine(code)
  assert.equal(sites.length, 1, 'expected exactly one effect writing form state')
  return sites[0]
}
const none = code => assert.deepEqual(examine(code).sites, [])

/** A form whose field is drawn, with whatever effect the row is about. */
const form = effect => `
  const Form = ({ programs, value }) => {
    const usable = programs.filter(program => program.is_active !== false)
    const onlyOne = usable.length === 1 ? usable[0] : null
    const pool = usable.map(program => program.program_id).join(' ')
    const starting = onlyOne ? onlyOne.program_id : ''
    const editing = Boolean(value?.program_id)
    const [draft, setDraft] = useState({ program_id: '' })
    ${effect}
    return <select value={draft.program_id} onChange={set('program_id')} />
  }
`

const DIAGNOSED = form(`
    useEffect(() => {
      setDraft({ program_id: starting })
    }, [value, onlyOne])
`)

const FIXED = form(`
    useEffect(() => {
      if (editing) return
      setDraft(current =>
        current.program_id && pool.split(' ').includes(current.program_id)
          ? current
          : { ...current, program_id: starting },
      )
    }, [editing, pool, starting])
`)

const GUARDED = form(`
    useEffect(() => {
      setDraft(current => (current.program_id ? current : { ...current, program_id: starting }))
    }, [onlyOne])
`)

test('the shape #232 found is a bare site, named by the dependency that re-runs it', () => {
  const site = one(DIAGNOSED)
  assert.equal(site.kind, 'bare')
  assert.equal(site.state, 'draft')
  assert.deepEqual(site.identity, ['onlyOne'])
  assert.equal(site.marker, null)
})

test('the fix takes the identity out of the list, so the effect is compared by value', () => {
  const site = one(FIXED)
  assert.equal(site.kind, 'by value')
  // `value` is a prop and `starting` reads a name after a dot: neither can be
  // classified from this file, and both are reported rather than guessed at.
  assert.deepEqual(site.unclassified, ['starting'])
})

test('an identity dependency with an updater that hands back what it was given is guarded', () => {
  const site = one(GUARDED)
  assert.equal(site.kind, 'guarded')
  assert.deepEqual(site.identity, ['onlyOne'])
})

test('an updater that keeps the state only as a fallback is not handing it back', () => {
  // `current && …` returns the new object whenever anything was typed, which is
  // every case this census is about, and `starting || current` returns the
  // state only where the answer gave nothing. Both read as `current` appearing
  // in a logical expression, which is why the side and the operator are read
  // and not only the node type — the branch no site in `src/` takes (#141).
  assert.equal(
    one(
      form(`
    useEffect(() => {
      setDraft(current => current && { ...current, program_id: starting })
    }, [onlyOne])
  `)
    ).kind,
    'bare'
  )
  assert.equal(
    one(
      form(`
    useEffect(() => {
      setDraft(current => ({ ...current, program_id: starting || current.program_id }))
    }, [onlyOne])
  `)
    ).kind,
    'bare'
  )
  assert.equal(
    one(
      form(`
    useEffect(() => {
      setDraft(current => current ?? { program_id: starting })
    }, [onlyOne])
  `)
    ).kind,
    'guarded'
  )
})

test('a marker with a reason of its own and a ticket number closes a bare site', () => {
  const site = one(
    form(`
    // form-identity: every line fills a field only when it is empty (#233)
    useEffect(() => {
      setDraft({ program_id: starting })
    }, [onlyOne])
  `)
  )
  assert.equal(site.kind, 'bare')
  assert.equal(site.marker.ok, true)
  assert.match(site.marker.reason, /only when it is empty/)
})

test('a marker at the top of its own paragraph is read, not only the line above the effect', () => {
  // Babel hands back one comment per `//` line, and the first version of this
  // census rejected both of the markers it was written for because of it.
  const site = one(
    form(`
    // form-identity: every line fills a field only when it is empty (#233)
    //
    // And then a paragraph of prose about why, which is what the two forms in
    // the tree actually carry.
    useEffect(() => {
      setDraft({ program_id: starting })
    }, [onlyOne])
  `)
  )
  assert.equal(site.marker.ok, true)
})

test('a marker naming no ticket is not a reason', () => {
  const site = one(
    form(`
    // form-identity: it is fine
    useEffect(() => {
      setDraft({ program_id: starting })
    }, [onlyOne])
  `)
  )
  assert.equal(site.marker.ok, false)
})

test('a marker that is nothing but a ticket number is not a reason either', () => {
  const site = one(
    form(`
    // form-identity: #233
    useEffect(() => {
      setDraft({ program_id: starting })
    }, [onlyOne])
  `)
  )
  assert.equal(site.marker.ok, false)
})

test('state nobody types into is not form state, however the effect writes it', () => {
  none(`
    const Screen = ({ programs }) => {
      const usable = programs.filter(program => program.is_active !== false)
      const onlyOne = usable.length === 1 ? usable[0] : null
      const [chosen, setChosen] = useState(null)
      useEffect(() => {
        setChosen(onlyOne)
      }, [onlyOne])
      return <span>{chosen?.program_name_th}</span>
    }
  `)
})

test('an effect with no dependency list runs once a mount and is not this family', () => {
  none(
    form(`
    useEffect(() => {
      setDraft({ program_id: starting })
    }, [])
  `)
  )
})

test('a setter handed to another function is a spelling this census cannot see', () => {
  // Not padding: the site is real and the report will not hold it, which is
  // what this row says out loud.
  none(
    form(`
    useEffect(() => {
      apply(setDraft, starting)
    }, [onlyOne])
  `)
  )
})

test('a field whose value goes under another prop name is one it cannot see either', () => {
  none(`
    const Form = ({ programs }) => {
      const usable = programs.filter(program => program.is_active !== false)
      const onlyOne = usable.length === 1 ? usable[0] : null
      const [draft, setDraft] = useState({ program_id: '' })
      useEffect(() => {
        setDraft({ program_id: '' })
      }, [onlyOne])
      return <Picker chosen={draft.program_id} />
    }
  `)
})

test('a checkbox is a field too', () => {
  const site = one(`
    const Form = ({ programs }) => {
      const usable = programs.filter(program => program.is_active !== false)
      const onlyOne = usable.length === 1 ? usable[0] : null
      const [draft, setDraft] = useState({ active: true })
      useEffect(() => {
        setDraft({ active: true })
      }, [onlyOne])
      return <input type="checkbox" checked={draft.active} />
    }
  `)
  assert.equal(site.kind, 'bare')
})

test('what each kind of initialiser is compared by', () => {
  const of = expression => {
    const { sites } = examine(`
      const Form = ({ rows }) => {
        const x = ${expression}
        const [draft, setDraft] = useState({ a: '' })
        useEffect(() => {
          setDraft({ a: '' })
        }, [x])
        return <input value={draft.a} />
      }
    `)
    assert.equal(sites.length, 1)
    return sites[0].kind === 'bare' ? 'reference' : 'not reference'
  }

  // An element of a list is a fresh object wherever the list is a fresh answer,
  // whether it is reached by index or by `find`.
  assert.equal(of('rows[0]'), 'reference')
  assert.equal(of('rows.find(row => row.id === 1)'), 'reference')
  assert.equal(of('rows.filter(row => row.is_active)'), 'reference')
  assert.equal(of('rows.length === 1 ? rows[0] : null'), 'reference')
  // And a name after a dot, a count, a joined string or a boolean is not.
  assert.equal(of('rows.someRow'), 'not reference')
  assert.equal(of('rows.length'), 'not reference')
  assert.equal(of('rows.map(row => row.id).join(" ")'), 'not reference')
  assert.equal(of('Boolean(rows.length)'), 'not reference')
  // The snippet is source text, so the `${}` in it is for the parser and not
  // for this file's own interpolation.
  // eslint-disable-next-line no-template-curly-in-string
  assert.equal(of('`${rows.length} rows`'), 'not reference')
})

test('the classifier itself, asked about the shapes the rule turns on', () => {
  const kind = expression => {
    const { sites } = examine(`
      const Form = () => {
        const x = ${expression}
        const [draft, setDraft] = useState({ a: '' })
        useEffect(() => {
          setDraft({ a: '' })
        }, [x])
        return <input value={draft.a} />
      }
    `)
    return sites[0].kind
  }
  assert.equal(typeof classify, 'function')
  assert.equal(kind('{ a: 1 }'), 'bare')
  assert.equal(kind("''"), 'by value')
})
