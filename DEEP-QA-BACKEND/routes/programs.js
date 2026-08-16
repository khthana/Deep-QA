// routes/programsRoutes.js
const express = require("express");
const router = express.Router();
const programsController = require("../controllers/programsController");
const multer = require('multer');
const { verifyToken } = require("../middleware/authMiddleware"); // 🔥 import middleware
const upload = multer({ dest: 'uploads/' });

// Routes ที่ต้องเช็ค JWT
router.post('/create-programs', verifyToken, programsController.createProgram);
router.get('/get-all-programs', verifyToken, programsController.getPrograms);
router.post('/get-program-by-id', verifyToken, programsController.getProgramsById);
router.post('/get-program-by-department-id', verifyToken, programsController.getProgramsByDepartmentId);
router.post('/edit-programs', verifyToken, programsController.updateProgram);
router.post('/delete-programs', verifyToken, programsController.deleteProgram);
router.post('/import-programs', verifyToken, upload.single('file'), programsController.importPrograms);
router.post('/get-program-by-role', verifyToken, programsController.getProgramByRole);

module.exports = router;
