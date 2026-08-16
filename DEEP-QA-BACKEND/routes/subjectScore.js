const express = require('express');
const router = express.Router();
const subjectScoreController = require('../controllers/subjectScoreController');
const { verifyToken } = require("../middleware/authMiddleware");
const multer = require('multer');
const path = require('path');
const upload = multer({
  dest: path.join(__dirname, '../uploads'),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// Create / Update (JSON)
router.post('/upsert', verifyToken, subjectScoreController.syncSubjectScoreRatio);

// Import (Excel)
router.post(
  '/import',
  verifyToken,
  upload.single('file'),
  subjectScoreController.importSubjectScoreRatio
);

// Get
router.get('/get/:section_id', verifyToken, subjectScoreController.getBySectionId);
router.get('/get-category/:section_id', verifyToken, subjectScoreController.getCategory);

// Delete
router.delete('/delete/:score_ratio_id', verifyToken, subjectScoreController.deleteScoreRatio);

module.exports = router;
