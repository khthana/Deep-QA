const express = require('express'); const router = express.Router();
const controller = require('../controllers/ploEvController');
const { verifyToken } = require("../middleware/authMiddleware");

router.get('/plo-evaluation/:program_id/:year', verifyToken, controller.getProgramPLOEvaluation);

module.exports = router;
