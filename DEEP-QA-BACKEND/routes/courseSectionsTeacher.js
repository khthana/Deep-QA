const express = require('express');  // 🔥 ต้องใช้ require
const router = express.Router();
const courseSectionTeacherController = require('../controllers/courseSectionsTeacherController');
const { verifyToken } = require('../middleware/authMiddleware'); // 🔥 import middleware

// POST route
router.post('/getTeacherCourse', verifyToken, courseSectionTeacherController.getTeacherCourse);

module.exports = router;
