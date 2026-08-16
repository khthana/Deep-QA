// routes/departmentRoutes.js
const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/departmentController");
const multer = require('multer');
const { verifyToken } = require("../middleware/authMiddleware"); // 🔥 import middleware

const upload = multer({ dest: 'uploads/' });

router.post('/create-department', verifyToken, departmentController.createDepartment);
router.get('/get-all-department', verifyToken, departmentController.getDepartments);
router.get('/get-all-department-flase', verifyToken, departmentController.getDepartmentsFalse);
router.post('/get-department-by-id', verifyToken, departmentController.getDepartmentById);
router.post('/edit-department', verifyToken, departmentController.updateDepartment);
router.post('/delete-department', verifyToken, departmentController.deleteDepartment);
router.post('/import-departments', verifyToken, upload.single('file'), departmentController.importDepartments);
router.post('/get-dept-by-fact-id', verifyToken, departmentController.getDepartmentByFacultyId);

module.exports = router;
