// routes/semesterCourseRoutes.js
const express = require('express');
const router = express.Router();
const semesterCourseController = require('../controllers/semesterCoursesController');
const { verifyToken } = require("../middleware/authMiddleware"); // 🔥 import middleware

router.post('/create', verifyToken, semesterCourseController.createSemesterCourse);
router.post('/get-by-year-semester', verifyToken, semesterCourseController.getCourseByYearTerm);
router.post('/delete', verifyToken, semesterCourseController.deleteSemesterCourse);
router.post('/copy', verifyToken, semesterCourseController.copySemesterCoursesController);

module.exports = router;
