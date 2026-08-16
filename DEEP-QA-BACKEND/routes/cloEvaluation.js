const express = require('express'); const router = express.Router();
const controller = require('../controllers/cloEvaluation.controller');
const { verifyToken } = require("../middleware/authMiddleware");

router.get('/get/:section_id', verifyToken, controller.getCLOEvaluationBySection);

module.exports = router
