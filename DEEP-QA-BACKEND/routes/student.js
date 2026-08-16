// routes/student.js
const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const multer = require('multer');
const { verifyToken } = require("../middleware/authMiddleware"); // 🔥 import middleware

const upload = multer({ dest: 'uploads/' });

// ทุก route ต้อง login ก่อน
router.post('/import-students', verifyToken, upload.single('file'), studentController.importStudents);
router.post('/add-student', verifyToken, studentController.createStudent);
router.post('/get-by-department', verifyToken, studentController.getStudentsByDepartmentId);
router.post('/get-by-program', verifyToken, studentController.getStudentsByProgramId);
router.get('/get-by-admission-year/:year',verifyToken,studentController.getStudentFromAdmissionYear);


module.exports = router;


