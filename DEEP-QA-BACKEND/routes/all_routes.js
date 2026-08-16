// routes/all_routes.js
const express = require('express');
const router = express.Router();

// นำเข้า Middleware
const { blockDirectAccess } = require('../middleware/authMiddleware');

// 1. นำเข้า Route ทั้งหมด
const authRoutes = require('./auth');
const protectedRoutes = require('./protected');
const userRoutes = require('./user');
const userRoleRoutes = require('./user_roles');
const departmentRoutes = require('./department');
const programsRoutes = require('./programs');
const subjectsRoutes = require('./subjects');
const programSubjectsRoutes = require('./program_subjects');
const studentRoutes = require('./student');
const rolesRoutes = require('./roles');
const rubricsRoute = require('./rubrics');
const rubricDetailsRoute = require('./rubricDetails');
const semesterCoursesRoute = require('./semesterCourses');
const coursSectionsRoute = require('./courseSections');
const courseSectionsTeacher = require('./courseSectionsTeacher');
const learningOutcomeRoute = require('./learningOutcome');
const subjectPloMappingRoute = require('./subjectPloMapping');
const studentCourseRoute = require('./studentCourse');
const studentgroupRoute = require('./studentGroup');
const subjectClo = require('./subjectClo');
const subjectBe = require('./subjectBe');
const subjectCloAch = require('./subjectCloAch');
const subjectScore = require('./subjectScore');
const activity = require('./activity');
const activityScore = require('./activityScore');
const courseSylabus = require('./courseSyllabus');
const cloEva = require('./cloEvaluation');
const scoreEva = require('./scoreEvaluation');
const relActClo = require('./relActivityClo');
const ploEv = require('./ploEv');
const envidence = require('./activityEvidence');
const cloPlan = require('./cloPLan');
const ploScore = require('./ploScoreRoute');

// --- กลุ่มที่ 1: ยกเว้นการเช็ค Direct Access (Public / Authentication) ---
// ต้องวางไว้ก่อน blockDirectAccess เพื่อให้ Google OAuth และการ Login ทำงานได้ปกติ
router.use('/auth', authRoutes);

// --- ตั้งด่านตรวจ Direct Access ตั้งแต่บรรทัดนี้เป็นต้นไป ---
// ทุก Request ที่จะไปหา Route ด้านล่างนี้ ต้องมาจาก Frontend ของเราเท่านั้น
router.use(blockDirectAccess);

// --- กลุ่มที่ 2: กลุ่มที่ต้องป้องกัน (Private API) ---
router.use('/protected', protectedRoutes);
router.use('/user', userRoutes);
router.use('/user_roles', userRoleRoutes);
router.use('/department', departmentRoutes);
router.use('/programs', programsRoutes);
router.use('/subjects', subjectsRoutes);
router.use('/student', studentRoutes);
router.use('/roles', rolesRoutes);
router.use('/program_subjects', programSubjectsRoutes);
router.use('/rubrics', rubricsRoute);
router.use('/rubricDetails', rubricDetailsRoute);
router.use('/semesterCourses', semesterCoursesRoute);
router.use('/coursSections', coursSectionsRoute);
router.use('/teacher', courseSectionsTeacher);
router.use('/plo', learningOutcomeRoute);
router.use('/plo-mapping', subjectPloMappingRoute);
router.use('/studentCourse', studentCourseRoute);
router.use('/studentGroup', studentgroupRoute);
router.use('/subjectClo', subjectClo);
router.use('/subjectBe', subjectBe);
router.use('/subjectCloAch', subjectCloAch);
router.use('/subjectScore', subjectScore);
router.use('/activity', activity);
router.use('/activityScore', activityScore);
router.use('/courseSyllabus', courseSylabus);
router.use('/cloEva', cloEva);
router.use('/scoreEva', scoreEva);
router.use('/relActClo', relActClo);
router.use('/ploEv', ploEv);
router.use('/envidence', envidence);
router.use('/cloPLan', cloPlan);
router.use('/ploScore', ploScore);

module.exports = router;