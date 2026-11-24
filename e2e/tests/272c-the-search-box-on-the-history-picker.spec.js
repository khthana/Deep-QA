'use strict';

const { test, expect } = require('@playwright/test');

const { BACKEND_URL } = require('../support/env');
const { ACCOUNTS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BOX, openHistory, searchHistory } = require('../support/history-panel');

/**
 * #272 ชิ้นที่สาม — ช่องค้นหาของ *ประวัติการใช้งาน* (`frontend/src/pages/UserHistory.js`)
 *
 * คำตอบของเจ้าของงาน 13 พฤศจิกายน 2569: ช่องค้นเปลี่ยนเป็นช่องค้นหาร่วม (`components/SearchBox.js`) — มีแว่นขยาย
 * หน่วงก่อนถาม และ `%` `_` เป็นตัวอักษร
 *
 * **ความหมายของช่องเปลี่ยนเมื่อ #305 (24 พ.ย. 2569)** — วันที่เขียนแฟ้มนี้ ช่องค้นตัวเลือกบัญชีผ่าน `GET /api/users`
 * ตั้งแต่ #305 หน้านี้กลับเป็นตารางรวมของทุกบัญชีแบบที่ส่งมอบ (`docs/users-screen.md` ข้อ 11) และช่องเดียวกันกรอง
 * **บรรทัดของประวัติ** ผ่าน `GET /api/history` แถวจึงเล็งใหม่ที่ช่องนั้นด้วยข้ออ้างเดิมทั้งสองข้อ: ช่องเป็นช่องร่วม และ
 * `_` เป็นตัวอักษร — `searchOf` ของเส้นทางใหม่ (#305) เป็นตัวเดียวกับของ `GET /api/users`
 *
 * ## สิ่งที่แฟ้มนี้ไม่ได้พูด (#123)
 *
 * - **สองบรรทัดท้ายของแถวไม่ใช่ข้ออ้างของ #272** — อ่านว่าคำตอบถูกวาดแล้ว ประโยคเป็นของ #305
 * - **ไม่ได้พูดเรื่องหน้าตาและจำนวนมิลลิวินาทีของการหน่วง** — `272a` ด้วยเหตุผลเดียวกัน (#52)
 */

test('the history table: the box is the shared search box, and an underscore is a character', async ({
  page,
  request,
}) => {
  // A line `teacher_one` would find if it were read as a pattern, whatever
  // the files before this one left in the log (#132). It stays, as every
  // sign-in's line does: the log is the product recording what the suite did,
  // and `support/hold.js` leaves it alone on purpose (#134).
  const inn = await request.post(`${BACKEND_URL}/api/auth/login`, {
    data: { email: ACCOUNTS.teacherOne, password: PASSWORD },
  });
  expect(inn.status()).toBe(200);

  await signIn(page, ACCOUNTS.facultyAdmin);
  await openHistory(page);
  // Read before it is typed into, so the plain input dies here at a claim and
  // not at a fill's timeout (#139).
  const box = page.getByRole('searchbox', { name: BOX });
  await expect(box, 'the search box of `components/SearchBox.js`').toBeVisible();

  // `teacher_one` is `teacher.one@kmitl.ac.th` to `ILIKE`'s `_`, and nothing as
  // text - and `teacher.one@` has just signed in, and this faculty's
  // administrator reaches it, so read as a wildcard the term would find a line.
  const answer = await searchHistory(page, 'teacher_one');
  expect((await answer.json()).total, 'the server reads the underscore as itself').toBe(0);
  await expect(page.getByText('ไม่พบข้อมูลประวัติการใช้งาน', { exact: true })).toBeVisible();
  await expect(page.locator('tbody tr'), 'only the empty line is drawn').toHaveCount(1);
});
