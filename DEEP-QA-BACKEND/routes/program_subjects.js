// routes/program_subjectsRoutes.js
const express = require("express");
const router = express.Router();
const multer = require('multer');
const program_subjectsController = require("../controllers/program_subjectsController");
const { verifyToken } = require("../middleware/authMiddleware"); // 🔥 import middleware

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // โฟลเดอร์เก็บไฟล์
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// 🔥 เพิ่ม verifyToken ทุก route
router.post('/import-program-subject', verifyToken, upload.single('file'), program_subjectsController.importProgramSubjects);
router.post('/create-program_subjects', verifyToken, program_subjectsController.createProgramSubject);
router.post('/update-program-subject', verifyToken, program_subjectsController.updateProgramSubject);
router.get('/get-all-program-subjects', verifyToken, program_subjectsController.getAllProgramSubjects);
router.post('/get-program-subjectsby-id', verifyToken, program_subjectsController.getProgramSubjectById);
router.post('/get-program-subjectsby-program_id', verifyToken, program_subjectsController.getProgramSubjectsByProgramId);
router.post("/delete", verifyToken, program_subjectsController.deleteProgramSubject);

module.exports = router;
