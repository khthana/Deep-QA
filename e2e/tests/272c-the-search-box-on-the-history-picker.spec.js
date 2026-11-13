'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const users = require('../support/users-screen');
const { openHistory } = require('../support/history-panel');

/**
 * #272 ชิ้นที่สาม — ช่องค้นหาของ *ประวัติการใช้งาน* (`frontend/src/pages/UserHistory.js`)
 *
 * คำตอบของเจ้าของงาน 13 พฤศจิกายน 2569: ช่องค้นยังค้นตัวเลือกบัญชีอย่างเดิม (ชื่อ อีเมล รหัสผู้ใช้)
 * และเปลี่ยนเป็นช่องค้นหาร่วม (`components/SearchBox.js`) — มีแว่นขยาย หน่วงก่อนถาม และ `%` `_` เป็น
 * ตัวอักษร ซึ่งเป็นของเส้นทาง `GET /api/users` ตั้งแต่ชิ้นที่สอง · ทางเลือกที่ไม่ถูกเลือก: ช่องที่สอง
 * เหนือตารางประวัติ และกลับไปหน้าเดียวของทุกบัญชีอย่างระบบที่ส่งมอบ
 * (`DEEP-QA-FRONTEND/src/components/content/AdminContent/UserMangement/userLogs.js`) ซึ่งรื้อการออกแบบของ #13
 *
 * ## สิ่งที่แฟ้มนี้ไม่ได้พูด (#123)
 *
 * - **ไม่ได้พูดว่าการเลือกคนหลังค้นยังใช้ได้** — `13a` (*rows 1, 2 and 4*, *row 3*, *row 6*, *row 12*)
 *   ค้นผ่าน `users.search` แล้วเลือก ซึ่งหาช่องด้วย placeholder ที่ช่องใหม่ยังถืออยู่
 * - **สองบรรทัดท้ายของแถวไม่ใช่ข้ออ้าง** — อ่านว่าคำตอบถูกวาดแล้ว ไม่มีมัตแตนต์ตัวใดตายที่นั่น ประโยคเป็นของ #13
 *   ซึ่ง `13a` *row 12* อ่านอยู่ (รีวิว 13 พ.ย. 2569, #88)
 * - **ไม่ได้พูดเรื่องหน้าตาและจำนวนมิลลิวินาทีของการหน่วง** — `272a` ด้วยเหตุผลเดียวกัน (#52)
 */

const BOX = 'ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้';

test('the history picker: the box is the shared search box, and an underscore is a character', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await openHistory(page);
  // Read before it is typed into, so the plain input dies here at a claim and
  // not at a fill's timeout (#139).
  const box = page.getByRole('searchbox', { name: BOX });
  await expect(box, 'the search box of `components/SearchBox.js`').toBeVisible();

  // `teacher_one` is `teacher.one@kmitl.ac.th` to `ILIKE`'s `_`, and nothing as text.
  const answer = await users.search(page, 'teacher_one');
  expect((await answer.json()).total, 'the server reads the underscore as itself').toBe(0);
  await expect(page.getByText('ไม่พบผู้ใช้งานตามคำค้นนี้', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox').locator('option'), 'only the prompt is offered').toHaveCount(1);
});
