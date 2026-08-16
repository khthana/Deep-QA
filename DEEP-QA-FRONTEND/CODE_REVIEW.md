# Code Review — DEEP-QA-FRONTEND (ภาพรวม codebase)

> วันที่ review: 2026-06-09 · ขอบเขต: ทั้ง codebase (ยังไม่มี git commit ให้เทียบ diff)

## ภาพรวมโปรเจกต์
React (CRA) SPA สำหรับระบบประกันคุณภาพการศึกษา แยกพื้นที่ admin (`/main/*`) กับ teacher (`/teacher/teacherDashboard/*`) ตาม role, auth ผ่าน HttpOnly cookie, ดึงข้อมูลจาก backend ด้วย `fetch` + `credentials: 'include'` โครงสร้างโดยรวมเป็นระเบียบดี — แยก feature module ชัด, hooks แยกออกมา, มี `isSessionExpired` + `SessionExpiredDialog` เตรียมไว้แล้ว

---

## 🔴 ปัญหา Correctness (ควรแก้)

### 1. `src/pages/Login.js:12-19` — destructure ค่าที่ไม่มีอยู่จริง
```js
const { token, profile, setToken, setProfile, setLoading, loading } = useAuth()
```
`AuthContext` ไม่ได้ provide `token` / `setToken` (ดู `AuthContext.js:72`) → ทั้งคู่เป็น `undefined`
เป็น dead code ที่หลงเหลือจากยุค token-based auth ก่อนเปลี่ยนเป็น cookie ควรลบทิ้ง

### 2. `src/context/AuthContext.js:34-36` — logic อ่านค่า stale
```js
if (profile !== null) {
  setLoading(false)
}
```
ตอน `fetchProfile` รันครั้งแรก closure `profile` เป็น `null` เสมอ → branch นี้ไม่เคยทำงานจริง
และ `setLoading(false)` ก็มีอยู่ใน `finally` อยู่แล้ว เป็น logic ที่สับสนและไร้ผล ควรลบออก

### 3. `src/routes/AppRoutes.js:104-109` — route `rubrics` ประกาศซ้ำ
```js
<Route path="rubrics" element={<RubricManage />}> ... </Route>   // บรรทัด 104
<Route path="rubrics" element={<RubricManage />} />              // บรรทัด 109 (ตาย)
```
ตัวที่สองไม่มีวันถูก match ควรลบ

---

## 🟠 Security

### 4. `src/components/content/TeacherContent/CourseOutcomes/CourseOutcomes.js:497-503` — Stored XSS risk
```js
dangerouslySetInnerHTML={{ __html: (clo?.[name] ?? '').replace(/\n/g, '<br/>') }}
```
ค่า `clo[name]` มาจาก API (เนื้อหา CLO ที่อาจารย์กรอกเอง) ถ้า backend ไม่ sanitize
อาจารย์ที่ประสงค์ร้ายฝัง `<script>`/`<img onerror>` แล้วผู้ใช้คนอื่นที่เปิดหน้านี้จะโดน execute
เจตนาจริงแค่อยากให้ขึ้นบรรทัดใหม่ — แนะนำเลิกใช้ `dangerouslySetInnerHTML` แล้วใช้ CSS แทน:
```jsx
<div className="whitespace-pre-line">{clo?.[name] ?? ''}</div>
```
(หรือถ้าจำเป็นต้อง render HTML จริง ให้ใส่ `DOMPurify.sanitize()`)

### 5. `src/pages/Login.js:26-33` — ตั้ง flag login ก่อน login สำเร็จ
`handleGoogleLogin` เซ็ต `localStorage.isLoggedIn = 'true'` *ก่อน* redirect ไป Google
ถ้าผู้ใช้ยกเลิกที่หน้า Google แล้วกลับมา แอปจะเข้าใจว่า logged-in อยู่ (จนกว่า `fetchProfile` จะ fail แล้วเคลียร์ทีหลัง)
ควรตั้ง flag นี้หลัง callback สำเร็จเท่านั้น — ฝั่ง email login (`Login.js:85`) ทำถูกแล้ว (ตั้งหลัง `response.ok`)

