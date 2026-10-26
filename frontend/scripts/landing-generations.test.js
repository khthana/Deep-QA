/**
 * The landing-generation census's own fixtures - `node --test
 * scripts/landing-generations.test.js`.
 *
 * An instrument nobody has seen fail is the species of assertion #124 is about,
 * and its own fixtures pass either way unless they are written for both ways a
 * rule like this goes wrong (#141): too tight, and a landing that stopped
 * reading the number is reported as clean; too loose, and a read this script
 * cannot account for is reported as a defect. Both directions are rows here.
 *
 * What these rows cannot do is say the census found the right *screens*. That
 * is four real sites broken on 26 October 2569 - a landing's dependency list, a
 * landing's call to the hook, a second read one hop out, and a menu's first
 * entry moved so that `FULL_ADMIN` lands on `/main/subjects` - each of which
 * put the census red on the line it should have, the fourth of them naming a
 * screen nobody had touched. That last one is the row no snippet can hold,
 * because what it measures is that the population is derived and not listed
 * (#123, #141).
 *
 * The rows that assert **nothing** is found are not padding. Each one is a
 * spelling this census cannot see, written down as a row so that the next
 * person to read the count knows what it is a count of.
 */
const test = require('node:test')
const assert = require('node:assert')

const {
  landingSpecifiers,
  firstPath,
  routeComponents,
  grantScoped,
  examine,
} = require('./landing-generations')

/** The tree's own shape: an api module is one under `api/`. */
const api = specifier => /(^|\/)api\//.test(specifier)
const asks = (code, scoped = () => false) => examine(code, { api, scoped })

/** The one read in a snippet. */
const one = (code, scoped) => {
  const found = asks(code, scoped)
  assert.equal(found.sites.length, 1, 'expected exactly one read of an api module')
  return found
}

const LANDING = `
  import { listDepartments } from '../api/departments'
  import { useScreenGeneration } from '../context/ScreenGeneration'
  const Screen = () => {
    const generation = useScreenGeneration()
    const load = useCallback(async () => {
      setRows(await listDepartments(page))
    }, [page, generation])
    useEffect(() => { load() }, [load])
    return null
  }
`

test('a landing that names the generation is a read with it in the list', () => {
  const found = one(LANDING)
  assert.equal(found.generation.name, 'generation')
  assert.deepEqual(found.sites[0].calls, ['listDepartments'])
  assert.deepEqual(found.sites[0].deps, ['page', 'generation'])
  assert.equal(found.sites[0].hook, 'useCallback')
})

test('a landing that stops naming it is the same read without it', () => {
  const found = one(LANDING.replace('[page, generation]', '[page]'))
  assert.deepEqual(found.sites[0].deps, ['page'])
  assert.equal(found.sites[0].deps.includes(found.generation.name), false)
})

test('the name the number is bound to is read off the declaration, not assumed', () => {
  const found = one(LANDING.replace(/generation/g, 'epoch'))
  assert.equal(found.generation.name, 'epoch')
  assert.deepEqual(found.sites[0].deps, ['page', 'epoch'])
})

test('a landing that never calls the hook has no generation at all', () => {
  const found = one(`
    import { listDepartments } from '../api/departments'
    const Screen = () => {
      const load = useCallback(async () => {
        setRows(await listDepartments(page))
      }, [page])
      return null
    }
  `)
  assert.equal(found.generation, null)
})

test('a read with no dependency array is a list this census cannot measure', () => {
  const found = one(`
    import { listDepartments } from '../api/departments'
    const Screen = () => {
      useEffect(() => { listDepartments() })
      return null
    }
  `)
  assert.equal(found.sites[0].deps, null)
})

test('an effect that only calls a read is not itself a read', () => {
  // `}, [load]` is the shape every landing writes, and it names no generation.
  // Reporting it would be the rule too loose: what it depends on is the
  // callback, whose own list is where the number belongs.
  const found = asks(LANDING)
  assert.equal(found.sites.length, 1)
  assert.equal(found.sites[0].hook, 'useCallback')
})

