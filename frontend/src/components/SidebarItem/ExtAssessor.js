import {
  HiOutlinePresentationChartLine, // การประเมินผลการเรียนรู้
  HiOutlineUsers, // ระดับหลักสูตรตามรุ่นปีรับเข้า
  HiOutlineArrowsRightLeft, // เปรียบเทียบระดับหลักสูตร
  HiOutlineUserCircle, // ระดับหลักสูตรรายคน
  HiOutlineUserGroup, // ระดับหลักสูตรของนักศึกษาทุกคน
} from 'react-icons/hi2'

/**
 * The external assessor's menu — the four programme-level results, read-only.
 *
 * This was one invented entry until #49. `docs/01` ROLE-6 and R005 say of the
 * role only that the account is time-boxed and signs in with a password; no
 * extracted requirement named a screen for it, and the inherited frontend had
 * no menu for it at all, so rather than invent a set and let it harden into a
 * requirement the role was given read-only reach at the one thing
 * accreditation review is for, with the real set left to whoever owns the
 * requirement. They settled it on 16 October 2569: **R086–R089, read-only,
 * within the curriculum the grant names** — written down as `docs/01` §9
 * `OWN-01`, which is why this docstring points at a requirement instead of
 * explaining itself.
 *
 * ## It is the committee's own group, copied rather than designed
 *
 * The group header, the four labels, the four paths and the four icons are
 * `ProgManager.js`'s fourth group unchanged, because the set the owner chose
 * *is* that group. Copying it is a decision and not an inheritance (#45), and
 * the decision is that this role should read these screens under the words the
 * delivered system uses for them (`docs/05` A15–A18) rather than under a name
 * invented here. The cost of that is paid once and in public: the first entry
 * is now *ระดับหลักสูตรตามรุ่นปีรับเข้า* and no longer the placeholder's
 * *ผลการเรียนรู้ระดับหลักสูตร*, so the one wording this role used to read has
 * changed. It was never delivered wording — there was no menu — which is the
 * reason this is not a `docs/06` §Out of Scope question.
 *
 * What hangs off the shape rather than the set: `firstEntry` reads
 * `menu[0].sub[0]`, so the landing is still `/main/programLevelByIntake` and
 * `66a` rows 1–2 keep holding, and `SidebarItem` opens every group that has
 * `sub` for a non-teacher role, so the four are drawn without a press.
 *
 * The set is asserted at both seams:
 * `e2e/tests/49a-the-external-assessors-screens.spec.js` reads this menu and
 * presses each entry, and `backend/test/shell.test.js` says the server permits
 * these four and refuses the screens the set leaves out — because hiding an
 * entry is not what stops anybody reaching it (`menus.js`, ADR-0002).
 */
export const EXT_ASSESSOR = [
  {
    key: 'การประเมินผลการเรียนรู้',
    label: 'การประเมินผลการเรียนรู้',
    icon: <HiOutlinePresentationChartLine />,
    sub: [
      {
        key: 'ระดับหลักสูตรตามรุ่นปีรับเข้า',
        label: 'ระดับหลักสูตรตามรุ่นปีรับเข้า',
        path: '/main/programLevelByIntake',
        icon: <HiOutlineUsers />,
      },
      {
        key: 'เปรียบเทียบระดับหลักสูตร',
        label: 'เปรียบเทียบระดับหลักสูตร',
        path: '/main/programLevelCompare',
        icon: <HiOutlineArrowsRightLeft />,
      },
      {
        key: 'ระดับหลักสูตรรายคน',
        label: 'ระดับหลักสูตรรายคน',
        path: '/main/programLevelIndividual',
        icon: <HiOutlineUserCircle />,
      },
      {
        key: 'ระดับหลักสูตรของนักศึกษาทุกคน',
        label: 'ระดับหลักสูตรของนักศึกษาทุกคน',
        path: '/main/programLevelAllStudents',
        icon: <HiOutlineUserGroup />,
      },
    ],
  },
]
