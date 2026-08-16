
const express = require('express');
const router = express.Router();
const studentGroupController = require('../controllers/studentGroupController');
const multer = require('multer');
const { verifyToken } = require("../middleware/authMiddleware");

const upload = multer(); // เก็บไฟล์ใน memory

// Upsert group
router.post('/upsert', verifyToken, studentGroupController.updateStudentGroup);

// Import Excel
router.post('/import-student-groups', verifyToken, upload.single('file'), studentGroupController.importStudentGroups );

// GET
router.get('/get-all-groups-in-section/:section_id', verifyToken, studentGroupController.getAllGroupInSection);
router.get('/get-students-in-group/:group_id', verifyToken, studentGroupController.getStudentInGroup);

// DELETE
router.delete('/delete-group', verifyToken, studentGroupController.deleteGroup);
router.get('/log/:section_id',verifyToken, studentGroupController.getLogsBySection);


module.exports = router;
