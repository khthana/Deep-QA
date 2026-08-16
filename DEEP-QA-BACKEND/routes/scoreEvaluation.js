const express = require('express'); const router = express.Router();
const controller = require('../controllers/scoreEvaluationController');
const { verifyToken } = require("../middleware/authMiddleware");

router.get('/section/:section_id/student/:studentId', verifyToken, controller.getStudentCloScoreBySection);
router.get('/section/:section_id/average', verifyToken, controller.getSectionCloAverage);
router.get('/section/:section_id/other-years', verifyToken, controller.getSameSubjectDifferentYears);
router.get('/section/:section_id/student-clo-scores', verifyToken, controller.getStudentCloScoresBySection);
// router.get('/program/:program_id/year/:academic_year', verifyToken, controller.getProgramPloScoresByYear);
// router.get('/program/:program_id/year-range/:start_year/:end_year', verifyToken, controller.getProgramPloScoresByYearRange);
// router.get('/program/:program_id/year/:academic_year/student/:student_id', verifyToken, controller.getProgramPloScoresByStudent);
// router.get('/program/:program_id/year/:academic_year/studentAll', verifyToken, controller.getProgramAllStudentsPloScores);


module.exports = router;
