// controllers/courseSyllabusController.js
const courseSyllabusModel = require('../models/courseSyllabusModel');

/**
 * จัดการข้อมูลแผนการสอน (Course Syllabus) ทั้งการเพิ่มข้อมูลใหม่และการอัปเดตข้อมูลเดิม (Upsert)
 */
exports.upsertCourseSyllabus = async (req, res) => {
  try {
    const result = await courseSyllabusModel.upsertCourseSyllabus(req.body);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลที่ต้องการอัปเดต'
      });
    }

    res.json({
      success: true,
      message: req.body.id ? 'อัปเดตข้อมูลสำเร็จ' : 'เพิ่มข้อมูลสำเร็จ',
      data: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ',
      error: error.message
    });
  }
};

/**
 * ดึงข้อมูลแผนการสอนทั้งหมดตามรหัสกลุ่มเรียน (Section ID) ที่ระบุ
 */
exports.getBySectionId = async (req, res) => {
  try {
    const { section_id } = req.params;

    if (!section_id) {
      return res.status(400).json({
        success: false,
        message: 'section_id is required'
      });
    }

    const data = await courseSyllabusModel.getCourseSyllabusBySectionId(section_id);

    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบ course_syllabus ของ section นี้'
      });
    }

    res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * ลบข้อมูลแผนการสอนออกจากระบบตามรหัส ID ที่ระบุ
 */
exports.deleteCourseSyllabus = async (req, res) => {
  try {
    const { course_syllabus_id } = req.params;

    const deleted = await courseSyllabusModel.deleteCourseSyllabusById(course_syllabus_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบ course syllabus ที่ต้องการลบ'
      });
    }

    res.json({
      success: true,
      message: 'ลบข้อมูล course syllabus สำเร็จ',
      data: deleted
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ',
      error: error.message
    });
  }
};