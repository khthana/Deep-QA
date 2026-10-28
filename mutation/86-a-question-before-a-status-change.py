# -*- coding: utf-8 -*-
"""#86 — การเปลี่ยนสถานะบัญชีถามก่อน ทั้งสองทิศ และกล่องเอ่ยว่าเป็นบัญชีใบไหน

จอที่ส่งมอบมีกล่องนี้อยู่แล้ว — `UserTable.js` ของ `DEEP-QA-FRONTEND` วาด `Switch` ในคอลัมน์ *สถานะ*
และเปิด `StatusConfirmModal` ที่เอ่ยชื่อเจ้าของบัญชี ส่วนที่สร้างใหม่วาดปุ่มข้อความข้าง *แก้ไข* แล้ว
**ทิ้งคำถามไป** การเดินแถว *ระงับโดยไม่ลบ* เมื่อ 21 ส.ค. 2569 บันทึกไว้ว่า *กดครั้งเดียวไม่มีกล่องยืนยัน*
และเกณฑ์ข้อ 3 ของ #11 ไม่ได้ขอกล่อง จึงไม่ถือว่าตก ใบนี้จึงเป็นคำถามของเจ้าของข้อกำหนด ไม่ใช่ข้อบกพร่อง
คำตอบเมื่อ 16 ต.ค. 2569 คือ **ถามทั้งสองทิศ จากปุ่มที่มันอยู่**

## ตัวค้ำ

| ชื่อ | สิ่งที่มันทำ | แถวที่มันฆ่า |
|---|---|---|
| `presswriteswithoutasking` | โค้ดที่ตั๋ววินิจฉัยไว้ เขียนให้รันได้ (#115) — การกดปุ่มเขียนทันทีอย่างที่ `toggle` ทำก่อน #86 | `86a` แถว 1 ที่ *writes made before anybody answered* ไม่ใช่ที่สถานะที่เก็บไว้บรรทัดถัดไป (แถว 2 กับ 4 เป็นแถวข้างเคียง) · ล้ม 3 ผ่าน 2 |
| `wrongtitle` | หัวข้อของกล่องไม่ใช่ถ้อยคำของจอที่ส่งมอบ | `86a` แถว 1 ที่หัวข้อของคำถาม (แถว 2 กับ 4 ที่หัวข้อเดียวกัน) |
| `namesnobody` | กล่องถามโดยไม่เอ่ยว่าบัญชีใบไหน ซึ่งเป็นสิ่งเดียวที่ดักการกดผิดแถวได้ | `86a` แถว 1 ที่ประโยคในกล่อง (แถว 4 ที่ประโยคของทิศกลับ) |
| `cancelwrites` | *ยกเลิก* เขียนเหมือน *ยืนยันการเปลี่ยน* | `86a` แถว 2 ที่ *writes made by a question that was answered no* · ล้ม 1 ผ่าน 4 |
| `alwayssuspends` | ทิศของการเขียนเป็น `inactive` เสมอ | `86a` แถว 5 ที่ประโยคของการเปิดใช้งาน |
| `alwaysrestores` | ทิศของการเขียนเป็น `active` เสมอ | `86a` แถว 3 ที่ประโยคของการระงับ |
| `asksthewrongdirection` | ประโยคในกล่องเป็นของการระงับเสมอ ส่วนการเขียนยังถูกทิศ | `86a` แถว 4 ที่ประโยคในกล่อง |
| `doesnotclose` | ตัด `setSwitching(null)` ออกจากทางสำเร็จ กล่องจึงค้างหลังคำตอบ (ทาง `catch` ยังปิด จึงไม่ใช่การลบทั้งคู่) | `86a` แถว 3 กับ 5 ที่ *the question, closed by its own answer* · ล้ม 2 ผ่าน 3 |
| `togglenoreload` | `const reloaded = Boolean(drawing)` — พูดประโยคสำเร็จโดยไม่อ่านรายการอีกครั้ง · แทนค่า ไม่ลบ call เพราะการลบจะทำให้ `reloaded` เป็น `undefined` แล้วประโยคหาย (#152) | `86a` แถว 3 กับ 5 ที่ *the row’s own status cell* · ล้ม 2 ผ่าน 3 |
| `cancelleavesitopen` | ตัด `setSwitching(null)` ออกจาก `onCancel` กล่องจึงค้างหลังตอบว่าไม่ — ฝาแฝดของ `doesnotclose` ที่ทางคำตอบว่าไม่ | `86a` แถว 2 ที่ *the question, dismissed* · ล้ม 1 ผ่าน 4 |
| `cancelsaysitdid` | *ยกเลิก* พูดประโยคสำเร็จของการระงับ โดยไม่เขียนอะไรจริง | `86a` แถว 2 ที่ *a sentence about something that did not happen* · ล้ม 1 ผ่าน 4 |
| `pressflipstherow` | การกดปุ่มพลิกสถานะในรายการที่วาดอยู่ทันที โดยยังไม่เขียนอะไรที่ server | `86a` แถว 1 ที่ *the row, still offering the same change* ซึ่งเป็นข้ออ้างสุดท้ายของแถวนั้น · ล้ม 1 ผ่าน 4 · นอกใบนี้ผ่าน 44 จาก 44 |
| `alwaysoffersuspend` | คำกริยาบนปุ่มเป็น *ระงับ* เสมอ — ข้างเดียว เพราะ `startStatusChange` หาปุ่มด้วยคำกริยา | `86a` แถว 3 ที่ *the control, now offering the way back* (แถว 4 กับ 5 ที่ข้ออ้างคำกริยาตอนมาถึง) · ล้ม 3 ผ่าน 2 |
| `alwaysofferrestore` | คำกริยาบนปุ่มเป็น *เปิดใช้งาน* เสมอ | `86a` แถว 5 ที่ *the control, back to the change it offered before* (แถว 1 ถึง 3 ที่ข้ออ้างคำกริยาตอนมาถึง) · ล้ม 4 ผ่าน 1 |

สองตัวของทิศถูกสร้างที่จุดที่สองค่าไม่ตรงกัน ไม่ใช่ที่จุดที่มันตรงกัน (#154) — แถว 3 ออกจาก *ใช้งานอยู่*
แถว 5 ออกจาก *ถูกระงับ* ตัวที่แทนค่าคงที่จึงมองไม่เห็นในแถวที่ค่านั้นถูกอยู่แล้ว

`presswriteswithoutasking` ปล่อยให้กล่องเปิดด้วย ซึ่งไม่เกี่ยวกับข้ออ้าง: ข้ออ้างของแถว 1 คือ **ยังไม่มีการเขียน
ก่อนมีคำตอบ** ไม่ใช่ว่ากล่องเปิดหรือไม่ และมัตแตนต์ที่ปิดกล่องทั้งใบ (`open={false}`) ไม่ได้เขียนไว้ที่นี่ด้วยเหตุผลนั้น
— มันทำให้ห้าแถวของแฟ้มนี้แดงทั้งหมด และสองแถวในนั้นตายที่**การรอ** ไม่ใช่ที่ข้ออ้าง (#139) ตัวค้ำทุกตัวที่นี่
จึงเล็งที่ข้ออ้างของแถวหนึ่ง

สองตัวท้ายเขียนขึ้นเพราะ review อ่านตารางนี้ด้วย #88: `alwaysrestores` กับ `alwayssuspends`
ตายที่ข้ออ้างแรกของแถว 3 กับ 5 คือประโยค ข้ออ้างที่เขียนใต้บรรทัดแดงจึงไม่มีใครอ่าน
สองตัวนี้เล็งข้อที่สองกับที่สาม คือกล่องปิด กับช่องสถานะของแถว

**เหตุที่เคยเขียนไว้ใต้บรรทัดแดง วัดแล้วไม่จริง (17 ต.ค. 2569 — #213)** ย่อหน้าเดิมของ 16 ต.ค. 2569
เขียนว่าข้ออ้างสุดท้ายของแถว 1 3 และ 5 (*the row, still offering the same change* / *the control, now
offering the way back* / *back to the change it offered before*) พิสูจน์ไม่ได้ เพราะคำกริยาบนปุ่มกับ
ช่องสถานะอ่านนิพจน์เดียวกัน จึงไม่มีมัตแตนต์ที่ไซต์นั้นแยกสองข้อออกจากกันได้ (#191) · **ไม่จริง** —
ช่องสถานะอ่าน `STATUS[user.status]?.label` ส่วนปุ่มอ่าน `suspends(user)` เป็นสองไซต์ สิ่งที่กันอยู่จริงคือ
`startStatusChange` หาปุ่ม **ด้วยคำกริยา** มัตแตนต์ที่ผิดทั้งสองข้างจึงฆ่าทุกแถวที่การกด ไม่ใช่ที่ข้ออ้าง
(#139) · ทางออกคือมัตแตนต์ **ข้างเดียว** ถูกข้างที่แถวกด ผิดข้างที่แถวอ่าน คู่กับข้ออ้างคำกริยาตอนมาถึง
ใน `arrive()` ที่ทำให้การตายที่การกดกลายเป็นข้ออ้างที่มีชื่อ คำตอบของ #213 จึงเป็นทางที่สี่ ไม่ใช่
สามทางที่ตั๋วเสนอ และไม่มีโค้ดของแอปเปลี่ยนเลย เพราะนี่เป็นช่องของการพิสูจน์ ไม่ใช่ข้อบกพร่อง

**เก้าตัวเดิมไม่ต้องกวาดใหม่ (17 ต.ค. 2569)** บรรทัดที่เพิ่มเข้าไปอยู่ใน `arrive()` ซึ่งรันก่อนการกดทุกครั้ง
และเก้าตัวเดิมทำงานที่การกดหรือหลังจากนั้นทั้งหมด จึงไม่มีตัวไหนเปลี่ยนสิ่งที่บรรทัดนี้อ่าน การรันสะอาด
ที่ผ่าน 5 จาก 5 ยืนยันว่าบรรทัดนี้ไม่แดงด้วยตัวมันเอง · **เงื่อนไขที่ทำให้เหตุผลนี้หมดอายุ** คือวันที่มีมัตแตนต์
ซึ่งเปลี่ยนคำกริยาบนปุ่มตอนรายการมาถึง หรือวันที่ `arrive()` ได้ข้ออ้างใหม่ที่โค้ดของเก้าตัวนั้นถึงได้ (#202)

## ตัวค้ำของใบอื่นที่การแก้นี้เล็งใหม่

`catch` ของ handler นี้คือสิ่งที่แยกมันออกจาก `save` ที่อยู่เหนือมัน และมีตัวค้ำของสี่ใบที่ปิดแล้วอ้างมันไว้ —
`140:userstogglestalewins` `202:userssaysanyway` `203:userstoggleanyway` `208:usersstaleloader` การแก้นี้
เติม `setSwitching(null)` ลงใน `catch` นั้น สมอทั้งสี่จึงถูกเล็งใหม่ด้วยหางใหม่ โดยบรรทัดที่ถูกกลายพันธุ์ไม่เปลี่ยน
ความหมายของตัวค้ำจึงคงเดิม และคอมเมนต์ของ `140` ที่เขียนว่า *`toggle` has no `finally`* หมดอายุในวันเดียวกัน
เพราะ handler นี้มี `finally` แล้ว — ตัวแยกคือ `setSwitching(null)` ที่บรรทัดแรกของ `catch`

## วิธีรัน

    python mutation/86-a-question-before-a-status-change.py save
    python mutation/86-a-question-before-a-status-change.py <mutant>
    python mutation/86-a-question-before-a-status-change.py restore
    cd e2e && npx playwright test tests/86a
    # พอร์ต: ย่อหน้า Ports ของ e2e/README.md — ตั้ง E2E_BACKEND_PORT หรือ E2E_FRONTEND_PORT เฉพาะเมื่อพอร์ตของชุดนี้ตกในช่วงที่ Hyper-V จอง
"""
from harness import main

