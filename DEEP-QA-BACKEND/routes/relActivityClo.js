const express = require('express'); const router = express.Router();
const controller = require('../controllers/relActivityCloController');
const { verifyToken } = require("../middleware/authMiddleware");

router.get('/section/:section_id/clo-activity', verifyToken, controller.getRelActivityCloBySection);

module.exports = router;
