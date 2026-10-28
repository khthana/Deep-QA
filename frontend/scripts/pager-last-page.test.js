/**
 * The pager census's own fixtures - `node --test scripts/pager-last-page.test.js`.
 *
 * Written both ways round, because this rule fails in two directions and only
 * one of them looks like a failure (#141): too tight, and a screen a person can
 * be left standing past the end of is reported as clean; too loose, and a screen
 * that cannot lose a page is reported as a defect, which is how a census teaches
 * people to ignore it.
 *
 * The rows that assert **nothing is found**, and the ones that report a mount
 * point as unclassified, are not padding. Each is a spelling this census cannot
 * read, written down so that whoever reads the count knows what it is a count of.
 *
 * These fixtures pass either way round for a census that is merely *present*
 * (#141 again), so the instrument was also proved by breaking a real site: the
 * numbers are on `docs/acceptance/11-user-accounts.md` §#239.
 */
const test = require('node:test')
const assert = require('node:assert')

const { examine, classify } = require('./pager-last-page')

/** The one mount point in a snippet, and what the file makes of it. */
const one = code => {
  const found = examine(code)
  assert.equal(found.mounts.length, 1, 'expected exactly one <Pager> in the snippet')
  return { ...classify(found.mounts[0], found), setter: found.mounts[0].setter }
}
const none = code => assert.deepEqual(examine(code).mounts, [])

/** A screen with a pager, with whatever `load` and whatever mount the row is about. */
const screen = (load, mount = '<Pager page={page} total={data.total} onPage={setPage} />') => `
  const Screen = () => {
    const [page, setPage] = useState(1)
    const [data, setData] = useState({ rows: [], total: 0 })
    const load = useCallback(async () => {
      const answer = await listRows({ page, per_page: PAGE_SIZE })
      ${load}
    }, [page])
    return (
      <div>
        <Table rows={data.rows} />
        ${mount}
      </div>
    )
  }
`

/** The rule, in the shape the eight screens that hold it are written in. */
const RULE = `
      const lastPage = Math.max(1, Math.ceil(answer.total / PAGE_SIZE))
      if (answer.page > lastPage) {
        setPage(lastPage)
        return
      }
      setData(answer)
`

const NOTHING = `
      setData(answer)
`

test('a screen that hands the person to the last page that exists is corrected', () => {
  const verdict = one(screen(RULE))
  assert.equal(verdict.kind, 'corrected')
  assert.equal(verdict.against, 'lastPage')
})

test('a screen that draws whatever page the server answered is bare', () => {
  // The diagnosed shape: `Users.js` before #239, and the three mount points
  // left outside the rule.
  const verdict = one(screen(NOTHING))
  assert.equal(verdict.kind, 'bare')
  assert.equal(verdict.setter, 'setPage')
})

test('the bound is not read by its name, so another way of computing it is corrected too', () => {
  // Nothing here is spelled `lastPage`, `Math.ceil` or `total`, and the rule is
  // held all the same: the census asks by the mechanism (#174).
  const verdict = one(
    screen(`
      const beyond = answer.pages ?? 1
      if (answer.page > beyond) {
        setPage(beyond)
        return
      }
      setData(answer)
  `)
  )
  assert.equal(verdict.kind, 'corrected')
  assert.equal(verdict.against, 'beyond')
})

test('a bound written inline is not read, and the mount is reported', () => {
  // The too-loose direction, written down rather than discovered: the rule is
  // held, and this census reads a bound by its name, so it reports the mount.
  // A red asking a person is the right way for this to fail (#141), and the
  // docblock says so where whoever reads the count will look.
  const verdict = one(
    screen(`
      if (answer.page > Math.ceil(answer.total / PAGE_SIZE)) {
        setPage(Math.ceil(answer.total / PAGE_SIZE))
        return
      }
      setData(answer)
  `)
  )
  assert.equal(verdict.kind, 'bare')
})