FILES = {
    'users': 'frontend/src/pages/Users.js',
}

MUTANTS = {
    # โค้ดที่ตั๋ววินิจฉัยไว้ เขียนให้รันได้ (#115) — การกดเขียนเลย ไม่รอคำตอบของคำถาม
    'presswriteswithoutasking': ('users',
        '    setNotice(null)\n'
        '    setSwitching(user)\n'
        '  }\n',
        '    setNotice(null)\n'
        '    setSwitching(user)\n'
        "    setUserStatus(user.user_id, suspends(user) ? 'inactive' : 'active').then(() => {\n"
        '      const drawing = onScreen.current\n'
        '      return drawing(() => onScreen.current === drawing)\n'
        '    })\n'
        '  }\n'),
    # หัวข้อของกล่องไม่ใช่ถ้อยคำของจอที่ส่งมอบ
    'wrongtitle': ('users',
        '        title="ยืนยันการเปลี่ยนสถานะ"\n',
        '        title="ยืนยันการเปลี่ยน"\n'),
    # ถามโดยไม่เอ่ยว่าเป็นบัญชีใบไหน
    'namesnobody': ('users',
        '    ? `ต้องการระงับการใช้งานบัญชีของ ${user.user_id} ${personName(user)} ใช่หรือไม่ บัญชีที่ถูกระงับจะถูกปฏิเสธทุกคำขอตั้งแต่คำขอถัดไป แม้ผู้ใช้งานจะยังเปิดหน้าจอค้างอยู่`\n'
        '    : `ต้องการเปิดใช้งานบัญชีของ ${user.user_id} ${personName(user)} ใช่หรือไม่`\n',
        '    ? `ต้องการระงับการใช้งานบัญชีนี้ ใช่หรือไม่ บัญชีที่ถูกระงับจะถูกปฏิเสธทุกคำขอตั้งแต่คำขอถัดไป แม้ผู้ใช้งานจะยังเปิดหน้าจอค้างอยู่`\n'
        '    : `ต้องการเปิดใช้งานบัญชีนี้ ใช่หรือไม่`\n'),
    # ยกเลิกเขียนเหมือนยืนยัน
    'cancelwrites': ('users',
        '        onCancel={() => {\n'
        '          setNotice(null)\n'
        '          setSwitching(null)\n'
        '        }}\n',
        '        onCancel={confirmSwitch}\n'),
    # ทิศของการเขียน สร้างที่จุดที่สองค่าไม่ตรงกัน (#154)
    'alwayssuspends': ('users',
        "    const next = suspends(user) ? 'inactive' : 'active'\n",
        "    const next = 'inactive'\n"),
    'alwaysrestores': ('users',
        "    const next = suspends(user) ? 'inactive' : 'active'\n",
        "    const next = 'active'\n"),
    # กล่องค้างหลังคำตอบ - ข้ออ้างที่อยู่ใต้ประโยคของแถว 3 กับ 5 (#88)
    'doesnotclose': ('users',
        '      await setUserStatus(user.user_id, next)\n'
        '      setSwitching(null)\n',
        '      await setUserStatus(user.user_id, next)\n'),
    # พูดประโยคโดยไม่อ่านรายการอีกครั้ง - ช่องสถานะกับปุ่มของแถวจะค้าง
    # #239 - the sentence it quotes is three lines since 28 ต.ค. 2569: the handler
    # hands its sentence over to the read `load` names when the page asked for
    # has gone. The mistake is unchanged and so is the row it kills (86a ล้ม 2 ผ่าน 3).
    'togglenoreload': ('users',
        '      const reloaded = await drawing(() => onScreen.current === drawing)\n'
        '      if (reloaded?.handedTo) {\n'
        '        if (showing.current === sent) waiting.current = { of: reloaded.handedTo, said }\n'
        '      } else if (reloaded && showing.current === sent) setNotice(said)\n'
        '    } catch (error) {\n'
        '      setSwitching(null)\n',
        '      const reloaded = Boolean(drawing)\n'
        '      if (reloaded?.handedTo) {\n'
        '        if (showing.current === sent) waiting.current = { of: reloaded.handedTo, said }\n'
        '      } else if (reloaded && showing.current === sent) setNotice(said)\n'
        '    } catch (error) {\n'
        '      setSwitching(null)\n'),
    # ประโยคในกล่องเป็นของการระงับเสมอ ส่วนการเขียนยังถูกทิศ
    'asksthewrongdirection': ('users',
        'const asks = user =>\n  suspends(user)\n',
        'const asks = user =>\n  true\n'),
    # #213 - สองครึ่งของแถว 2 ที่ cancelwrites ตายเหนือและใต้มัน
    # *ยกเลิก* ไม่ปิดกล่อง - ฝาแฝดของ doesnotclose ที่ทางคำตอบว่าไม่
    'cancelleavesitopen': ('users',
        '        onCancel={() => {\n'
        '          setNotice(null)\n'
        '          setSwitching(null)\n'
        '        }}\n',
        '        onCancel={() => {\n'
        '          setNotice(null)\n'
        '        }}\n'),
    # *ยกเลิก* พูดว่าระงับเรียบร้อยแล้ว โดยไม่เขียนอะไรจริง
    'cancelsaysitdid': ('users',
        '        onCancel={() => {\n'
        '          setNotice(null)\n'
        '          setSwitching(null)\n'
        '        }}\n',
        '        onCancel={() => {\n'
        "          setNotice({ error: false, message: 'ระงับการใช้งานบัญชีเรียบร้อยแล้ว' })\n"
        '          setSwitching(null)\n'
        '        }}\n'),
    # #213 - คำกริยาบนปุ่มของแถว 1 3 และ 5 ซึ่งอยู่ใต้บรรทัดแดงมาตั้งแต่ #86
    # การกดพลิกตัวควบคุมของแถวเองทันทีโดยไม่เขียนอะไร - การวาดแบบคาดการณ์ล่วงหน้า
    'pressflipstherow': ('users',
        '    setNotice(null)\n'
        '    setSwitching(user)\n'
        '  }\n',
        '    setNotice(null)\n'
        '    setSwitching(user)\n'
        '    setData(shown => ({\n'
        '      ...shown,\n'
        '      users: shown.users.map(row =>\n'
        '        row.user_id === user.user_id\n'
        "          ? { ...row, status: suspends(row) ? 'inactive' : 'active' }\n"
        '          : row,\n'
        '      ),\n'
        '    }))\n'
        '  }\n'),
    # ปุ่มเสนอ *ระงับ* ทุกสถานะ - ถูกข้างที่แถว 3 กดเข้าไป ผิดข้างที่แถว 3 อ่านออกมา
    'alwaysoffersuspend': ('users',
        "                          {suspends(user) ? 'ระงับ' : 'เปิดใช้งาน'}\n",
        "                          {suspends(user) ? 'ระงับ' : 'ระงับ'}\n"),
    # ปุ่มเสนอ *เปิดใช้งาน* ทุกสถานะ - กระจกของตัวข้างบน สำหรับแถว 5
    'alwaysofferrestore': ('users',
        "                          {suspends(user) ? 'ระงับ' : 'เปิดใช้งาน'}\n",
        "                          {suspends(user) ? 'เปิดใช้งาน' : 'เปิดใช้งาน'}\n"),
}

main(FILES, MUTANTS)
