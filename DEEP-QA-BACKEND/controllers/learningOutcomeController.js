// controllers/learningOutcomeController.js
const learningOutcomeModel = require("../models/learningOutcomeModel");
const userModel = require("../models/userModel");
const subjectPloMappingModel = require("../models/subjectPloMappingModel");

/**
 * สร้างผลลัพธ์การเรียนรู้ (PLO) ใหม่ หรือทำการคืนค่าสถานะ (Reactivate) หากเคยมีรหัสซ้ำเดิมอยู่ในระบบ
 */
exports.createPLO = async (req, res) => {
  try {
    const {
      program_id,
      outcome_code,
      outcome_title,
      outcome_description,
      outcome_type,
      parent_outcome_code,
      email
    } = req.body;

    const missingFields = [];
    if (!program_id) missingFields.push("program_id");
    if (!outcome_code) missingFields.push("outcome_code");
    if (!outcome_title) missingFields.push("outcome_title");
    if (!outcome_type) missingFields.push("outcome_type");

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`
      });
    }

    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "Invalid created_by or updated_by email" });
    }

    let parent_outcome_id = null;
    let level_depth = 1;
    if (parent_outcome_code) {
      const parent = await learningOutcomeModel.getPloByCode(program_id, parent_outcome_code);
      if (!parent) {
        return res.status(400).json({
          message: `parent_outcome_code "${parent_outcome_code}" not found in program ${program_id}`
        });
      }
      parent_outcome_id = parent.outcome_id;
      level_depth = parent.level_depth + 1;
    }

    const existing = await learningOutcomeModel.getPloByCode(program_id, outcome_code);
    if (existing) {
      if (!existing.is_active) {
        const reactivated = await learningOutcomeModel.reactivatePlo({
          program_id,
          outcome_code,
          outcome_title,
          outcome_description,
          outcome_type,
          parent_outcome_id,
          level_depth,
          updated_by: user.user_id
        });

        return res.status(200).json({
          message: "PLO reactivated and updated successfully",
          data: reactivated
        });
      } else {
        return res.status(400).json({
          message: `PLO with code ${outcome_code} already exists and active`
        });
      }
    }

    const maxSeq = await learningOutcomeModel.getMaxSequenceOrder(program_id, parent_outcome_id);
    const sequence_order = maxSeq + 1;

    const newPLO = await learningOutcomeModel.createLearningOutcome({
      program_id,
      outcome_code,
      outcome_title,
      outcome_description,
      outcome_type,
      parent_outcome_id,
      sequence_order,
      level_depth,
      created_by: user.user_id,
      updated_by: user.user_id
    });

    return res.status(201).json({
      message: "PLO created successfully",
      data: newPLO
    });

  } catch (error) {
    console.error("Error in createPLO:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/**
 * ดึงข้อมูลผลลัพธ์การเรียนรู้ (PLO) ทั้งหมดของหลักสูตร และจัดรูปแบบเป็นโครงสร้างต้นไม้ (Tree Structure)
 */
exports.getPLOsByProgram = async (req, res) => {
  try {
    const { program_id } = req.body;

    if (!program_id) {
      return res.status(400).json({ message: "program_id is required" });
    }

    const plos = await learningOutcomeModel.getPloByProgramId(program_id);

    const userIds = Array.from(
      new Set(plos.flatMap(p => [p.created_by, p.updated_by].filter(Boolean)))
    );

    const users = await Promise.all(
      userIds.map(id => userModel.findUserById(id))
    );

    const userMap = {};
    users.forEach(u => {
      if (u) userMap[u.user_id] = u.email;
    });

    const ploMap = {};
    plos.forEach(plo => {
      ploMap[plo.outcome_id] = {
        outcome_id: plo.outcome_id,
        program_id: plo.program_id,
        outcome_code: plo.outcome_code,
        outcome_title: plo.outcome_title,
        outcome_description: plo.outcome_description,
        outcome_type: plo.outcome_type,
        parent_outcome_id: plo.parent_outcome_id,
        sequence_order: plo.sequence_order,
        level_depth: plo.level_depth,
        created_by: userMap[plo.created_by] || null,
        updated_by: userMap[plo.updated_by] || null,
        children: []
      };
    });

    const tree = [];
    Object.values(ploMap).forEach(plo => {
      if (plo.parent_outcome_id === null) {
        tree.push(plo);
      } else {
        const parent = ploMap[plo.parent_outcome_id];
        if (parent) parent.children.push(plo);
      }
    });

    return res.status(200).json({
      message: "PLOs fetched successfully",
      data: tree
    });

  } catch (error) {
    console.error("Error in getPLOsByProgram:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/**
 * แก้ไขข้อมูลผลลัพธ์การเรียนรู้ (PLO) เช่น ชื่อ หรือคำอธิบาย โดยอ้างอิงจากรหัส PLO และหลักสูตร
 */
exports.updatePLO = async (req, res) => {
  try {
    const { program_id, outcome_code, outcome_title, outcome_description, email } = req.body;

    if (!program_id || !outcome_code) {
      return res.status(400).json({
        message: "program_id and outcome_code are required"
      });
    }

    if (!outcome_title && !outcome_description) {
      return res.status(400).json({
        message: "Nothing to update. Provide outcome_title or outcome_description"
      });
    }

    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({
        message: "Invalid email for updated_by"
      });
    }

    const plo = await learningOutcomeModel.getPloByCode(program_id, outcome_code);
    if (!plo) {
      return res.status(404).json({
        message: `PLO with outcome_code "${outcome_code}" not found in program ${program_id}`
      });
    }

    const updatedPLO = await learningOutcomeModel.updateLearningOutcome({
      program_id,
      outcome_code,
      outcome_title,
      outcome_description,
      updated_by: user.user_id
    });

    return res.status(200).json({
      message: "PLO updated successfully",
      data: updatedPLO
    });

  } catch (error) {
    console.error("Error in updatePLO:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/**
 * ลบข้อมูลผลลัพธ์การเรียนรู้ (PLO) ออกจากระบบ หรือเปลี่ยนสถานะเป็น Inactive หากตรวจพบว่ามีการนำไปใช้งานแล้ว
 */
exports.deletePLO = async (req, res) => {
  try {
    const { program_id, outcome_code } = req.body;

    if (!program_id || !outcome_code) {
      return res.status(400).json({ message: "program_id and outcome_code are required" });
    }

    const plo = await learningOutcomeModel.getPloByCode(program_id, outcome_code);
    if (!plo) return res.status(404).json({ message: `PLO ${outcome_code} not found` });

    const isUsed = await learningOutcomeModel.isPLOUsed(program_id, plo.outcome_id);

    let result;
    if (isUsed) {
      result = await learningOutcomeModel.deactivatePLO(program_id, outcome_code);
      return res.status(200).json({
        message: `PLO ${outcome_code} is in use, so it has been deactivated`,
        data: result
      });
    } else {
      result = await learningOutcomeModel.deletePLO(program_id, outcome_code);
      return res.status(200).json({
        message: `PLO ${outcome_code} deleted successfully`,
        data: result
      });
    }
  } catch (error) {
    console.error("Error in deletePLO:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};