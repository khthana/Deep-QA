# -*- coding: utf-8 -*-
"""#239 — กฎของ #209 ถึงจุดติดตั้งที่สี่ และประโยคที่ข้ามการส่งต่อหน้า

เจ้าของงานตอบ #209 ข้อ ก เมื่อ 19 ต.ค. 2569 ว่าให้เซิร์ฟเวอร์เป็นคนบอกว่ามีกี่หน้า และถ้าหน้า
ที่คนอยู่ไม่มีอยู่จริงอีกแล้ว ให้พาไปหน้าสุดท้ายที่มีอยู่ · กฎนั้นลงไปอยู่ใน `load` ของเจ็ดจอ
ที่สำมะโนของตั๋วนั้นเห็น แต่ `<Pager>` มีจุดติดตั้งสิบเอ็ดจุด และ `Users.js` เป็นจุดเดียวในสี่จุด
ที่เหลือซึ่ง**คนคนเดียวไปถึงอาการได้** คือตัวกรอง *ใช้งานอยู่* คู่กับปุ่ม *ระงับ* ซึ่งเป็นการอ่าน
กับการเขียนของรายการเดียวกัน — วัดเมื่อ 25 ต.ค. 2569 ไม่มีผู้เล่นที่สอง ไม่มีการแข่ง และไม่มี
คำตอบที่ถูกถือไว้ (#196 — ไม่ใช่กฎใหม่ เป็นการตัดสินใจที่ตัดสินไปแล้วนำไปใช้กับจุดที่สำมะโน
ของวันนั้นมองไม่เห็น)

## สามตัว กับสิ่งที่หน้าต่างเป็นคนบอก

จอนี้ต่างจากหกจอฝั่งผู้ดูแลตรงที่ **ผู้เรียกอ่านคำตอบของ loader** (`Departments.js`
§`HANDED_ON` วัดไว้เมื่อ 20 ต.ค. 2569 ว่าไม่มีผู้เรียกไหนในหกจอนั้นอ่าน) ฉะนั้นคำตอบที่สาม
ต้องบอกด้วยว่า**ส่งต่อให้การอ่านไหน** แล้วผู้เรียกส่งประโยคของตัวเองไปให้การอ่านนั้น ไม่ใช่
พูดบนหน้าที่กำลังจะถูกแทน

และสิ่งที่การส่งต่อซื้อ **ไม่ใช่ปลายทาง** — ไม่มีอะไรล้าง notice ฉะนั้นประโยคที่พูดตอนคำตอบ
เป็นจริงก็ยังอยู่บนจอเมื่อหน้าที่ถูกส่งต่อมาถึง แถวที่อ่านแค่จอตอนจบจึงผ่านทั้งสองแบบ และ
มัตแตนต์ที่เขียนไว้สำหรับข้ออ้างนี้จะยืนฟรี ๆ (#203) · สิ่งที่แยกสองแบบออกจากกันคือ **เมื่อไร**
ฉะนั้นสองแถวล่างถือการอ่านที่ถูกส่งต่อไว้ที่ route แล้วอ่านค่าลบในหน้าต่างนั้น

| ชื่อ | สิ่งที่มันทำ | แถวที่มันฆ่า |
|---|---|---|
| `nolastpage` | กฎของ #209 ถามอะไรไม่ได้เลย คือ `answer.page > lastPage` กลายเป็น `answer.page > answer.page` ฉะนั้นจอวาดหน้าที่เซิร์ฟเวอร์ตอบมาเสมอ · **คือโค้ดที่ตั๋ววินิจฉัย เขียนให้รันได้** (#115) ทุก binding ยังถูกอ้างถึง ฉะนั้นไม่ใช่มัตแตนต์ที่หยุดแอป (#101) | `239a` ทั้งสามแถว · แถว 1 ที่ `poll` ของตัวเอง (`shown` เป็น 2 ขณะที่ `pages` เป็น 1 คือ `หน้า 2 จาก 1`) ส่วนแถว 2 กับ 3 ที่ `handed.sent` เพราะไม่มีการอ่านหน้าหนึ่งให้ถือ |
| `switchsaysitovertheoldpage` | `confirmSwitch` กลับไปพูดประโยคเมื่อคำตอบเป็นจริง คือทิ้งข้อ `handedTo` ไป ซึ่งเป็นรูปที่จอนี้ใช้ก่อน #239 | `239a` แถว 2 ที่ค่าลบในหน้าต่าง — ปลายทางของแถวนั้นยังเขียว ซึ่งคือเหตุผลที่แถวถือหน้าต่างไว้ |
| `savesaysitovertheoldpage` | `save` ทำอย่างเดียวกัน · เขียนแยกเพราะการแก้ลงที่สองที่ และ guard ที่เขียนไว้เพื่อผู้เรียกรายหนึ่งเป็นข้ออ้างเกี่ยวกับผู้เรียกทุกราย (#125 · #68 · #133) | `239a` แถว 3 ที่ค่าลบในหน้าต่าง |

`nolastpage` เล็งที่การเปรียบเทียบ ไม่ใช่ลบบล็อกทั้งก้อน เพราะมัตแตนต์ที่ถอดเงื่อนไขออกต้อง
ทำให้พารามิเตอร์ของมันยังถูกอ้างถึง (#101) — `lastPage` กับ `to` อยู่ในกิ่งที่ตายแล้วแต่ยังถูก
อ่านทางวากยสัมพันธ์ ฉะนั้น `CI=true` ไม่ล้มเพราะ binding ที่ไม่มีใครใช้

## สิ่งที่แฟ้มนี้ไม่ได้พิสูจน์

จุดติดตั้งอีกสามจุด (`Students.js` · `components/users/HistoryPanel.js` ·
`components/groups/GroupHistory.js`) ไม่มีกฎนี้ และเหตุผลพร้อมวันที่เขียนไว้ที่แต่ละจุดด้วย
มาร์กเกอร์ที่ `frontend/scripts/pager-last-page.js` อ่าน — มาร์กเกอร์เป็นข้ออ้างเหมือนตัวเลข
ของตั๋ว (#141) และไม่มีมัตแตนต์ไหนในแฟ้มนี้ถืออะไรเกี่ยวกับสามจุดนั้น

## วิธีรัน

    python mutation/239-the-page-the-press-took-away.py save
    python mutation/239-the-page-the-press-took-away.py <mutant>
    python mutation/239-the-page-the-press-took-away.py restore
    cd e2e && npx playwright test tests/239a
    # พอร์ต: ย่อหน้า Ports ของ e2e/README.md — ตั้ง E2E_BACKEND_PORT หรือ E2E_FRONTEND_PORT เฉพาะเมื่อพอร์ตของชุดนี้ตกในช่วงที่ Hyper-V จอง
"""
from harness import main

