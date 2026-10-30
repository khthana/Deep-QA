/**
 * #247's census's own fixtures -
 * `node --test scripts/rows-outside-the-filter.test.js`.
 *
 * Written both ways round, because this rule fails in two directions and only
 * one of them looks like a failure (#141): too tight, and a screen that says
 * *บันทึกข้อมูลเรียบร้อยแล้ว* over a list without the row is reported as clean; too
 * loose, and a screen whose form cannot write outside its own filter is reported
 * as a defect, which is how a census teaches people to ignore it.
 *
 * The rows that assert **nothing is found** are not padding. Each is a shape
 * this census leaves out on purpose - a read with no filter, a filter that is
 * only a page, a screen with nothing to say after a write - written down so that
 * whoever reads the count knows what it is a count of.
 *
 * These fixtures pass either way round for a census that is merely *present*
 * (#141 again), so the instrument was also proved against the tree, in both
 * directions: a real site broken (`Rubrics.js`'s message taken out of
 * `alsoOutside`) and the population *moved* (a filter added to
 * `Departments.js`, which no ticket has ever touched for this rule) - #230's
 * pair. Both numbers are on
 * `docs/acceptance/19-programme-learning-outcomes.md` §#247.
 *
 * #252's fourth question - the import sentence the parent screen says - was
 * added on 30 ตุลาคม 2569 and proved against the tree the same way: a real site
 * broken (`Subjects.js`'s `SOME_IMPORTED_OUTSIDE` taken out of its
 * `onImported`, `importing 3 · problems 1`) and the population moved (the same
 * filter added to `Departments.js`, which mounts the panel and says nothing:
 * `importing 4 · problems 2`, one for each rule). The rows below it are the
 * shapes, both ways round.
 */
const test = require('node:test')
const assert = require('node:assert')

const { examine, classify } = require('./rows-outside-the-filter')

/** The mounts of the import panel a snippet holds, for #252's rows. */
const imports = code => examine(code).imports

/** What the census makes of one snippet. */
const verdict = code => classify(examine(code)).kind

/** The filters a snippet holds, flattened, for the rows about reading them. */
const filters = code =>
  examine(code)
    .reads.flatMap(one => one.by)
    .sort()

/**
 * A screen in the shape the seven are written in: a filtered read, a save that
 * says something, and whatever the row is about in between.
 */
const screen = (read, said) => `
  const Screen = () => {
    const [program, setProgram] = useState('')
    const [page, setPage] = useState(1)
    const [data, setData] = useState({ rows: [], total: 0 })
    const load = useCallback(async () => {
      const answer = await ${read}
      setData(answer)
    }, [program, page])
    const save = async draft => {
      await createRow(draft)
      ${said}
      setNotice(said)
    }
    return <Table rows={data.rows} onPage={setPage} />
  }
`

const FILTERED = 'listRows({ page, per_page: PAGE_SIZE, program_id: program })'
const SAYS = `const outside = outsideFilter(program, draft.program_id)
      const said = { error: false, message: alsoOutside('บันทึก', outside) }`
const BARE = "const said = { error: false, message: 'บันทึก' }"

test('a filtered screen that hands its sentence through the shared join is saying it', () => {
  assert.equal(verdict(screen(FILTERED, SAYS)), 'saying')
})

test('a filtered screen that says a bare sentence over the list is the defect', () => {
  assert.equal(verdict(screen(FILTERED, BARE)), 'bare')
})

test('the filter is read by name, and the pager keys are left out', () => {
  assert.deepEqual(filters(screen(FILTERED, SAYS)), ['program_id'])
})

test('a spread of a state object is a filter too, which is how `Users` passes three', () => {
  const code = `
    const Screen = () => {
      const [filters, setFilters] = useState({ q: '', role: '', status: '' })
      const [page, setPage] = useState(1)
      const load = useCallback(async () => {
        const answer = await listUsers({ ...filters, page, per_page: PAGE_SIZE })
        setData(answer)
      }, [filters, page])
      const save = async () => { ${BARE}; setNotice(said) }
      return <Table />
    }
  `
  assert.deepEqual(filters(code), ['...filters'])
  assert.equal(verdict(code), 'bare')
})

test('a read filtered by nothing but the page is outside the population', () => {
  const code = screen('listRows({ page, per_page: PAGE_SIZE })', BARE)
  assert.deepEqual(filters(code), [])
  assert.equal(verdict(code), 'outside')
})

test('a filtered read on a screen with nothing to say after a write is outside it too', () => {
  const code = `
    const Picker = () => {
      const [q, setQ] = useState('')
      const load = useCallback(async () => {
        setFound(await listUsers({ q, page: 1, per_page: PICKER_SIZE }))
      }, [q])
      return <List />
    }
  `
  assert.deepEqual(filters(code), ['q'])
  assert.equal(verdict(code), 'outside')
})

