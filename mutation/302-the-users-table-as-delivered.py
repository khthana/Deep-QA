# -*- coding: utf-8 -*-
"""#302 — ตารางผู้ใช้งานกลับไปเป็นแบบที่ส่งมอบ

คำตอบของเจ้าของงานเมื่อ 22 พ.ย. 2569 (`docs/users-screen.md` ข้อ 1–3) และคำถามสี่ข้อของ 23 พ.ย. 2569
(หัวคอลัมน์ใช้คำของเดิม · *ดำเนินการ* ไม่ใช่ *จัดการ* · ลำดับนับต่อข้ามหน้า · สวิตช์อย่างเดียวไม่มีคำ)
ข้ออ้างอยู่ใน `e2e/tests/302a-the-users-table-as-delivered.spec.js` และใบรับงานคือ
`docs/acceptance/11-user-accounts.md` §#302

**สิ่งที่ไม่อยู่ที่นี่ โดยตั้งใจ** — ตัดชื่อ `role="switch"` ออก หรือเปลี่ยนชื่อของไอคอนแก้ไขให้ไม่ขึ้นต้นด้วย
*แก้ไข␠* ไม่ใช่มัตแตนต์ของใบนี้: สองอย่างนั้นคือสิ่งที่ `statusSwitch` `statusButton` และ `editButton` ใน
`e2e/support/users-screen.js` ใช้**หา**ตัวควบคุม จึงเป็นสมมติฐานของทุกแถวที่กดมัน ไม่ใช่ข้ออ้างของแถวไหน (#85, #111)
มัตแตนต์แบบนั้นจะหยุดทุกแถวที่กดสวิตช์หรือไอคอน และไม่พิสูจน์อะไรเกี่ยวกับตั๋วนี้ · ชื่อของไอคอนจึงถูกพิสูจน์ด้วย
ชื่อที่ยังขึ้นต้นด้วยคำกริยาแต่เอ่ยบัญชีผิดทาง (`editnamedbycode`) ไม่ใช่ด้วยการลบชื่อ

## ตารางมัตแตนต์ — คำทำนาย เขียนก่อนรันตัวแรก (#255 · 23 พ.ย. 2569)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่ทำนายว่ามันฆ่า |
|---|---|---|
| `managecolumn` | หัวคอลัมน์สุดท้ายเป็น *จัดการ* ตามถ้อยคำของกฎข้อ 1 — ทางที่เจ้าของงานไม่เลือก เขียนให้รันได้ (#48) | **1** — `302a` แถว 1 ที่ `toEqual(HEADERS)` |
| `ordinalperpage` | ลำดับเป็น `index + 1` อย่างจอที่ส่งมอบ นับ 1 ใหม่ทุกหน้า — ทางที่เจ้าของงานไม่เลือก (#48) | **1** — `302a` แถว 3 ที่ลำดับของหน้า 2 (`toEqual(second.map(...))`) ไม่ใช่ที่หน้า 1 ซึ่งสองทางให้ค่าเดียวกัน (#154) |
| `thainametitleless` | คอลัมน์ชื่อไทยไม่มีคำนำหน้า อย่างจอที่ส่งมอบ | **1** — `302a` แถว 2 ที่ช่อง *ชื่อ สกุล (ไทย)* |
| `englishcolumnthai` | คอลัมน์ชื่ออังกฤษวาดชื่อไทย | **1** — `302a` แถว 2 ที่ช่อง *ชื่อ สกุล (อังกฤษ)* (ช่องไทยข้างบนยังถูก) |
| `switchsaysaword` | วาดคำ *ใช้งานอยู่ / ถูกระงับ* ข้างสวิตช์ — ทางที่เจ้าของงานไม่เลือกเมื่อ 23 พ.ย. 2569 (#48) | **1** — `302a` แถว 4 ที่ช่อง *สถานะ* `toHaveText('')` |
| `switchnamedbycode` | ชื่อของสวิตช์เป็น *สถานะ ‹รหัส›* แทนชื่อคน | **1** — `302a` แถว 4 ที่ `toHaveAccessibleName` |
| `editnamedbycode` | ชื่อของไอคอนแก้ไขเป็น *แก้ไข ‹รหัส›* แทนชื่อคน — ยังขึ้นต้นด้วยคำกริยา จึงยังหาเจอ | **1** — `302a` แถว 6 ที่ `toHaveAccessibleName` |
| `edittitleisword` | tooltip ของไอคอนเป็นคำกริยาเปล่า ๆ ไม่เอ่ยบัญชี | **1** — `302a` แถว 6 ที่ *its tooltip* |
| `editwordsdrawn` | วาดคำ *แก้ไข* ไว้ข้างไอคอน | **1** — `302a` แถว 6 ที่ *no word drawn beside it* |

## มัตแตนต์ของใบอื่นที่ #302 เล็งใหม่หรือไปถึง — คำทำนาย (23 พ.ย. 2569, ก่อนรัน)

`302a` เป็น spec ใหม่ที่กดตัวควบคุมของจอซึ่งใบอื่นถือมัตแตนต์อยู่ และการแก้นี้เปลี่ยนตัวควบคุมที่มัตแตนต์ของ
`84` `86` `271` ไปถึง ยอดฆ่าของตัวที่ไม่มีใครแก้จึงหมดอายุ (#248, #257) · รันกับ `302a` `84a` `86a` `271a` `12a`

| ชื่อ | คำทำนาย |
|---|---|
| `86:alwaysoffersuspend` (เล็งใหม่ `checked={true}`) | `86a` **3** ล้ม — แถว 3 ที่ *the row's own status cell* (ข้อเดียวกับ *the control, now offering the way back* ตั้งแต่ #302) แถว 4 กับ 5 ที่ *the change the row arrives offering* · `302a` **1** — แถว 4 ที่ `aria-checked` ของรอบ `inactive` · `84a` **0** |
| `86:alwaysofferrestore` (เล็งใหม่ `checked={false}`) | `86a` **4** ล้ม — แถว 1 2 3 ที่ *the change the row arrives offering* แถว 5 ที่ *the row's own status cell* · `302a` **2** — แถว 4 ที่ `aria-checked` ของรอบ `active` และแถว 5 ที่ *the switch while the question is open* · `84a` **1** — แถว 3 ที่ `aria-checked` ของแถวตัวเอง |
| `86:pressflipstherow` | `86a` **1** — แถว 1 ที่ *the row, still offering the same change* · `302a` **1** — แถว 5 ที่ *the switch while the question is open* |
| `86:togglenoreload` | `86a` **2** — แถว 3 กับ 5 ที่ *the row's own status cell* · `302a` **0** |
| `84:alwaysenabled` | `84a` **1** — แถว 1 ที่ `toBeDisabled` · `302a` **0** |
| `84:everyrowisdead` | `84a` **1** — แถว 2 ที่ `toBeEnabled` · `302a` **2** — แถว 4 ที่ `toBeEnabled` และแถว 5 ที่การกด (การจัดฉาก ไม่ใช่ข้ออ้าง — #266) · `86a` **5** ที่การกด (การจัดฉาก) |
| `84:titledrifts` | `84a` **1** — แถว 1 ที่ `title` · `302a` **0** |
| `271:wordsdrawn` `271:notitle` `271:noicon` | `271a` **10** ต่อตัว — แถว 1–4 และ 6–11 ที่ข้อเดียวกับเมื่อ 11 พ.ย. 2569 · แถว 5 ถอนแล้ว จึงไม่ใช่ 11 อีก · `302a` **0** — ไอคอนแก้ไขของจอนี้ไม่ใช่ `RowAction` แล้ว |
| `271:reasonlost` | **1** — `12a` แถว 6 ที่ `title` เท่านั้น · `84a` ไม่ตายแล้ว เพราะ `title` ของสวิตช์ไม่ได้มาจาก `RowAction` (เมื่อ 11 พ.ย. 2569 ตาย 2) |

## การกวาด — บันทึกผล (23 พ.ย. 2569)

ทีละตัว `save` → มัตแตนต์ → ถามต้นไม้ว่ามันอยู่ในนั้นจริง (#268) → รัน → `restore` → ถามต้นไม้ว่าตรงกับ `HEAD` ·
รอบแรกล้มที่ `restore` หลัง `thainametitleless` (`OSError 22` ตอนเขียน `Users.js` ทับ — OneDrive ถือแฟ้มอยู่) ต้นไม้ค้างมัตแตนต์ไว้
และ `save` ของตัวถัดไปทุกตัวปฏิเสธ (#126) — ผลของสิบสามตัวถัดมา และของ `271` สี่ตัวที่รันทับมัตแตนต์นั้น ถูกทิ้งทั้งหมด (#146) แล้วรันใหม่
ด้วยการ `restore` ที่ลองซ้ำและหยุดทั้งรอบถ้าต้นไม้ไม่ตรงกับ `HEAD` · สามตัวแรกรันก่อนการล้ม จึงใช้ได้

| ชื่อ | ล้ม | ตายที่ | ตรงคำทำนาย |
|---|---|---|---|
| `managecolumn` | 1 | `302a` แถว 1 `toEqual(HEADERS)` | ✓ |
| `ordinalperpage` | 1 | `302a` แถว 3 ลำดับของหน้า 2 | ✓ |
| `thainametitleless` | 1 | `302a` แถว 2 ช่องไทย | ✓ |
| `englishcolumnthai` | 1 | `302a` แถว 2 ช่องอังกฤษ | ✓ |
| `switchsaysaword` | 1 | `302a` แถว 4 `toHaveText('')` | ✓ |
| `switchnamedbycode` | 1 | `302a` แถว 4 `toHaveAccessibleName` | ✓ |
| `editnamedbycode` | 1 | `302a` แถว 6 `toHaveAccessibleName` | ✓ |
| `edittitleisword` | 1 | `302a` แถว 6 *its tooltip* | ✓ |
| `editwordsdrawn` | 1 | `302a` แถว 6 *no word drawn beside it* | ✓ |
| `86:alwaysoffersuspend` | 4 | `86a` แถว 3 *the row's own status cell* · แถว 4 กับ 5 ใน `arrive` · `302a` แถว 4 `aria-checked` | ✓ |
| `86:alwaysofferrestore` | 7 | `86a` แถว 1 2 3 ใน `arrive` · แถว 5 *the row's own status cell* · `302a` แถว 4 `aria-checked` · แถว 5 *while the question is open* · `84a` แถวที่สาม `aria-checked` | ✓ |
| `86:pressflipstherow` | 2 | `86a` แถว 1 *still offering the same change* · `302a` แถว 5 *while the question is open* | ✓ |
| `86:togglenoreload` | 2 | `86a` แถว 3 กับ 5 *the row's own status cell* | ✓ |
| `84:alwaysenabled` | 1 | `84a` แถวแรก `toBeDisabled` | ✓ |
| `84:everyrowisdead` | 8 | `84a` แถวที่สอง `toBeEnabled` · `302a` แถว 4 `toBeEnabled` · `302a` แถว 5 และ `86a` ห้าแถวที่การกด (การจัดฉาก #266) | ✓ |
| `84:titledrifts` | 1 | `84a` แถวแรก `title` | ✓ |
| `271:wordsdrawn` `notitle` `noicon` | 10 ต่อตัว | `271a` แถว 1–4 และ 6–11 · `302a` ไม่ตาย | ✓ |
| `271:reasonlost` | 1 | `12a` แถว 6 `title` | ✓ |

ยี่สิบสองตัวตรงทั้งยี่สิบสองตัว ทั้งจำนวนและบรรทัด · **ข้ออ้างหนึ่งข้อที่ไม่มีมัตแตนต์ตัวไหนไปถึง**: *the switch after ยกเลิก*
ท้ายแถว 5 อยู่ใต้บรรทัดที่ทุกตัวตายก่อน (#88) — ใบรับงานแยกมันเป็นแถว ☑ ของตัวเอง ไม่ให้มันขี่ ⚙ ของบรรทัดข้างบน

## วิธีรัน

    python mutation/302-the-users-table-as-delivered.py save
    python mutation/302-the-users-table-as-delivered.py <mutant>
    python mutation/302-the-users-table-as-delivered.py restore
    cd e2e && npx playwright test tests/302a-the-users-table-as-delivered.spec.js
    # พอร์ต: ย่อหน้า Ports ของ e2e/README.md — ตั้ง E2E_BACKEND_PORT หรือ E2E_FRONTEND_PORT เฉพาะเมื่อพอร์ตของชุดนี้ตกในช่วงที่ Hyper-V จอง
"""
from harness import main

