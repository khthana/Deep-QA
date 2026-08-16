//controllers/subjectScoreController.js
const subjectScoreModel = require('../models/subjectScoreModel');
const XLSX = require("xlsx");

/**
 * ซิงค์ข้อมูลสัดส่วนคะแนนของรายวิชา (Subject Score Ratio) ระหว่างฐานข้อมูลกับข้อมูลที่ส่งมา
 */
exports.syncSubjectScoreRatio = async (req, res) => {
  try {
    const data = await subjectScoreModel.syncSubjectScoreRatio(req.body);
    res.json({
      success: true,
      message: 'Sync Subject Score Ratio สำเร็จ',
      data
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * ดึงข้อมูลสัดส่วนคะแนนทั้งหมดตามรหัสกลุ่มเรียน (Section ID)
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

    const data = await subjectScoreModel.getSubjectScoreBySectionId(section_id);

    res.json({
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
 * ดึงเฉพาะหมวดหมู่ของคะแนน (Categories) ตามรหัสกลุ่มเรียนที่ระบุ
 */
exports.getCategory = async (req, res) => {
  try {
    const { section_id } = req.params;

    if (!section_id) {
      return res.status(400).json({
        message: 'section_id is required'
      });
    }

    const rows = await subjectScoreModel.getCategoryBySectionId(section_id);

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'ไม่พบข้อมูลของ section นี้'
      });
    }

    res.status(200).json({ data: rows });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * ลบข้อมูลสัดส่วนคะแนนตามรหัส ID ที่ระบุ
 */
exports.deleteScoreRatio = async (req, res) => {
  try {
    const { score_ratio_id } = req.params;

    if (!score_ratio_id) {
      return res.status(400).json({
        message: 'score_ratio_id is required'
      });
    }

    const result = await subjectScoreModel.deleteScoreRatioById(score_ratio_id);

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    if (err.message === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบ score_ratio_id นี้'
      });
    }

    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * นำเข้าข้อมูลสัดส่วนคะแนนจากไฟล์ Excel พร้อมตรวจสอบความถูกต้องของข้อมูลและตรวจสอบว่าผลรวมค่าน้ำหนักต้องเท่ากับ 100
 */
exports.importSubjectScoreRatio = async (req, res) => {
  try {
    const { section_id } = req.body;

    if (!section_id) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ section_id'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาอัปโหลดไฟล์ Excel'
      });
    }

    const existing =
      await subjectScoreModel.getCategoryBySectionId(section_id);

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'section_id นี้มี subject_score_ratio อยู่แล้ว ไม่สามารถ import ซ้ำได้'
      });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Excel ว่างเปล่า'
      });
    }

    const errors = [];
    const seenCategories = new Set();
    const subject_score = [];

    let totalWeight = 0;

    rows.forEach((row, index) => {
      const excelRow = index + 2;
      const sequence_order = index + 1;

      const score_category = row.score_category?.toString().trim();
      const weight = Number(row.weight);

      if (!score_category || Number.isNaN(weight)) {
        errors.push({
          row: excelRow,
          error: 'ข้อมูลไม่ครบหรือรูปแบบไม่ถูกต้อง'
        });
        return;
      }

      if (weight < 0) {
        errors.push({
          row: excelRow,
          score_category,
          error: 'weight ห้ามเป็นค่าติดลบ'
        });
        return;
      }

      if (seenCategories.has(score_category)) {
        errors.push({
          row: excelRow,
          score_category,
          error: 'score_category ซ้ำในไฟล์'
        });
        return;
      }
      seenCategories.add(score_category);

      totalWeight += weight;

      subject_score.push({
        sequence_order,
        score_category,
        weight
      });
    });

    if (errors.length === 0 && totalWeight !== 100) {
      errors.push({
        error: `weight รวมต้องเท่ากับ 100 (ปัจจุบัน = ${totalWeight})`
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors
      });
    }

    const result = await subjectScoreModel.syncSubjectScoreRatio({
      section_id,
      subject_score
    });

    return res.json({
      success: true,
      message: {
        section_id,
        insertedCount: result.length
      }
    });

  } catch (err) {
    console.error('ImportSubjectScoreRatio Error:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};