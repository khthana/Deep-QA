/**
 * The guard census's own fixtures - `node --test scripts/guards-with-no-mutant.test.js`.
 *
 * Written both ways round, because this rule fails in two directions and only
 * one of them looks like a failure (#141): too tight, and a guard nothing
 * breaks is reported as proved - which is the failure this census exists to
 * prevent, and the one the two instruments before it made; too loose, and a
 * comparison that is not this family's guard at all is reported as a defect,
 * which is how a census teaches people to ignore it.
 *
 * The rows that assert **nothing is found** are not padding. Each is a shape
 * this census cannot read or deliberately does not count, written down so that
 * whoever reads the count knows what it is a count of (#123).
 *
 * These fixtures pass either way round for a census that is merely *present*
 * (#141, #230), so the instrument was also proved on real sites, both by
 * taking a real mutant's text out of the catalogue and by moving the population
 * into a file nobody had touched: the numbers are on
 * `docs/acceptance/57-pager.md` §#269.
 */
const test = require('node:test')
const assert = require('node:assert')

const { examine, brokenBy, catalogue } = require('./guards-with-no-mutant')

/** The guards of a snippet. */
const guards = code => examine(code).guards
/** The one guard of a snippet. */
const one = code => {
  const found = guards(code)
  assert.equal(found.length, 1, 'expected exactly one guard in the snippet')
  return found[0]
}
const none = code => assert.deepEqual(guards(code), [])

/** A handler written the way the family's twenty-odd sites are. */
const handler = body => `
  const Screen = () => {
    const onScreen = useRef(load)
    const save = async () => {
      await updateRow(id, draft)
      ${body}
    }
    return <form onSubmit={save} />
  }
`

test('the family\'s awaited pair is a guard, and the name it compares is read', () => {
  const guard = one(
    handler(`
      const drawing = onScreen.current
      await drawing(() => onScreen.current === drawing)
    `)
  )
  assert.equal(guard.callee, 'drawing')
  assert.equal(guard.compared, 'drawing')
})

test('the unawaited pair is a guard too, which is the clause that blinded #266', () => {
  // The shape `_local/q266population.js` could not see, on `StudentGroups.js`
  // and `GradingWeights.js`: no `await` stands over the call, and #266's
  // closing prose said *ten sites* where the tree held twelve.
  const guard = one(
    handler(`
      const drawing = onScreen.current
      drawing(() => onScreen.current === drawing)
    `)
  )
  assert.equal(guard.compared, 'drawing')
})

test('a guard inside a branch is found, and its line is the comparison\'s', () => {
  // `Departments.js:813` and the five screens that copy it: the call is the
  // consequent of an `if`, and the line a mutant has to quote is the `if`'s.
  const guard = one(
    handler(`
      const drawing = onScreen.current
      if (page === 1) drawing(() => onScreen.current === drawing)
      else setPage(1)
    `)
  )
  assert.equal(guard.line, guard.at, 'the call and the comparison are on one line here')
})

test('a guard handed back rather than awaited is found', () => {
  // `SubjectStudents.js:268`, where the caller awaits `reload` and the pair
  // inside it is written `return drawing(...)`.
  assert.equal(
    one(
      handler(`
      const drawing = onScreen.current
      return drawing(() => onScreen.current === drawing)
    `)
    ).compared,
    'drawing'
  )
})

test('a comparison against something other than a loader is still a guard', () => {
  // `ActivityScores.js:575` asks `onScreen.current === activityId`: the ref
  // holds what the grid is **of**, not the loader, and the family's question is
  // the same one.
  const guard = one(handler('load(() => onScreen.current === activityId)'))
  assert.equal(guard.callee, 'load')
  assert.equal(guard.compared, 'activityId')
})

test('the comparison may be written with the ref on the right', () => {
  assert.equal(one(handler('load(() => drawing === onScreen.current)')).compared, 'drawing')
})

test('a comparison against a sentinel is outside the population', () => {
  // `undefined`, `NaN` and `Infinity` are identifiers to the parser, so all
  // three were counted until the review of 6 พฤศจิกายน 2569 asked the
  // too-loose direction (#141). `onScreen.current === undefined` asks whether
  // the ref has been written, which is a different question from *what is this
  // value of* and is nobody's row here. No site in `src/` writes one, so this
  // is the half of the rule a real site cannot prove.
  none(handler('load(() => onScreen.current === undefined)'))
  none(handler('load(() => onScreen.current === NaN)'))
  none(handler('load(() => onScreen.current === Infinity)'))
})

