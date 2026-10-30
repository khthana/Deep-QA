/**
 * The save-window census's own fixtures - `node --test scripts/save-window-fields.test.js`.
 *
 * Written both ways round, because this rule fails in two directions and only
 * one of them looks like a failure (#141): too tight, and a form whose fields a
 * person can move while its own save is out is reported as clean; too loose, and
 * a control that was never part of a window is reported as a defect, which is
 * how a census teaches people to ignore it.
 *
 * The rows that assert **nothing is found** are not padding. Each is a spelling
 * this census cannot read, written down so that whoever reads the count knows
 * what it is a count of.
 *
 * These fixtures pass either way round for a census that is merely *present*
 * (#141 again), so the instrument was also proved by breaking a real site and
 * by **moving the population** (#230): the numbers are on
 * `docs/acceptance/10-application-shell.md` §#243.
 */
const test = require('node:test')
const assert = require('node:assert')

const { examine, classify } = require('./save-window-fields')

/** A form that sends something, with whatever controls the row is about. */
const form = (controls, extra = '') => `
  const Form = ({ draft, set, busy, onSubmit }) => {
    const [sending, setSending] = useState(false)
    ${extra}
    return (
      <form onSubmit={onSubmit}>
        ${controls}
        <button type="submit" disabled={sending}>บันทึก</button>
        <button type="button" onClick={onSubmit}>ยกเลิก</button>
      </form>
    )
  }
`

/** Every control of a snippet, as the report would read them. */
const verdicts = code => {
  const found = examine(code)
  return [...found.buttons, ...found.fields].map(control => ({
    line: control.line,
    ...classify(control, found),
  }))
}

/** What the one field of a snippet is. */
const field = code => {
  const found = examine(code)
  assert.equal(found.fields.length, 1, 'expected exactly one field in the snippet')
  return classify(found.fields[0], found)
}

test('a field closed by the form’s own flag is flagged, and says by what', () => {
  const verdict = field(form('<input value={draft.name} onChange={set} disabled={sending} />'))
  assert.equal(verdict.kind, 'flagged')
  assert.equal(verdict.by, 'sending')
})

test('a field closed by the page’s flag is flagged too — whose flag it is, this cannot say', () => {
  // The limit the docblock prints, as a row: #242's whole subject is invisible
  // here, and what holds it is the fourth claim of each row of `228a`, `242a`
  // and `243a`.
  const verdict = field(form('<input value={draft.name} onChange={set} disabled={busy} />'))
  assert.equal(verdict.kind, 'flagged')
  assert.equal(verdict.by, 'busy')
})

test('a field with no disabled at all is bare', () => {
  // The diagnosed shape: the three fields of `Navbar.js`'s change-password
  // dialog before 29 ตุลาคม 2569, and the 57 this census still reports.
  assert.equal(field(form('<input value={draft.name} onChange={set} />')).kind, 'bare')
})

test('a <select> and a <textarea> are fields, and a hidden input is not', () => {
  const found = examine(
    form(
      '<select value={draft.plo} onChange={set} />' +
        '<textarea value={draft.detail} onChange={set} />' +
        '<input type="hidden" value={draft.id} />'
    )
  )
  assert.deepEqual(
    found.fields.map(one => one.tag),
    ['select', 'textarea']
  )
})

test('a bare submit button is its own finding, and the reason it is the priority', () => {
  // `Navbar.js:524` before this ticket, and `LoginForm.js:98`, whose
  // `// disabled={loading}` is a comment and not an attribute: the two the
  // button question found and the field question could not have.
  const verdicts = examine(`
    <form onSubmit={onSubmit}>
      <input value={draft.name} onChange={set} disabled={sending} />
      <button type="submit">บันทึก</button>
    </form>
  `)
  assert.equal(verdicts.buttons.length, 1)
  assert.equal(classify(verdicts.buttons[0], verdicts).kind, 'bare')
})

test('ยกเลิก is not in the population, by the owner’s answer', () => {
  // A `type="button"` is not read at all, which is the owner's answer of
  // 26 ตุลาคม 2569 built into the instrument rather than left to a reader: a
  // person who has given up on a save must be able to leave.
  const found = examine(form('<input value={draft.name} onChange={set} disabled={sending} />'))
  assert.equal(found.buttons.length, 1)
  assert.equal(found.buttons[0].line, 8)
})

