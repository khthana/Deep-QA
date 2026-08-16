const express = require('express'); const router = express.Router();
const upload = require('../middleware/evidenceUpload');
const controller = require('../controllers/activityEvidenceController');
const { verifyToken } = require("../middleware/authMiddleware");

router.post('/', verifyToken, upload.single('file'), controller.uploadEvidence);
router.get('/section/:section_id', verifyToken, controller.getEvidenceBySection);
router.get('/:evidence_id/download', verifyToken, controller.downloadEvidence);
router.put('/:evidence_id/replace', verifyToken, upload.single('file'), controller.replaceEvidence);
router.get('/section/:section_id/activity/:activity_id', verifyToken, controller.getEvidenceByActivity);
router.delete('/:evidence_id/delete', verifyToken, controller. DeleteEvidence);

module.exports = router;
