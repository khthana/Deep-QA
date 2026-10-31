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

const { examine, classify, classifyWayOut } = require('./save-window-fields')

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
  // `Navbar.js`' บันทึกรหัสใหม่, before #253 gave it a flag, and
  // `LoginForm.js`' submit, whose `// disabled={loading}` is a comment and not
  // an attribute: the two the button question found and the field question
  // could not have. Cited by their text since 31 ตุลาคม 2569, because #254
  // added lines above the first of them and a citation by line number ages
  // the day anything above it grows (#173, #130).
  const verdicts = examine(`
    <form onSubmit={onSubmit}>
      <input value={draft.name} onChange={set} disabled={sending} />
      <button type="submit">บันทึก</button>
    </form>
  `)
  assert.equal(verdicts.buttons.length, 1)
  assert.equal(classify(verdicts.buttons[0], verdicts).kind, 'bare')
})

test('ยกเลิก is not one of the buttons the first question counts', () => {
  // **Dated 31 ตุลาคม 2569 (#253).** This used to say a `type="button"` is not
  // read at all, which was the owner's answer of 26 ตุลาคม 2569 built into the
  // instrument - the half of it that says a person who has given up on a save
  // must be able to leave. The other half of that sentence is that ยกเลิก holds
  // nothing, and leaving it unread is what made the rule unmeasurable, so the
  // third question now reads these buttons under a rule of their own. What this
  // row still holds is that the first question's count is the sends.
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
  assert.deepEqual(found, { buttons: [], fields: [], waysOut: [], marker: null })
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

/** What the one way out of a snippet is. */
const wayOut = code => {
  const found = examine(code)
  assert.equal(found.waysOut.length, 1, 'expected exactly one way out in the snippet')
  return classifyWayOut(found.waysOut[0], found)
}

test('a way out holding nothing is free, which is the owner’s answer', () => {
  // The thirteen forms that were already right on 31 ตุลาคม 2569, and the two
  // this ticket made the fourteenth and fifteenth.
  assert.equal(wayOut(form('<input value={draft.name} onChange={set} />')).kind, 'free')
})

test('a way out holding a flag is held, and says which flag', () => {
  // The diagnosed shape, both members of it: `EvidenceForm.js` held the page's
  // `busy` and `ProfilePhotoDialog.js` its own. Whose flag it is does not come
  // into the rule - the owner's sentence is that ยกเลิก holds nothing - which is
  // why this question can answer where the first two cannot (#226).
  const verdict = wayOut(
    `
    const Form = ({ draft, set, busy, onSubmit, onCancel }) => (
      <form onSubmit={onSubmit}>
        <input value={draft.name} onChange={set} disabled={busy} />
        <button type="submit" disabled={busy}>บันทึก</button>
        <button type="button" onClick={onCancel} disabled={busy}>ยกเลิก</button>
      </form>
    )
  `
  )
  assert.equal(verdict.kind, 'held')
  assert.equal(verdict.by, 'busy')
})

test('a way out written as a local that calls the prop is read', () => {
  // `ProfilePhotoDialog.js`'s `close`, which clears the box and then calls
  // `onClose`. One hop, which is the limit on the front page: a helper calling a
  // helper calling the prop is invisible.
  const verdict = wayOut(
    `
    const Dialog = ({ busy, onClose, onSubmit }) => {
      const close = () => {
        setFile(null)
        onClose()
      }
      return (
        <form onSubmit={onSubmit}>
          <button type="submit" disabled={busy}>บันทึก</button>
          <button type="button" onClick={close} disabled={busy}>ยกเลิก</button>
        </form>
      )
    }
  `
  )
  assert.equal(verdict.kind, 'held')
  assert.equal(verdict.by, 'busy')
})

test('a way out written as an arrow that calls the prop is read too', () => {
  const found = examine(
    `
    const Form = ({ busy, onCancel, onSubmit }) => (
      <form onSubmit={onSubmit}>
        <button type="submit" disabled={busy}>บันทึก</button>
        <button type="button" onClick={() => onCancel(null)}>ยกเลิก</button>
      </form>
    )
  `
  )
  assert.equal(found.waysOut.length, 1)
  assert.equal(classifyWayOut(found.waysOut[0], found).kind, 'free')
})

test('a button whose handler calls no prop is not read as a way out', () => {
  // Two real shapes, and both of them ways out this question cannot see:
  // `Navbar.js`' ยกเลิก, whose `onClick={closeChangePassword}` sets the
  // navbar's own state because the box's state lives in the file that draws it
  // (#167), and `SectionsPanel.js`' `() => setRenaming(null)`. Both are free
  // today, which is how they could be read by hand at all; the day one is not,
  // this count is silent about it rather than wrong.
  const found = examine(
    `
    const Panel = ({ busy, onSubmit }) => {
      const stop = () => setRenaming(null)
      return (
        <form onSubmit={onSubmit}>
          <button type="submit" disabled={busy}>บันทึก</button>
          <button type="button" onClick={stop} disabled={busy}>ยกเลิก</button>
          <button type="button" onClick={() => setRenaming(null)} disabled={busy}>ยกเลิก</button>
        </form>
      )
    }
  `
  )
  assert.deepEqual(found.waysOut, [])
})

test('a way out that is not a <button> is not read', () => {
  // `ProfilePhotoDialog.js`' backdrop - the `onClick={close}` on its
  // `absolute inset-0` div, which never held a flag and is
  // the reason the owner's question about that box was about what a person could
  // already do rather than about what this ticket opened (#217).
  const found = examine(
    `
    const Dialog = ({ busy, onClose, onSubmit }) => (
      <form onSubmit={onSubmit}>
        <div onClick={onClose} className="absolute inset-0" />
        <button type="submit" disabled={busy}>บันทึก</button>
      </form>
    )
  `
  )
  assert.deepEqual(found.waysOut, [])
})

test('a held way out behind a marker with a reason and a ticket is marked', () => {
  const verdict = wayOut(
    `
    const Form = ({ busy, onCancel, onSubmit }) => (
      // save-window: this way out is the save, pressed again (#253)
      <form onSubmit={onSubmit}>
        <button type="submit" disabled={busy}>บันทึก</button>
        <button type="button" onClick={onCancel} disabled={busy}>ยกเลิก</button>
      </form>
    )
  `
  )
  assert.equal(verdict.kind, 'marked')
  assert.equal(verdict.marker.ok, true)
})

test('a prop that sends a request reads as a way out, which the front page says', () => {
  // The too-loose direction of the third question, written down rather than
  // argued about: `onRemove` is a prop and a button that calls it writes. Today
  // every such button is free so nothing is reported, and this row is what says
  // the day one holds a flag the report will name it wrongly. Met on a real site
  // the hour the question landed: `Pager.js`, pulled into the population by the
  // move that proved the instrument (#230), reported its ก่อนหน้า and ถัดไป.
  const found = examine(
    `
    const Card = ({ busy, onRemove, onSubmit }) => (
      <form onSubmit={onSubmit}>
        <button type="submit" disabled={busy}>บันทึก</button>
        <button type="button" onClick={onRemove} disabled={busy}>ลบ</button>
      </form>
    )
  `
  )
  assert.equal(found.waysOut.length, 1)
  assert.equal(classifyWayOut(found.waysOut[0], found).kind, 'held')
})

test('a way out disabled outright is held, and names no flag', () => {
  // The worst case of the third question, and the one the two-axis review of
  // 31 ตุลาคม 2569 found had no fixture: a bare `disabled` is `always` for a
  // field - a control nobody is ever in the window of - and here it is a way
  // out nobody can take at all. It has no flag to name, so `by` is null and
  // the report says what it is rather than printing empty backticks. Nothing
  // in `src/` writes this, so a fixture is the whole of what can read it, and
  // the docblock says so (#141).
  const verdict = wayOut(
    `
    const Form = ({ busy, onCancel, onSubmit }) => (
      <form onSubmit={onSubmit}>
        <button type="submit" disabled={busy}>บันทึก</button>
        <button type="button" onClick={onCancel} disabled>ยกเลิก</button>
      </form>
    )
  `
  )
  assert.equal(verdict.kind, 'held')
  assert.equal(verdict.by, null)
})

