# DEEP-Core — Screen ↔ Frontend ↔ Backend ↔ API Mapping

| หัวข้อ | รายละเอียด |
|---|---|
| **ระบบ** | DEEP-Core: Curriculum & Learning Outcomes Management System (KMITL) |
| **ที่มาของข้อมูล** | Scan codebase จริง: `DEEP-QA-FRONTEND/` และ `DEEP-QA-BACKEND/` |
| **จำนวน Screen** | 36 หน้าจอ (public/shell 6 + admin 18 + teacher 12) |
| **จำนวน API Endpoint (backend)** | 130 endpoints |
| **วันที่จัดทำ** | 2026-08-16 |
| **เวอร์ชัน** | 1.0 |

> เอกสารนี้จับคู่ **หน้าจอ (screen) → ไฟล์ frontend → API route → ไฟล์ backend (route/controller/model)** เพื่อใช้อ้างอิงในการทำ QA, impact analysis และ regression testing

---

## สารบัญ

1. [ภาพรวมสถาปัตยกรรม](#1-ภาพรวมสถาปัตยกรรม)
2. [สรุปรายการหน้าจอทั้งหมด (Screen Inventory)](#2-สรุปรายการหน้าจอทั้งหมด-screen-inventory)
3. [รายละเอียดรายหน้าจอ — Public / Shell](#3-รายละเอียดรายหน้าจอ--public--shell)
4. [รายละเอียดรายหน้าจอ — Admin (`/main`)](#4-รายละเอียดรายหน้าจอ--admin-main)
5. [รายละเอียดรายหน้าจอ — Teacher (`/teacher/teacherDashboard`)](#5-รายละเอียดรายหน้าจอ--teacher-teacherteacherdashboard)
6. [Backend Layer Map (route → controller → model/service)](#6-backend-layer-map-route--controller--modelservice)
7. [Reverse Index: API Endpoint → หน้าจอที่เรียกใช้](#7-reverse-index-api-endpoint--หน้าจอที่เรียกใช้)
8. [Shared Components / Hooks / Context](#8-shared-components--hooks--context)
9. [ข้อสังเกตจากการ Scan Codebase (Findings)](#9-ข้อสังเกตจากการ-scan-codebase-findings)

---

## 1. ภาพรวมสถาปัตยกรรม

### 1.1 โครงสร้าง Repository

```
Deep-QA/
├── docs/                       ← เอกสาร (ไฟล์นี้อยู่ที่นี่)
├── DEEP-QA-FRONTEND/
│   └── src/
│       ├── routes/AppRoutes.js         ← นิยาม route ทั้งหมด
│       ├── pages/                      ← Login, SelectApp, Mainpage (shell), NotFound
│       ├── components/
│       │   ├── SidebarItem/            ← เมนูแยกตาม role
│       │   ├── content/AdminContent/   ← หน้าจอฝั่งผู้ดูแล/กรรมการหลักสูตร
│       │   └── content/TeacherContent/ ← หน้าจอฝั่งอาจารย์
│       ├── hooks/                      ← useXxx() ที่ห่อ fetch ของ admin
│       └── context/AuthContext.js      ← session/profile
└── DEEP-QA-BACKEND/
    ├── index.js                ← express app, CORS, session, passport, mount /api
    ├── routes/all_routes.js    ← ตาราง mount ทุก sub-router
    ├── routes/*.js             ← นิยาม endpoint + middleware
    ├── controllers/*.js        ← business logic
    ├── models/*.js             ← SQL / PostgreSQL
    ├── services/*.js           ← คำนวณคะแนน, validate, log
    └── middleware/             ← authMiddleware(verifyToken), blockDirectAccess, upload
```

### 1.2 เส้นทางการทำงานของ 1 request

```
[React Screen]
   │  fetch(`${process.env.REACT_APP_API_URL}/api/<mount>/<path>`,
   │        { credentials: 'include' })          ← ส่ง HttpOnly JWT cookie
   ▼
[index.js]  CORS allowlist → cookieParser → express-session → passport
   ▼
[routes/all_routes.js]  router.use('/<mount>', <subRouter>)
   │   • '/auth'  ประกาศ "ก่อน" blockDirectAccess
   │   • ทุก mount หลังจากนั้นผ่าน blockDirectAccess (กัน direct browser access)
   ▼
[routes/<file>.js]  verifyToken → (upload/multer ถ้ามีไฟล์) → controller
   ▼
[controllers/<file>Controller.js]  ตรวจสิทธิ์ตาม role/scope + business rule
   ▼
[models/<file>Model.js]  +  [services/*.js]
   ▼
[PostgreSQL]  (config/db.js)
```

### 1.3 Convention ที่ใช้ทั้งระบบ

| เรื่อง | รายละเอียด |
|---|---|
| Base URL | `process.env.REACT_APP_API_URL` + `/api` |
| Auth | JWT ใน HttpOnly cookie; ทุก fetch ใส่ `credentials: 'include'` |
| Middleware มาตรฐาน | `verifyToken` (จาก `middleware/authMiddleware.js`) + `blockDirectAccess` |
| การ Import Excel | Frontend parse XLSX ด้วย `xlsx` → POST `multipart/form-data` → backend ใช้ `multer` + `xlsx` |
| Role codes | `FULL_ADMIN`, `FACULTY_ADMIN`, `DEPT_ADMIN`, `PROG_MANAGER`, `TEACHER`, `STUDENT`, `GUEST` (แปลงไทย↔code ที่ `components/MapRole.js`) |
| Teacher path | ใช้ placeholder `%SUBJECT%` แทนด้วย `{subject_name_en}-Section-{section}` จาก `localStorage.selectedCourse` / `localStorage.section` |
| ตัวระบุ context ฝั่ง teacher | เกือบทุกหน้าใช้ `section_id` ที่ resolve จาก `localStorage` |

---

## 2. สรุปรายการหน้าจอทั้งหมด (Screen Inventory)

### 2.1 Public / Shell

| # | Route | ชื่อหน้าจอ | ไฟล์หลัก (Frontend) | Role |
|---|---|---|---|---|
| S01 | `/` | เข้าสู่ระบบ | `pages/Login.js` | ทุกคน (GuestRoute) |
| S02 | `/select-app` | เลือกแอป / บทบาท | `pages/SelectApp.js` | ผู้ล็อกอินแล้ว |
| ~~S03~~ | ~~`/user-not-found`~~ | ~~ไม่พบผู้ใช้ในระบบ~~ | ~~`pages/UserNotFound.js`~~ | **ลบแล้วที่ [#50](https://github.com/khthana/Deep-QA/issues/50)** — ไม่มีที่ใดพาไปถึง ดูหมายเหตุท้ายเอกสาร |
| S04 | `/page-not-found` | 404 | `pages/PageNotFound.js` | ทุกคน |
| S05 | `/load` | หน้าจอโหลด | `components/LoadingScreen.js` | ทุกคน |
| S06 | `/main/*`, `/teacher/*` | Shell (Navbar + Sidebar + Outlet) | `pages/Mainpage.js` | ผู้ล็อกอินแล้ว |

### 2.2 Admin / ผู้ดูแล / กรรมการหลักสูตร (`/main`)

| # | Route | ชื่อหน้าจอ | ไฟล์หลัก (Frontend) | Role ที่เห็นเมนู |
|---|---|---|---|---|
| A01 | `/main/departments` | ข้อมูลภาควิชา | `AdminContent/Department/DepartmentTable.js` | FACULTY_ADMIN |
| A02 | `/main/programs` | ข้อมูลหลักสูตร | `AdminContent/Programs/ProgramsTable.js` | FACULTY_ADMIN, DEPT_ADMIN |
| A03 | `/main/subjects` | ข้อมูลรายวิชา | `AdminContent/Subject/SubjectTable.js` | DEPT_ADMIN |
| A04 | `/main/rubrics` | ข้อมูล Rubric กลาง | `AdminContent/Rubric/RubricTable.js` (ใน `RubricManage`) | DEPT_ADMIN, PROG_MANAGER |
| A05 | `/main/rubrics/edit-Rubric` | แก้ไขรายละเอียด Rubric | `AdminContent/Rubric/EditRubricDetail.js` | เท่ากับ A04 |
| A06 | `/main/course-in-program` | รายวิชาในหลักสูตร | `AdminContent/Subject/CourseInProg.js` | DEPT_ADMIN, PROG_MANAGER |
| A07 | `/main/student-data` | ข้อมูลนักศึกษากลาง | `AdminContent/Student/MainStudentData.js` | DEPT_ADMIN |
| A08 | `/main/course-in-term` | การเปิดรายวิชาในภาคการศึกษา | `AdminContent/Subject/CourseInTerm.js` | PROG_MANAGER |
| A09 | `/main/plos` | ผลลัพธ์การเรียนรู้ระดับหลักสูตร (PLO) | `AdminContent/PLO/PLOtable.js` (ใน `PLOManage`) | DEPT_ADMIN, PROG_MANAGER |
| A10 | `/main/mapping-plo` | เชื่อมโยงผลการเรียนรู้กับรายวิชา | `AdminContent/PLOMapping/MappingPLO.js` | DEPT_ADMIN, PROG_MANAGER |
| A11 | `/main/users` | ผู้ใช้งานระบบ | `AdminContent/UserMangement/UserTable.js` (ใน `UserManage`) | FULL_ADMIN, FACULTY_ADMIN, DEPT_ADMIN |
| A12 | `/main/users/edit-user` | แก้ไขผู้ใช้ / จัดการสิทธิ์ | `AdminContent/UserMangement/EditUser.js` | FULL_ADMIN, FACULTY_ADMIN, DEPT_ADMIN |
| A13 | `/main/users/user-history` | ประวัติการใช้งานผู้ใช้ | `AdminContent/UserMangement/userLogs.js` | FULL_ADMIN, FACULTY_ADMIN, DEPT_ADMIN |
| A14 | `/main/course-list` | รายการรายวิชา (placeholder) | `AdminContent/CourseList.js` | ไม่มีในเมนู |
| A15 | `/main/courseLevelByIntake` | ประเมินระดับหลักสูตรตามรุ่นปีรับเข้า | `AdminContent/courseLevelByIntake/courseLevelByIntake.js` | PROG_MANAGER |
| A16 | `/main/courseLevelAllStudents` | ระดับหลักสูตรของนักศึกษาทุกคน | `AdminContent/courseLevelAllStudents.js` | PROG_MANAGER |
| A17 | `/main/courseLevelCompare` | เปรียบเทียบระดับหลักสูตร | `AdminContent/courseLevelCompare.js` | PROG_MANAGER |
| A18 | `/main/courseLevelIndividual` | ระดับหลักสูตรรายบุคคล | `AdminContent/courseLevelIndividual.js` | PROG_MANAGER |

### 2.3 Teacher (`/teacher/teacherDashboard`)

ทุกหน้า (ยกเว้น T01) อยู่ใต้ `:subjectNameEn` และใช้ `section_id` เป็น context หลัก

| # | Route (ย่อจาก `/teacher/teacherDashboard/`) | ชื่อหน้าจอ | ไฟล์หลัก (Frontend) |
|---|---|---|---|
| T01 | *(index)* | รายวิชาของอาจารย์ | `TeacherContent/TeacherDashboard/TeacherDashboard.js` |
| T02 | `:subjectNameEn/subjectStudents` | นักศึกษาในรายวิชา | `TeacherContent/SubjectStudents/SubjectStudents.js` |
| T03 | `:subjectNameEn/studentGroups` | กลุ่มนักศึกษา | `TeacherContent/StudentGroups/StudentGroups.js` |
| T04 | `:subjectNameEn/courseOutcomes` | ผลลัพธ์การเรียนรู้ของรายวิชา (CLO) | `TeacherContent/CourseOutcomes/CourseOutcomes.js` |
| T05 | `:subjectNameEn/courseOutcomes/:cloId/behaviors` | พฤติกรรมบ่งชี้ของ CLO | `TeacherContent/CourseOutcomes/CourseOutcomeBehaviors.js` |
| T06 | `:subjectNameEn/courseOutcomes/:cloId/attention` | เกณฑ์การบรรลุ CLO | `TeacherContent/CourseOutcomes/CourseOutcomeAttention.js` |
| T07 | `:subjectNameEn/gradingWeights` | สัดส่วนการให้คะแนน | `TeacherContent/GradingWeights/GradingWeights.js` |
| T08 | `:subjectNameEn/learningActivities` | กิจกรรมการเรียนรู้ | `TeacherContent/LearningActivities/LearningActivities.js` |
| T09 | `:subjectNameEn/learningActivities/AddNewActivity` | เพิ่ม/แก้ไขกิจกรรม | `TeacherContent/LearningActivities/AddNewActicity.js` |
| T10 | `:subjectNameEn/teachingPlan` | แผนการสอน (Course Syllabus) | `TeacherContent/TeachingPlan/TeachingPlan.js` |
| T11 | `:subjectNameEn/activityScores` | บันทึกคะแนนกิจกรรม | `TeacherContent/ActivityScores/ActivityScores.js` |
| T12 | `:subjectNameEn/activityScores/AssessmentCriteria` | หลักฐานการประเมิน (Evidence) | `TeacherContent/ActivityScores/AssessmentCriteria.js` |
| T13 | `:subjectNameEn/courseResults` | ผลการเรียนรู้ระดับรายวิชา | `TeacherContent/CourseResults/CourseResults.js` |
| T14 | `:subjectNameEn/studentResults` | ผลการเรียนรู้รายบุคคล | `TeacherContent/StudentResults/StudentResults.js` |
| T15 | `:subjectNameEn/learningDetails` | รายละเอียดผลการเรียนรู้ | `TeacherContent/LearningDetails/LearningDetails.js` |
| T16 | `:subjectNameEn/outcomeActivityMapping` | เชื่อมโยง CLO ↔ กิจกรรม (Sankey) | `TeacherContent/OutcomeActivityMapping/OutcomeActivityMapping.js` |
| T17 | `:subjectNameEn/AssessmentCLO` | ประเมินผล CLO | `TeacherContent/AssessmentCLO/AssessmentCLO.js` |
| T18 | `:subjectNameEn/ContinuousImprove` | แผนการปรับปรุงอย่างต่อเนื่อง (CIP) | `TeacherContent/ContinuousImprove/ContinuousImprove.js` |

> หมายเหตุ: T05/T06/T09/T12 เป็นหน้าจอย่อยที่ไม่ปรากฏใน sidebar (เข้าจากหน้าแม่) จึงรวมเป็น 12 เมนู + 6 หน้าย่อย

---

## 3. รายละเอียดรายหน้าจอ — Public / Shell

### S01 · `/` — เข้าสู่ระบบ

**Frontend**

| บทบาท | ไฟล์ |
|---|---|
| หน้าหลัก | `src/pages/Login.js` |
| ฟอร์ม | `src/components/LoginForm.js` |
| ปุ่ม Google | `src/components/LoginGoogle.js` |
| service | `src/services/authService.js` |

**API Pairing**

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model/service |
|---|---|---|---|---|---|
| ล็อกอินด้วย username/password | `POST /api/auth/login` | `Login.js:63` | `routes/auth.js` | `authController.login` | `userModel`, `userService` |
| ล็อกอินด้วย Google (redirect) | `GET /api/auth/google-login` | `Login.js:32` | `routes/auth.js` | `passport.authenticate('google')` | — |
| Callback จาก Google | `GET /api/auth/google/callback` | Google redirect | `routes/auth.js` | `authController.googleCallback` | `userModel.existsStudentById`, `addUserLog` |

> `google/callback` จะ `generateToken` → `setTokenCookie` → บันทึก log `GOOGLE_LOGIN` → redirect ไป `${FRONTEND_URL}/select-app?login=success&user_id=..&is_student=..`
> `/api/auth/*` เป็น mount เดียวที่ประกาศ **ก่อน** `blockDirectAccess`

---

### S02 · `/select-app` — เลือกแอป / บทบาท

**Frontend:** `src/pages/SelectApp.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| ดึงบทบาททั้งหมดของผู้ใช้ | `POST /api/user_roles/user-roles` | `SelectApp.js:28` | `routes/user_roles.js` | `user_rolesController` | `user_rolesModel`, `userModel`, `rolesModel` |

> ถ้าผู้ใช้มี role `STUDENT` หน้านี้จะ redirect ไป `https://portfolio.deep-core.net/student` หลัง 2 วินาที

---

### S06 · Shell (`MainPage`) — Navbar + Sidebar

**Frontend**

| บทบาท | ไฟล์ |
|---|---|
| Shell | `src/pages/Mainpage.js` |
| Navbar | `src/components/Navbar.js` |
| Sidebar | `src/components/Sidebar.js`, `src/components/SidebarItem.js`, `src/components/SidebarItem/*.js` |
| Breadcrumb | `src/components/Breadcrumb.js`, `breadcrumbNameMap .js`, `titleMap.js` |
| Session | `src/context/AuthContext.js`, `src/utils/session.js`, `src/components/SessionExpiredDialog.js` |

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| ดึง profile ของ session | `GET /api/protected/profile` | `context/AuthContext.js:22` | `routes/protected.js` | — (คืน `req.user`) | — |
| ดึงบทบาท เพื่อสร้างเมนู | `POST /api/user_roles/user-roles` | `Mainpage.js:64` | `routes/user_roles.js` | `user_rolesController` | `user_rolesModel` |
| ออกจากระบบ | `GET /api/auth/logout` | `context/AuthContext.js:56` | `routes/auth.js` | `authController.logout` | `userModel` |
| เปลี่ยนรหัสผ่าน | `POST /api/user/change-password` | `components/Navbar.js:53` | `routes/user.js` | `userController.changePassword` | `userModel`, `userService` |

---

## 4. รายละเอียดรายหน้าจอ — Admin (`/main`)

### A01 · `/main/departments` — ข้อมูลภาควิชา

**Frontend**

| บทบาท | ไฟล์ |
|---|---|
| หน้าหลัก | `content/AdminContent/Department/DepartmentTable.js` |
| Dialog นำเข้า | `content/AdminContent/Department/ImportDepartmentDilog.js` |
| Dialog ลบ | `components/DeleteDialog.js` |
| Hooks | `hooks/useDepartments.js`, `hooks/useDepartmentActions.js` |

**API Pairing**

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| แสดงรายการภาควิชา | `GET /api/department/get-all-department` | `useDepartments.js:15` | `routes/department.js` | `departmentController.getAll` | `departmentModel` |
| เพิ่มภาควิชา | `POST /api/department/create-department` | `useDepartmentActions.js:26` | `routes/department.js` | `departmentController.create` | `departmentModel`, `facultyModel` |
| แก้ไขภาควิชา | `POST /api/department/edit-department` | `useDepartmentActions.js:69` | `routes/department.js` | `departmentController.edit` | `departmentModel` |
| ลบภาควิชา | `POST /api/department/delete-department` | `useDepartmentActions.js:110` | `routes/department.js` | `departmentController.delete` | `departmentModel` |
| นำเข้าจาก Excel | `POST /api/department/import-departments` | `ImportDepartmentDilog.js:32` | `routes/department.js` (+`upload`) | `departmentController.import` | `departmentModel`, `XLSX` |

---

### A02 · `/main/programs` — ข้อมูลหลักสูตร

**Frontend:** `AdminContent/Programs/ProgramsTable.js` + `ImportProgramDilog.js` + `components/SelectDepartment.js` + `DeleteDialog.js`
**Hooks:** `useDepartments.js`, `usePrograms.js`, `useProgramsActions.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| dropdown ภาควิชา | `GET /api/department/get-all-department` | `useDepartments.js:15` | `routes/department.js` | `departmentController` | `departmentModel` |
| รายละเอียดภาควิชาที่เลือก | `POST /api/department/get-department-by-id` | `SelectDepartment.js:20` | `routes/department.js` | `departmentController` | `departmentModel` |
| แสดงหลักสูตรตามภาควิชา | `POST /api/programs/get-program-by-department-id` | `usePrograms.js:14` | `routes/programs.js` | `programsController` | `programsModel`, `departmentModel` |
| เพิ่มหลักสูตร | `POST /api/programs/create-programs` | `useProgramsActions.js:21` | `routes/programs.js` | `programsController.create` | `programsModel` |
| แก้ไขหลักสูตร | `POST /api/programs/edit-programs` | `useProgramsActions.js:58` | `routes/programs.js` | `programsController.edit` | `programsModel` |
| ลบหลักสูตร | `POST /api/programs/delete-programs` | `useProgramsActions.js:92` | `routes/programs.js` | `programsController.delete` | `programsModel` |
| นำเข้าจาก Excel | `POST /api/programs/import-programs` | `ImportProgramDilog.js:33` | `routes/programs.js` (+`upload`) | `programsController.import` | `programsModel`, `XLSX` |

---

### A03 · `/main/subjects` — ข้อมูลรายวิชา

**Frontend:** `AdminContent/Subject/SubjectTable.js` + `AddEditSubjectDialog.js` + `ImportSubjectDilog.js` + `SelectDepartment.js`
**Hooks:** `useSubjects.js`, `useDepartments.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| แสดงรายวิชาตามภาควิชา | `POST /api/subjects/get-subject-by-department_id` | `useSubjects.js:12` | `routes/subjects.js` | `subjectsController` | `subjectsModel`, `departmentModel` |
| เพิ่มรายวิชา | `POST /api/subjects/create-subjects` | `useSubjects.js:48` | `routes/subjects.js` | `subjectsController.create` | `subjectsModel`, `userModel` |
| แก้ไขรายวิชา | `POST /api/subjects/update-subjects` | `useSubjects.js:84` | `routes/subjects.js` | `subjectsController.update` | `subjectsModel` |
| ลบรายวิชา | `POST /api/subjects/delete` | `useSubjects.js:119` | `routes/subjects.js` | `subjectsController.delete` | `subjectsModel` |
| นำเข้าจาก Excel | `POST /api/subjects/import-subject` | `ImportSubjectDilog.js:38` | `routes/subjects.js` (+`upload`) | `subjectsController.import` | `subjectsModel` |

---

### A04 · `/main/rubrics` — ข้อมูล Rubric กลาง

**Frontend:** `AdminContent/Rubric/RubricManage.js` (layout) → `RubricTable.js` + `components/SelectProgram.js` / `SelecteProgForProgManager.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| dropdown หลักสูตรตามสิทธิ์ | `POST /api/programs/get-program-by-role` | `SelectProgram.js:25`, `SelecteProgForProgManager.js:41` | `routes/programs.js` | `programsController.getByRole` | `programsModel`, `userModel` |
| แสดง Rubric ของหลักสูตร | `POST /api/rubrics/get-by-program` | `RubricTable.js:223` | `routes/rubrics.js` | `rubricsController` | `rubricsModel`, `userModel` |
| เพิ่ม Rubric | `POST /api/rubrics/create` | `RubricTable.js:189` | `routes/rubrics.js` | `rubricsController.create` | `rubricsModel` |
| แก้ไข Rubric | `POST /api/rubrics/update` | `RubricTable.js:108` | `routes/rubrics.js` | `rubricsController.update` | `rubricsModel` |
| ลบ Rubric | `POST /api/rubrics/delete` | `RubricTable.js:141` | `routes/rubrics.js` | `rubricsController.delete` | `rubricsModel` |

---

### A05 · `/main/rubrics/edit-Rubric` — แก้ไขรายละเอียด Rubric

**Frontend:** `AdminContent/Rubric/EditRubricDetail.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| แสดงรายละเอียดตาม code | `POST /api/rubricDetails/get-by-code` | `EditRubricDetail.js:258` | `routes/rubricDetails.js` | `rubricDetailsController` | `rubricDetailsModel`, `rubricsModel` |
| เพิ่มระดับ/เกณฑ์ | `POST /api/rubricDetails/create` | `EditRubricDetail.js:152` | `routes/rubricDetails.js` | `rubricDetailsController.create` | `rubricDetailsModel` |
| แก้ไข | `POST /api/rubricDetails/update` | `EditRubricDetail.js:187` | `routes/rubricDetails.js` | `rubricDetailsController.update` | `rubricDetailsModel` |
| ลบ | `POST /api/rubricDetails/delete` | `EditRubricDetail.js:221` | `routes/rubricDetails.js` | `rubricDetailsController.delete` | `rubricDetailsModel` |

---

### A06 · `/main/course-in-program` — รายวิชาในหลักสูตร

**Frontend:** `AdminContent/Subject/CourseInProg.js` + `ImportProgSubjectDilog.js` + `CopyDataDialog.js` + `SelectProgram.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| แสดงรายวิชาในหลักสูตร | `POST /api/program_subjects/get-program-subjectsby-program_id` | `CourseInProg.js:147` | `routes/program_subjects.js` | `program_subjectsController` | `program_subjectsModel` |
| dropdown รายวิชาของภาควิชา | `POST /api/subjects/get-subject-by-department_id` | `CourseInProg.js:170` | `routes/subjects.js` | `subjectsController` | `subjectsModel` |
| ผูกวิชาเข้าหลักสูตร | `POST /api/program_subjects/create-program_subjects` | `CourseInProg.js:109` | `routes/program_subjects.js` | `program_subjectsController.create` | `program_subjectsModel`, `subjectPloMappingModel` |
| แก้ไขการผูกวิชา | `POST /api/program_subjects/update-program-subject` | `CourseInProg.js:202` | `routes/program_subjects.js` | `program_subjectsController.update` | `program_subjectsModel` |
| ลบการผูกวิชา | `POST /api/program_subjects/delete` | `CourseInProg.js:238` | `routes/program_subjects.js` | `program_subjectsController.delete` | `program_subjectsModel` |
| นำเข้าจาก Excel | `POST /api/program_subjects/import-program-subject` | `ImportProgSubjectDilog.js:38` | `routes/program_subjects.js` (+`upload`) | `program_subjectsController.import` | `program_subjectsModel` |
| คัดลอกข้อมูลข้ามภาคเรียน | `POST /api/semesterCourses/copy` | `CopyDataDialog.js:40` | `routes/semesterCourses.js` | `semesterCoursesController.copy` | `semesterCoursesModel`, `courseSectionsModel`, `cloPlanModel` |

---

### A07 · `/main/student-data` — ข้อมูลนักศึกษากลาง

**Frontend:** `AdminContent/Student/MainStudentData.js` + `components/SelectDepartmentAndPrograms.js`
**Hooks:** `useDepartments.js`, `usePrograms.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| dropdown ภาควิชา | `GET /api/department/get-all-department` | `useDepartments.js:15` | `routes/department.js` | `departmentController` | `departmentModel` |
| รายละเอียดภาควิชา | `POST /api/department/get-department-by-id` | `SelectDepartmentAndPrograms.js:27` | `routes/department.js` | `departmentController` | `departmentModel` |
| dropdown หลักสูตร | `POST /api/programs/get-program-by-department-id` | `usePrograms.js:14` | `routes/programs.js` | `programsController` | `programsModel` |
| แสดงนักศึกษาในหลักสูตร | `POST /api/student/get-by-program` | `MainStudentData.js:55` | `routes/student.js` | `studentController.getByProgram` | `studentModel`, `programsModel` |

---

### A08 · `/main/course-in-term` — การเปิดรายวิชาในภาคการศึกษา

**Frontend**

| บทบาท | ไฟล์ |
|---|---|
| หน้าหลัก | `AdminContent/Subject/CourseInTerm.js` |
| การ์ดรายวิชา/section | `AdminContent/Subject/CardCourseInTerm.js` |
| คัดลอกข้อมูล | `AdminContent/Subject/CopyDataDialog.js` |
| เพิ่ม/นำเข้าอาจารย์ | `AdminContent/UserMangement/AddUserDialog.js`, `ImportUserDilog.js` |
| เลือกภาค/ปี | `components/TermAndYearUtils.js`, `SelectSemesterAndSubject.js` |

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| รายวิชาในหลักสูตร | `POST /api/program_subjects/get-program-subjectsby-program_id` | `CourseInTerm.js:57` | `routes/program_subjects.js` | `program_subjectsController` | `program_subjectsModel` |
| รายวิชาที่เปิดในปี/ภาค | `POST /api/semesterCourses/get-by-year-semester` | `CourseInTerm.js:79` | `routes/semesterCourses.js` | `semesterCoursesController` | `semesterCoursesModel` |
| ลำดับ scope ของผู้ใช้ | `POST /api/user_roles/scope-order` | `CourseInTerm.js:107` | `routes/user_roles.js` | `user_rolesController` | `user_rolesModel` |
| รายชื่ออาจารย์ในภาควิชา | `POST /api/user/get-teacher-in-department` | `CourseInTerm.js:128` | `routes/user.js` | `userController` | `userModel`, `departmentModel` |
| เปิดรายวิชาในภาค | `POST /api/semesterCourses/create` | `CardCourseInTerm.js:213` | `routes/semesterCourses.js` | `semesterCoursesController.create` | `semesterCoursesModel`, `courseSectionsModel` |
| ยกเลิกการเปิดรายวิชา | `POST /api/semesterCourses/delete` | `CardCourseInTerm.js:279` | `routes/semesterCourses.js` | `semesterCoursesController.delete` | `semesterCoursesModel` |
| สร้าง section + ผูกอาจารย์ | `POST /api/coursSections/create-section-teacher` | `CardCourseInTerm.js:246` | `routes/courseSections.js` | `courseSectionsController` | `courseSectionsModel`, `userModel`, `subjectsModel` |
| แก้ไขอาจารย์ประจำ section | `POST /api/coursSections/update-section-teachers` | `CardCourseInTerm.js:314` | `routes/courseSections.js` | `courseSectionsController` | `courseSectionsModel` |
| ลบ section | `POST /api/coursSections/delete` | `CardCourseInTerm.js:349` | `routes/courseSections.js` | `courseSectionsController` | `courseSectionsModel` |
| คัดลอกข้อมูลจากภาคก่อน | `POST /api/semesterCourses/copy` | `CopyDataDialog.js:40` | `routes/semesterCourses.js` | `semesterCoursesController.copy` | `semesterCoursesModel`, `cloPlanModel` |

---

### A09 · `/main/plos` — ผลลัพธ์การเรียนรู้ระดับหลักสูตร (PLO)

**Frontend:** `AdminContent/PLO/PLOManage.js` (layout) → `PLOtable.js` + `SelectProgram.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| dropdown หลักสูตร | `POST /api/programs/get-program-by-role` | `SelectProgram.js:25` | `routes/programs.js` | `programsController` | `programsModel` |
| แสดง PLO ของหลักสูตร | `POST /api/plo/get-plo-by-program-id` | `PLOtable.js:344` | `routes/learningOutcome.js` | `learningOutcomeController` | `learningOutcomeModel` |
| เพิ่ม PLO | `POST /api/plo/create` | `PLOtable.js:267` | `routes/learningOutcome.js` | `learningOutcomeController.create` | `learningOutcomeModel`, `subjectPloMappingModel` |
| แก้ไข PLO | `POST /api/plo/update-plo` | `PLOtable.js:228` | `routes/learningOutcome.js` | `learningOutcomeController.update` | `learningOutcomeModel` |
| ลบ PLO | `POST /api/plo/delete-plo` | `PLOtable.js:305` | `routes/learningOutcome.js` | `learningOutcomeController.delete` | `learningOutcomeModel` |

---

### A10 · `/main/mapping-plo` — เชื่อมโยงผลการเรียนรู้กับรายวิชา

**Frontend:** `AdminContent/PLOMapping/MappingPLO.js` + `pdfUtils.js` (export PDF ด้วยฟอนต์ไทย)

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| แสดง PLO ของหลักสูตร | `POST /api/plo/get-plo-by-program-id` | `MappingPLO.js:448` | `routes/learningOutcome.js` | `learningOutcomeController` | `learningOutcomeModel` |
| แสดงตาราง mapping | `POST /api/plo-mapping/get-subject-plo-mapping` | `MappingPLO.js:386` | `routes/subjectPloMapping.js` | `subjectPloMappingController` | `subjectPloMappingModel`, `subjectsModel` |
| บันทึก mapping (E/I/D/P/A) | `POST /api/plo-mapping/create` | `MappingPLO.js:55`, `:414` | `routes/subjectPloMapping.js` | `subjectPloMappingController.create` | `subjectPloMappingModel`, `learningOutcomeModel` |

> `/api/plo-mapping/update` และ `/delete` มีอยู่ใน backend แต่หน้าจอใช้ `create` ทำหน้าที่ upsert แทน

---

### A11 · `/main/users` — ผู้ใช้งานระบบ

**Frontend**

| บทบาท | ไฟล์ |
|---|---|
| Layout | `AdminContent/UserMangement/UserManage.js` |
| ตารางผู้ใช้ | `AdminContent/UserMangement/UserTable.js` |
| เพิ่มผู้ใช้ | `AdminContent/UserMangement/AddUserDialog.js` |
| นำเข้าผู้ใช้ | `AdminContent/UserMangement/ImportUserDilog.js` |
| Hooks | `useUserList.js`, `useAddUser.js`, `useAssignableRoles.js`, `useScope.js`, `useImportUsers.js` |

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| แสดงรายชื่อผู้ใช้ | `POST /api/user/get-user-list` | `useUserList.js:12` | `routes/user.js` | `userController.getUserList` | `userModel`, `user_rolesModel` |
| เปิด/ปิดสถานะผู้ใช้ | `POST /api/user/swap-status` | `UserTable.js:96` | `routes/user.js` | `userController.swapStatus` | `userModel` |
| ลบผู้ใช้ | `DELETE /api/user/delete/:user_id` | `UserTable.js:143` | `routes/user.js` | `userController.deleteUser` | `userModel` |
| เพิ่มผู้ใช้ | `POST /api/user/add_user` | `useAddUser.js:16` | `routes/user.js` | `userController.addUser` | `userModel`, `rolesModel` |
| รายการ role ที่กำหนดได้ | `POST /api/user_roles/assignable-roles/` | `useAssignableRoles.js:14` | `routes/user_roles.js` | `user_rolesController` | `rolesModel`, `user_rolesModel` |
| รายการ scope ที่กำหนดได้ | `POST /api/user_roles/get-scope` | `useScope.js:14` | `routes/user_roles.js` | `user_rolesController` | `departmentModel`, `programsModel`, `facultyModel` |
| นำเข้าผู้ใช้จาก Excel | `POST /api/user/import-users` | `useImportUsers.js:16` | `routes/user.js` (+`upload`) | `userController.importUsers` | `userModel` |

---

### A12 · `/main/users/edit-user` — แก้ไขผู้ใช้ / จัดการสิทธิ์

**Frontend:** `EditUser.js` + `EditPersonalData.js` + `EditRoleAssign.js` + `AddRoleDialog.js`
**Hooks:** `useUpdateUser.js`, `useUserRoles.js`, `useDeleteUserRole.js`, `useAddUserRole.js`, `useAssignableRoles.js`, `useScope.js`, `useAddUser.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| แก้ไขข้อมูลส่วนตัว | `POST /api/user/update_user` | `useUpdateUser.js:21` | `routes/user.js` | `userController.updateUser` | `userModel` |
| แสดงสิทธิ์ปัจจุบัน | `POST /api/user_roles/user-roles/` | `useUserRoles.js:18` | `routes/user_roles.js` | `user_rolesController` | `user_rolesModel` |
| เพิ่มสิทธิ์ | `POST /api/user_roles/add-user-role` | `useAddUserRole.js:22` | `routes/user_roles.js` | `user_rolesController.add` | `user_rolesModel`, `rolesModel` |
| ลบสิทธิ์ | `POST /api/user_roles/delete_user_role` | `useDeleteUserRole.js:20` | `routes/user_roles.js` | `user_rolesController.delete` | `user_rolesModel` |
| role/scope ที่กำหนดได้ | `POST /api/user_roles/assignable-roles/`, `POST /api/user_roles/get-scope` | `useAssignableRoles.js:14`, `useScope.js:14` | `routes/user_roles.js` | `user_rolesController` | `rolesModel`, `programsModel` |

---

### A13 · `/main/users/user-history` — ประวัติการใช้งาน

**Frontend:** `AdminContent/UserMangement/userLogs.js` + `hooks/useUserList.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| รายชื่อผู้ใช้ (filter) | `POST /api/user/get-user-list` | `useUserList.js:12` | `routes/user.js` | `userController` | `userModel` |
| ดึง user log | `GET /api/user/log` | `userLogs.js:99` | `routes/user.js` | `userController.getLog` | `userModel`, `userService` |

---

### A14 · `/main/course-list` — รายการรายวิชา

**Frontend:** `AdminContent/CourseList.js` — เป็น placeholder แสดงเฉพาะหัวข้อ **ไม่มีการเรียก API** และไม่มีลิงก์จาก sidebar

---

### A15 · `/main/courseLevelByIntake` — ประเมินระดับหลักสูตรตามรุ่นปีรับเข้า

**Frontend:** `AdminContent/courseLevelByIntake/courseLevelByIntake.js` + `AdminContent/courseLevelByIntake/AssessmentCriteria.js` + `SelecteProgForProgManager.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | service/model |
|---|---|---|---|---|---|
| dropdown หลักสูตร | `POST /api/programs/get-program-by-role` | `SelecteProgForProgManager.js:41` | `routes/programs.js` | `programsController` | `programsModel` |
| คะแนน PLO รายปีรับเข้า | `GET /api/ploScore/:programId/year/:academicYear` | `courseLevelByIntake.js:37` | `routes/ploScoreRoute.js` | `ploScoreController` | `ploScoreService` → `ploScoreModel`, `cloNormalizeUtil` |
| กิจกรรมของรายวิชา (drill-down) | `GET /api/activity/:subject_id/:program_id` | `AssessmentCriteria.js:68` | `routes/activity.js` | `activityController` | `activityModel` |
| หลักฐานของ section | `GET /api/envidence/section/:section_id` | `AssessmentCriteria.js:101` | `routes/activityEvidence.js` | `activityEvidenceController` | `activityEvidenceService`, `activityEvidenceModel` |

---

### A16 · `/main/courseLevelAllStudents` — ระดับหลักสูตรของนักศึกษาทุกคน

**Frontend:** `AdminContent/courseLevelAllStudents.js` + `SelecteProgForProgManager.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | service |
|---|---|---|---|---|---|
| คะแนน PLO ของนักศึกษาทุกคนในปี | `GET /api/ploScore/:programId/year/:academicYear/studentAll` | `courseLevelAllStudents.js:30` | `routes/ploScoreRoute.js` | `ploScoreController` | `ploScoreService` |

---

### A17 · `/main/courseLevelCompare` — เปรียบเทียบระดับหลักสูตร

**Frontend:** `AdminContent/courseLevelCompare.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | service |
|---|---|---|---|---|---|
| คะแนน PLO ช่วงหลายปี | `GET /api/ploScore/:programId/year-range/:startYear/:endYear` | `courseLevelCompare.js:31` | `routes/ploScoreRoute.js` | `ploScoreController` | `ploScoreService` |

---

### A18 · `/main/courseLevelIndividual` — ระดับหลักสูตรรายบุคคล

**Frontend:** `AdminContent/courseLevelIndividual.js` + `courseLevelByIntake/AssessmentCriteria.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model/service |
|---|---|---|---|---|---|
| dropdown นักศึกษาตามปีรับเข้า | `GET /api/student/get-by-admission-year/:year` | `courseLevelIndividual.js:37` | `routes/student.js` | `studentController` | `studentModel` |
| คะแนน PLO รายบุคคล | `GET /api/ploScore/:programId/student/:studentId` | `courseLevelIndividual.js:69` | `routes/ploScoreRoute.js` | `ploScoreController` | `ploScoreService` |
| กิจกรรม + หลักฐาน (drill-down) | `GET /api/activity/:subject_id/:program_id`, `GET /api/envidence/section/:section_id` | `AssessmentCriteria.js:68`, `:101` | `routes/activity.js`, `routes/activityEvidence.js` | `activityController`, `activityEvidenceController` | `activityModel`, `activityEvidenceModel` |

---

## 5. รายละเอียดรายหน้าจอ — Teacher (`/teacher/teacherDashboard`)

### T01 · *(index)* — รายวิชาของอาจารย์

**Frontend:** `TeacherContent/TeacherDashboard/TeacherDashboard.js` + `components/SearchSectionTeacher.js`, `TeacherTag.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| รายวิชา/section ที่สอน | `POST /api/teacher/getTeacherCourse` | `TeacherDashboard.js:67` | `routes/courseSectionsTeacher.js` | `courseSectionsTeacherController` | `courseSectionsTeacherModel` |

> หน้านี้เขียน `localStorage.selectedCourse` + `localStorage.section` ที่หน้าจออื่นทั้งหมดใช้ resolve `section_id` และ `%SUBJECT%`

---

### T02 · `subjectStudents` — นักศึกษาในรายวิชา

**Frontend:** `SubjectStudents/SubjectStudents.js` + `SubjectStudents/ImportSubjectStudentsDialog.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| แสดงนักศึกษาใน section | `GET /api/studentCourse/get/:section_id` | `SubjectStudents.js:169` | `routes/studentCourse.js` | `studentCourseController` | `studentCourseModel` |
| เพิ่มนักศึกษา | `POST /api/studentCourse/add` | `SubjectStudents.js:114` | `routes/studentCourse.js` | `studentCourseController.add` | `studentCourseModel` |
| ลบนักศึกษา | `DELETE /api/studentCourse/delete` | `SubjectStudents.js:148` | `routes/studentCourse.js` | `studentCourseController.delete` | `studentCourseModel` |
| นำเข้าจาก Excel | `POST /api/studentCourse/import` | `ImportSubjectStudentsDialog.js:37` | `routes/studentCourse.js` (+`upload`) | `studentCourseController.import` | `studentCourseModel` |

---

### T03 · `studentGroups` — กลุ่มนักศึกษา

**Frontend:** `StudentGroups/StudentGroups.js` + `StudentGroups/ImportStudentGroupsDialog.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| แสดงกลุ่มทั้งหมดใน section | `GET /api/studentGroup/get-all-groups-in-section/:section_id` | `StudentGroups.js:222` | `routes/studentGroup.js` | `studentGroupController` | `studentGroupModel` |
| สร้าง/แก้ไขกลุ่ม | `POST /api/studentGroup/upsert` | `StudentGroups.js:181` | `routes/studentGroup.js` | `studentGroupController.upsert` | `studentGroupModel` |
| ลบกลุ่ม | `DELETE /api/studentGroup/delete-group` | `StudentGroups.js:242` | `routes/studentGroup.js` | `studentGroupController.delete` | `studentGroupModel` |
| ประวัติการแก้ไขกลุ่ม | `GET /api/studentGroup/log/:section_id` | `StudentGroups.js:113` | `routes/studentGroup.js` | `studentGroupController.getLog` | `studentGroupModel` |
| นำเข้ากลุ่มจาก Excel | `POST /api/studentGroup/import-student-groups` | `ImportStudentGroupsDialog.js:35` | `routes/studentGroup.js` (+`upload`) | `studentGroupController.import` | `studentGroupModel` |

---

### T04 · `courseOutcomes` — ผลลัพธ์การเรียนรู้ของรายวิชา (CLO)

**Frontend:** `CourseOutcomes/CourseOutcomes.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| แสดง CLO ของ section | `GET /api/subjectClo/get/:section_id` | `CourseOutcomes.js:382` | `routes/subjectClo.js` | `subjectCloController` | `subjectCloModel` |
| PLO ที่ผูกกับรายวิชานี้ | `POST /api/plo-mapping/get-mapping-in-subject` | `CourseOutcomes.js:223` | `routes/subjectPloMapping.js` | `subjectPloMappingController` | `subjectPloMappingModel`, `learningOutcomeModel` |
| เพิ่ม CLO | `POST /api/subjectClo/create` | `CourseOutcomes.js:256` | `routes/subjectClo.js` | `subjectCloController.create` | `subjectCloModel` |
| แก้ไข CLO | `POST /api/subjectClo/update` | `CourseOutcomes.js:340` | `routes/subjectClo.js` | `subjectCloController.update` | `subjectCloModel` |
| ลบ CLO | `DELETE /api/subjectClo/delete/:clo_id` | `CourseOutcomes.js:299` | `routes/subjectClo.js` | `subjectCloController.delete` | `subjectCloModel` |

---

### T05 · `courseOutcomes/:cloId/behaviors` — พฤติกรรมบ่งชี้ของ CLO

**Frontend:** `CourseOutcomes/CourseOutcomeBehaviors.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| แสดงพฤติกรรมบ่งชี้ | `GET /api/subjectBe/get/:section_id/:clo_id` | `CourseOutcomeBehaviors.js:227` | `routes/subjectBe.js` | `subjectBeController` | `subjectBeModel` |
| เพิ่ม | `POST /api/subjectBe/create` | `CourseOutcomeBehaviors.js:132` | `routes/subjectBe.js` | `subjectBeController.create` | `subjectBeModel` |
| แก้ไข | `POST /api/subjectBe/update` | `CourseOutcomeBehaviors.js:195` | `routes/subjectBe.js` | `subjectBeController.update` | `subjectBeModel` |
| ลบ | `DELETE /api/subjectBe/delete/:id` | `CourseOutcomeBehaviors.js:164` | `routes/subjectBe.js` | `subjectBeController.delete` | `subjectBeModel` |

---

### T06 · `courseOutcomes/:cloId/attention` — เกณฑ์การบรรลุ CLO

**Frontend:** `CourseOutcomes/CourseOutcomeAttention.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| แสดงเกณฑ์การบรรลุ | `GET /api/subjectCloAch/get/:section_id/:clo_id` | `CourseOutcomeAttention.js:183` | `routes/subjectCloAch.js` | `subjectCloAchController` | `subjectCloAchModel` |
| เพิ่ม | `POST /api/subjectCloAch/create` | `CourseOutcomeAttention.js:151` | `routes/subjectCloAch.js` | `subjectCloAchController.create` | `subjectCloAchModel` |
| แก้ไข | `POST /api/subjectCloAch/update` | `CourseOutcomeAttention.js:203` | `routes/subjectCloAch.js` | `subjectCloAchController.update` | `subjectCloAchModel` |
| ลบ | `DELETE /api/subjectCloAch/delete/:id` | `CourseOutcomeAttention.js:235` | `routes/subjectCloAch.js` | `subjectCloAchController.delete` | `subjectCloAchModel` |

---

### T07 · `gradingWeights` — สัดส่วนการให้คะแนน

**Frontend:** `GradingWeights/GradingWeights.js` + `GradingWeights/ImportGradingWeightsDialog.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| แสดงสัดส่วนคะแนน | `GET /api/subjectScore/get/:section_id` | `GradingWeights.js:156` | `routes/subjectScore.js` | `subjectScoreController` | `subjectScoreModel` |
| บันทึกสัดส่วนคะแนน | `POST /api/subjectScore/upsert` | `GradingWeights.js:125` | `routes/subjectScore.js` | `subjectScoreController.upsert` | `subjectScoreModel` |
| ลบสัดส่วน | `DELETE /api/subjectScore/delete/:score_ratio_id` | `GradingWeights.js:175` | `routes/subjectScore.js` | `subjectScoreController.delete` | `subjectScoreModel` |
| นำเข้าจาก Excel | `POST /api/subjectScore/import` | `ImportGradingWeightsDialog.js:37` | `routes/subjectScore.js` (+`upload`) | `subjectScoreController.import` | `subjectScoreModel` |

---

### T08 · `learningActivities` — กิจกรรมการเรียนรู้

**Frontend:** `LearningActivities/LearningActivities.js` + `ActivityCard.js` + `TypeTitle.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| แสดงกิจกรรมทั้งหมดใน section | `GET /api/activity/get/:section_id` | `LearningActivities.js:38` | `routes/activity.js` | `activityController` | `activityModel` |
| ลบกิจกรรม | `DELETE /api/activity/:activity_id` | `ActivityCard.js:28` | `routes/activity.js` | `activityController.delete` | `activityModel` |

---

### T09 · `learningActivities/AddNewActivity` — เพิ่ม/แก้ไขกิจกรรม

**Frontend:** `LearningActivities/AddNewActicity.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| ดึง CLO เพื่อผูกกับกิจกรรม | `GET /api/subjectClo/get/:section_id` | `AddNewActicity.js:204` | `routes/subjectClo.js` | `subjectCloController` | `subjectCloModel` |
| ดึงหมวดคะแนนที่กำหนดไว้ | `GET /api/subjectScore/get-category/:section_id` | `AddNewActicity.js:162` | `routes/subjectScore.js` | `subjectScoreController` | `subjectScoreModel` |
| ดึง CLO ที่ผูกกับกิจกรรมเดิม | `GET /api/activity/get-clo-map/:activity_id` | `AddNewActicity.js:114` | `routes/activity.js` | `activityController` | `activityModel` |
| บันทึกกิจกรรม | `POST /api/activity/upsert` | `AddNewActicity.js:182` | `routes/activity.js` | `activityController.upsert` | `activityModel` |

---

### T10 · `teachingPlan` — แผนการสอน

**Frontend:** `TeachingPlan/TeachingPlan.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| แสดงแผนการสอน | `GET /api/courseSyllabus/get/:section_id` | `TeachingPlan.js:39` | `routes/courseSyllabus.js` | `courseSyllabusController` | `courseSyllabusModel` |
| บันทึกแผนการสอน | `POST /api/courseSyllabus/upsert` | `TeachingPlan.js:79` | `routes/courseSyllabus.js` | `courseSyllabusController.upsert` | `courseSyllabusModel` |
| ลบแถวแผนการสอน | `DELETE /api/courseSyllabus/delete/:course_syllabus_id` | `TeachingPlan.js:114` | `routes/courseSyllabus.js` | `courseSyllabusController.delete` | `courseSyllabusModel` |

---

### T11 · `activityScores` — บันทึกคะแนนกิจกรรม

**Frontend:** `ActivityScores/ActivityScores.js` + `ActivityScores/ImportActivityScoresDialog.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model/service |
|---|---|---|---|---|---|
| รายชื่อนักศึกษาใน section | `GET /api/studentCourse/get/:section_id` | `ActivityScores.js:167` | `routes/studentCourse.js` | `studentCourseController` | `studentCourseModel` |
| รายการกิจกรรม | `GET /api/activity/get/:section_id` | `ActivityScores.js:208` | `routes/activity.js` | `activityController` | `activityModel` |
| กลุ่มนักศึกษา (สำหรับคะแนนกลุ่ม) | `GET /api/studentGroup/get-all-groups-in-section/:section_id` | `ActivityScores.js:276` | `routes/studentGroup.js` | `studentGroupController` | `studentGroupModel` |
| ดึงคะแนนที่บันทึกไว้ | `POST /api/activityScore/get` | `ActivityScores.js:227` | `routes/activityScore.js` | `activityScoreController` | `activityScoreModel` |
| บันทึกคะแนน | `POST /api/activityScore/upsert` | `ActivityScores.js:131` | `routes/activityScore.js` | `activityScoreController.upsert` | `activityScoreModel`, `validateScoreService` |
| นำเข้าคะแนนจาก Excel | `POST /api/activityScore/import` | `ImportActivityScoresDialog.js:129` | `routes/activityScore.js` (+`upload`) | `activityScoreController.import` | `activityScoreModel`, `validateScoreService` |

---

### T12 · `activityScores/AssessmentCriteria` — หลักฐานการประเมิน (Evidence)

**Frontend:** `ActivityScores/AssessmentCriteria.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model/service |
|---|---|---|---|---|---|
| รายการกิจกรรม | `GET /api/activity/get/:section_id` | `AssessmentCriteria.js:95` | `routes/activity.js` | `activityController` | `activityModel` |
| แสดงหลักฐานของ section | `GET /api/envidence/section/:section_id` | `AssessmentCriteria.js:116` | `routes/activityEvidence.js` | `activityEvidenceController` | `activityEvidenceModel` |
| อัปโหลดหลักฐาน | `POST /api/envidence` | `AssessmentCriteria.js:176` | `routes/activityEvidence.js` (+`upload.single('file')`) | `activityEvidenceController.upload` | `activityEvidenceService` |
| แทนที่ไฟล์หลักฐาน | `PUT /api/envidence/:evidence_id/replace` | `AssessmentCriteria.js:226` | `routes/activityEvidence.js` | `activityEvidenceController.replace` | `activityEvidenceService` |
| ลบหลักฐาน | `DELETE /api/envidence/:evidence_id/delete` | `AssessmentCriteria.js:277` | `routes/activityEvidence.js` | `activityEvidenceController.delete` | `activityEvidenceModel` |

> ไฟล์หลักฐานถูก serve แบบ static ที่ `app.use('/static', express.static('/data/evidence'))` (`index.js`)
> จำกัดขนาด 50 MB ที่ `middleware/evidenceUpload.js` — **ไม่มี** `fileFilter`/ตรวจ mimetype

---

### T13 · `courseResults` — ผลการเรียนรู้ระดับรายวิชา

**Frontend:** `CourseResults/CourseResults.js` + `CourseResults/crChart.js` + `hooks/useStudentCourses.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model/service |
|---|---|---|---|---|---|
| PLO ที่ผูกกับรายวิชา | `POST /api/plo-mapping/get-mapping-in-subject` | `CourseResults.js:32` | `routes/subjectPloMapping.js` | `subjectPloMappingController` | `subjectPloMappingModel` |
| คะแนนเฉลี่ยของ section | `GET /api/scoreEva/section/:section_id/average` | `CourseResults.js:65`, `:87` | `routes/scoreEvaluation.js` | `scoreEvaluationController` | `scoreEvaluationSectionModel`, `cloScoreService`, `cloNormalizeUtil` |
| เปรียบเทียบกับปีอื่น | `GET /api/scoreEva/section/:section_id/other-years` | `CourseResults.js:108` | `routes/scoreEvaluation.js` | `scoreEvaluationController` | `scoreEvaluationBaseModel` |
| *(ไม่ทำงาน)* รายชื่อ นศ. | `POST /api/studentCourse/get-student-in-course` | `useStudentCourses.js:15` | **ไม่มี route นี้ใน backend** | — | — |

---

### T14 · `studentResults` — ผลการเรียนรู้รายบุคคล

**Frontend:** `StudentResults/StudentResults.js` + `hooks/useStudentCourses.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model/service |
|---|---|---|---|---|---|
| รายชื่อนักศึกษาใน section | `GET /api/studentCourse/get/:section_id` | `StudentResults.js:101` | `routes/studentCourse.js` | `studentCourseController` | `studentCourseModel` |
| คะแนนเฉลี่ยของ section (baseline) | `GET /api/scoreEva/section/:section_id/average` | `StudentResults.js:58` | `routes/scoreEvaluation.js` | `scoreEvaluationController` | `scoreEvaluationSectionModel` |
| คะแนนรายบุคคล | `GET /api/scoreEva/section/:section_id/student/:studentId` | `StudentResults.js:80` | `routes/scoreEvaluation.js` | `scoreEvaluationController` | `scoreEvaluationSectionModel`, `cloScoreService` |
| *(ไม่ทำงาน)* รายชื่อ นศ. | `POST /api/studentCourse/get-student-in-course` | `useStudentCourses.js:15` | **ไม่มี route นี้ใน backend** | — | — |

---

### T15 · `learningDetails` — รายละเอียดผลการเรียนรู้

**Frontend:** `LearningDetails/LearningDetails.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model/service |
|---|---|---|---|---|---|
| รายชื่อนักศึกษาใน section | `GET /api/studentCourse/get/:section_id` | `LearningDetails.js:37` | `routes/studentCourse.js` | `studentCourseController` | `studentCourseModel` |
| คะแนนเฉลี่ยของ section | `GET /api/scoreEva/section/:section_id/average` | `LearningDetails.js:62` | `routes/scoreEvaluation.js` | `scoreEvaluationController` | `scoreEvaluationSectionModel` |
| คะแนน CLO รายนักศึกษาทั้ง section | `GET /api/scoreEva/section/:section_id/student-clo-scores` | `LearningDetails.js:83` | `routes/scoreEvaluation.js` | `scoreEvaluationController` | `cloScoreService`, `cloNormalizeUtil` |

---

### T16 · `outcomeActivityMapping` — เชื่อมโยง CLO ↔ กิจกรรม

**Frontend:** `OutcomeActivityMapping/OutcomeActivityMapping.js` + `ThinSankey.js` (@nivo/sankey)

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| ผลประเมิน CLO ของ section | `GET /api/cloEva/get/:section_id` | `OutcomeActivityMapping.js:28` | `routes/cloEvaluation.js` | `cloEvaluation.controller` | `cloEvaluation.model` |
| รายการกิจกรรม | `GET /api/activity/get/:section_id` | `OutcomeActivityMapping.js:51` | `routes/activity.js` | `activityController` | `activityModel` |

> มี endpoint `GET /api/relActClo/section/:section_id/clo-activity` ที่ตรงกับหน้านี้ แต่ **ไม่ถูกเรียกจาก frontend**

---

### T17 · `AssessmentCLO` — ประเมินผล CLO

**Frontend:** `AssessmentCLO/AssessmentCLO.js` + `AssessmentCLO/assessmentPdfUtils.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| ผลประเมิน CLO ของ section | `GET /api/cloEva/get/:section_id` | `AssessmentCLO.js:38` | `routes/cloEvaluation.js` | `cloEvaluation.controller` | `cloEvaluation.model` |

---

### T18 · `ContinuousImprove` — แผนการปรับปรุงอย่างต่อเนื่อง (CIP)

**Frontend:** `ContinuousImprove/ContinuousImprove.js` + `ContinuousCard.js`

| การกระทำ | Method + Endpoint | เรียกจาก | routes | controller | model |
|---|---|---|---|---|---|
| แสดงแผน CIP ของ section | `GET /api/cloPLan/section/:section_id` | `ContinuousImprove.js:22` | `routes/cloPLan.js` | `cloPLanController` | `cloPlanModel` |
| CLO ของ section (อ้างอิง) | `GET /api/subjectClo/get/:section_id` | `ContinuousImprove.js:81` | `routes/subjectClo.js` | `subjectCloController` | `subjectCloModel` |
| บันทึกรายละเอียดแผน | `POST /api/cloPLan/detail/upsert` | `ContinuousImprove.js:43` | `routes/cloPLan.js` | `cloPLanController.upsertDetail` | `cloPlanModel` |
| ลบรายละเอียดแผน | `DELETE /api/cloPLan/:plan_detail_id/delete` | `ContinuousImprove.js:65` | `routes/cloPLan.js` | `cloPLanController.deleteDetail` | `cloPlanModel` |

> `POST /api/cloPLan/create-cycle` ถูกเรียกโดยอ้อมจากฝั่ง backend (`semesterCoursesController` → `cloPlanModel`) ไม่ได้เรียกจาก frontend

---

## 6. Backend Layer Map (route → controller → model/service)

| Mount ใน `all_routes.js` | ไฟล์ route | Controller | Model / Service |
|---|---|---|---|
| `/auth` *(ก่อน blockDirectAccess)* | `auth.js` | `authController` | `userModel`, `userService` |
| `/protected` | `protected.js` | — | — |
| `/user` | `user.js` | `userController` | `userModel`, `user_rolesModel`, `departmentModel`, `programsModel`, `rolesModel`, `userService`, `config/evidence` |
| `/user_roles` | `user_roles.js` | `user_rolesController` | `user_rolesModel`, `userModel`, `rolesModel`, `programsModel`, `departmentModel`, `facultyModel` |
| `/department` | `department.js` | `departmentController` | `departmentModel`, `facultyModel`, `XLSX` |
| `/programs` | `programs.js` | `programsController` | `programsModel`, `departmentModel`, `XLSX` |
| `/subjects` | `subjects.js` | `subjectsController` | `subjectsModel`, `userModel`, `departmentModel` |
| `/student` | `student.js` | `studentController` | `studentModel`, `departmentModel`, `programsModel`, `userController`, `xlsx` |
| `/roles` | `roles.js` | `rolesController` | `rolesModel` |
| `/program_subjects` | `program_subjects.js` | `program_subjectsController` | `program_subjectsModel`, `subjectPloMappingModel`, `learningOutcomeModel`, `programsModel`, `departmentModel`, `subjectsModel`, `userModel` |
| `/rubrics` | `rubrics.js` | `rubricsController` | `rubricsModel`, `userModel` |
| `/rubricDetails` | `rubricDetails.js` | `rubricDetailsController` | `rubricDetailsModel`, `rubricsModel`, `userModel` |
| `/semesterCourses` | `semesterCourses.js` | `semesterCoursesController` | `semesterCoursesModel`, `courseSectionsModel`, `cloPlanModel`, `userModel` |
| `/coursSections` | `courseSections.js` | `courseSectionsController` | `courseSectionsModel`, `userModel`, `programsModel`, `semesterCoursesModel`, `subjectsModel` |
| `/teacher` | `courseSectionsTeacher.js` | `courseSectionsTeacherController` | `courseSectionsTeacherModel` |
| `/plo` | `learningOutcome.js` | `learningOutcomeController` | `learningOutcomeModel`, `subjectPloMappingModel`, `userModel` |
| `/plo-mapping` | `subjectPloMapping.js` | `subjectPloMappingController` | `subjectPloMappingModel`, `learningOutcomeModel`, `programsModel`, `subjectsModel`, `userModel` |
| `/studentCourse` | `studentCourse.js` | `studentCourseController` | `studentCourseModel` |
| `/studentGroup` | `studentGroup.js` | `studentGroupController` | `studentGroupModel` |
| `/subjectClo` | `subjectClo.js` | `subjectCloController` | `subjectCloModel` |
| `/subjectBe` | `subjectBe.js` | `subjectBeController` | `subjectBeModel` |
| `/subjectCloAch` | `subjectCloAch.js` | `subjectCloAchController` | `subjectCloAchModel` |
| `/subjectScore` | `subjectScore.js` | `subjectScoreController` | `subjectScoreModel` |
| `/activity` | `activity.js` | `activityController` | `activityModel` |
| `/activityScore` | `activityScore.js` | `activityScoreController` | `activityScoreModel`, `validateScoreService` |
| `/courseSyllabus` | `courseSyllabus.js` | `courseSyllabusController` | `courseSyllabusModel` |
| `/cloEva` | `cloEvaluation.js` | `cloEvaluation.controller` | `cloEvaluation.model` |
| `/scoreEva` | `scoreEvaluation.js` | `scoreEvaluationController` | `scoreEvaluationSectionModel`, `scoreEvaluationBaseModel`, `scoreEvaluationProgramModel`, `cloScoreService`, `cloNormalizeUtil` |
| `/relActClo` | `relActivityClo.js` | `relActivityCloController` | `relActivityCloNModel` |
| `/ploEv` | `ploEv.js` | `ploEvController` | `ploEvModel` |
| `/envidence` | `activityEvidence.js` | `activityEvidenceController` | `activityEvidenceService`, `activityEvidenceModel` |
| `/cloPLan` | `cloPLan.js` | `cloPLanController` | `cloPlanModel` |
| `/ploScore` | `ploScoreRoute.js` | `ploScoreController` | `ploScoreService` → `ploScoreModel`, `cloNormalizeUtil` |

---

## 7. Reverse Index: API Endpoint → หน้าจอที่เรียกใช้

| Method + Endpoint | หน้าจอที่เรียก | ไฟล์ frontend |
|---|---|---|
| `POST /api/auth/login` | S01 | `pages/Login.js` |
| `GET /api/auth/google-login` | S01 | `pages/Login.js` |
| `GET /api/auth/google/callback` | S01 (redirect) | — |
| `GET /api/auth/logout` | S06 | `context/AuthContext.js` |
| `GET /api/auth/ping` | *(ไม่มีผู้เรียก)* | — |
| `GET /api/protected/profile` | S06 | `context/AuthContext.js` |
| `POST /api/user/get-user-list` | A11, A13 | `hooks/useUserList.js` |
| `POST /api/user/add_user` | A11, A12 | `hooks/useAddUser.js` |
| `POST /api/user/update_user` | A12 | `hooks/useUpdateUser.js` |
| `POST /api/user/get-teacher-in-department` | A08 | `CourseInTerm.js` |
| `POST /api/user/swap-status` | A11 | `UserTable.js` |
| `GET /api/user/log` | A13 | `userLogs.js` |
| `POST /api/user/import-users` | A11, A08 | `hooks/useImportUsers.js` |
| `POST /api/user/change-password` | S06 | `components/Navbar.js` |
| `DELETE /api/user/delete/:user_id` | A11 | `UserTable.js` |
| `POST /api/user/upload-profile-image` | *(ไม่มีผู้เรียก)* | — |
| `GET /api/user/profile` | *(ไม่มีผู้เรียก — ใช้ `/protected/profile` แทน)* | — |
| `POST /api/user_roles/user-roles` | S02, S06, A12 | `SelectApp.js`, `Mainpage.js`, `hooks/useUserRoles.js` |
| `POST /api/user_roles/add-user-role` | A12 | `hooks/useAddUserRole.js` |
| `POST /api/user_roles/assignable-roles` | A11, A12 | `hooks/useAssignableRoles.js` |
| `POST /api/user_roles/get-scope` | A11, A12 | `hooks/useScope.js` |
| `POST /api/user_roles/delete_user_role` | A12 | `hooks/useDeleteUserRole.js` |
| `POST /api/user_roles/scope-order` | A08 | `CourseInTerm.js` |
| `GET /api/department/get-all-department` | A01, A02, A03, A07 | `hooks/useDepartments.js` |
| `POST /api/department/get-department-by-id` | A02, A07 | `SelectDepartment.js`, `SelectDepartmentAndPrograms.js` |
| `POST /api/department/create-department` | A01 | `hooks/useDepartmentActions.js` |
| `POST /api/department/edit-department` | A01 | `hooks/useDepartmentActions.js` |
| `POST /api/department/delete-department` | A01 | `hooks/useDepartmentActions.js` |
| `POST /api/department/import-departments` | A01 | `ImportDepartmentDilog.js` |
| `GET /api/department/get-all-department-flase` | *(ไม่มีผู้เรียก)* | — |
| `POST /api/department/get-dept-by-fact-id` | *(ไม่มีผู้เรียก)* | — |
| `POST /api/programs/get-program-by-department-id` | A02, A07 | `hooks/usePrograms.js` |
| `POST /api/programs/get-program-by-role` | A04, A06, A09, A10, A15–A18 | `SelectProgram.js`, `SelecteProgForProgManager.js` |
| `POST /api/programs/create-programs` | A02 | `hooks/useProgramsActions.js` |
| `POST /api/programs/edit-programs` | A02 | `hooks/useProgramsActions.js` |
| `POST /api/programs/delete-programs` | A02 | `hooks/useProgramsActions.js` |
| `POST /api/programs/import-programs` | A02 | `ImportProgramDilog.js` |
| `GET /api/programs/get-all-programs` | *(ไม่มีผู้เรียก)* | — |
| `POST /api/programs/get-program-by-id` | *(ไม่มีผู้เรียก)* | — |
| `POST /api/subjects/get-subject-by-department_id` | A03, A06 | `hooks/useSubjects.js`, `CourseInProg.js` |
| `POST /api/subjects/create-subjects` | A03 | `hooks/useSubjects.js` |
| `POST /api/subjects/update-subjects` | A03 | `hooks/useSubjects.js` |
| `POST /api/subjects/delete` | A03 | `hooks/useSubjects.js` |
| `POST /api/subjects/import-subject` | A03 | `ImportSubjectDilog.js` |
| `GET /api/subjects/get-all-subjects` | *(ไม่มีผู้เรียก)* | — |
| `POST /api/subjects/get-subject-by-id` | *(ไม่มีผู้เรียก)* | — |
| `POST /api/program_subjects/create-program_subjects` | A06 | `CourseInProg.js` |
| `POST /api/program_subjects/update-program-subject` | A06 | `CourseInProg.js` |
| `POST /api/program_subjects/delete` | A06 | `CourseInProg.js` |
| `POST /api/program_subjects/get-program-subjectsby-program_id` | A06, A08 | `CourseInProg.js`, `CourseInTerm.js` |
| `POST /api/program_subjects/import-program-subject` | A06 | `ImportProgSubjectDilog.js` |
| `GET /api/program_subjects/get-all-program-subjects` | *(ไม่มีผู้เรียก)* | — |
| `POST /api/program_subjects/get-program-subjectsby-id` | *(ไม่มีผู้เรียก)* | — |
| `POST /api/rubrics/create|update|delete|get-by-program` | A04 | `RubricTable.js` |
| `POST /api/rubricDetails/create|update|delete|get-by-code` | A05 | `EditRubricDetail.js` |
| `POST /api/student/get-by-program` | A07 | `MainStudentData.js` |
| `GET /api/student/get-by-admission-year/:year` | A18 | `courseLevelIndividual.js` |
| `POST /api/student/import-students` | *(ไม่มีผู้เรียก)* | — |
| `POST /api/student/add-student` | *(ไม่มีผู้เรียก)* | — |
| `POST /api/student/get-by-department` | *(ไม่มีผู้เรียก)* | — |
| `POST /api/roles/create_roles` | *(ไม่มีผู้เรียก)* | — |
| `POST /api/semesterCourses/create` | A08 | `CardCourseInTerm.js` |
| `POST /api/semesterCourses/get-by-year-semester` | A08 | `CourseInTerm.js` |
| `POST /api/semesterCourses/delete` | A08 | `CardCourseInTerm.js` |
| `POST /api/semesterCourses/copy` | A06, A08 | `CopyDataDialog.js` |
| `POST /api/coursSections/create-section-teacher` | A08 | `CardCourseInTerm.js` |
| `POST /api/coursSections/update-section-teachers` | A08 | `CardCourseInTerm.js` |
| `POST /api/coursSections/delete` | A08 | `CardCourseInTerm.js` |
| `POST /api/teacher/getTeacherCourse` | T01 | `TeacherDashboard.js` |
| `POST /api/plo/create|update-plo|delete-plo` | A09 | `PLOtable.js` |
| `POST /api/plo/get-plo-by-program-id` | A09, A10 | `PLOtable.js`, `MappingPLO.js` |
| `POST /api/plo-mapping/create` | A10 | `MappingPLO.js` |
| `POST /api/plo-mapping/get-subject-plo-mapping` | A10 | `MappingPLO.js` |
| `POST /api/plo-mapping/get-mapping-in-subject` | T04, T13 | `CourseOutcomes.js`, `CourseResults.js` |
| `POST /api/plo-mapping/update` | *(ไม่มีผู้เรียก)* | — |
| `POST /api/plo-mapping/delete` | *(ไม่มีผู้เรียก)* | — |
| `GET /api/studentCourse/get/:section_id` | T02, T11, T14, T15 | `SubjectStudents.js`, `ActivityScores.js`, `StudentResults.js`, `LearningDetails.js` |
| `POST /api/studentCourse/add` | T02 | `SubjectStudents.js` |
| `DELETE /api/studentCourse/delete` | T02 | `SubjectStudents.js` |
| `POST /api/studentCourse/import` | T02 | `ImportSubjectStudentsDialog.js` |
| `POST /api/studentGroup/upsert` | T03 | `StudentGroups.js` |
| `GET /api/studentGroup/get-all-groups-in-section/:section_id` | T03, T11 | `StudentGroups.js`, `ActivityScores.js` |
| `DELETE /api/studentGroup/delete-group` | T03 | `StudentGroups.js` |
| `GET /api/studentGroup/log/:section_id` | T03 | `StudentGroups.js` |
| `POST /api/studentGroup/import-student-groups` | T03 | `ImportStudentGroupsDialog.js` |
| `GET /api/studentGroup/get-students-in-group/:group_id` | *(ไม่มีผู้เรียก)* | — |
| `GET /api/subjectClo/get/:section_id` | T04, T09, T18 | `CourseOutcomes.js`, `AddNewActicity.js`, `ContinuousImprove.js` |
| `POST /api/subjectClo/create|update` | T04 | `CourseOutcomes.js` |
| `DELETE /api/subjectClo/delete/:clo_id` | T04 | `CourseOutcomes.js` |
| `GET /api/subjectClo/getPloMappedinCLO/...` | *(ไม่มีผู้เรียก)* | — |
| `POST/GET/DELETE /api/subjectBe/*` | T05 | `CourseOutcomeBehaviors.js` |
| `POST/GET/DELETE /api/subjectCloAch/*` | T06 | `CourseOutcomeAttention.js` |
| `POST /api/subjectScore/upsert` | T07 | `GradingWeights.js` |
| `GET /api/subjectScore/get/:section_id` | T07 | `GradingWeights.js` |
| `DELETE /api/subjectScore/delete/:score_ratio_id` | T07 | `GradingWeights.js` |
| `POST /api/subjectScore/import` | T07 | `ImportGradingWeightsDialog.js` |
| `GET /api/subjectScore/get-category/:section_id` | T09 | `AddNewActicity.js` |
| `GET /api/activity/get/:section_id` | T08, T11, T12, T16 | `LearningActivities.js`, `ActivityScores.js`, `AssessmentCriteria.js`, `OutcomeActivityMapping.js` |
| `POST /api/activity/upsert` | T09 | `AddNewActicity.js` |
| `GET /api/activity/get-clo-map/:activity_id` | T09 | `AddNewActicity.js` |
| `DELETE /api/activity/:activity_id` | T08 | `ActivityCard.js` |
| `GET /api/activity/:subject_id/:program_id` | A15, A18 | `courseLevelByIntake/AssessmentCriteria.js` |
| `POST /api/activityScore/upsert|get` | T11 | `ActivityScores.js` |
| `POST /api/activityScore/import` | T11 | `ImportActivityScoresDialog.js` |
| `POST /api/envidence` | T12 | `ActivityScores/AssessmentCriteria.js` |
| `GET /api/envidence/section/:section_id` | T12, A15, A18 | `AssessmentCriteria.js` (ทั้ง 2 เวอร์ชัน) |
| `PUT /api/envidence/:evidence_id/replace` | T12 | `ActivityScores/AssessmentCriteria.js` |
| `DELETE /api/envidence/:evidence_id/delete` | T12 | `ActivityScores/AssessmentCriteria.js` |
| `GET /api/envidence/:evidence_id/download` | *(ไม่มีผู้เรียก)* | — |
| `GET /api/envidence/section/:section_id/activity/:activity_id` | *(ไม่มีผู้เรียก)* | — |
| `POST /api/courseSyllabus/upsert` | T10 | `TeachingPlan.js` |
| `GET /api/courseSyllabus/get/:section_id` | T10 | `TeachingPlan.js` |
| `DELETE /api/courseSyllabus/delete/:id` | T10 | `TeachingPlan.js` |
| `GET /api/cloEva/get/:section_id` | T16, T17 | `OutcomeActivityMapping.js`, `AssessmentCLO.js` |
| `GET /api/scoreEva/section/:section_id/average` | T13, T14, T15 | `CourseResults.js`, `StudentResults.js`, `LearningDetails.js` |
| `GET /api/scoreEva/section/:section_id/student/:studentId` | T14 | `StudentResults.js` |
| `GET /api/scoreEva/section/:section_id/other-years` | T13 | `CourseResults.js` |
| `GET /api/scoreEva/section/:section_id/student-clo-scores` | T15 | `LearningDetails.js` |
| `GET /api/relActClo/section/:section_id/clo-activity` | *(ไม่มีผู้เรียก)* | — |
| `GET /api/ploEv/plo-evaluation/:program_id/:year` | *(ไม่มีผู้เรียก)* | — |
| `GET /api/cloPLan/section/:section_id` | T18 | `ContinuousImprove.js` |
| `POST /api/cloPLan/detail/upsert` | T18 | `ContinuousImprove.js` |
| `DELETE /api/cloPLan/:plan_detail_id/delete` | T18 | `ContinuousImprove.js` |
| `POST /api/cloPLan/create-cycle` | *(ไม่มีผู้เรียก — ถูกใช้ภายใน `semesterCoursesController`)* | — |
| `GET /api/cloPLan/semester-course/:section_id` | *(ไม่มีผู้เรียก)* | — |
| `GET /api/ploScore/:programId/student/:studentId` | A18 | `courseLevelIndividual.js` |
| `GET /api/ploScore/:programId/year/:academicYear` | A15 | `courseLevelByIntake.js` |
| `GET /api/ploScore/:programId/year/:academicYear/studentAll` | A16 | `courseLevelAllStudents.js` |
| `GET /api/ploScore/:programId/year-range/:startYear/:endYear` | A17 | `courseLevelCompare.js` |

---

## 8. Shared Components / Hooks / Context

### 8.1 Shared Components (ใช้ข้ามหลายหน้าจอ)

| ไฟล์ | หน้าที่ | เรียก API |
|---|---|---|
| `components/Navbar.js` | แถบบน + เปลี่ยนรหัสผ่าน | `POST /api/user/change-password` |
| `components/Sidebar.js`, `SidebarItem.js` | เมนูตาม role | — |
| `components/SidebarItem/*.js` | config เมนูของแต่ละ role | — |
| `components/SelectDepartment.js` | dropdown ภาควิชา | `POST /api/department/get-department-by-id` |
| `components/SelectDepartmentAndPrograms.js` | dropdown ภาควิชา+หลักสูตร | `POST /api/department/get-department-by-id` |
| `components/SelectProgram.js` | dropdown หลักสูตร | `POST /api/programs/get-program-by-role` |
| `components/SelecteProgForProgManager.js` | dropdown หลักสูตร (กรรมการหลักสูตร) | `POST /api/programs/get-program-by-role` |
| `components/DeleteDialog.js` | ยืนยันการลบ | — |
| `components/SessionExpiredDialog.js` | แจ้ง session หมดอายุ | — |
| `components/Breadcrumb.js`, `breadcrumbNameMap .js`, `titleMap.js` | breadcrumb | — |
| `components/MapRole.js` | แปลง role code ↔ ชื่อไทย | — |
| `components/usePagination.js`, `PageNumber.js` | แบ่งหน้า | — |
| `components/SeachSection.js`, `SearchSectionTeacher.js` | ค้นหา | — |
| `components/TermAndYearUtils.js`, `SelectSemesterAndSubject.js` | เลือกปี/ภาคการศึกษา | — |
| `components/ContentMotionDIV.js`, `ContentTitle.js`, `ContentSubjectTitle.js`, `MainPageContent.js` | layout/animation | — |
| `components/TableHeader.js`, `MotionTr.js`, `StatusTag.js`, `TeacherTag.js`, `BT.js`, `RoleDropdown.js` | UI ย่อย | — |
| `components/LoadingScreen.js` | หน้าจอโหลด | — |
| `utils/session.js`, `services/authService.js` | จัดการ session | — |

### 8.2 Hooks (`src/hooks/`)

| Hook | Endpoint | ใช้โดยหน้าจอ |
|---|---|---|
| `useUserList.js` | `POST /api/user/get-user-list` | A11, A13 |
| `useAddUser.js` | `POST /api/user/add_user` | A11, A12 |
| `useUpdateUser.js` | `POST /api/user/update_user` | A12 |
| `useImportUsers.js` | `POST /api/user/import-users` | A11, A08 |
| `useUserRoles.js` | `POST /api/user_roles/user-roles` | A12 |
| `useAddUserRole.js` | `POST /api/user_roles/add-user-role` | A12 |
| `useDeleteUserRole.js` | `POST /api/user_roles/delete_user_role` | A12 |
| `useAssignableRoles.js` | `POST /api/user_roles/assignable-roles` | A11, A12 |
| `useScope.js` | `POST /api/user_roles/get-scope` | A11, A12 |
| `useDepartments.js` | `GET /api/department/get-all-department` | A01, A02, A03, A07 |
| `useDepartmentActions.js` | create/edit/delete-department | A01 |
| `usePrograms.js` | `POST /api/programs/get-program-by-department-id` | A02, A07 |
| `useProgramsActions.js` | create/edit/delete-programs | A02 |
| `useSubjects.js` | subjects get/create/update/delete | A03 |
| `useStudentCourses.js` | `POST /api/studentCourse/get-student-in-course` ⚠️ | T13, T14 |

### 8.3 Context

| ไฟล์ | หน้าที่ | Endpoint |
|---|---|---|
| `context/AuthContext.js` | เก็บ `profile`, `loading`, `logout`; bootstrap จาก `localStorage.isLoggedIn` | `GET /api/protected/profile`, `GET /api/auth/logout` |

---

## 9. ข้อสังเกตจากการ Scan Codebase (Findings)

### 9.1 API ที่ frontend เรียกแต่ backend ไม่มี (Broken)

| รายการ | รายละเอียด |
|---|---|
| `POST /api/studentCourse/get-student-in-course` | เรียกจาก `hooks/useStudentCourses.js:15` (ใช้โดย T13 CourseResults และ T14 StudentResults) แต่ **ไม่มี route นี้ใน `routes/studentCourse.js`** → คืน 404 เสมอ |
| `useStudentCourses.js` — logic | บล็อก `finally { setLoading(false); setStudents([]) }` เคลียร์ผลลัพธ์ทุกครั้ง แม้ request สำเร็จ hook ก็จะคืน `[]` เสมอ |

### 9.2 Endpoint ที่ไม่มี `verifyToken`

| Endpoint | ไฟล์ | สถานะการใช้งาน |
|---|---|---|
| `GET /api/ploScore/:programId/student/:studentId` | `routes/ploScoreRoute.js` | ใช้จริง (A18) |
| `GET /api/ploScore/:programId/year/:academicYear` | `routes/ploScoreRoute.js` | ใช้จริง (A15) |
| `GET /api/ploScore/:programId/year/:academicYear/studentAll` | `routes/ploScoreRoute.js` | ใช้จริง (A16) |
| `GET /api/ploScore/:programId/year-range/:startYear/:endYear` | `routes/ploScoreRoute.js` | ใช้จริง (A17) |
| `DELETE /api/user/delete/:user_id` | `routes/user.js` | ใช้จริง (A11 `UserTable.js:143`) |

> ทั้งหมดยังผ่าน `blockDirectAccess` แต่ไม่ตรวจ JWT/สิทธิ์ระดับ role — ควรตั้งเป็น test case ด้านความปลอดภัย (ดู `04-test-cases-v0.1.md` กลุ่ม TC-NFR)

### 9.3 Endpoint ที่ backend มีแต่ไม่มีหน้าจอเรียก (Dead / Reserved)

`GET /api/auth/ping` · `GET /api/user/profile` · `POST /api/user/upload-profile-image` · `GET /api/department/get-all-department-flase` · `POST /api/department/get-dept-by-fact-id` · `GET /api/programs/get-all-programs` · `POST /api/programs/get-program-by-id` · `GET /api/subjects/get-all-subjects` · `POST /api/subjects/get-subject-by-id` · `GET /api/program_subjects/get-all-program-subjects` · `POST /api/program_subjects/get-program-subjectsby-id` · `POST /api/student/import-students` · `POST /api/student/add-student` · `POST /api/student/get-by-department` · `POST /api/roles/create_roles` · `POST /api/plo-mapping/update` · `POST /api/plo-mapping/delete` · `GET /api/subjectClo/getPloMappedinCLO/sections/:section_id/clo/:clo_id` · `GET /api/studentGroup/get-students-in-group/:group_id` · `GET /api/envidence/:evidence_id/download` · `GET /api/envidence/section/:section_id/activity/:activity_id` · `GET /api/relActClo/section/:section_id/clo-activity` · `GET /api/ploEv/plo-evaluation/:program_id/:year` · `POST /api/cloPLan/create-cycle` · `GET /api/cloPLan/semester-course/:section_id`

> รวม **25 endpoints** ที่ไม่มี caller จากฝั่ง frontend (บางตัวถูกเรียกภายใน backend เอง เช่น `cloPLan/create-cycle`)
> ใน `routes/scoreEvaluation.js` ยังมี route ระดับหลักสูตรอีก 4 เส้นที่ถูก **comment out** ไว้

### 9.4 ไฟล์ frontend ที่ไม่ถูก import (Orphan)

| ไฟล์ | สถานะ |
|---|---|
| `content/TeacherContent/TeacherSubjects/TeacherSubjects.js` | stub ไม่มีใคร import |
| `content/TeacherContent/newcontent.js` | stub ไม่มีใคร import |
| `content/Student/MainStudentData.js` | ซ้ำกับเวอร์ชันใน `AdminContent/Student/` และไม่ถูก import |
| `content/AdminContent/CourseList.js` | มี route `/main/course-list` แต่เนื้อหาเป็นแค่หัวข้อ ไม่มีในเมนู |

### 9.5 ข้อสังเกตอื่น

| # | รายการ | รายละเอียด |
|---|---|---|
| 1 | Route ซ้ำ | `AppRoutes.js` ประกาศ `<Route path="rubrics" element={<RubricManage />} />` **สองครั้ง** (บล็อก บรรทัด 104–107 และบรรทัด 109) |
| 2 | Sidebar ของ FULL_ADMIN | `SidebarItem/FullAddmin.js` มีเมนูเดียวคือ *ผู้ใช้งานระบบ* → `/main/users` ซึ่ง **ไม่ตรงกับที่วิทยานิพนธ์ระบุ** ว่าผู้ดูแลระบบกลางเข้าถึงเมนูข้อมูลหลักได้ทั้งหมด |
| 3 | Sidebar ของ STUDENT / GUEST | `Student.js`, `Guest.js` เป็น label เปล่า ไม่มี path — ฝั่งนักศึกษาแยกไปที่ `portfolio.deep-core.net` |
| 4 | Hardcode ใน role lookup | `SelectApp.js` และ `Mainpage.js` POST `/api/user_roles/user-roles` ด้วย payload คงที่ `role_id: 'FULL_ADMIN', scope_id: 'FULL_ADMIN'` |
| 5 | ข้อจำกัดไฟล์หลักฐาน | `middleware/evidenceUpload.js` ใช้ `multer.memoryStorage()` + `limits.fileSize = 50 MB` และ **ไม่มี `fileFilter`/ตรวจ mimetype** → ข้อกำหนด "อัปโหลดได้เฉพาะ PDF" (BR-15) ไม่ได้ถูกบังคับทั้งฝั่ง client และ server (ตอบคำถาม Q6 ใน `04-test-cases-v0.1.md`) |
| 6 | Static evidence | `index.js` เปิด `app.use('/static', express.static('/data/evidence'))` — ไฟล์หลักฐานเข้าถึงได้โดยตรงถ้ารู้ path (ไม่ผ่าน `verifyToken`) |
| 7 | CORS allowlist | `https://portfolio.deep-core.net`, `https://deep-core.net`, `http://localhost:3000/5000/5173`, `http://10.240.68.8` (+`:5000`, `:80`) พร้อม `credentials: true` |
| 8 | ชื่อ mount สะกดผิด | `/api/envidence` (evidence), `/api/coursSections` (courseSections) — ต้องใช้ตามนี้ในการทดสอบ |
| 9 | ไฟล์ที่มีช่องว่างในชื่อ | `components/breadcrumbNameMap .js` (มี space ก่อน `.js`) |

---

## เอกสารที่เกี่ยวข้อง

- [`01-requirements.md`](./01-requirements.md) — Requirements Specification
- [`02-database-schema.md`](./02-database-schema.md) — Database Schema
- [`03-er-diagram.md`](./03-er-diagram.md) — ER Diagram
- [`04-test-cases-v0.1.md`](./04-test-cases-v0.1.md) — Test Cases v0.1
- **`05-screen-api-mapping.md`** — Screen ↔ Frontend ↔ Backend ↔ API Mapping *(เอกสารนี้)*
- [`06-implementation-plan.md`](./06-implementation-plan.md) — Implementation Spec
- [`07-ticket-breakdown.md`](./07-ticket-breakdown.md) — Ticket Breakdown (44 tickets)

> **เอกสารนี้อธิบายโค้ดของนักศึกษาตามที่ส่งมอบ** และจะถูกอัปเดตทีละ ticket ระหว่างการเขียนใหม่ สิ่งที่จะเปลี่ยน:
> ชื่อ mount ที่สะกดผิด (`envidence`, `coursSections`) · endpoint ที่อ่านอย่างเดียวเปลี่ยนจาก POST เป็น GET ·
> หน้า `courseLevel*` (A15–A18) เปลี่ยนชื่อเป็น `programLevel*` · endpoint 25 เส้นที่ไม่มีคนเรียกจะไม่ถูกคัดลอกไป ·
> A03 (`/main/subjects`) เหลือ `DEPT_ADMIN` บทบาทเดียว ตาม [#61](https://github.com/khthana/Deep-QA/issues/61)
> ซึ่งตัดสินว่าแคตตาล็อกรายวิชาเป็นของภาควิชาที่สอนวิชานั้น ผู้ดูแลระดับคณะจึงเข้าหน้านี้ไม่ได้เลย
> ทั้งอ่านและแก้ ·
> A04, A06, A09 และ A10 ตัด `FACULTY_ADMIN` ออกทั้งสี่หน้า ตาม [#79](https://github.com/khthana/Deep-QA/issues/79)
> คณะถือรายชื่อภาควิชาและรายชื่อหลักสูตร (A01, A02) ส่วนสิ่งที่อยู่ *ข้างใน* หลักสูตร — รายวิชา Rubric PLO
> และการเชื่อมโยง — เป็นของภาควิชากับกรรมการหลักสูตร #79 จึงกลับคำหมายเหตุเดิมที่ว่า A06 ไม่เปลี่ยน ·
> A07 (`/main/student-data`) เหลือ `DEPT_ADMIN` บทบาทเดียวเช่นกัน ตาม [#17](https://github.com/khthana/Deep-QA/issues/17)
> ด้วยเหตุผลเดียวกัน — นักศึกษาถูกรับเข้าที่ภาควิชา ส่วนกรรมการหลักสูตรดูแลว่าหลักสูตรสอนอะไร ไม่ใช่ว่าใครถูกรับเข้า
> ทั้ง `FACULTY_ADMIN` และ `PROG_MANAGER` จึงถูกปฏิเสธหน้านี้ทั้งอ่านและเขียน และเมนูของทั้งสองบทบาทถูกตัดรายการนี้ออก
> นอกจากนี้ปีที่เข้าศึกษาคำนวณจากรหัสนักศึกษา ไม่ได้กรอก และไฟล์นำเข้าไม่มีคอลัมน์ภาควิชา (ได้จากหลักสูตรที่เลือก)
> ต่างจากไฟล์เดิมที่ใช้หัวคอลัมน์ภาษาไทยห้าคอลัมน์และจับคู่ภาควิชา/หลักสูตรด้วยชื่อ
> และเมื่อเหลือบทบาทเดียวที่ดูแลภาควิชาเดียว *ภาควิชา* จึงเป็นข้อความบอกว่ากำลังอ่านทะเบียนของใคร ไม่ใช่ dropdown
> อย่างใน `SelectDepartmentAndPrograms.js` เดิม (dropdown ที่ทุกตัวเลือกคืนแถวชุดเดิมคือ control ที่ไม่ทำอะไร)
> เหลือ *หลักสูตร* เป็นตัวกรองจริงตัวเดียว ส่วนลำดับรายการเรียงจากคนที่ถูกเพิ่มล่าสุดก่อน ไม่ใช่จากรหัสมากไปน้อย
> ส่วน Findings ในหัวข้อ 9 ถูกแปลงเป็นงานแล้วทั้งหมด: §9.1 hook ที่พัง → [#36](https://github.com/khthana/Deep-QA/issues/36) ·
> §9.2 endpoint ที่ไม่มี `verifyToken` → [#9](https://github.com/khthana/Deep-QA/issues/9) ·
> §9.5 ข้อ 5–6 เรื่องไฟล์หลักฐาน → [#35](https://github.com/khthana/Deep-QA/issues/35)
> ข้อยกเว้น: §9.5 ข้อ 2 ที่ระบุว่า sidebar ของ FULL_ADMIN ขัดกับวิทยานิพนธ์ — ตรวจแล้วว่าเป็นการอ่านเล่มผิด
> เล่มจำกัดบทบาทนี้ไว้ที่การจัดการผู้ใช้และสิทธิ์ ซึ่งตรงกับโค้ด จึงไม่แก้ ·
> **S03 (`/user-not-found`) ไม่มีในระบบที่รื้อใหม่** ตาม [#50](https://github.com/khthana/Deep-QA/issues/50)
> หน้านั้นไม่เคยถูกพาไปถึงจากที่ใดเลย และมันอ่านเหตุผลจาก `?reason` ด้วยการเทียบกับ*ประโยคภาษาไทยทั้งประโยค*
> การแก้คำใน `backend/auth/refusals.js` จึงเปลี่ยน *บัญชีถูกระงับ* ให้กลายเป็น *ไม่พบผู้ใช้* ได้เงียบ ๆ
> คำปฏิเสธตอนลงชื่อเข้าใช้อยู่บนหน้าลงชื่อเข้าใช้ ซึ่ง `?error=<key>` พาไปถึงอยู่แล้วโดยใช้กุญแจ ไม่ใช่ข้อความ