FILES = {
    'users': 'frontend/src/pages/Users.js',
}

MUTANTS = {
    # ทางที่เจ้าของงานไม่เลือก: คำของกฎข้อ 1 แทนคำของจอที่ส่งมอบ
    'managecolumn': ('users',
        "  'สถานะ',\n  'ดำเนินการ',\n]\n",
        "  'สถานะ',\n  'จัดการ',\n]\n"),
    # ทางที่เจ้าของงานไม่เลือก: ลำดับนับ 1 ใหม่ทุกหน้า อย่าง `UserTable.js`
    'ordinalperpage': ('users',
        "                        {((data.page || 1) - 1) * (data.per_page || PAGE_SIZE) + index + 1}\n",
        "                        {index + 1}\n"),
    # คอลัมน์ชื่อไม่มีคำนำหน้า อย่างจอที่ส่งมอบ
    'thainametitleless': ('users',
        "    ? [user[`title_${lang}`], user[`first_name_${lang}`], user[`last_name_${lang}`]]\n",
        "    ? [user[`first_name_${lang}`], user[`last_name_${lang}`]]\n"),
    # คอลัมน์อังกฤษวาดชื่อไทย
    'englishcolumnthai': ('users',
        "                      <td className=\"px-4 py-2\">{nameIn(user, 'en')}</td>\n",
        "                      <td className=\"px-4 py-2\">{nameIn(user, 'th')}</td>\n"),
    # ทางที่เจ้าของงานไม่เลือก: คำข้างสวิตช์
    'switchsaysaword': ('users',
        "                          title={isSelf(user) ? CANNOT_SUSPEND_SELF : undefined}\n"
        "                        />\n",
        "                          title={isSelf(user) ? CANNOT_SUSPEND_SELF : undefined}\n"
        "                        />\n"
        "                        <span>{suspends(user) ? 'ใช้งานอยู่' : 'ถูกระงับ'}</span>\n"),
    # สวิตช์ถูกตั้งชื่อด้วยรหัส ไม่ใช่ด้วยชื่อคน
    'switchnamedbycode': ('users',
        "                          label={`สถานะ ${personName(user)}`}\n",
        "                          label={`สถานะ ${user.user_id}`}\n"),
    # ไอคอนแก้ไขถูกตั้งชื่อด้วยรหัส - ยังขึ้นต้นด้วยคำกริยา ตัวหาจึงยังเจอ
    'editnamedbycode': ('users',
        "                            aria-label={`แก้ไข ${personName(user)}`}\n",
        "                            aria-label={`แก้ไข ${user.user_id}`}\n"),
    # tooltip เป็นคำกริยาเปล่า
    'edittitleisword': ('users',
        "                            title={`แก้ไข ${personName(user)}`}\n",
        "                            title=\"แก้ไข\"\n"),
    # คำถูกวาดข้างไอคอน
    'editwordsdrawn': ('users',
        "                            <FaUserEdit aria-hidden=\"true\" className=\"text-2xl\" />\n",
        "                            <FaUserEdit aria-hidden=\"true\" className=\"text-2xl\" />\n"
        "                            แก้ไข\n"),
}

main(FILES, MUTANTS)