> หมายเหตุ: การใช้ HttpOnly cookie + ให้ server เป็นคนบังคับ auth จริง (โดย `isLoggedIn` เป็นแค่ UX hint) เป็นแนวที่ถูกต้องแล้ว

---

## 🟡 Code Quality / Housekeeping

### 6. `console.log` เหลือค้าง 115 จุด
รวมถึงจุดที่ dump ข้อมูลจริง เช่น `useImportUsers.js:41` `console.log('Import success:', data)`
และ `useUserList.js:8` `console.log(role, Scope)` (รันทุกครั้งที่เรียก hook)
ควรถอดออกหรือครอบด้วย guard ก่อนขึ้น production

### 7. `src/services/authService.js` เป็นไฟล์ว่าง
ไม่มีใคร import (grep แล้วไม่เจอ reference) ลบทิ้งได้เลย

### 8. Fetch pattern ซ้ำทั้งโปรเจกต์ + `withCredentials` ใช้ผิดที่
ทุก hook/component เขียน `fetch(\`${process.env.REACT_APP_API_URL}/api/...\`, { credentials: 'include', withCredentials: true })` ซ้ำกันหมด
`withCredentials` เป็น option ของ **axios** ไม่มีผลกับ `fetch` (ตัวที่ทำงานจริงคือ `credentials: 'include'`) เป็น cargo-cult ที่ก๊อปต่อๆ กันมา
แนะนำทำ wrapper กลางตัวเดียว เช่น `apiFetch()` ที่รวม base URL, credentials, parse JSON, และเช็ค 401/403 → เด้ง `SessionExpiredDialog` ให้อัตโนมัติ
(ตอนนี้มี `isSessionExpired` แล้วแต่ต้องไปเรียกเองทีละจุด ซึ่งส่วนใหญ่ยังไม่ได้เรียก)

### 9. Error handling ไม่สม่ำเสมอ
บางที่ swallow เงียบ (`catch` ที่ comment `console.error` ทิ้งไว้ใน Login), บางที่ขึ้น alert,
ไม่มี global handler สำหรับ 401 เพื่อ logout/redirect รวมศูนย์ → เกี่ยวโยงกับข้อ 8

### 10. ชื่อไฟล์/โฟลเดอร์สะกดผิดหลายจุด
`breadcrumbNameMap .js` (มี **เว้นวรรค** ในชื่อไฟล์!), `ImportUserDilog.js` / `ImportDepartmentDilog.js` / `ImportProgramDilog.js` (Dilog→Dialog),
`AddNewActicity.js`, `SeachSection.js`, โฟลเดอร์ `UserMangement/`
ไม่กระทบการทำงานแต่ทำให้ค้นหา/อ้างอิงยากและดูไม่โปร ควรค่อยๆ rename

### 11. Test coverage แทบเป็นศูนย์
มีแค่ `App.test.js` ที่เป็น default ของ CRA
สำหรับ logic ที่ critical (auth gating ใน `ProtectedRoute`/`GuestRoute`, `mapRole`, `isSessionExpired`) ควรเพิ่ม unit test เพราะเขียนง่ายและกันการ regress

---

## สรุป / ลำดับความสำคัญ

| ลำดับ | รายการ |
|---|---|
| ทำก่อน | #4 (XSS), #5 (Google login flag), #6 (ถอด console.log ที่ dump data) |
| ทำต่อ | #1, #2, #3 (dead code), #8 (apiFetch wrapper รวม session-expired) |
| เมื่อมีเวลา | #7, #9, #10, #11 |

เริ่มที่ #4 (XSS) กับ #8 (ทำ `apiFetch` wrapper) จะได้ผลตอบแทนสูงสุด
