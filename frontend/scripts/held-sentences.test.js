/**
 * The held-sentence census's own fixtures - `node --test scripts/held-sentences.test.js`.
 *
 * Written both ways round, because this rule fails in two directions and only
 * one of them looks like a failure (#141): too tight, and a screen that says a
 * sentence over a form which replaced the list it is about is reported as
 * clean; too loose, and a screen whose list is never replaced is reported as a
 * defect, which is how a census teaches people to ignore it.
 *
 * The rows that assert **nothing is found**, and the one that reports a say as
 * unclassified, are not padding. Each is a spelling this census cannot read,
 * written down so that whoever reads the count knows what it is a count of.
 *
 * These fixtures are written from the rule, so they pass either way round for a
 * census that is merely *present* (#141, #124). The instrument was proved by
 * breaking real sites instead - one per part of the deferral, and a rename of
 * the ref the whole population is derived from (#230) - and the numbers are on
 * `docs/acceptance/19-programme-learning-outcomes.md` §#246.
 */
const test = require('node:test')
const assert = require('node:assert')

const { examine, classify } = require('./held-sentences')

/** The one say in a snippet, and what the file makes of it. */
const one = code => {
  const found = examine(code)
  assert.equal(found.says.length, 1, 'expected exactly one say in the snippet')
  return { ...classify(found.says[0], found), ref: found.says[0].ref }
}
const none = code => assert.deepEqual(examine(code).says, [])

/** A screen whose read says a sentence it was handed, however the row writes it. */
const screen = (say, rest = '') => `
  const Screen = () => {
    const [editing, setEditing] = useState(null)
    const waiting = useRef(null)
    const load = useCallback(async isCurrent => {
      const key = readOf(page)
      try {
        const answer = await listRows({ page })
        if (isCurrent()) {
          setData(answer)
          ${say}
        }
      } finally {
        if (isCurrent()) {
          ${rest || 'waiting.current = null'}
        }
      }
    }, [page])
    return editing ? <Form /> : <Table rows={data.rows} />
  }
`

/** The say as every one of these screens wrote it before 29 ตุลาคม 2569. */
const BARE = `
          if (waiting.current && waiting.current.of === key) {
            setNotice(waiting.current.said)
          }
`

/** The say as the owner's answer leaves it: held while a form is drawn. */
const HELD = `
          if (waiting.current && waiting.current.of === key) {
            if (formShown.current) {
              waiting.current = { ...waiting.current, held: true }
            } else {
              setNotice(waiting.current.said)
            }
          }
`

/** The `finally` that stops throwing a held one away. */
const KEEPS = 'if (!waiting.current?.held) waiting.current = null'

/** The effect that says a held sentence when the form closes, and clears it. */
const LATER = `
    useEffect(() => {
      if (editing) return
      const held = waiting.current
      if (!held?.held) return
      if (held.of === readOf(page)) setNotice(held.said)
      waiting.current = null
    }, [editing, page])
`

/** A whole screen: the say, the `finally`, and whatever else the row wants. */
const whole = (say, rest, extra) => screen(say, rest).replace('return editing', extra + '\n    return editing')

test('a screen that holds the sentence, keeps it and says it later is held', () => {
  const verdict = one(whole(HELD, KEEPS, LATER))
  assert.equal(verdict.kind, 'held')
  assert.equal(verdict.ref, 'waiting')
  assert.equal(verdict.by, 'formShown')
})

test('the guard is not read by its name, so another mirror is held too', () => {
  // Nothing here is spelled `formShown`: the census asks by the mechanism, which
  // is *the say is in the `else` of a test on some other ref* (#174).
  const verdict = one(
    whole(HELD.replace(/formShown/g, 'aFormIsUp'), KEEPS, LATER.replace('editing', 'editing')),
  )
  assert.equal(verdict.kind, 'held')
  assert.equal(verdict.by, 'aFormIsUp')
})

