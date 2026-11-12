# -*- coding: utf-8 -*-
"""#273 ปุ่มของจอฝั่งอาจารย์เป็น `RowAction` — tooltip ชื่อเต็ม และตาน้ำเงินแทนชื่อแฟ้มที่กดได้

    python mutation/273-teacher-row-actions.py save
    python mutation/273-teacher-row-actions.py <mutant>
    python mutation/273-teacher-row-actions.py restore

แถวที่ถูกฆ่าอยู่ใน `e2e/tests/273a-teacher-row-actions.spec.js` ใบ `docs/acceptance/273-teacher-row-actions.md`

    cd e2e && npx playwright test tests/273a-teacher-row-actions.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## มัตแตนต์

หนึ่งตัวต่อที่ (#125) — สิบแฟ้มที่ตั๋วกับการวัดตอนลงมือนับได้ ยี่สิบที่ แต่ละตัวให้ `title=""` กับ `RowAction`
ที่เดียว ซึ่งเป็นข้ออ้างที่ปุ่มเปล่าเดิมตกพอดี: ปุ่มเปล่าไม่มีคำบนหน้าปุ่มและมีไอคอนเดียวอยู่แล้ว
สิ่งที่มันขาดคือ tooltip (#115 — โค้ดที่วินิจฉัยไว้ทำให้รันได้ ในรูปที่แยกที่ได้) ยี่สิบตัวไม่ใช่สิบ
เพราะแถวหนึ่งของ `273a` อ่านหลายปุ่มเรียงกัน และแถวรายงานเฉพาะ assertion แรกที่ตาย มัตแตนต์ที่ปุ่ม
แรกจึงพิสูจน์ปุ่มที่สองไม่ได้ (#88)

อีกสองตัวเป็นของสองข้ออ้างที่ไม่ใช่ tooltip: `t273linkisbutton` วาด *หลักฐาน* เป็นปุ่มแทนลิงก์ (สถานที่
ไม่ใช่การกระทำ #35) และ `t273namebutton` คืนชื่อแฟ้มให้เป็นปุ่มที่กดเปิดได้ คือรูปก่อนคำตอบของเจ้าของงาน
12 พ.ย. 2569 (#48)

ชื่อขึ้นต้นด้วย `t273` เพราะ harness คีย์มัตแตนต์ในแฟ้มของมันเอง และชื่ออย่าง `clo_edit` ชนกับใบอื่นได้ (#185)

## ตารางคำทำนาย (เขียนก่อนกวาด 12 พ.ย. 2569 และ commit ก่อนการรัน)

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `t273clo_edit` | `273a` *row 1: ผลการเรียนรู้รายวิชา - แก้ไข and ลบ* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273clo_remove` | `273a` *row 1: ผลการเรียนรู้รายวิชา - แก้ไข and ลบ* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273beh_edit` | `273a` *row 2: พฤติกรรมที่วัดได้ - แก้ไขข้อ and ลบข้อ* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273beh_remove` | `273a` *row 2: พฤติกรรมที่วัดได้ - แก้ไขข้อ and ลบข้อ* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273crit_edit` | `273a` *row 3: เกณฑ์การประเมิน - แก้ไขข้อ and ลบข้อ* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273crit_remove` | `273a` *row 3: เกณฑ์การประเมิน - แก้ไขข้อ and ลบข้อ* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273week_edit` | `273a` *row 4: แผนการสอน - แก้ไขสัปดาห์ที่ and ลบสัปดาห์ที่* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273week_remove` | `273a` *row 4: แผนการสอน - แก้ไขสัปดาห์ที่ and ลบสัปดาห์ที่* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273group_rename` | `273a` *row 5: กลุ่มงานนักศึกษา - เปลี่ยนชื่อ and ลบ* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273group_remove` | `273a` *row 5: กลุ่มงานนักศึกษา - เปลี่ยนชื่อ and ลบ* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273weight_remove` | `273a` *row 6: สัดส่วนคะแนน - ลบหมวดคะแนนที่* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273act_evidence` | `273a` *row 7: กิจกรรมการเรียนรู้ - หลักฐาน, แก้ไขกิจกรรม and ลบกิจกรรม* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273act_edit` | `273a` *row 7: กิจกรรมการเรียนรู้ - หลักฐาน, แก้ไขกิจกรรม and ลบกิจกรรม* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273act_remove` | `273a` *row 7: กิจกรรมการเรียนรู้ - หลักฐาน, แก้ไขกิจกรรม and ลบกิจกรรม* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273form_drop` | `273a` *row 8: the activity form - นำผลการเรียนรู้แถวที่ … ออก* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273file_open` | `273a` *row 9: หลักฐานการประเมิน - เปิดหลักฐาน, แก้ไขหลักฐาน and ลบหลักฐาน* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273file_edit` | `273a` *row 9: หลักฐานการประเมิน - เปิดหลักฐาน, แก้ไขหลักฐาน and ลบหลักฐาน* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273file_remove` | `273a` *row 9: หลักฐานการประเมิน - เปิดหลักฐาน, แก้ไขหลักฐาน and ลบหลักฐาน* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273entry_edit` | `273a` *row 10: การปรับปรุงอย่างต่อเนื่อง - แก้ไข and ลบ an entry* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273entry_remove` | `273a` *row 10: การปรับปรุงอย่างต่อเนื่อง - แก้ไข and ลบ an entry* | *its tooltip is its whole name* | อีกเก้าแถวของ `273a` · `271a` ทั้งสิบเอ็ด |
| `t273linkisbutton` | `273a` *row 7: กิจกรรมการเรียนรู้ - หลักฐาน, แก้ไขกิจกรรม and ลบกิจกรรม* ที่ *the control is drawn* (ไม่มีลิงก์ชื่อนั้น) · แถว 9 ที่การจัดฉาก (กดลิงก์ที่ไม่มี) · ทุกสเปกที่เข้าจอหลักฐานด้วยการกดลิงก์จาก `LearningActivities` | ดูคอลัมน์ซ้าย | แถวที่เหลือของ `273a` · `271a` ทั้งสิบเอ็ด (ไม่มี `to` บนจอผู้ดูแล) |
| `t273namebutton` | `273a` *row 9: หลักฐานการประเมิน - เปิดหลักฐาน, แก้ไขหลักฐาน and ลบหลักฐาน* | *the file name is text, not a button* | อีกเก้าแถวของ `273a` |

สเปกอื่นที่กดปุ่มเหล่านี้กดด้วยชื่อ ซึ่งมัตแตนต์ tooltip ไม่แตะ จึงไม่ทำนายการตายที่อื่น ยกเว้น
`t273linkisbutton` ซึ่งปุ่มที่ได้ไม่พาไปไหน แถวที่ใช้ลิงก์นั้นเป็นเครื่องมือจัดฉากจึงตายที่การจัดฉาก
ไม่ใช่ที่ข้ออ้าง (#266) — การกวาดของตัวนี้รันเฉพาะ `273a`

## คำทำนายของมัตแตนต์ใบอื่นที่ `273a` เอื้อมถึง (#248, #257)

สี่ตัวของ `mutation/271-action-icons.py` แก้ `RowAction.js` ซึ่งตอนนี้วาดปุ่มของจอฝั่งอาจารย์ด้วย
จำนวนที่ใบ `271` ให้เครดิตจึงหมดอายุ ทำนายต่อ assertion ไม่ใช่ต่อแถว (#258) และกวาดกับ `273a`

| มัตแตนต์ | แถวของ `273a` ที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `wordsdrawn` | ทั้งสิบ | *no word is drawn* — tooltip ยังถูก จึงผ่านบรรทัดก่อนหน้า | ไม่มี |
| `notitle` | ทั้งสิบ | *its tooltip is its whole name* — ไม่มีผู้เรียกฝั่งอาจารย์คนไหนส่ง `title` | ไม่มี |
| `noicon` | ทั้งสิบ | *it holds one icon* | ไม่มี |
| `reasonlost` | ไม่มี | — | ทั้งสิบ: `title={label}` กับ `title ?? label` ให้ค่าเดียวกันเมื่อไม่มีใครส่ง `title` และในสิบแฟ้มไม่มีใครส่ง (grep `title=` ใต้ `<RowAction` 12 พ.ย. 2569 พบแค่ `GrantsPanel.js` กับ `Users.js`) |
"""

