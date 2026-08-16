// routes/rubricDetailsRoutes.js
const express = require('express');
const router = express.Router();
const rubricDetailsController = require('../controllers/rubricDetailsController');
const { verifyToken } = require("../middleware/authMiddleware"); // 🔥 import middleware

router.post('/create', verifyToken, rubricDetailsController.createRubricDetails);
router.post('/get-by-code', verifyToken, rubricDetailsController.getRubricDetailsByRubricCode);
router.post('/update', verifyToken, rubricDetailsController.updateRubricDetails);
router.post('/delete', verifyToken, rubricDetailsController.deleteRubricDetail);

module.exports = router;
