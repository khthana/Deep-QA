'use strict';

const { test, expect } = require('@playwright/test');

const { currentTerm } = require('../../db/term');
const { ACCOUNTS, IDS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { BACKEND_URL } = require('../support/env');
const { openDashboard, sectionCard } = require('../support/teaching-screen');

/**
 * #272 ชิ้นที่สี่ — ช่องค้นหาของ *รายวิชาที่สอน* (`frontend/src/pages/TeacherDashboard.js`)
 *
 * คำตอบของเจ้าของงาน 13 พฤศจิกายน 2569: ค้นรหัส ชื่อไทย และชื่ออังกฤษ ไม่ค้นเลขตอนเรียนและจำนวนนักศึกษา ·
 * ทางเลือกที่ไม่ถูกเลือก: รหัสกับชื่อไทยอย่างระบบที่ส่งมอบ
 * (`DEEP-QA-FRONTEND/src/components/content/TeacherContent/TeacherDashboard/TeacherDashboard.js`, `filteredCourses`)
 * และทุกอย่างที่การ์ดแสดง · กรองในเบราว์เซอร์ เพราะ `GET /api/teaching/sections` ตอบทุกตอนเรียนของภาคนี้ในครั้งเดียว
 * และไม่มีอะไรบนจอนี้แบ่งหน้า
 *
 * ## ทำไมมีวิชาที่สองในแฟ้มนี้
 *
 * seed เปิดสอนวิชาเดียว (`01076105`) จึงไม่มีอาจารย์คนไหนมีการ์ดสองวิชาให้ช่องค้นเลือกระหว่างกัน · `beforeAll`
 * จึงขึ้นทะเบียนวิชา `Z0272001` วางในหลักสูตร 0501 เปิดสอนในภาคปัจจุบัน และมอบตอนเรียนที่ 1 ให้ `teacher.one@`
 * ผ่านเส้นทางของจอที่เป็นเจ้าของข้อเท็จจริงเหล่านั้น อย่าง `20a` และ `support/hold.js` เอาออกเมื่อแฟ้มจบ (#134)
 *
 * ## ลำดับของแต่ละแถว
 *
 * การ์ดที่ควรหายถูกอ่านก่อน เพราะเป็นจุดที่จอนิ่งหลังการหน่วง (#209): การ์ดที่ควรอยู่อยู่บนจอตั้งแต่ก่อนพิมพ์
 * การอ่านมันก่อนจึงผ่านไปก่อนที่คำค้นจะถูกส่งต่อ แล้วมัตแตนต์ที่ทำให้มันหายทีหลังจะรอด (#88)
 *
 * ## สิ่งที่แฟ้มนี้ไม่ได้พูด (#123)
 *
 * - **ไม่ได้พูดว่าเลขตอนเรียนไม่ถูกค้น** — การ์ดทั้งสองเป็นตอนเรียนที่ 1 และ `1` อยู่ในรหัสทั้งสอง จึงไม่มีเลขตอนเรียน
 *   ที่ทำให้สองแบบตอบต่างกันโดยไม่ต้องสร้างตอนเรียนที่สอง · จำนวนนักศึกษามีแถว D5 (รีวิว 13 พ.ย. 2569)
 * - **ไม่ได้พูดเรื่องหน้าตาและจำนวนมิลลิวินาทีของการหน่วง** — `272a` ด้วยเหตุผลเดียวกัน (#52)
 */

const SEEDED = '01076105';
const MINE = 'Z0272001';
const MINE_TH = 'สถิติสำหรับวิศวกร';
const MINE_EN = 'Engineering Statistics';
const PROGRAM = '0501';
const BOX = 'ค้นหารายวิชา';

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/** `Z0272001` in the catalogue, in หลักสูตร 0501, open this term, ตอนเรียน 1 taught by `teacher.one@`. */
test.beforeAll(async ({ playwright }) => {
  const asMaintainer = await playwright.request.newContext();
  const asCommittee = await playwright.request.newContext();
  try {
    await asMaintainer.post(`${BACKEND_URL}/api/auth/login`, {
      data: { email: ACCOUNTS.departmentAdmin05, password: PASSWORD },
    });
    const subject = await asMaintainer.post(`${BACKEND_URL}/api/subjects`, {
      data: {
        subject_id: MINE,
        subject_name_th: MINE_TH,
        subject_name_en: MINE_EN,
        credits: 3,
        department_id: '05',
      },
    });
    expect(subject.status(), 'catalogue entry').toBe(201);
    const placed = await asMaintainer.post(`${BACKEND_URL}/api/program-subjects`, {
      data: { program_id: PROGRAM, subject_id: MINE, subject_type: 'required' },
    });
    expect(placed.status(), 'placement').toBe(201);

    await asCommittee.post(`${BACKEND_URL}/api/auth/login`, {
      data: { email: ACCOUNTS.committee0501, password: PASSWORD },
    });
    const term = currentTerm();
    const opened = await asCommittee.post(`${BACKEND_URL}/api/offerings`, {
      data: {
        program_id: PROGRAM,
        subject_id: MINE,
        academic_year: term.academicYear,
        semester: term.semester,
      },
    });
    expect(opened.status(), 'offering').toBe(201);
    const { offering } = await opened.json();
    const split = await asCommittee.post(`${BACKEND_URL}/api/offerings/${offering.id}/sections`, {
      data: { section_number: '1' },
    });
    expect(split.status(), 'section').toBe(201);
    const { section } = await split.json();
    const taught = await asCommittee.put(
      `${BACKEND_URL}/api/offerings/${offering.id}/sections/${section.section_id}/teachers`,
      { data: { user_ids: [IDS.teacherOne] } },
    );
    expect(taught.status(), 'teacher').toBe(200);
  } finally {
    await asMaintainer.dispose();
    await asCommittee.dispose();
  }
});

/** Signs `teacher.one@` in on the dashboard, with both cards drawn, and types the term. */
async function search(page, term) {
  await signIn(page, ACCOUNTS.teacherOne);
  const answer = await openDashboard(page);
  const { sections } = await answer.json();
  await expect(sectionCard(page, SEEDED), 'the seeded card, before the search').toHaveCount(1);
  await expect(sectionCard(page, MINE), 'the fixture card, before the search').toHaveCount(1);
  const box = page.getByRole('searchbox', { name: BOX });
  // Read before it is typed into, so a screen with no box dies here at a claim
  // and not at a fill's timeout (#139).
  await expect(box, 'the search box of `components/SearchBox.js`').toBeVisible();
  await box.fill(typeof term === 'function' ? term(sections) : term);
  return sections;
}

test('D1: the code is searched', async ({ page }) => {
  await search(page, '0272001');
  await expect(sectionCard(page, SEEDED), 'a code without the term is hidden').toHaveCount(0);
  await expect(sectionCard(page, MINE), 'the code holding the term is shown').toHaveCount(1);
});

test('D2: the Thai name is searched', async ({ page }) => {
  await search(page, 'เชิงวัตถุ');
  await expect(sectionCard(page, MINE), 'a Thai name without the term is hidden').toHaveCount(0);
  await expect(sectionCard(page, SEEDED), 'the Thai name holding the term is shown').toHaveCount(1);
});

test('D3: the English name is searched, in any case', async ({ page }) => {
  await search(page, 'engineering stat');
  await expect(sectionCard(page, SEEDED), 'an English name without the term is hidden').toHaveCount(0);
  await expect(sectionCard(page, MINE), 'the English name holding the term is shown').toHaveCount(1);
});

test('D4: a term nothing holds says so', async ({ page }) => {
  await search(page, 'ไม่มีวิชานี้');
  await expect(page.getByText('ไม่พบรายวิชาตามคำค้น', { exact: true }), 'the sentence').toBeVisible();
  await expect(page.getByRole('button').filter({ hasText: 'ตอนเรียน' }), 'no card is left').toHaveCount(0);
});

test('D5: the count of students is not searched', async ({ page }) => {
  // The seeded card's count, read off the answer rather than written down
  // (#129), and asked first to be in no code and no name - otherwise the term
  // would be found for another reason and the row would measure nothing.
  let count;
  await search(page, sections => {
    const seeded = sections.find(section => section.subject_id === SEEDED);
    count = String(seeded.student_count);
    const words = sections.flatMap(section => [
      section.subject_id,
      section.subject_name_th,
      section.subject_name_en,
    ]);
    expect(words.some(word => word.toLowerCase().includes(count)), 'the count is in no code or name').toBe(false);
    return count;
  });
  await expect(page.getByText('ไม่พบรายวิชาตามคำค้น', { exact: true }), 'a count is not a term the cards hold').toBeVisible();
  await expect(page.getByText(`${count} คน`), 'the count was on the card').toHaveCount(0);
});
