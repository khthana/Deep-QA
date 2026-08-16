const SubjectClo = require('../models/subjectCloAchModel');

/**
 * สร้างบันทึกเกณฑ์การบรรลุผลลัพธ์การเรียนรู้ของรายวิชา (Subject CLO Achievement) ใหม่
 */
exports.createSubjectClo = async (req, res) => {
  try {
    const data = req.body;
    const newRecord = await SubjectClo.create(data);
    return res.status(200).json({ 
      status: 'success', 
      data: newRecord 
    });

  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Duplicate entry for year, semester, subject_id, clo_id, criteria_no' 
      });

    }
    return res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error' 
    });
  }
};

/**
 * ดึงข้อมูลเกณฑ์การบรรลุผลลัพธ์การเรียนรู้ตามกลุ่มเรียน (Section) และรหัส CLO ที่ระบุ
 */
exports.getSubjectClo = async (req, res) => {
  try {
    const { section_id, clo_id } = req.params;

    if (!section_id || !clo_id) {
      return res.status(400).json({
        status: 'error',
        message: 'section_id and clo_id are required'
      });
    }

    const records = await SubjectClo.getSubjectClo({
      section_id,
      clo_id
    });

    return res.status(200).json({
      status: 'success',
      data: records
    });
    
  } catch (err) {
    console.error('Error getSubjectClo:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

/**
 * อัปเดตข้อมูลเกณฑ์การบรรลุผลลัพธ์การเรียนรู้ของรายวิชา
 */
exports.updateSubjectClo = async (req, res) => {
  try {
    const data = req.body;
    const updatedRecord = await SubjectClo.updateSubjectClo(data);
    if (!updatedRecord) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Record not found' 
      });
    }
    return res.status(200).json({ 
      status: 'success', 
      data: updatedRecord 
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error' 
    });
  }
};

/**
 * ลบบันทึกเกณฑ์การบรรลุผลลัพธ์การเรียนรู้ของรายวิชาตาม ID ที่ระบุ
 */
exports.deleteSubjectClo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Missing required field: id' 
      });
    }

    const deletedRecord = await SubjectClo.deleteSubjectClo({ id });

    if (!deletedRecord) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Record not found' 
      });
    }

    return res.status(200).json({
      status: 'success',
      message: `Deleted criteria_no ${deletedRecord.criteria_no}`,
      deleted: deletedRecord,
    });
  } catch (err) {
    console.error('Error deleting subject clo:', err);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error' 
    });
  }
};