// routes/subjects.js
const express = require("express");
const router = express.Router();
const subjectController = require("../controllers/subjectsController");
const multer = require('multer');
const { verifyToken } = require("../middleware/authMiddleware"); // 🔥 import middleware

// ใช้ verifyToken ทุก route
router.post('/create-subjects', verifyToken, subjectController.createSubject);
router.get('/get-all-subjects', verifyToken, subjectController.getAllSubjects);
router.post('/update-subjects', verifyToken, subjectController.updateSubject);
router.post('/get-subject-by-id', verifyToken, subjectController.getSubjectsById);
router.post('/get-subject-by-department_id', verifyToken, subjectController.getSubjectsByDepartmentId);
router.post('/delete', verifyToken, subjectController.deleteSubject);

// ตั้งค่า multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // โฟลเดอร์เก็บไฟล์ชั่วคราว
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Route สำหรับ import-subject
router.post('/import-subject', verifyToken, upload.single('file'), subjectController.importSubject);

module.exports = router;
