# -*- coding: utf-8 -*-
"""
#11 ข้อมูลผู้ใช้งาน and #12 สิทธิ์การใช้งาน - the account and grant routes.

Every mutant here was applied on its own and the suite run against it, and each
killed the one assertion it was aimed at - see the mutation section of
docs/acceptance/11-user-accounts.md and docs/acceptance/12-role-grants.md
for which assertion, and for what each mutant is about.

    python mutation/11-12-accounts-and-grants.py save
    python mutation/11-12-accounts-and-grants.py <mutant>
    python mutation/11-12-accounts-and-grants.py restore

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `M1` | **ทำอะไร** ไม่บันทึกนามสกุล — `last_name_th = $5` เป็น `COALESCE(last_name_th, $5)` การแก้จึงไม่ลงจริง | **ฆ่าที่** ข้ออ้างของเกณฑ์ข้อ 1 *แก้ข้อมูลส่วนตัวได้* ที่นามสกุลใหม่ในแถวของตาราง (`12a` แถว 1) ซึ่งเป็นครึ่งที่แถบเขียวอย่างเดียวพิสูจน์ไม่ได้ · ใบรับงานจดว่า **เจ็ดตัวกลายพันธุ์ เจ็ดตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 135) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/12-role-grants.md:42` กับ `docs/acceptance/12-role-grants.md:135` |
| `M2` | **ทำอะไร** ล้าง `user_roles` ตอนแก้ข้อมูล — แทรก `DELETE FROM user_roles` ก่อนการบันทึกกิจกรรม | **ฆ่าที่** ข้ออ้างของเกณฑ์ข้อ 1 *แก้ข้อมูลแล้วบทบาทไม่หาย* ซึ่งเปิดแผงใหม่หลังบันทึกแล้วอ่านว่าแถว *อาจารย์ผู้สอน* ขอบเขต `05` ยังอยู่ · ใบรับงานจดว่า **เจ็ดตัวกลายพันธุ์ เจ็ดตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 135) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/12-role-grants.md:43` กับ `docs/acceptance/12-role-grants.md:135` |
| `M3` | **ทำอะไร** เขียน `assigned_by` เป็นคนอื่น (`'admin01'` แทน `req.auth.userId`) | **ฆ่าที่** ข้ออ้างของเกณฑ์ข้อ 7 *บันทึกว่าใครให้และเมื่อไร* ที่คอลัมน์ *ผู้กำหนด* ว่าเป็น `deptadm05` (`12a` แถว 2 และ 7) · ใบรับงานจดว่า **เจ็ดตัวกลายพันธุ์ เจ็ดตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 135) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/12-role-grants.md:59` กับ `docs/acceptance/12-role-grants.md:44` |
| `M4` | **ทำอะไร** ยกเลิกแล้วไม่ได้ปิดจริง — `SET is_active = false` เป็น `true` | **ฆ่าที่** ข้ออ้างของเกณฑ์ข้อ 3 *ยกเลิกบทบาทได้* และ *ผู้รับเสียสิทธิ์ใน request ถัดไป* (`12a` แถว 2 และ 3) · มันกับ `M5` **ไปถึงทิศการถอนเท่านั้น** ทิศการให้ได้ `M13` เมื่อ 7 ต.ค. 2569 (#193) · ใบรับงานจดว่า **เจ็ดตัวกลายพันธุ์ เจ็ดตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 135) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/12-role-grants.md:50` กับ `docs/acceptance/12-role-grants.md:45` |
| `M5` | **ทำอะไร** `allRoles` ไม่กรอง `is_active` — สิทธิ์ที่ถูกถอนแล้วยังถูกอ่านว่ายังถืออยู่ | **ฆ่าที่** ข้ออ้างของเกณฑ์ข้อ 3 *ผู้รับเสียสิทธิ์ใน request ถัดไป* ซึ่งยิงจอเดิมด้วยคุกกี้ใบเดิมหลังถูกยกเลิกแล้วต้องได้ 403 · มันกับ `M4` ไปถึงทิศการถอนเท่านั้น (ข้างบน) · ใบรับงานจดว่า **เจ็ดตัวกลายพันธุ์ เจ็ดตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 135) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/12-role-grants.md:51` กับ `docs/acceptance/12-role-grants.md:45` |
| `M6` | **ทำอะไร** ถอดด่านห้ามยกเลิกบทบาทตัวเองออก — ตัด `if (userId === req.auth.userId) ... REFUSALS.selfRevoke` ทิ้ง | **ฆ่าที่** ข้ออ้างของเกณฑ์ข้อ 6 *ยกระดับตัวเองไม่ได้ (ผ่านหน้าจอ)* ที่คำขอซึ่งยิงตรงด้วยคุกกี้ใบเดิมต้องได้ 403 กับแถวที่ยังอยู่ — *ซ่อนไม่ใช่กั้น* (ADR-0002) · ใบรับงานจดว่า **เจ็ดตัวกลายพันธุ์ เจ็ดตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 135) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/12-role-grants.md:55` กับ `docs/acceptance/12-role-grants.md:135` |
| `M8` | **ทำอะไร** สำเนาของด่านระงับบัญชีที่เป็นของ session ที่ค้างอยู่ **และสำเนานั้นตัวเดียว** — `admit` ตรวจข้อเดียวกันตอนลงชื่อเข้าใช้ บัญชีที่ถูกระงับจึงยังถูกปฏิเสธที่หน้าลงชื่อ และทำงานต่อได้ในแท็บที่เปิดอยู่แล้ว ผูกกับบรรทัด `unknown` ที่อยู่เหนือมัน เพราะสำเนาทั้งสองเขียนเหมือนกันทุกตัวอักษร | **ฆ่าที่** `11c` **บรรทัด 109** คือ `/api/me` ตอบ `200` ทั้งที่บัญชีถูกระงับไปแล้ว ส่วนด่านตอนลงชื่อเข้าใช้ยังปฏิเสธตามปกติ — ซึ่งเป็นเหตุผลทั้งหมดที่แถวนั้นต้องมีสเปคของตัวเอง · ที่มา `docs/acceptance/11-user-accounts.md:259` |
| `M7` | **ทำอะไร** revival ที่ไม่ประทับชื่อผู้ให้คนใหม่ — ถอด `assigned_by = EXCLUDED.assigned_by` ออกจาก `ON CONFLICT` | **ฆ่าที่** ข้ออ้างของเกณฑ์ข้อ 7 *ให้ซ้ำหลังยกเลิก บันทึกคนใหม่* ที่คอลัมน์ *ผู้กำหนด* ต้องเปลี่ยนเป็น `facadm01` ไม่ใช่ค้างชื่อคนเดิม (`12a` แถว 7) · ใบรับงานจดว่า **เจ็ดตัวกลายพันธุ์ เจ็ดตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 135) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/12-role-grants.md:60` กับ `docs/acceptance/12-role-grants.md:135` |
| `M10` | **ทำอะไร** เซิร์ฟเวอร์ไม่ส่งส่วนหัว `X-Deep-Grants` — ตัด `carryGrants(res, req.auth)` ออก หนึ่งมัตแตนต์ต่อหนึ่งไซต์ เพราะการแก้ของ #77 ลงที่สองจุด (#125) และไม่มีตัวไหนทำให้แอปหยุด ซึ่งคือสิ่งที่ทำให้มันเป็นมัตแตนต์ ไม่ใช่เหตุขัดข้อง | **ฆ่าที่** **สองแถว** ที่ assert ของแต่ละแถวเอง — เกณฑ์ข้อ 2 *ตัวเลือกบทบาทตามทันเมื่อกดเมนู* (`12a` แถว 8) และเกณฑ์ข้อ 3 *ตัวเลือกบทบาททิ้งบทบาทที่ถูกถอน* (`12a` แถว 9) · ที่มา `docs/acceptance/12-role-grants.md:46` กับ `docs/acceptance/12-role-grants.md:52` |
| `M11` | **ทำอะไร** ฝั่ง client ไม่ประกาศต่อ — `read_at > announcedAt` เป็น `<` ซึ่งเป็นอีกไซต์ของการแก้เดียวกัน | **ฆ่าที่** **สองแถวเดียวกับ `M10`** ที่ assert ของแต่ละแถวเอง · ที่มา `docs/acceptance/12-role-grants.md:46` กับ `docs/acceptance/12-role-grants.md:52` |
| `M12` | **ทำอะไร** ไม่ใช่ไซต์ แต่เป็นกฎที่ทำให้ listener แคบ — รับ `acting` จากส่วนหัวทุกครั้ง แทนที่จะรับเมื่อหมวกที่สวมอยู่หายไปแล้ว เปลือกจอจึงย้ายคนไปเป็นบทบาทที่คนอื่นเพิ่งให้ | **ฆ่าที่** assert **หมวก**ของแถว 8 (เกณฑ์ข้อ 2) **และปล่อยแถวของเกณฑ์ข้อ 3 ให้รอด** เพราะแถวนั้นคือทางเดียวที่กฎแคบอนุญาตให้รับ acting จากส่วนหัว — เป็นตัวควบคุมที่แยกกฎแคบออกจากกฎกว้าง (#145) ซึ่งเป็นเหตุที่แถว 8 assert หมวกที่สวมอยู่ ไม่ใช่เฉพาะรายการที่มันเสนอ · ที่มา `docs/acceptance/12-role-grants.md:46` กับ `docs/acceptance/12-role-grants.md:52` |
| `M13` | **ทำอะไร** ทิศการให้ของเกณฑ์ข้อ 2 (#193) — ด่านตัดสินจากการอ่านครั้งแรกที่มันเคยอ่านบัญชีนี้ มัตแตนต์**แทรก**โค้ด ไม่ใช่แก้ เพราะไม่มี cache ให้แก้ (`attachRoles` อ่านทุก request) รูปเดียวกับที่ `M2` ใช้ · อยู่ที่ `requireRole` ไม่ใช่ `attachRoles` ตามที่ตั๋วเสนอ: รูปที่ตั๋วเสนอถูกรันเป็นมัตแตนต์เพื่อวัด แล้วตายที่ `12a-role-grants.spec.js:193` คือปุ่มหมวกที่สวมอยู่ ไม่เคยไปถึง 200 — **รูปของมัตแตนต์ที่ตั๋วเขียนไว้ก็เป็นข้ออ้างเหมือนตัวเลขของมัน** | **ฆ่าที่** **สองแถว ที่ `.toBe(200)` ของแต่ละแถวเอง** — แถว 2 และ 3 ที่ `:194` ซึ่งมาถึงด้วยการโหลดหน้าใหม่ และแถว 8 ของ #77 ที่ `:391` ซึ่งมาถึงด้วยการกดเมนู มัตแตนต์ตัวเดียวเหนือโค้ดร่วมแยกสองทางเข้านั้นไม่ออก สิ่งที่แต่ละแถวเพิ่มคือว่าทางของมันไปถึงที่นั่น และการฆ่าคือหลักฐาน (#191) · 403 ใบแรกและ assert ปุ่มผ่านทั้งคู่ ส่วนใบที่สามไม่ถูกรันเพราะแถวหยุดไปแล้ว · `16-subjects.py` มี `M13` ของตัวเอง ไม่มีใบไหนถือแถวจากสองแฟ้ม สองตัวจึงไม่เคยเจอกันในตารางเดียว (#185) · ที่มา `docs/acceptance/12-role-grants.md:45` |
| `M9` | **ทำอะไร** `COMMIT` แทน `ROLLBACK` ใน `backend/lib/importer.js` คือกฎ *ทั้งไฟล์หรือไม่เอาเลย* ของการนำเข้า ซึ่ง #64 ต้องมีมัตแตนต์ให้ หลังจากถอดตัวเลขที่ฆ่าไม่ได้สี่จุดใน `11b` กับ `14b` ออก — edit เดียวกับ `keepgood` ใน `mutation/18-program-subjects.py` ต่อ importer ตัวร่วมกัน ซึ่งคือประเด็น เพราะ rollback ใบเดียวรับการนำเข้าของทุกจอ | **ฆ่าที่** `11b` **บรรทัด 131** และ `14b` **บรรทัด 124** ตายทั้งคู่ (ได้ 7 ที่ควรเป็น 6) ซึ่งเป็นแถวที่ `reload` แล้วเปิดรายการใหม่แล้วจึงนับตัวเลขที่มาจากเซิร์ฟเวอร์ · ทั้งสองไฟล์เป็น `mode: 'serial'` แถวที่อยู่หลังแถวที่ล้มจึงไม่ได้รัน รอบนั้นจึงไม่ได้บอกอะไรเกี่ยวกับแถวเหล่านั้น (#67) · ที่มา `docs/acceptance/11-user-accounts.md:261` |
"""

