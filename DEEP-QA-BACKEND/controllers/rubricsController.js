// controllers/rubricsController.js
const rubricModel = require('../models/rubricsModel');
const userModel = require('../models/userModel');

/**
 * สร้างเกณฑ์การประเมิน (Rubric) ใหม่เข้าสู่ระบบ พร้อมระบุผู้สร้างและหลักสูตรที่เกี่ยวข้อง
 */
exports.createRubric = async (req, res) => {
  try {
    const {
      rubric_code,
      rubric_name_en,
      rubric_name_th,
      display_order = 0,
      email,
      program_id
    } = req.body;

    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุ email' });
    }

    const rubric = await rubricModel.createRubric({
      rubric_code,
      rubric_name_en,
      rubric_name_th,
      display_order,
      created_by : user.user_id,
      updated_by : user.user_id,
      program_id
    });

    return res.status(201).json(rubric);
  } catch (error) {
    console.error('Error creating rubric:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * อัปเดตข้อมูลเกณฑ์การประเมิน (Rubric) เช่น รหัส ชื่อ และลำดับการแสดงผล
 */
exports.updateRubric = async (req, res) => {
  try {
    const { id, rubric_code, rubric_name_en, rubric_name_th, display_order, email } = req.body;

    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุ email ที่ถูกต้อง' });
    }

    const updatedRubric = await rubricModel.updateRubric(id, {
      rubric_code,
      rubric_name_en,
      rubric_name_th,
      display_order,
      updated_by: user.user_id
    });

    res.status(200).json({ success: true, data: updatedRubric });
  } catch (err) {
    console.error('Error updating rubric:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * ดึงข้อมูลเกณฑ์การประเมิน (Rubrics) ทั้งหมดที่สังกัดอยู่ในหลักสูตร (Program) ที่ระบุ
 */
exports.getRubricsByProgramId = async (req, res) => {
  try {
    const { program_id } = req.body;

    if (!program_id) {
      return res.status(400).json({ success: false, message: 'กรุณาส่ง program_id' });
    }

    const rubrics = await rubricModel.getRubricsByProgramId(program_id);

    res.status(200).json({ success: true, data: rubrics });
  } catch (err) {
    console.error('Error fetching rubrics by program_id:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * ลบเกณฑ์การประเมิน (Rubric) ออกจากระบบ โดยจะทำการลบรายละเอียดของเกณฑ์ (Rubric Details) ที่เกี่ยวข้องก่อนเสมอ
 */
exports.deleteRubric = async (req, res) => {
  try {
    const { rubric_code } = req.body;

    if (!rubric_code) {
      return res.status(400).json({ message: "rubric_code is required" });
    }

    const rubric = await rubricModel.getRubricByCode(rubric_code);
    if (!rubric) {
      return res.status(404).json({ message: "Rubric not found" });
    }

    await rubricModel.deleteRubricDetailsByRubricId(rubric.id);

    await rubricModel.deleteRubricById(rubric.id);

    return res.status(200).json({
      success: true,
      message: `Rubric ${rubric_code} deleted successfully and display_order updated`
    });

  } catch (error) {
    console.error("Error in deleteRubric:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};