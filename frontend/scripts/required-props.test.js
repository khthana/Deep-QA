/**
 * The required-prop census's own fixtures - `node --test
 * scripts/required-props.test.js`.
 *
 * An instrument nobody has seen fail is the species of assertion #124 is about,
 * and its own fixtures pass either way unless they are written to catch the two
 * ways a rule like this goes wrong (#141): too tight, and a caller that forgets
 * a declared prop is reported as clean; too loose, and a call this script cannot
 * read is reported as one it had read. Both directions are rows here, and the
 * second direction is the one that found two defects in the first version of
 * this census on the day it was written - which `_local` could not have found,
 * because both were in sites no snippet had asked about yet.
 *
 * The rows that assert **nothing** is found are not padding. Each one is a
 * spelling this census cannot see, written down as a row so that the next person
 * to read the count knows what it is a count of.
 */
const test = require('node:test')
const assert = require('node:assert')

const { declaration, examine } = require('./required-props')

/** A lookup that answers for one module and nothing else, as the runner's does. */
const panel = props => specifier => (specifier === '../components/ImportPanel' ? props : null)

/** The one call site in a snippet. */
const one = (code, props = ['target']) => {
  const sites = examine(code, panel(props))
  assert.equal(sites.length, 1, 'expected exactly one call site of a declaring component')
  return sites[0]
}
const none = (code, props = ['target']) => assert.deepEqual(examine(code, panel(props)), [])

const PASSES = `
  import ImportPanel from '../components/ImportPanel'
  const Screen = () => <ImportPanel title="t" target="departments" send={send} />
`
const FORGETS = `
  import ImportPanel from '../components/ImportPanel'
  const Screen = () => <ImportPanel title="t" send={send} />
`

test('a caller that passes the declared prop has nothing missing', () => {
  const site = one(PASSES)
  assert.deepEqual(site.missing, [])
  assert.equal(site.spread, false)
  assert.equal(site.component, 'ImportPanel')
})

test('a caller that forgets it is missing it', () => {
  assert.deepEqual(one(FORGETS).missing, ['target'])
})

test('two declared props are two names, and only the absent one is reported', () => {
  assert.deepEqual(one(PASSES, ['target', 'send']).missing, [])
  assert.deepEqual(one(PASSES, ['target', 'onImported']).missing, ['onImported'])
})

test('a spread is a call this census cannot read, with the prop or without it', () => {
  // Both ways round, because a spread removes the attribute: asking *what is
  // missing* first reported the second of these as a site it had read, which is
  // the sentence it cannot say. Found by breaking a real site (#141).
  const spreadOnly = one(`
    import ImportPanel from '../components/ImportPanel'
    const Screen = () => <ImportPanel title="t" {...rest} />
  `)
  assert.equal(spreadOnly.spread, true)
  const spreadBeside = one(`
    import ImportPanel from '../components/ImportPanel'
    const Screen = () => <ImportPanel target="departments" {...rest} />
  `)
  assert.equal(spreadBeside.spread, true)
  assert.deepEqual(spreadBeside.missing, [])
})

test('a marker above the call is read, with its reason and its ticket', () => {
  const site = one(`
    import ImportPanel from '../components/ImportPanel'
    const Screen = () => (
      <>
        {/* required-prop: this panel is aimed by the shell above it (#182) */}
        <ImportPanel title="t" send={send} />
      </>
    )
  `)
  assert.deepEqual(site.missing, ['target'])
  assert.equal(site.marker.ok, true)
  assert.match(site.marker.reason, /aimed by the shell/)
})

test('a marker with no ticket number is not a reason', () => {
  const site = one(`
    import ImportPanel from '../components/ImportPanel'
    const Screen = () => (
      <>
        {/* required-prop: the shell above it aims this panel */}
        <ImportPanel title="t" send={send} />
      </>
    )
  `)
  assert.equal(site.marker.ok, false)
})

test('a marker too short to be a reason is not one either', () => {
  const site = one(`
    import ImportPanel from '../components/ImportPanel'
    const Screen = () => (
      <>
        {/* required-prop: see #182 */}
        <ImportPanel title="t" send={send} />
      </>
    )
  `)
  assert.equal(site.marker.ok, false)
})

test('a marker further above than the reach is not this call site’s', () => {
  const site = one(`
    import ImportPanel from '../components/ImportPanel'
    const Screen = () => (
      <>
        {/* required-prop: this panel is aimed by the shell above it (#182) */}
        <p>one</p>
        <p>two</p>
        <p>three</p>
        <p>four</p>
        <p>five</p>
        <p>six</p>
        <ImportPanel title="t" send={send} />
      </>
    )
  `)
  assert.equal(site.marker, null)
})

test('`//` between two tags is text the browser draws, not a marker (#93)', () => {
  const site = one(`
    import ImportPanel from '../components/ImportPanel'
    const Screen = () => (
      <>
        // required-prop: this panel is aimed by the shell above it (#182)
        <ImportPanel title="t" send={send} />
      </>
    )
  `)
  assert.equal(site.marker, null)
})

