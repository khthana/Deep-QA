const express = require('express'); const router = express.Router();
const multer = require('multer'); const upload = multer();
const activityScoreController = require('../controllers/activityScoreController');
const { verifyToken } = require("../middleware/authMiddleware");

router.post('/upsert', verifyToken, activityScoreController.saveActivityScore);
router.post('/get', verifyToken, activityScoreController.getActivityScore);
router.post('/import', verifyToken, upload.single('file'), activityScoreController.importActivityScore);

module.exports = router;