test('a screen that says a handed sentence with no guard is bare', () => {
  // The diagnosed shape: all nine of these screens before 29 ตุลาคม 2569.
  const verdict = one(whole(BARE, KEEPS, LATER))
  assert.equal(verdict.kind, 'bare')
  assert.deepEqual(verdict.missing, [
    'no guard asking whether a form is drawn in place of the list',
  ])
})

test("a screen whose `finally` throws a held sentence away is bare, and says which part", () => {
  const verdict = one(whole(HELD, 'waiting.current = null', LATER))
  assert.equal(verdict.kind, 'bare')
  assert.deepEqual(verdict.missing, ['nothing keeping a held sentence when the read lands'])
})

test('a screen that holds a sentence and never says it is bare', () => {
  // The worst of the three to ship: the sentence is taken away from the person
  // and nothing gives it back (#205, #137).
  const verdict = one(whole(HELD, KEEPS, ''))
  assert.equal(verdict.kind, 'bare')
  assert.deepEqual(verdict.missing, ['nothing saying a held sentence when the form closes'])
})

test('a screen missing all three is told all three', () => {
  const verdict = one(whole(BARE, 'waiting.current = null', ''))
  assert.equal(verdict.kind, 'bare')
  assert.equal(verdict.missing.length, 3)
})

test('a marker with a reason and a ticket makes a bare say green', () => {
  const verdict = one(
    '// held-sentence: no form is ever drawn in place of this list (#246)\n' +
      whole(BARE, 'waiting.current = null', ''),
  )
  assert.equal(verdict.kind, 'marked')
  assert.equal(verdict.marker.ok, true)
})

test('a marker that is only a ticket number is not a reason', () => {
  // A number on its own is a pointer, not a reason somebody after you can read.
  const verdict = one('// held-sentence: #246\n' + whole(BARE, 'waiting.current = null', ''))
  assert.equal(verdict.kind, 'marked')
  assert.equal(verdict.marker.ok, false)
})

test("a marker's reason is read out of a paragraph, not out of its first line", () => {
  // `//` between two lines is one comment per line to the parser, so a reason
  // whose ticket number is two lines below the keyword reads as a marker naming
  // none (#233).
  const verdict = one(
    '// held-sentence: nothing on this screen draws a form in place of\n' +
      '// the list it is about, so a read that lands has drawn the thing\n' +
      '// the sentence is about (#246)\n' +
      whole(BARE, 'waiting.current = null', ''),
  )
  assert.equal(verdict.marker.ok, true)
})

test('the key check a screen already had is not a deferral', () => {
  // `if (waiting.current && ...)` is the key rule of #185 and #205, and an
  // `else` on it would be the same ref the say reads: a guard that tells the
  // sentence's own absence apart from a drawn form is what is being asked for.
  const verdict = one(
    whole(
      `
          if (waiting.current && waiting.current.of === key) {
            setNotice(waiting.current.said)
          } else {
            waiting.current = { ...waiting.current, held: true }
          }
`,
      KEEPS,
      LATER,
    ),
  )
  assert.equal(verdict.kind, 'bare')
})

test('a say of something that is not a ref is reported, not guessed at', () => {
  const found = examine(`
    const Screen = () => {
      const say = () => setNotice(someModule.state().said)
      return <div onClick={say} />
    }
  `)
  assert.deepEqual(found.says, [])
  assert.equal(found.unreadable.length, 1)
})

test('a screen with no sentence handed to a read is outside the population', () => {
  none(`
    const Screen = () => {
      const save = async () => {
        await writeRow()
        setNotice({ message: 'saved' })
      }
      return <button onClick={save}>บันทึก</button>
    }
  `)
})

test('a say reached through a helper is not read, which is the population limit', () => {
  // The population is the file, as #198 left it: a sentence said by a shared
  // hook on the screen's behalf is invisible here and is nobody's red.
  none(`
    const Screen = () => {
      const waiting = useRef(null)
      useEffect(() => {
        sayWhateverIsWaiting(waiting)
      }, [])
      return <Table />
    }
  `)
})