test('a comparison that hands the person somewhere else is not the rule', () => {
  // It compares the right numbers and moves nobody to the page it computed,
  // which is the half a count of `Math.ceil` would have credited.
  const verdict = one(
    screen(`
      const lastPage = Math.max(1, Math.ceil(answer.total / PAGE_SIZE))
      if (answer.page > lastPage) {
        setPage(1)
        return
      }
      setData(answer)
  `)
  )
  assert.equal(verdict.kind, 'bare')
})

test('a correction that moves some other state is not this pager being corrected', () => {
  // `onPage` and not `page`: what a correction has to move is the state this
  // pager's own buttons write.
  const verdict = one(
    screen(
      RULE,
      '<Pager page={page} total={data.total} onPage={goToPage} />'
    )
  )
  assert.equal(verdict.kind, 'bare')
  assert.equal(verdict.setter, 'goToPage')
})

test('a marker with a reason of its own and a ticket number closes a bare mount point', () => {
  const verdict = one(
    `
    // pager-last-page: nothing a person can press on this screen makes the list
    // it is drawing shorter (#239)
    ` + screen(NOTHING)
  )
  assert.equal(verdict.kind, 'marked')
  assert.equal(verdict.marker.ok, true)
  assert.match(verdict.marker.reason, /shorter/)
})

test('a marker naming no ticket is not a reason', () => {
  const verdict = one('// pager-last-page: it is fine\n' + screen(NOTHING))
  assert.equal(verdict.kind, 'marked')
  assert.equal(verdict.marker.ok, false)
})

test('a marker that is nothing but a ticket number is not a reason either', () => {
  const verdict = one('// pager-last-page: #239\n' + screen(NOTHING))
  assert.equal(verdict.marker.ok, false)
})

test('a marker reads from the top of its own paragraph, not only from one line', () => {
  // Babel hands back one comment per `//` line, which is what made the first
  // version of the form-identity census reject both of the markers it was
  // written for (#233).
  const verdict = one(
    `
    // pager-last-page: this panel writes nothing at all, so the list it draws
    // cannot lose a row while somebody is reading it.
    //
    // #239 measured the four mount points outside #209's rule and this is one
    // of the three that no press on its own screen can shorten.
    ` + screen(NOTHING)
  )
  assert.equal(verdict.marker.ok, true)
})

test('a marker does not make a corrected mount point anything else', () => {
  // The rule is what the census reads; a marker is only what it accepts in
  // place of one.
  assert.equal(one('// pager-last-page: and a reason too (#239)\n' + screen(RULE)).kind, 'corrected')
})

test('an onPage this script cannot follow is reported as unclassified, not guessed at', () => {
  // An inline arrow is a real mount point and the report will not hold it,
  // which is what this row says out loud.
  const verdict = one(
    screen(NOTHING, '<Pager page={page} total={data.total} onPage={next => setPage(next)} />')
  )
  assert.equal(verdict.kind, 'unclassified')
})

test('a mount point with no onPage at all is unclassified as well', () => {
  assert.equal(one(screen(NOTHING, '<Pager page={page} total={data.total} />')).kind, 'unclassified')
})

test('a screen with no pager is not in the population', () => {
  none(`
    const Screen = () => {
      const [data, setData] = useState({ rows: [] })
      return <Table rows={data.rows} />
    }
  `)
})

test('another component is not the pager, however it is paged', () => {
  none(`
    const Screen = () => {
      const [page, setPage] = useState(1)
      return <Paginator page={page} onPage={setPage} />
    }
  `)
})

test('two mount points in one file are both read', () => {
  const found = examine(`
    const Screen = () => {
      const [page, setPage] = useState(1)
      const [other, setOther] = useState(1)
      return (
        <div>
          <Pager page={page} onPage={setPage} />
          <Pager page={other} onPage={setOther} />
        </div>
      )
    }
  `)
  assert.equal(found.mounts.length, 2)
  assert.deepEqual(
    found.mounts.map(mount => mount.setter),
    ['setPage', 'setOther']
  )
})

test('the classifier itself, asked about a file holding neither a rule nor a marker', () => {
  assert.equal(typeof classify, 'function')
  assert.equal(classify({ setter: 'setPage' }, { corrections: [], marker: null }).kind, 'bare')
  assert.equal(classify({ setter: null }, { corrections: [], marker: null }).kind, 'unclassified')
})