test('a hook inside a hook is counted once, at the outer one', () => {
  const found = one(`
    import { listDepartments } from '../api/departments'
    const Screen = () => {
      const load = useCallback(() => {
        useEffect(() => { listDepartments() }, [])
      }, [page])
      return null
    }
  `)
  assert.equal(found.sites[0].hook, 'useCallback')
  assert.deepEqual(found.sites[0].deps, ['page'])
})

test('a call to anything but an api module is not a read', () => {
  assert.deepEqual(
    asks(`
      import { format } from '../lib/format'
      const Screen = () => {
        useEffect(() => { format(page) }, [page])
        return null
      }
    `).sites,
    []
  )
})

test('a renamed import is followed, and the declared name is what is asked about', () => {
  const found = one(
    `
      import { listGrantable as roles } from '../api/users'
      const Hook = () => {
        useEffect(() => { roles() }, [])
        return null
      }
    `,
    (specifier, exported) => specifier === '../api/users' && exported === 'listGrantable'
  )
  assert.deepEqual(found.sites[0].calls, ['roles'])
  assert.deepEqual(found.sites[0].grant, ['roles'])
})

test('a binding this script cannot follow is a read it cannot see', () => {
  // `const roles = listGrantable` and a call through an object are both
  // invisible, which is in the docblock rather than hidden (#123).
  assert.deepEqual(
    asks(`
      import { listGrantable } from '../api/users'
      const roles = listGrantable
      const Hook = () => {
        useEffect(() => { roles() }, [])
        return null
      }
    `).sites,
    []
  )
  assert.deepEqual(
    asks(`
      import * as users from '../api/users'
      const Hook = () => {
        useEffect(() => { users.listGrantable() }, [])
        return null
      }
    `).sites,
    []
  )
})

test('a read in a handler is not a read this census is about', () => {
  assert.deepEqual(
    asks(`
      import { listDepartments } from '../api/departments'
      const Screen = () => {
        const press = async () => { setRows(await listDepartments()) }
        return <button onClick={press} />
      }
    `).sites,
    []
  )
})

test('a grant-scoped call is named apart from the rest of the reads', () => {
  const found = one(
    `
      import { listGrantable, listUsers } from '../api/users'
      const Hook = () => {
        useEffect(() => {
          listUsers()
          listGrantable()
        }, [])
        return null
      }
    `,
    (specifier, exported) => exported === 'listGrantable'
  )
  assert.deepEqual(found.sites[0].calls, ['listUsers', 'listGrantable'])
  assert.deepEqual(found.sites[0].grant, ['listGrantable'])
})

test('a marker above a read is read, with its reason and its ticket', () => {
  const found = one(`
    import { listDepartments } from '../api/departments'
    const Screen = () => {
      // screen-generation: the read above closes this one on every pass (#230)
      const load = useCallback(() => listDepartments(), [page])
      return null
    }
  `)
  assert.equal(found.sites[0].marker.ok, true)
  assert.match(found.sites[0].marker.reason, /closes this one/)
})

test('a marker with no ticket, and one too far above, are not markers', () => {
  const short = one(`
    import { listDepartments } from '../api/departments'
    const Screen = () => {
      // screen-generation: because
      const load = useCallback(() => listDepartments(), [page])
      return null
    }
  `)
  assert.equal(short.sites[0].marker.ok, false)
  const far = one(`
    import { listDepartments } from '../api/departments'
    const Screen = () => {
      // screen-generation: this one is seven lines above the read (#230)
      const a = 1
      const b = 2
      const c = 3
      const d = 4
      const e = 5
      const f = 6
      const load = useCallback(() => listDepartments(), [page])
      return null
    }
  `)
  assert.equal(far.sites[0].marker, null)
})

test('an api module declares which of its reads the grant scopes', () => {
  const found = grantScoped(`
    export const listGrantable = () => get('/api/users/grantable')
    export const GRANT_SCOPED = ['listGrantable']
  `)
  assert.deepEqual(found.names, ['listGrantable'])
  assert.deepEqual(found.sound, ['listGrantable'])
  assert.deepEqual(found.unsound, [])
})

