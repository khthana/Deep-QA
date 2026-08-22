'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { openPrograms, programRow, waitForList } = require('../support/programs-screen');

/**
 * แถบแจ้งผลที่อยู่เหนือขอบจอ — ตั๋ว #55
 *
 * พื้นที่เนื้อหาใน `frontend/src/pages/Mainpage.js` เลื่อนของมันเอง
 * (`flex-1 overflow-y-auto`) ส่วนแถบแจ้งผลถูกวาดไว้บนสุดของหน้า เหนือฟอร์ม
 * คนที่กรอกฟอร์มยาวจึงมองอยู่ที่ก้นพื้นที่ตอนกด *บันทึก* คำตอบมาถึงจริง
 * แถบขึ้นจริง และไม่มีอะไรมาลบมัน แต่มันอยู่เหนือขอบจอและไม่มีใครเห็น
 * ตั๋วเขียนไว้ว่าฝั่งที่หนักกว่าคือแถบแดง — คำปฏิเสธที่ไม่มีใครอ่าน
 * คือการบันทึกที่คนเชื่อว่าสำเร็จไปแล้ว
 *
 * ไฟล์นี้ยึดสองกรณีนั้นไว้ที่หน้าหลักสูตร ซึ่งเป็นหน้าที่ตั๋วบอกว่าฟอร์มยาวที่สุด
 * แต่สิ่งที่ถูกยึดไม่ใช่ของหน้าหลักสูตร — การแก้อยู่ใน `components/Notice.js`
 * ตัวเดียวที่ทั้งหกหน้าใช้ร่วมกัน ตามที่ตั๋วสั่งว่า *ทำครั้งเดียว*
 *
 * สองอย่างในนี้เป็นของที่ตั้งใจวางไว้ ไม่ใช่รสนิยม
 *
 * `viewport` ที่เตี้ย เพราะที่ความสูงปกติของ `Desktop Chrome` ฟอร์มหลักสูตร
 * ไม่ยาวพอจะทำให้พื้นที่เนื้อหาเลื่อนได้เลย และการทดสอบที่ล้มไม่ได้ต่อให้ไม่แก้โค้ด
 * คือสิ่งที่โครงการนี้ใช้เวลาสองตั๋วในการกำจัดออกไป
 *
 * ข้อยืนยันว่า *หัวข้อฟอร์มไม่อยู่ในจอ* ก่อนกดบันทึก เพราะถ้าพื้นที่ไม่ได้เลื่อนจริง
 * แถบก็จะอยู่ในจอตั้งแต่แรกโดยไม่ต้องมีใครทำอะไร และ `toBeInViewport()` ท้ายเทสต์
 * จะผ่านด้วยเหตุผลที่ผิด บรรทัดนั้นทำให้เทสต์ล้มตรงที่ *สมมติฐานพัง* แทนที่จะผ่านเงียบ ๆ
 * และเลือกยึดหัวข้อแทนที่จะไปอ่าน `scrollTop` ของ div ที่รู้จักจากคลาส Tailwind
 * เพราะคลาสนั้นอยู่ในไฟล์ที่เทสต์นี้ไม่ได้เป็นเจ้าของ
 *
 * ทั้งสองเทสต์ไม่เขียนแถวใหม่ลงฐานข้อมูล กรณีแดงใช้รหัสที่ชนกับ seed
 * ซึ่งเซิร์ฟเวอร์ปฏิเสธ กรณีเขียวเปิดแถวเดิมขึ้นมาแล้วบันทึกทับด้วยค่าเดิม
 */

// เตี้ยพอให้ฟอร์มล้นพื้นที่เนื้อหา — เหตุผลอยู่ในหัวไฟล์
test.use({ viewport: { width: 900, height: 400 } });

/** เลื่อนพื้นที่เนื้อหาลงไปจนสุด โดยเลื่อนไปหาปุ่มที่อยู่ก้นฟอร์ม */
async function scrollToBottomOfForm(page) {
  await page.getByRole('button', { name: 'บันทึก' }).scrollIntoViewIfNeeded();
}

/**
 * สมมติฐานของเทสต์: พื้นที่เลื่อนไปแล้วจริง
 *
 * หัวข้อฟอร์มอยู่บนสุดของพื้นที่ ถ้ามันยังอยู่ในจอแปลว่าไม่มีอะไรเลื่อน
 * และข้อยืนยันเรื่องแถบข้างล่างจะไม่มีความหมาย
 */
async function expectScrolledPastHeading(page, heading) {
  await expect(page.getByRole('heading', { name: heading })).not.toBeInViewport();
}