test('a declaration is read when it is a literal array of strings', () => {
  const found = declaration(`
    export const REQUIRED_PROPS = ['target']
    export default function ImportPanel({ title, target, send }) { return null }
  `)
  assert.deepEqual(found.props, ['target'])
  assert.deepEqual(found.destructures, ['title', 'target', 'send'])
})

test('a declaration computed from anything is read as no declaration', () => {
  const found = declaration(`
    export const REQUIRED_PROPS = NAMES.slice(0, 1)
    export default function ImportPanel({ target }) { return null }
  `)
  assert.equal(found.props, null)
})

test('a name the component never takes apart is dropped from what callers are measured against', () => {
  // One mistake reported eleven times, ten of them naming the wrong fix, is
  // what the first run of this census did (#182). The declaration itself says
  // which names are sound, so the repair is in the function a fixture can ask
  // and not in the runner.
  const found = declaration(`
    export const REQUIRED_PROPS = ['taget']
    export default function ImportPanel({ title, target }) { return null }
  `)
  assert.deepEqual(found.props, ['taget'])
  assert.ok(!found.destructures.includes('taget'))
  assert.deepEqual(found.sound, [])
  assert.deepEqual(found.unsound, ['taget'])
})

test('a declaration the component takes apart is sound whole', () => {
  const found = declaration(`
    export const REQUIRED_PROPS = ['target']
    export default function ImportPanel({ title, target, send }) { return null }
  `)
  assert.deepEqual(found.sound, ['target'])
  assert.deepEqual(found.unsound, [])
})

test('a declaration half taken apart is sound in the half that is', () => {
  const found = declaration(`
    export const REQUIRED_PROPS = ['target', 'taget']
    export default function ImportPanel({ target }) { return null }
  `)
  assert.deepEqual(found.sound, ['target'])
  assert.deepEqual(found.unsound, ['taget'])
})

test('a declaration nothing can be subtracted from stands whole', () => {
  // Where the names are not in the source there is nothing to check against,
  // so the declaration is not narrowed - the problem is reported against the
  // declaration itself instead.
  const found = declaration(`
    export const REQUIRED_PROPS = ['target']
    export default function ImportPanel(props) { return null }
  `)
  assert.equal(found.destructures, null)
  assert.deepEqual(found.sound, ['target'])
  assert.deepEqual(found.unsound, [])
})

test('a default export that takes its props as one object cannot be checked', () => {
  assert.equal(
    declaration(`
      export const REQUIRED_PROPS = ['target']
      export default function ImportPanel(props) { return null }
    `).destructures,
    null
  )
  // A rest element is the same answer: what it holds is not in the source.
  assert.equal(
    declaration(`
      export const REQUIRED_PROPS = ['target']
      export default function ImportPanel({ title, ...rest }) { return null }
    `).destructures,
    null
  )
})

test('an arrow exported through its name is the same declaration', () => {
  const found = declaration(`
    export const REQUIRED_PROPS = ['target']
    const ImportPanel = ({ title, target }) => null
    export default ImportPanel
  `)
  assert.deepEqual(found.destructures, ['title', 'target'])
})

test('a file with no declaration declares nothing', () => {
  assert.equal(declaration('export default function Panel({ target }) { return null }'), null)
})

// The rest are what this census cannot see. Each is a row so the count is read
// as a count of something.

test('a named import is not followed', () => {
  none(`
    import { ImportPanel } from '../components/ImportPanel'
    const Screen = () => <ImportPanel title="t" />
  `)
})

test('a component held in another binding is not followed', () => {
  none(`
    import ImportPanel from '../components/ImportPanel'
    const Panel = ImportPanel
    const Screen = () => <Panel title="t" />
  `)
})

test('a module that declares nothing has no call sites here', () => {
  none(
    `
    import ImportPanel from '../components/Something'
    const Screen = () => <ImportPanel title="t" />
  `
  )
})

test('an intrinsic element is never a call site', () => {
  none(`
    import ImportPanel from '../components/ImportPanel'
    const Screen = () => <section title="t" />
  `)
})

test('a prop whose value is undefined counts as passed', () => {
  // The rule is about the caller having been told, not about the value
  // arriving - the same boundary `isCurrent` has.
  assert.deepEqual(
    one(`
      import ImportPanel from '../components/ImportPanel'
      const Screen = () => <ImportPanel title="t" target={undefined} />
    `).missing,
    []
  )
  assert.deepEqual(
    one(`
      import ImportPanel from '../components/ImportPanel'
      const Screen = () => <ImportPanel title="t" target={maybe?.id} />
    `).missing,
    []
  )
})

test('every call site in a file is read, not only the first', () => {
  const sites = examine(
    `
    import ImportPanel from '../components/ImportPanel'
    const Screen = () => (
      <>
        <ImportPanel title="one" target="departments" />
        <ImportPanel title="two" />
      </>
    )
  `,
    panel(['target'])
  )
  assert.equal(sites.length, 2)
  assert.deepEqual(
    sites.map(site => site.missing),
    [[], ['target']]
  )
})
