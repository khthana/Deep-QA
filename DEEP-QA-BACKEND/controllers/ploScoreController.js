const ploScoreService = require('../services/ploScoreService');

/**
 * ดึงข้อมูลคะแนนผลลัพธ์การเรียนรู้ (PLO) ของนักศึกษาเป็นรายบุคคลตามหลักสูตรที่กำหนด
 */
exports.getStudentPloByProgram = async (req, res) => {
  try {
    const { programId, studentId } = req.params;
    const data = await ploScoreService.getStudentPloByProgram({
      programId,
      studentId
    });

    return res.status(200).json({
      success: true,
      ...data 
    });
  } catch (err) {
    console.error(err);
    if (err.message === 'Student not found') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

/**
 * ดึงข้อมูลคะแนน PLO ของนักศึกษาทุกคนในหลักสูตรตามปีที่เข้าเรียน (Admission Year)
 */
exports.getPloByAdmissionYear = async (req, res) => {
  try {
    const { programId, academicYear } = req.params;
    const data = await ploScoreService.getPloByAdmissionYear({
      programId,
      academicYear
    });

    return res.status(200).json({
      success: true,
      ...data 
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

/**
 * ดึงข้อมูลคะแนน PLO แบบภาพรวม (Aggregate) ของนักศึกษาในหลักสูตรตามปีที่เข้าเรียน
 */
exports.getPloByAdmissionYearAggregate = async (req, res) => {
  try {
    const { programId, academicYear } = req.params;

    if (!programId || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'programId and academicYear are required'
      });
    }

    const result = await ploScoreService.getPloByAdmissionYearAggregate({
      programId,
      academicYear
    });

    return res.status(200).json({
      success: true,
      ...result 
    });
  } catch (error) {
    console.error('getPloByAdmissionYearAggregate error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * ดึงข้อมูลคะแนน PLO ของหลักสูตรโดยเปรียบเทียบตามช่วงปีการศึกษาที่ระบุ
 */
exports.getPloByYearRange = async (req, res) => {
  try {
    const { programId, startYear, endYear } = req.params;

    if (Number(startYear) > Number(endYear)) {
      return res.status(400).json({
        success: false,
        message: 'startYear must be <= endYear'
      });
    }

    const result = await ploScoreService.getPloByYearRange({
      programId,
      startYear,
      endYear
    });

    return res.status(200).json({
      success: true,
      ...result 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};