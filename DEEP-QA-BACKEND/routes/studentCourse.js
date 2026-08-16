// routes/studentCourseRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const studentCourseController = require('../controllers/studentCourseController');
const { verifyToken } = require('../middleware/authMiddleware'); // 🔥 import middleware

const upload = multer({ storage: multer.memoryStorage() });

// ทุก route ต้อง login ก่อน
router.post('/import', verifyToken, upload.single('file'), studentCourseController.importStudentsToSection);
router.post('/add', verifyToken, studentCourseController.addStudentToSection);
router.get('/get/:section_id', verifyToken, studentCourseController.getStudentsInSection);
router.delete('/delete', verifyToken, studentCourseController.deleteStudentFromSection);

module.exports = router;
