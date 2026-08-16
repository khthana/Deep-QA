// routes/rubricRoutes.js
const express = require('express');
const router = express.Router();
const rubricController = require('../controllers/rubricsController');
const { verifyToken } = require("../middleware/authMiddleware"); // 🔥 import middleware

router.post('/create', verifyToken, rubricController.createRubric);
router.post('/update', verifyToken, rubricController.updateRubric);
router.post('/get-by-program', verifyToken, rubricController.getRubricsByProgramId);
router.post('/delete', verifyToken, rubricController.deleteRubric);

module.exports = router;
