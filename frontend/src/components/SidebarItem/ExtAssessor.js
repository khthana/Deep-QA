import { HiOutlineClipboardDocumentCheck } from 'react-icons/hi2'

/**
 * The external assessor's menu.
 *
 * Deliberately one entry, and deliberately the same programme-level results
 * the committee sees. docs/01 says of this role only that the account is
 * time-boxed (ROLE-6, R005) and that it signs in with a password; no
 * requirement anywhere names a screen for it, and the inherited frontend has
 * no menu for it at all. Rather than invent a set of screens and let it
 * harden into a requirement, the role gets read-only reach at the one thing
 * accreditation review is for, and the real set is settled by whoever owns
 * the requirement. Recorded under "สิ่งที่ยังไม่ปิดใน #10" in
 * docs/acceptance/10-application-shell.md.
 */
export const EXT_ASSESSOR = [
  {
    key: 'ผลการเรียนรู้ระดับหลักสูตร',
    label: 'ผลการเรียนรู้ระดับหลักสูตร',
    path: '/main/programLevelByIntake',
    icon: <HiOutlineClipboardDocumentCheck />,
  },
]