test('a file with no submit button is not in the population', () => {
  // `ImportPanel.js`'s species, and the limit that goes with it: a panel that
  // writes without a form is invisible here.
  const found = examine(`
    const Panel = ({ busy, onImport }) => (
      <div>
        <input type="file" onChange={onImport} />
        <button type="button" onClick={onImport} disabled={busy}>นำเข้า</button>
      </div>
    )
  `)
  assert.deepEqual(found, { buttons: [], fields: [], marker: null })
})

test('a bare control behind a marker with a reason and a ticket is marked', () => {
  const verdict = field(
    form('<input value={draft.name} onChange={set} />', '// save-window: the screen takes this form away while the save is out (#243)')
  )
  assert.equal(verdict.kind, 'marked')
  assert.match(verdict.marker.reason, /takes this form away/)
  assert.equal(verdict.marker.ok, true)
})

test('a marker in a JSX comment is read, which is the shape LoginForm.js carries', () => {
  // Written between two tags, where `//` would be `JSXText` and would be drawn
  // on the screen (#93) - so the real file writes `{/* ... */}` and this is the
  // row that says the instrument reads that shape.
  const verdict = field(`
    <form onSubmit={onSubmit}>
      <input value={draft.name} onChange={set} />
      {/* save-window: the screen takes this form away while the save is out (#243) */}
      <button type="submit">บันทึก</button>
    </form>
  `)
  assert.equal(verdict.kind, 'marked')
  assert.equal(verdict.marker.ok, true)
})

test('a marker that is only a ticket number is not a reason', () => {
  const verdict = field(form('<input value={draft.name} onChange={set} />', '// save-window: #243'))
  assert.equal(verdict.kind, 'marked')
  assert.equal(verdict.marker.ok, false)
})

test('a marker with a reason and no ticket number is not one either', () => {
  const verdict = field(
    form('<input value={draft.name} onChange={set} />', '// save-window: nobody can type here anyway')
  )
  assert.equal(verdict.marker.ok, false)
})

test('a reason written two lines below the keyword is still read', () => {
  // #233's rule: a `//` paragraph is one comment per line to the parser, so a
  // census that read a line would reject the very markers it was built for.
  const verdict = field(
    form(
      '<input value={draft.name} onChange={set} />',
      `// save-window: the screen takes this form away while
       // the save is out, so there is nothing to close
       // (#243)`
    )
  )
  assert.equal(verdict.marker.ok, true)
})

test('disabled written bare is always, not a window', () => {
  // `ProgramSubjectForm.js:195` — a code that may never be changed once it is
  // stored is not a control a save can part company with.
  const verdict = field(form('<input value={draft.code} readOnly disabled />'))
  assert.equal(verdict.kind, 'always')
})

test('a disabled whose expression names nothing this script knows is still flagged', () => {
  // The too-loose direction, deliberately: `OfferingForm.js:203` closes its
  // subject picker until a หลักสูตร has been chosen, which is not a save
  // window at all. Reading what it names rather than judging it is what keeps
  // this census out of an argument it cannot settle; the report prints the
  // expression so a person can see which it is. That site reads
  // `sending || !draft.program_id || loading` since #249 gave the form a flag of
  // its own on 30 ตุลาคม 2569; the fixture below keeps the shape without one,
  // which is the case this test is about.
  const verdict = field(
    form('<select value={draft.subject} onChange={set} disabled={!draft.program_id || loading} />')
  )
  assert.equal(verdict.kind, 'flagged')
  assert.equal(verdict.by, '!draft.program_id || loading')
})

test('every control of a form is read, not only the first', () => {
  const found = verdicts(
    form(
      '<input value={draft.a} onChange={set} disabled={sending} />' +
        '<input value={draft.b} onChange={set} />'
    )
  )
  assert.deepEqual(
    found.map(one => one.kind),
    ['flagged', 'flagged', 'bare']
  )
})

test('a field this script cannot see is not reported as either', () => {
  // The population is the tag, so a field wrapped in a component of its own is
  // invisible — #182's shape one family along. The count is silent about it
  // rather than wrong, and that is why the docblock says so.
  const found = examine(form('<TextField value={draft.name} onChange={set} />'))
  assert.deepEqual(found.fields, [])
  assert.equal(found.buttons.length, 1)
})
