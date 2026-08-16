const express = require('express'); const router = express.Router();
const controller = require('../controllers/courseSyllabusController');
const { verifyToken } = require("../middleware/authMiddleware");

router.post('/upsert', verifyToken, controller.upsertCourseSyllabus);
router.get('/get/:section_id', verifyToken, controller.getBySectionId);
router.delete('/delete/:course_syllabus_id', verifyToken, controller.deleteCourseSyllabus);

module.exports = router;