test('a declared name the module does not export is one mistake, named once', () => {
  // Reported against the declaration rather than against every caller of it,
  // which is the shape #182's first run got wrong.
  const found = grantScoped(`
    export const listGrantable = () => get('/api/users/grantable')
    export const GRANT_SCOPED = ['listGrantible']
  `)
  assert.deepEqual(found.unsound, ['listGrantible'])
  assert.deepEqual(found.sound, [])
})

test('a declaration that is not a literal array of strings declares nothing', () => {
  assert.equal(grantScoped('export const GRANT_SCOPED = names').names, null)
  assert.equal(grantScoped("export const listX = () => get('/x')"), null)
})

test('the menus say which module each role takes its landing from', () => {
  const roles = landingSpecifiers(`
    import { FULL_ADMIN } from './FullAddmin'
    import { TEACHER } from './Teacher'
    export const MENUS = { FULL_ADMIN, TEACHER }
  `)
  assert.deepEqual([...roles.keys()], ['FULL_ADMIN', 'TEACHER'])
  assert.equal(roles.get('TEACHER').specifier, './Teacher')
  assert.equal(roles.get('TEACHER').exported, 'TEACHER')
})

test("a menu's first entry is where its role lands, through a group or not", () => {
  const flat = `
    export const FULL_ADMIN = [
      { name: 'ผู้ใช้งาน', path: '/main/users' },
      { name: 'ประวัติ', path: '/main/users/user-history' },
    ]
  `
  assert.equal(firstPath(flat, 'FULL_ADMIN'), '/main/users')
  const grouped = `
    export const DEPT_ADMIN = [
      { name: 'ข้อมูลหลัก', sub: [{ path: '/main/programs' }, { path: '/main/subjects' }] },
    ]
  `
  assert.equal(firstPath(grouped, 'DEPT_ADMIN'), '/main/programs')
})

test('a first entry that is not a literal path is a landing this census cannot read', () => {
  assert.equal(firstPath('export const R = [{ path: first() }]', 'R'), null)
  assert.equal(firstPath('export const R = []', 'R'), null)
  assert.equal(firstPath('export const R = [{ sub: [] }]', 'R'), null)
  assert.equal(firstPath('export const R = entries', 'R'), null)
})

const ROUTES = `
  import Users from '../pages/Users'
  import MainPage from '../pages/Mainpage'
  import TeacherDashboard from '../pages/TeacherDashboard'
  const AppRoutes = () => (
    <Routes>
      <Route path="/main/*" element={<MainPage />}>
        <Route path="users" element={<Users />} />
      </Route>
      <Route path="/teacher/teacherDashboard/*" element={<MainPage />}>
        <Route index element={<TeacherDashboard />} />
      </Route>
    </Routes>
  )
`

test('a nested route is one address, and a layout route is not a landing', () => {
  const drawn = routeComponents(ROUTES)
  assert.equal(drawn.get('/main/users').component, 'Users')
  assert.equal(drawn.get('/main/users').specifier, '../pages/Users')
  // The shell draws at `/main`, and what lands there is a child: a route with
  // routes inside it is passed over, so its own element never answers for the
  // address its children share.
  assert.equal(drawn.has('/main'), false)
})

test("an index child lands at its parent's own address", () => {
  const drawn = routeComponents(ROUTES)
  assert.equal(drawn.get('/teacher/teacherDashboard').component, 'TeacherDashboard')
})

test('a route whose element is not a default-imported component names nothing', () => {
  const drawn = routeComponents(`
    const AppRoutes = () => (
      <Routes>
        <Route path="/main/index" element={<div />} />
        <Route path="/main/guarded" element={guard} />
      </Routes>
    )
  `)
  assert.equal(drawn.get('/main/index').specifier, null)
  assert.equal(drawn.get('/main/guarded').component, null)
})
