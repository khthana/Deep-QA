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
 */
const test = require('node:test')
const assert = require('node:assert')

const { examine, classify } = require('./rows-outside-the-filter')

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
