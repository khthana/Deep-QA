const express = require('express');
const router = express.Router();
const ploScoreController = require('../controllers/ploScoreController');

// 1. ดึงคะแนนนักศึกษาเป็นรายบุคคล
router.get('/:programId/student/:studentId', ploScoreController.getStudentPloByProgram);

// 2. ดึงคะแนนของนักศึกษาทุกคนในรุ่น (แสดงรายคน)
router.get('/:programId/year/:academicYear/studentAll', ploScoreController.getPloByAdmissionYear);

// 3. ดึงคะแนนเฉลี่ยรวมของทั้งรุ่น (Aggregate)
router.get('/:programId/year/:academicYear', ploScoreController.getPloByAdmissionYearAggregate);

// 4. ดึงคะแนนเฉลี่ยเปรียบเทียบตามช่วงปี
router.get('/:programId/year-range/:startYear/:endYear', ploScoreController.getPloByYearRange);

module.exports = router;