from harness import main

FILES = {
    'clos': 'frontend/src/pages/CourseOutcomes.js',
    'behaviors': 'frontend/src/pages/MeasurableBehaviors.js',
    'criteria': 'frontend/src/pages/AchievementCriteria.js',
    'plan': 'frontend/src/pages/TeachingPlan.js',
    'groups': 'frontend/src/pages/StudentGroups.js',
    'weights': 'frontend/src/pages/GradingWeights.js',
    'activities': 'frontend/src/pages/LearningActivities.js',
    'form': 'frontend/src/components/activity/ActivityForm.js',
    'evidence': 'frontend/src/pages/ActivityEvidence.js',
    'entry': 'frontend/src/components/improvement/EntrySection.js',
    'action': 'frontend/src/components/RowAction.js',
}

MUTANTS = {
    # row 1: ผลการเรียนรู้รายวิชา - แก้ไข and ลบ: this button's tooltip is gone again
    't273clo_edit': ('clos',
        '                      label={`แก้ไข ${clo.clo_number}`}\n',
        '                      label={`แก้ไข ${clo.clo_number}`}\n                      title=""\n'),
    # row 1: ผลการเรียนรู้รายวิชา - แก้ไข and ลบ: this button's tooltip is gone again
    't273clo_remove': ('clos',
        '                      label={`ลบ ${clo.clo_number}`}\n',
        '                      label={`ลบ ${clo.clo_number}`}\n                      title=""\n'),
    # row 2: พฤติกรรมที่วัดได้ - แก้ไขข้อ and ลบข้อ: this button's tooltip is gone again
    't273beh_edit': ('behaviors',
        '                      label={`แก้ไขข้อ ${behavior.behavior_no}`}\n',
        '                      label={`แก้ไขข้อ ${behavior.behavior_no}`}\n                      title=""\n'),
    # row 2: พฤติกรรมที่วัดได้ - แก้ไขข้อ and ลบข้อ: this button's tooltip is gone again
    't273beh_remove': ('behaviors',
        '                      label={`ลบข้อ ${behavior.behavior_no}`}\n',
        '                      label={`ลบข้อ ${behavior.behavior_no}`}\n                      title=""\n'),
    # row 3: เกณฑ์การประเมิน - แก้ไขข้อ and ลบข้อ: this button's tooltip is gone again
    't273crit_edit': ('criteria',
        '                      label={`แก้ไขข้อ ${criterion.criteria_no}`}\n',
        '                      label={`แก้ไขข้อ ${criterion.criteria_no}`}\n                      title=""\n'),
    # row 3: เกณฑ์การประเมิน - แก้ไขข้อ and ลบข้อ: this button's tooltip is gone again
    't273crit_remove': ('criteria',
        '                      label={`ลบข้อ ${criterion.criteria_no}`}\n',
        '                      label={`ลบข้อ ${criterion.criteria_no}`}\n                      title=""\n'),
    # row 4: แผนการสอน - แก้ไขสัปดาห์ที่ and ลบสัปดาห์ที่: this button's tooltip is gone again
    't273week_edit': ('plan',
        '                      label={`แก้ไขสัปดาห์ที่ ${week.week_no} · ${week.title}`}\n',
        '                      label={`แก้ไขสัปดาห์ที่ ${week.week_no} · ${week.title}`}\n                      title=""\n'),
    # row 4: แผนการสอน - แก้ไขสัปดาห์ที่ and ลบสัปดาห์ที่: this button's tooltip is gone again
    't273week_remove': ('plan',
        '                      label={`ลบสัปดาห์ที่ ${week.week_no} · ${week.title}`}\n',
        '                      label={`ลบสัปดาห์ที่ ${week.week_no} · ${week.title}`}\n                      title=""\n'),
    # row 5: กลุ่มงานนักศึกษา - เปลี่ยนชื่อ and ลบ: this button's tooltip is gone again
    't273group_rename': ('groups',
        '                      label={`เปลี่ยนชื่อ ${group.group_name}`}\n',
        '                      label={`เปลี่ยนชื่อ ${group.group_name}`}\n                      title=""\n'),
    # row 5: กลุ่มงานนักศึกษา - เปลี่ยนชื่อ and ลบ: this button's tooltip is gone again
    't273group_remove': ('groups',
        '                      label={`ลบ ${group.group_name}`}\n',
        '                      label={`ลบ ${group.group_name}`}\n                      title=""\n'),
    # row 6: สัดส่วนคะแนน - ลบหมวดคะแนนที่: this button's tooltip is gone again
    't273weight_remove': ('weights',
        '                    label={`ลบหมวดคะแนนที่ ${index + 1}`}\n',
        '                    label={`ลบหมวดคะแนนที่ ${index + 1}`}\n                    title=""\n'),
    # row 7: กิจกรรมการเรียนรู้ - หลักฐาน, แก้ไขกิจกรรม and ลบกิจกรรม: this button's tooltip is gone again
    't273act_evidence': ('activities',
        '                              label={`หลักฐานการประเมินของ ${activity.activity_name}`}\n',
        '                              label={`หลักฐานการประเมินของ ${activity.activity_name}`}\n                              title=""\n'),
    # row 7: กิจกรรมการเรียนรู้ - หลักฐาน, แก้ไขกิจกรรม and ลบกิจกรรม: this button's tooltip is gone again
    't273act_edit': ('activities',
        '                              label={`แก้ไขกิจกรรม ${activity.activity_name}`}\n',
        '                              label={`แก้ไขกิจกรรม ${activity.activity_name}`}\n                              title=""\n'),
    # row 7: กิจกรรมการเรียนรู้ - หลักฐาน, แก้ไขกิจกรรม and ลบกิจกรรม: this button's tooltip is gone again
    't273act_remove': ('activities',
        '                              label={`ลบกิจกรรม ${activity.activity_name}`}\n',
        '                              label={`ลบกิจกรรม ${activity.activity_name}`}\n                              title=""\n'),
    # row 8: the activity form - นำผลการเรียนรู้แถวที่ … ออก: this button's tooltip is gone again
    't273form_drop': ('form',
        '                    label={`นำผลการเรียนรู้แถวที่ ${index + 1} ออก`}\n',
        '                    label={`นำผลการเรียนรู้แถวที่ ${index + 1} ออก`}\n                    title=""\n'),
    # row 9: หลักฐานการประเมิน - เปิดหลักฐาน, แก้ไขหลักฐาน and ลบหลักฐาน: this button's tooltip is gone again
    't273file_open': ('evidence',
        '                      label={`เปิดหลักฐาน ${file.file_name}`}\n',
        '                      label={`เปิดหลักฐาน ${file.file_name}`}\n                      title=""\n'),
    # row 9: หลักฐานการประเมิน - เปิดหลักฐาน, แก้ไขหลักฐาน and ลบหลักฐาน: this button's tooltip is gone again
    't273file_edit': ('evidence',
        '                      label={`แก้ไขหลักฐาน ${file.file_name}`}\n',
        '                      label={`แก้ไขหลักฐาน ${file.file_name}`}\n                      title=""\n'),
    # row 9: หลักฐานการประเมิน - เปิดหลักฐาน, แก้ไขหลักฐาน and ลบหลักฐาน: this button's tooltip is gone again
    't273file_remove': ('evidence',
        '                      label={`ลบหลักฐาน ${file.file_name}`}\n',
        '                      label={`ลบหลักฐาน ${file.file_name}`}\n                      title=""\n'),
    # row 10: การปรับปรุงอย่างต่อเนื่อง - แก้ไข and ลบ an entry: this button's tooltip is gone again
    't273entry_edit': ('entry',
        '              label={`แก้ไข${label}`}\n',
        '              label={`แก้ไข${label}`}\n              title=""\n'),
    # row 10: การปรับปรุงอย่างต่อเนื่อง - แก้ไข and ลบ an entry: this button's tooltip is gone again
    't273entry_remove': ('entry',
        '              label={`ลบ${label}`}\n',
        '              label={`ลบ${label}`}\n              title=""\n'),
    # หลักฐาน is drawn as a button that goes nowhere instead of a link
    't273linkisbutton': ('action',
        "  const Square = to ? Link : 'button'\n",
        "  const Square = 'button'\n"),
    # the file name is the control that opens it again, as before the answer
    't273namebutton': ('evidence',
        '                    <p className="mt-1 text-sm text-gray-900">{file.file_name}</p>\n',
        '                    <button type="button" onClick={() => open(file)} className="mt-1 text-sm text-primary">{file.file_name}</button>\n'),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
