const express = require('express'); const router = express.Router();
const activityController = require('../controllers/activityController');
const { verifyToken } = require("../middleware/authMiddleware");

router.post('/upsert', verifyToken, activityController.upsertActivityHandler);
router.get('/get/:section_id', verifyToken, activityController.getActivityHandler);
router.get('/get-clo-map/:activity_id', verifyToken, activityController.getActivityCloMapHandler);
router.delete('/:activity_id', verifyToken, activityController.deleteActivityHandler);
router.get('/:subject_id/:program_id', verifyToken,activityController.getActivityFromSubjectAndProgram);

module.exports = router;
