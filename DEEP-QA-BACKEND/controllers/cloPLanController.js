// controllers/cloPlanController.js
const cloPlanModel = require("../models/cloPlanModel");

/**
 * สร้างรอบประเมิน CLO (รับ semester_course_id เพื่อไปหาพิกัดสร้าง Cycle)
 */
exports.createCloplanCycle = async (req, res) => {
  try {
    const { semester_course_id } = req.body;

    if (!semester_course_id) {
      return res.status(400).json({
        success: false,
        message: "กรุณาระบุ semester_course_id"
      });
    }

    const result = await cloPlanModel.createCycle(semester_course_id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลวิชาที่ระบุ หรือไม่สามารถสร้างรอบประเมินได้"
      });
    }

    res.status(201).json({
      success: true,
      message: "สร้างรอบประเมิน CLO สำหรับปีการศึกษานี้สำเร็จ",
      data: result
    });
  } catch (error) {
    console.error("Create Cycle Error:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในระบบ",
      error: error.message
    });
  }
};

/**
 * Upsert Detail CLO Plan
 */
exports.upsertCloplanDetail = async (req, res) => {
  try {
    const {
      clo_course_cycle_id,
      clo_id,
      detailType,
      detail,
      year
    } = req.body;

    if (!clo_course_cycle_id || !clo_id || !detailType || !detail) {
      return res.status(400).json({
        success: false,
        message: "ข้อมูลไม่ครบถ้วน (ต้องระบุ cycle_id, clo_id, type และ detail)"
      });
    }

    const allowedTypes = ['SUMMARY', 'REFLECTION', 'IMPROVEMENT', 'NEXT_PLAN'];
    if (!allowedTypes.includes(detailType)) {
      return res.status(400).json({
        success: false,
        message: "ประเภทข้อมูล (detailType) ไม่ถูกต้อง"
      });
    }

    const payload = {
      planId: clo_course_cycle_id,
      cloId: clo_id,
      detailType,
      detailText: detail,
      referenceAcademicYear: year ?? null
    };

    const result = await cloPlanModel.upsertDetail(payload);

    res.status(200).json({
      success: true,
      message: "บันทึกข้อมูล CLO Plan เรียบร้อยแล้ว", 
      data: result
    });

  } catch (error) {
    console.error("Upsert Error:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
      error: error.message
    });
  }
};

/**
 * จัดFormat
 */
const mapCloplanRows = (rows, section_id, meta) => {
  if (!rows || rows.length === 0) {
    return {
      section_id: Number(section_id),
      semester_course_id: meta.semester_course_id,
      cycle_id: null,
      subject_id: meta.subject_id,
      academic_year: meta.academic_year,
      program_id: meta.program_id,
      summary: [], next_plan: [], reflection: [], improvement_from_previous: []
    };
  }

  const result = {
    section_id: Number(section_id),
    semester_course_id: meta.semester_course_id,
    cycle_id: rows[0].clo_course_cycle_id,
    clo_course_cycle_id: rows[0].clo_course_cycle_id,
    subject_id: rows[0].subject_id,
    academic_year: rows[0].academic_year,
    program_id: rows[0].program_id,
    summary: [],
    next_plan: [],
    reflection: [],
    improvement_from_previous: []
  };


  const improvementAdded = new Set();

 rows.forEach(r => {
    if (r.detail_type) {
        const item = {
            plan_detail_id: r.clo_course_cycle_detail_id,
            clo_id: r.clo_id,
            clo: r.clo_number,
            detail: r.detail_text,
            year: r.reference_academic_year ?? null
        };

        if (r.detail_type === "SUMMARY") result.summary.push(item);
        else if (r.detail_type === "NEXT_PLAN") result.next_plan.push(item);
        else if (r.detail_type === "REFLECTION") result.reflection.push(item);
        else if (r.detail_type === "IMPROVEMENT") {
            result.improvement_from_previous.push(item);
            improvementAdded.add(r.clo_id); 
        }
    }
    if (r.prev_next_plan_detail && !improvementAdded.has(r.clo_id)) {
        result.improvement_from_previous.push({
            plan_detail_id: null, 
            clo_id: r.clo_id,
            clo: r.clo_number,
            detail: `[จากแผนปีที่แล้ว]: ${r.prev_next_plan_detail}`,
            year: (parseInt(result.academic_year) - 1)
        });
        improvementAdded.add(r.clo_id);
    }
});

  return result;
};
/**
 * เส้นที่ 1: Get Global View (ย้อนจาก Section ไปดึงทั้ง Course/Program/Year)
 */
exports.getCloplanBySemesterCourse = async (req, res) => {
  try {
    const { section_id } = req.params;
    const meta = await cloPlanModel.getMetadataBySectionId(section_id);

    if (!meta) return res.status(404).json({ success: false, message: "ไม่พบข้อมูลวิชา" });

    const rows = await cloPlanModel.getGlobalByMetadata(meta.subject_id, meta.program_id, meta.academic_year);
    const result = mapCloplanRows(rows, section_id, meta);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * เส้นที่ 2: Get Section Only (ดึง CLO เฉพาะของ Section นั้นๆ)
 */
exports.getCloplanBySectionOnly = async (req, res) => {
  try {
    const { section_id } = req.params;
    const meta = await cloPlanModel.getMetadataBySectionId(section_id);

    if (!meta) return res.status(404).json({ success: false, message: "ไม่พบข้อมูลวิชา" });

    const rows = await cloPlanModel.getBySectionSpecific(meta.subject_id, meta.program_id, meta.academic_year, section_id);
    const result = mapCloplanRows(rows, section_id, meta);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * DELETE: ลบข้อมูล CLO Plan Detail
 */
exports.deleteCloplanDetail = async (req, res) => {
  try {
    const { plan_detail_id } = req.params;

    if (!plan_detail_id) {
      return res.status(400).json({
        success: false,
        message: "กรุณาระบุ plan_detail_id ที่ต้องการลบ"
      });
    }

    const result = await cloPlanModel.deleteDetail(plan_detail_id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลที่ต้องการลบ หรือข้อมูลอาจถูกลบไปแล้ว"
      });
    }

    res.status(200).json({
      success: true,
      message: "ลบข้อมูลเรียบร้อยแล้ว",
      data: result 
    });

  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการลบข้อมูล",
      error: error.message
    });
  }
};