from harness import main

FILES = {
    'users': 'backend/routes/users.js',
    'grants': 'backend/routes/grants.js',
    'accounts': 'backend/auth/accounts.js',
    'importer': 'backend/lib/importer.js',
    'authorise': 'backend/auth/authorise.js',
    'client': 'frontend/src/api/client.js',
    'authcontext': 'frontend/src/context/AuthContext.js',
}

MUTANTS = {
 'M1': ('users',
   "title_th = $3, first_name_th = $4, last_name_th = $5,",
   "title_th = $3, first_name_th = $4, last_name_th = COALESCE(last_name_th, $5),"),
 'M2': ('users',
   "      await recordActivity(pool, req.auth.userId, 'UPDATE_USER', onUser(existing.user_id));",
   "      await pool.query('DELETE FROM user_roles WHERE user_id = $1', [existing.user_id]);\n      await recordActivity(pool, req.auth.userId, 'UPDATE_USER', onUser(existing.user_id));"),
 'M3': ('grants',
   "[target.user_id, roleId, scopeId, req.auth.userId],",
   "[target.user_id, roleId, scopeId, 'admin01'],"),
 'M4': ('grants',
   "`UPDATE user_roles SET is_active = false",
   "`UPDATE user_roles SET is_active = true"),
 'M5': ('accounts',
   "WHERE ur.user_id = $1 AND ur.is_active AND r.is_active",
   "WHERE ur.user_id = $1 AND r.is_active"),
 'M6': ('grants',
   "        if (userId === req.auth.userId) {\n          return res.status(403).json({ message: REFUSALS.selfRevoke });\n        }\n",
   ""),
 # The live session's own copy of the suspension check, and only that copy:
 # `admit` makes the same test at sign-in, so with this gone a suspended
 # account is still refused at the sign-in screen and goes on working in the
 # tab it already had. Anchored on the line above it because the two copies of
 # the check are written the same way.
 'M8': ('accounts',
   "  if (!user) return refuse(403, 'unknown');\n  if (user.status !== 'active') return refuse(403, 'inactive');",
   "  if (!user) return refuse(403, 'unknown');"),
 'M7': ('grants',
   "SET is_active = true, assigned_by = EXCLUDED.assigned_by, assigned_at = now()",
   "SET is_active = true, assigned_at = now()"),
 # The whole-or-nothing rule of an import, which #64 needed a mutant for once
 # the four vacuous counts in 11b and 14b were taken out: what is left had to
 # be shown to be the thing that carries the claim. Same edit as `keepgood` in
 # mutation/18-program-subjects.py, against the same shared importer - which is
 # the point, since one rollback serves every screen's import.
 # ---- #77: the picker catching up without a reload -------------------------
 # One mutant per site, because the fix landed at two (#125): the answer has to
 # carry the grants, and the client has to announce them. Either one alone is
 # the defect #77 reported, and neither stops the application - which is what
 # makes them mutants rather than outages.
 'M10': ('authorise',
   "      carryGrants(res, req.auth);\n",
   ""),
 'M11': ('client',
   "    if (grants && grants.read_at > announcedAt) {",
   "    if (grants && grants.read_at < announcedAt) {"),
 # Not a site but the rule the listener is narrow by: `acting` comes from the
 # header only once the grant being worn is gone. With this gone the shell moves
 # a person into a role somebody else just granted them, which is why row 8
 # asserts the hat it is wearing and not only the list it offers.
 'M12': ('authcontext',
   "acting: stillHeld ? prev.acting : acting }",
   "acting }"),
 # ---- #193: the giving direction of criterion 2 --------------------------
 # `M4` and `M5` reach the revoking direction only, so
 # `expect(await reachProgramSubjects(grantee)).toBe(200)` - a grant just
 # given takes effect on the next request - had nothing that could fail it
 # for its own reason. Nothing to alter, either: `attachRoles` reads the
 # grants on every request and there is no cache to break, so the mutant
 # inserts, which is the shape `M2` above already uses.
 #
 # It goes in `requireRole` and not in `attachRoles` because of where the
 # row's assertions sit. `requireRole` is what decides the 200, and
 # `/api/me` is mounted above every `requireRole`, so the shell still reads
 # the grants fresh and the acting-role button the row checks before the 200
 # still says what it should. The same staleness in `attachRoles` reaches
 # both and kills the row at that button instead, which would leave the 200
 # exactly as unproved as it was. Measured, not reasoned: the proposed shape
 # ran as a mutant of its own and died at `12a-role-grants.spec.js:193`, the
 # acting-role button, with the 200 one line below it never reached. This
 # one dies at `:194`.
 #
 # The two flanking 403s must stay green: before the grant and after the
 # revoke, the remembered role is the teaching one either way. A mutant that
 # takes all three has stopped the application rather than proved a row.
 #
 # It kills two rows, both at their own 200: `rows 2 and 3` at `:194`, which
 # arrives by a reload, and #77's `row 8` at `:391`, which arrives by a menu
 # press. The picker assertions above the second one pass, the shell reading
 # fresh either way. One mutant over shared code cannot tell the two ways in
 # apart, so what each row adds is that its own way in gets there, and the
 # kill is that proof (#191).
 #
 # `16-subjects.py` has an `M13` of its own. No sheet carries rows from both
 # files, so the two never meet in one table (#185).
 'M13': [('authorise',
   "function requireRole(...roleIds) {\n  const allowed = new Set(roleIds);\n",
   "const actedAs = new Map();\nfunction requireRole(...roleIds) {\n  const allowed = new Set(roleIds);\n"),
  ('authorise',
   "    return allowed.has(req.auth.acting.role_id) ? next() : forbid(res);\n",
   "    if (!actedAs.has(req.auth.userId)) actedAs.set(req.auth.userId, req.auth.acting.role_id);\n"
   "    return allowed.has(actedAs.get(req.auth.userId)) ? next() : forbid(res);\n")],
 'M9': ('importer',
   "      await client.query('ROLLBACK');\n      return { ok: false,",
   "      await client.query('COMMIT');\n      return { ok: false,"),
}

main(FILES, MUTANTS)