test('a comparison against a literal was never in the population', () => {
  // The population is `what is this value of`, and a number is not a thing the
  // ref can hold the identity of. This passed before the sentinels were
  // excluded too, which is why that exclusion needed its own row.
  none(handler('load(() => onScreen.current === 1)'))
})

test('a property of the ref\'s value is not this family\'s guard', () => {
  // `onRows.current.of === readOf(page)` on the screens that key a sentence:
  // what is compared is a property of what the ref holds, and `.current` has to
  // be the whole of what is read. A real guard, and somebody else's rows hold
  // it - #205, #207.
  none(handler('load(() => onRows.current.of === readOf(page))'))
})

test('a refusal guard is not this family\'s guard either', () => {
  // `ImportPanel`'s own `latest.current !== asked` is `!==` and is read before
  // a draw rather than passed into the read. #179's rows hold it.
  none(handler('if (latest.current !== asked) return'))
})

test('a call with more than one argument is outside the population', () => {
  // The family's shape hands the loader exactly one thing: its own flag.
  none(handler('load(() => onScreen.current === drawing, { quiet: true })'))
})

test('a comparison that is not passed into a call is not counted', () => {
  // Read in place rather than handed to the read - `if (onScreen.current ===
  // sent) setNotice(said)`, which is the *sentence*'s guard and is what
  // `sentences-after-a-move.js` counts.
  none(handler('if (onScreen.current === sent) setNotice(said)'))
})

test('a marker needs a reason of its own and a ticket number', () => {
  const code = `
    // guard-no-mutant: #269
    const Screen = () => load(() => onScreen.current === drawing)
  `
  assert.equal(examine(code).marker.ok, false, 'a ticket number alone is a pointer, not a reason')
  const better = `
    // guard-no-mutant: nothing on this screen reloads a list it is not the
    // only reader of, so no answer can be superseded here (#269)
    const Screen = () => load(() => onScreen.current === drawing)
  `
  assert.equal(examine(better).marker.ok, true)
})

test('a marker is read as the paragraph it is written as', () => {
  // `//` between two lines is one comment per line to the parser, so a reason
  // whose ticket number is two lines below the keyword reads as a marker naming
  // none (#233).
  const code = `
    // guard-no-mutant: this screen draws one row and has no list to supersede
    // (#269)
    const Screen = () => load(() => onScreen.current === drawing)
  `
  const marker = examine(code).marker
  assert.equal(marker.ok, true)
  assert.match(marker.reason, /#269/)
})

// ── The catalogue half ───────────────────────────────────────────────────────

const SCRIPTS = [
  {
    name: '140-superseded-handler-reload.py',
    text: "FILES = {'students': 'frontend/src/pages/Students.js'}\n" +
      "MUTANTS = {'studentsimportstalewins': ('students',\n" +
      "    '              if (page === 1) drawing(() => onScreen.current === drawing)\\n',\n" +
      "    '              if (page === 1) drawing(() => true)\\n')}\n",
    paths: new Set(['src/pages/Students.js']),
  },
]

test('a guard a mutant of its own file quotes is broken by it', () => {
  assert.deepEqual(
    brokenBy(
      'src/pages/Students.js',
      'if (page === 1) drawing(() => onScreen.current === drawing)',
      SCRIPTS
    ),
    ['140']
  )
})

test('the same line in another file is not covered by that mutant', () => {
  // Six screens write this line identically, and a mutant is keyed to one file:
  // the first version of #269's own measurement named all six for every site,
  // which is *a grep is evidence for the pattern you typed* (#111) met in a
  // census.
  assert.deepEqual(
    brokenBy(
      'src/pages/Departments.js',
      'if (page === 1) drawing(() => onScreen.current === drawing)',
      SCRIPTS
    ),
    []
  )
})

test('a guard whose line nothing in the catalogue holds is bare', () => {
  assert.deepEqual(
    brokenBy('src/pages/Students.js', 'await drawing(() => onScreen.current === drawing)', SCRIPTS),
    []
  )
})

test('an empty line is never reported as covered', () => {
  // The guard's line is read out of the file by number, so a line this script
  // could not find must not match every script in the catalogue.
  assert.deepEqual(brokenBy('src/pages/Students.js', '', SCRIPTS), [])
})

test('the catalogue reads a path whether or not it is written from the repo root', () => {
  const read = catalogue(require('path').join(__dirname, '..', '..', 'mutation'))
  assert.ok(read.length > 100, 'the real catalogue is read, not an empty directory')
  const family = read.find(script => script.name.startsWith('140-'))
  assert.ok(family, 'the #140 script is in the catalogue')
  assert.ok(
    family.paths.has('src/pages/Students.js'),
    'its FILES are read as src/-relative paths whichever way they are written'
  )
})