test.describe('แถบแจ้งผลหลังบันทึกจากก้นฟอร์มยาว — #55', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await openPrograms(page);
  });

  test('แถบแดงที่ปฏิเสธการบันทึกอยู่ในจอ โดยไม่ต้องเลื่อนขึ้นไปหา', async ({ page }) => {
    await page.getByRole('button', { name: 'เพิ่มหลักสูตร' }).click();

    await page.getByLabel('รหัสหลักสูตร', { exact: true }).fill('0501');
    // `getByRole` ไม่ใช่ `getByLabel` ที่นี่: ป้ายหุ้ม `<select>` ไว้ทั้งก้อน
    // ข้อความของป้ายจึงนับรวมข้อความของทุก option เข้าไปด้วย และ exact ก็ไม่ตรงกับอะไรเลย
    await page.getByRole('combobox', { name: 'ภาควิชา' }).selectOption('05');
    await page
      .getByLabel('ชื่อหลักสูตร (ไทย)', { exact: true })
      .fill('หลักสูตรที่ใช้รหัสซ้ำ');

    await scrollToBottomOfForm(page);
    await expectScrolledPastHeading(page, 'เพิ่มหลักสูตร');

    const [answer] = await Promise.all([
      page.waitForResponse(
        response =>
          new URL(response.url()).pathname === '/api/programs' &&
          response.request().method() === 'POST',
      ),
      page.getByRole('button', { name: 'บันทึก' }).click(),
    ]);
    expect(answer.ok()).toBe(false);

    // แถบแดงของหน้าจอ ไม่ใช่ข้อความข้างช่องกรอก
    const refusal = page.locator('.bg-red-50').first();
    await expect(refusal).toBeVisible();
    await expect(refusal).toBeInViewport();
  });

  /**
   * การปฏิเสธครั้งที่สองด้วยข้อความเดิม
   *
   * กรณีที่แยกออกมาเป็นเทสต์ของตัวเอง เพราะมันเป็นทางเดียวที่แถบไม่ถูกล้างก่อน
   * ฟอร์มยังเปิดอยู่หลังคำปฏิเสธ คนเลื่อนกลับลงไปกดบันทึกอีกครั้ง และได้คำปฏิเสธเดิม
   * คำต่อคำ ถ้า `Notice` ตัดสินจากตัวข้อความ มันจะเห็นว่าไม่มีอะไรเปลี่ยน
   * และปล่อยแถบไว้เหนือขอบจออีกครั้ง ซึ่งคือข้อบกพร่องเดิมที่ตั๋วนี้เปิดขึ้นมาเพื่อแก้
   */
  test('คำปฏิเสธครั้งที่สองที่ข้อความเหมือนเดิม ก็ถูกพากลับมาอยู่ในจอ', async ({ page }) => {
    await page.getByRole('button', { name: 'เพิ่มหลักสูตร' }).click();

    await page.getByLabel('รหัสหลักสูตร', { exact: true }).fill('0501');
    await page.getByRole('combobox', { name: 'ภาควิชา' }).selectOption('05');
    await page
      .getByLabel('ชื่อหลักสูตร (ไทย)', { exact: true })
      .fill('หลักสูตรที่ใช้รหัสซ้ำ');

    const refusal = page.locator('.bg-red-50').first();

    for (const attempt of ['ครั้งแรก', 'ครั้งที่สอง']) {
      await scrollToBottomOfForm(page);
      await expectScrolledPastHeading(page, 'เพิ่มหลักสูตร');

      const [answer] = await Promise.all([
        page.waitForResponse(
          response =>
            new URL(response.url()).pathname === '/api/programs' &&
            response.request().method() === 'POST',
        ),
        page.getByRole('button', { name: 'บันทึก' }).click(),
      ]);
      expect(answer.ok(), attempt).toBe(false);

      await expect(refusal, attempt).toBeVisible();
      await expect(refusal, attempt).toBeInViewport();
    }
  });

  test('แถบเขียวที่ยืนยันการบันทึกอยู่ในจอ โดยไม่ต้องเลื่อนขึ้นไปหา', async ({ page }) => {
    await programRow(page, '0503').getByRole('button', { name: 'แก้ไข' }).click();
    await expect(page.getByRole('heading', { name: 'แก้ไขหลักสูตร' })).toBeVisible();

    await scrollToBottomOfForm(page);
    await expectScrolledPastHeading(page, 'แก้ไขหลักสูตร');

    // บันทึกทับด้วยค่าเดิม — แถบเขียวที่ต้องเห็นเกิดขึ้นโดยไม่เปลี่ยนข้อมูลอะไรเลย
    const [answer] = await Promise.all([
      waitForList(page),
      page.getByRole('button', { name: 'บันทึก' }).click(),
    ]);
    expect(answer.status()).toBe(200);

    const done = page.getByText('บันทึกข้อมูลเรียบร้อยแล้ว');
    await expect(done).toBeVisible();
    await expect(done).toBeInViewport();
  });
});