test('a name the file does not hold in state is not a filter', () => {
  // A read keyed on a module constant is the same read every time, so the
  // screen cannot save outside it and there is nothing for this rule to be
  // about. Not *unclassified*: there is no ambiguity to report.
  const code = `
    const Screen = () => {
      const load = useCallback(async () => {
        setPool(await listPrograms({ program_id: ONLY_ONE }))
      }, [])
      const save = async () => { ${BARE}; setNotice(said) }
      return <Form />
    }
  `
  assert.deepEqual(filters(code), [])
  assert.equal(verdict(code), 'outside')
})

test('a filter written as something this script cannot follow is unclassified, not guessed at', () => {
  const code = screen('listRows({ page, program_id: chosen.program_id })', BARE)
  assert.equal(verdict(code), 'unclassified')
})

test('a marker with a reason and a ticket excuses a screen whose form cannot write out', () => {
  const code = `
    // outside-the-filter: the หลักสูตร of this screen's form is the one the table
    // is filtered to, drawn from the same state, so the save cannot land outside
    // the list (#247)
    ${screen(FILTERED, BARE)}
  `
  assert.equal(verdict(code), 'marked')
})

test('a marker that is only a ticket number is not a reason', () => {
  const code = `
    // outside-the-filter: #247
    ${screen(FILTERED, BARE)}
  `
  const found = examine(code)
  assert.equal(classify(found).kind, 'marked')
  assert.equal(found.marker.ok, false)
})

test('a marker written as one paragraph of `//` lines is read whole (#233)', () => {
  const code = `
    // outside-the-filter: nothing this form writes is a key the table is
    // filtered by
    // (#247)
    ${screen(FILTERED, BARE)}
  `
  assert.equal(examine(code).marker.ok, true)
})

test('a screen that says the sentence needs no marker, and the marker is not read for it', () => {
  const found = examine(screen(FILTERED, SAYS))
  assert.equal(classify(found).kind, 'saying')
  assert.deepEqual(found.adds.length, 1)
})

/**
 * A screen in the shape the four that mount the shared import panel are written
 * in - #252. The handler is the whole question: what is read is the attribute's
 * own body, not what the panel does with it.
 */
const importing = handler => `
  const Screen = () => {
    const [program, setProgram] = useState('')
    const [page, setPage] = useState(1)
    const load = useCallback(async () => {
      setData(await ${FILTERED})
    }, [program, page])
    const save = async draft => {
      await createRow(draft)
      ${SAYS}
      setNotice(said)
    }
    return (
      <>
        <Table />
        <ImportPanel kind="rows"${handler} />
      </>
    )
  }
`

const SAYS_IMPORT = ` onImported={result => {
          const outside = someImportedOutside(program, result?.rows?.map(row => row.program_id))
          if (outside) waiting.current = { said: { error: false, message: SOME_IMPORTED_OUTSIDE } }
          setPage(1)
        }}`

test('a mount whose handler names the import sentence is counted and clean (#252)', () => {
  const found = examine(importing(SAYS_IMPORT))
  assert.equal(found.imports.length, 1)
  assert.equal(found.imports[0].says, true)
})

test('a mount whose handler says nothing is the defect, however much else it does', () => {
  const code = importing(` onImported={() => setPage(1)}`)
  assert.equal(imports(code).length, 1)
  assert.equal(imports(code)[0].says, false)
})

test('the sentence is read inside the handler and not elsewhere in the file', () => {
  // The constant imported at the top of a screen that stopped using it in the
  // handler would be a green light for nothing: the question is asked of the
  // attribute, which is why the file's own text is not what is searched.
  const code = `
    const SOME_IMPORTED_OUTSIDE = 'x'
    ${importing(` onImported={() => setPage(1)}`)}
  `
  assert.equal(imports(code)[0].says, false)
})

test('a panel mounted with no finished-import callback is not in the question', () => {
  assert.deepEqual(imports(importing('')), [])
})

test('another component handed an onImported is not this panel', () => {
  const code = importing('').replace('ImportPanel', 'ExportPanel')
  assert.deepEqual(imports(code), [])
})

test('a mount on a screen whose list is not filtered is outside the species', () => {
  // The six other screens that mount the panel are here: `examine` stops at the
  // first question, so there is no mount to report and nothing to excuse.
  const code = importing(` onImported={() => setPage(1)}`).replace(
    FILTERED,
    'listRows({ page, per_page: PAGE_SIZE })'
  )
  assert.equal(verdict(code), 'outside')
  assert.deepEqual(imports(code), [])
})