FILES = {
    'users': 'frontend/src/pages/Users.js',
}

# The anchor is the code the mutant breaks and never the comment beside it
# (#121, #123).

ASKS_THE_SERVER = """        if (answer.page > lastPage) {
"""
ASKS_NOTHING = """        if (answer.page > answer.page) {
"""

SWITCH_HANDS_IT_OVER = """      if (reloaded?.handedTo) {
        if (showing.current === sent) waiting.current = { of: reloaded.handedTo, said }
      } else if (reloaded && showing.current === sent) setNotice(said)
    } catch (error) {
      setSwitching(null)
"""
SWITCH_SAYS_IT = """      if (reloaded && showing.current === sent) setNotice(said)
    } catch (error) {
      setSwitching(null)
"""

SAVE_HANDS_IT_OVER = """      if (reloaded?.handedTo) {
        if (showing.current === sent) waiting.current = { of: reloaded.handedTo, said }
      } else if (reloaded && showing.current === sent) setNotice(said)
    } catch (error) {
      if (showing.current === sent) report(error)
"""
SAVE_SAYS_IT = """      if (reloaded && showing.current === sent) setNotice(said)
    } catch (error) {
      if (showing.current === sent) report(error)
"""

MUTANTS = {
    # The code the ticket diagnosed, made to run (#115): the screen draws
    # whatever page the server answered, which is what it did before #239.
    'nolastpage': [
        ('users', ASKS_THE_SERVER, ASKS_NOTHING),
    ],
    # The sentence said on a truthy answer - this screen's shape before #239,
    # which `Departments.js` §`HANDED_ON` predicted would put it over a page
    # about to be replaced.
    'switchsaysitovertheoldpage': [
        ('users', SWITCH_HANDS_IT_OVER, SWITCH_SAYS_IT),
    ],
    # The same at the other site. The two blocks are identical code, so each
    # anchor carries its own handler's `catch` to be unique (#202).
    'savesaysitovertheoldpage': [
        ('users', SAVE_HANDS_IT_OVER, SAVE_SAYS_IT),
    ],
}

main(FILES, MUTANTS)
