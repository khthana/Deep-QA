// controllers/rubricDetailsController.js
const rubricDetailsModel = require('../models/rubricDetailsModel');
const userModel = require('../models/userModel');
const rubricModel = require('../models/rubricsModel');

/**
 * สร้างรายละเอียดเกณฑ์การประเมิน (Rubric Details) แบบกลุ่ม (Batch) โดยระบุผ่านรหัส Rubric
 */
exports.createRubricDetails = async (req, res) => {
  try {
    const { rubric_code: rubric_code, email, detail } = req.body;

    if (!Array.isArray(detail) || detail.length === 0) {
      return res.status(400).json({ success: false, message: 'กรุณาส่งรายละเอียดของ rubric อย่างน้อย 1 อัน' });
    }

    const rubric = await rubricModel.findRubricByCode(rubric_code);
    if (!rubric) {
      return res.status(400).json({ success: false, message: 'Rubric ไม่ถูกต้อง' });
    }

    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุ email ที่ถูกต้อง' });
    }

    const insertedRows = await rubricDetailsModel.createRubricDetailsBatch(rubric.id, detail, user.user_id);

    res.status(201).json({ success: true, data: insertedRows });
  } catch (err) {
    console.error('Error creating rubric details batch:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * ดึงข้อมูลรายละเอียดเกณฑ์การประเมินทั้งหมดตามรหัส Rubric Code ที่ระบุ
 */
exports.getRubricDetailsByRubricCode = async (req, res) => {
  try {
    const { rubric_code } = req.body;

    if (!rubric_code) {
      return res.status(400).json({ success: false, message: 'กรุณาส่ง rubric_code' });
    }

    const rubric = await rubricModel.findRubricByCode(rubric_code);

    const details = await rubricDetailsModel.getRubricDetailsByRubricId(rubric.id);

    res.status(200).json({ success: true, data: details });
  } catch (err) {
    console.error('Error fetching rubric details:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * อัปเดตข้อมูลรายละเอียดเกณฑ์การประเมินแบบกลุ่ม โดยตรวจสอบความถูกต้องของสิทธิ์ผู้ใช้งานและรหัส Rubric
 */
exports.updateRubricDetails = async (req, res) => {
  try {
    const { email, rubric_code, detail } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'กรุณาส่ง email' });
    }
    if (!rubric_code) {
      return res.status(400).json({ success: false, message: 'กรุณาส่ง rubric_code' });
    }
    if (!Array.isArray(detail) || detail.length === 0) {
      return res.status(400).json({ success: false, message: 'กรุณาส่งรายละเอียดอย่างน้อย 1 รายการ' });
    }

    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุ email ที่ถูกต้อง' });
    }

    const rubric = await rubricModel.getRubricByCode(rubric_code);
    if (!rubric) {
      return res.status(400).json({ success: false, message: 'ไม่พบ rubric_code นี้' });
    }

    for (const d of detail) {
      if (!d.id) {
        return res.status(400).json({ success: false, message: 'กรุณาส่ง id ของแต่ละ rubric detail' });
      }
    }

    const updatedRows = await rubricDetailsModel.updateRubricDetailsByRubricId(detail, rubric.id, user.user_id);

    return res.status(200).json({ success: true, data: updatedRows });
  } catch (err) {
    console.error('Error updating rubric details batch:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * ลบข้อมูลรายละเอียดเกณฑ์การประเมินรายรายการตาม ID ที่ระบุ
 */
exports.deleteRubricDetail = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required"
      });
    }

    const deleted = await rubricDetailsModel.deleteRubricDetail(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Rubric detail with id ${id} not found`
      });
    }

    res.json({
      success: true,
      message: "Rubric detail deleted successfully",
      data: deleted
    });
  } catch (error) {
    console.error("Error deleting rubric detail:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};