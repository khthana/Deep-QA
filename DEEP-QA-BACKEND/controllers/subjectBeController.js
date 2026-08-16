// controllers/subjectBeController.js
const subjectBeModel = require("../models/subjectBeModel");

/**
 * สร้างบันทึกพฤติกรรมการเรียนรู้ (Subject Behavior) ใหม่ โดยตรวจสอบฟิลด์ที่จำเป็นทั้งหมด
 */
exports.createSubjectBe = async (req, res) => {
  try {
    const {
      section_id,
      clo_id,
      behavior_no,
      learning_activity,
      behavior_detail,
      cognitive_level
    } = req.body;

    if (
      !section_id ||
      !clo_id ||
      behavior_no === undefined ||
      !learning_activity ||
      !behavior_detail ||
      !cognitive_level
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const newData = await subjectBeModel.createSubjectBe({
      section_id,
      clo_id,
      behavior_no,
      learning_activity,
      behavior_detail,
      cognitive_level
    });

    return res.status(201).json({
      success: true,
      data: newData
    });

  } catch (error) {
    console.error('Error creating subject behavior:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * ดึงข้อมูลพฤติกรรมการเรียนรู้ตามกลุ่มเรียน (Section) และสามารถกรองตามรหัส CLO ได้
 */
exports.getSubjectBeByFilter = async (req, res) => {
  try {
    const { section_id, clo_id } = req.params;

    if (!section_id) {
      return res.status(400).json({
        status: "error",
        message: "section_id is required"
      });
    }

    const data = await subjectBeModel.getSubjectBeByFilter({
      section_id,
      clo_id
    });

    return res.status(200).json({
      status: "success",
      data
    });
  } catch (error) {
    console.error("Error getting subject behavior:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

/**
 * อัปเดตข้อมูลพฤติกรรมการเรียนรู้ เช่น กิจกรรมการเรียนรู้ รายละเอียดพฤติกรรม และระดับพุทธิพิสัย
 */
exports.updateSubjectBe = async (req, res) => {
  try {
    const { id, learning_activity, behavior_detail, cognitive_level, section } = req.body;

    if (!id || !learning_activity || !behavior_detail || !cognitive_level) {
      return res.status(400).json({ status: "error", message: "Missing required fields" });
    }

    const updatedData = await subjectBeModel.updateSubjectBe({ id, learning_activity, behavior_detail, cognitive_level, section });
    if (!updatedData) return res.status(404).json({ status: "error", message: `No record found with id ${id}` });

    return res.status(200).json({ status: "success", data: updatedData });
  } catch (error) {
    console.error("Error updating subject behavior:", error);
    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

/**
 * ลบข้อมูลพฤติกรรมการเรียนรู้ และดำเนินการจัดลำดับหมายเลขพฤติกรรม (behavior_no) ใหม่ภายในกลุ่มเรียนเดียวกัน
 */
exports.deleteSubjectBe = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "id is required"
      });
    }

    const deletedRecord = await subjectBeModel.deleteById(id);

    if (!deletedRecord) {
      return res.status(404).json({
        status: "error",
        message: `No record found with id ${id}`
      });
    }

    const behaviorList = await subjectBeModel.getBehaviorListBySection(
      deletedRecord.section_id
    );

    for (let i = 0; i < behaviorList.length; i++) {
      const record = behaviorList[i];
      const newOrder = i + 1;

      if (record.behavior_no !== newOrder) {
        await subjectBeModel.updateBehaviorOrder(record.id, newOrder);
      }
    }

    return res.status(200).json({
      status: "success",
      message: `Deleted behavior_no ${deletedRecord.behavior_no}`,
      deleted: deletedRecord
    });

  } catch (error) {
    console.error("Error deleting subject behavior:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};