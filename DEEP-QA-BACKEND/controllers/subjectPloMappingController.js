// controllers/subjectPloMappingController.js
const subjectPloMappingModel = require("../models/subjectPloMappingModel");
const userModel = require("../models/userModel");
const learningOutcomeModel = require("../models/learningOutcomeModel");
const programsModel = require('../models/programsModel');
const subjectsModel = require("../models/subjectsModel");

/**
 * จัดการข้อมูลการแมปรายวิชากับผลลัพธ์การเรียนรู้ (PLO Mapping) แบบครบวงจร (สร้าง, อัปเดต, ลบ) ตามรายการที่ส่งมา
 */
exports.createPloMapping = async (req, res) => {
  try {
    const { program_id, email, plo_detail } = req.body;

    if (!program_id || !email || !Array.isArray(plo_detail)) {
      return res.status(400).json({
        message: "program_id, email and plo_detail[] are required"
      });
    }

    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({
        message: "Invalid email for created_by / updated_by"
      });
    }

    const result = {
      inserted: [],
      updated: [],
      deleted: []
    };

    const existingMappings =
      await subjectPloMappingModel.getSubjectPloMappingByProgramId(program_id);

    const existingMapById = {};
    existingMappings.forEach(m => {
      existingMapById[m.mapping_id] = m;
    });

    const currentIds = [];

    for (const subjectItem of plo_detail) {
      const { subject_id } = subjectItem;
      let { subject_map_list } = subjectItem;

      const subject = await subjectsModel.getSubjectById(subject_id);
      if (!subject) {
        return res.status(400).json({
          message: `subject_id "${subject_id}" not found`
        });
      }

      const outcomeMap = new Map();

      for (const item of subject_map_list) {
        const { outcome_id, mapping_id } = item;

        if (!outcomeMap.has(outcome_id)) {
          outcomeMap.set(outcome_id, item);
        } else {
          const existing = outcomeMap.get(outcome_id);
          if (existing.mapping_id == null && mapping_id != null) {
            outcomeMap.set(outcome_id, item);
          }
        }
      }

      subject_map_list = Array.from(outcomeMap.values());

      for (const mapItem of subject_map_list) {
        let { mapping_id, outcome_id, mapping_level } = mapItem;
        const level = mapping_level ?? 'E';

        if (mapping_id && existingMapById[mapping_id]) {
          const updated =
            await subjectPloMappingModel.updateSubjectPloMapping({
              mapping_id,
              outcome_id,
              mapping_level: level,
              updated_by: user.user_id
            });

          if (updated) {
            result.updated.push(updated);
            currentIds.push(mapping_id);
          }

        } else {
          const inserted =
            await subjectPloMappingModel.createPloMapping({
              program_id,
              subject_id,
              outcome_id,
              mapping_level: level,
              created_by: user.user_id,
              updated_by: user.user_id
            });

          if (inserted) {
            result.inserted.push(inserted);
            currentIds.push(inserted.mapping_id);
          }
        }
      }
    }

    for (const oldMapping of existingMappings) {
      if (!currentIds.includes(oldMapping.mapping_id)) {
        const deleted =
          await subjectPloMappingModel.deleteSubjectPloMapping(
            oldMapping.mapping_id
          );
        if (deleted) {
          result.deleted.push(deleted);
        }
      }
    }

    return res.status(201).json({
      message: "PLO Mappings processed successfully",
      result
    });

  } catch (error) {
    console.error("Error in createPloMapping:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/**
 * ดึงข้อมูลการแมปรายวิชากับผลลัพธ์การเรียนรู้ (PLO Mapping) ทั้งหมดของหลักสูตรที่ระบุ
 */
exports.getSubjectPloMapping = async (req, res) => {
  try {
    const { program_id } = req.body;

    if (!program_id) {
      return res.status(400).json({ message: "program_id is required" });
    }

    const program = await programsModel.getProgramById(program_id);
    if (!program) {
      return res.status(404).json({ message: `Program ${program_id} not found` });
    }

    const rows = await subjectPloMappingModel.getSubjectPloMappingByProgramId(program_id);

    const subjectMap = {};
    rows.forEach(r => {
      if (!subjectMap[r.subject_id]) {
        subjectMap[r.subject_id] = {
          subject_id: r.subject_id,
          subject_name_th: r.subject_name_th,
          subject_name_en: r.subject_name_en,
          subject_mapping: []
        };
      }
      subjectMap[r.subject_id].subject_mapping.push({
        mapping_id: r.mapping_id,
        outcome_code: r.outcome_code,
        outcome_description: r.outcome_description,
        mapping_level: r.mapping_level
      });
    });

    const program_subject_mapping = Object.values(subjectMap);

    return res.status(200).json({
      message: "Subject PLO mappings retrieved successfully",
      program_id: program.program_id,
      program_name_th: program.program_name_th,
      program_name_en: program.program_name_en,
      program_subject_mapping
    });

  } catch (error) {
    console.error("Error in getSubjectPloMapping:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/**
 * อัปเดตข้อมูลการแมปรายวิชากับผลลัพธ์การเรียนรู้รายรายการ (เฉพาะฟิลด์ระดับการแมปหรือรหัสผลลัพธ์)
 */
exports.updateSubjectPloMapping = async (req, res) => {
  try {
    const { mapping_id, program_id,  outcome_code, mapping_level, email } = req.body;

    if (!mapping_id || !email) {
      return res.status(400).json({
        message: "mapping_id and email are required"
      });
    }

    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: `User with email "${email}" not found` });
    }

    let outcome_id;
    if (outcome_code) {
      const plo = await learningOutcomeModel.getPloByCode(program_id, outcome_code);
      if (!plo) {
        return res.status(404).json({ message: `PLO with outcome_code "${outcome_code}" not found` });
      }
      outcome_id = plo.outcome_id;
    }

    const updatedMapping = await subjectPloMappingModel.updateSubjectPloMapping({
      mapping_id,
      outcome_id,
      mapping_level,
      updated_by: user.user_id
    });

    if (!updatedMapping) {
      return res.status(404).json({ message: `Mapping with id ${mapping_id} not found` });
    }

    return res.status(200).json({
      message: "Subject PLO mapping updated successfully",
      data: updatedMapping
    });

  } catch (error) {
    console.error("Error in updateSubjectPloMapping:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/**
 * ลบข้อมูลการแมปรายวิชากับผลลัพธ์การเรียนรู้ตาม Mapping ID ที่ระบุ
 */
exports.deleteSubjectPloMapping = async (req, res) => {
  try {
    const { mapping_id } = req.body;

    if (!mapping_id) {
      return res.status(400).json({
        message: "mapping_id is required"
      });
    }

    const deletedMapping = await subjectPloMappingModel.deleteSubjectPloMapping(mapping_id);

    if (!deletedMapping) {
      return res.status(404).json({
        message: `Subject PLO mapping with mapping_id "${mapping_id}" not found`
      });
    }

    return res.status(200).json({
      message: "Subject PLO mapping deleted successfully",
      data: deletedMapping
    });

  } catch (error) {
    console.error("Error in deleteSubjectPloMapping:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/**
 * ดึงข้อมูลการแมป PLO ของรายวิชาพร้อมข้อมูลผลลัพธ์การเรียนรู้ย่อย (Children Outcomes) ที่เกี่ยวข้อง
 */
exports.getSubjectPloMappingController = async (req, res) => {
  try {
    const { subject_id, program_id } = req.body;

    if (!subject_id || !program_id) {
      return res.status(400).json({
        success: false,
        message: 'subject_id and program_id are required'
      });
    }

    const rows =
      await subjectPloMappingModel.getSubjectPloMappingWithChildren(
        subject_id,
        program_id
      );

    const map = new Map();

    for (const r of rows) {
      if (!map.has(r.mapping_id)) {
        map.set(r.mapping_id, {
          mapping_id: r.mapping_id,
          subject_id: r.subject_id,
          program_id: r.program_id,
          outcome_id: r.parent_outcome_id,
          outcome_code: r.parent_outcome_code,
          outcome_title: r.parent_outcome_title,
          outcome_type: r.parent_outcome_type,
          mapping_level: r.mapping_level,
          children: []
        });
      }

      if (r.child_outcome_id) {
        map.get(r.mapping_id).children.push({
          outcome_id: r.child_outcome_id,
          outcome_code: r.child_outcome_code,
          outcome_title: r.child_outcome_title,
          outcome_type: r.child_outcome_type
        });
      }
    }

    res.json({
      success: true,
      data: Array.from(map.values())
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};