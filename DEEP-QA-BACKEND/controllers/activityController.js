// controllers/activityController.js
const activityModel = require('../models/activityModel');

/**
 * จัดการข้อมูลกิจกรรมการประเมิน (Activity) ทั้งการสร้างใหม่และการอัปเดตข้อมูลเดิม 
 * พร้อมทั้งแมปข้อมูล CLO และคำนวณคะแนนรวมให้อัตโนมัติ
 */
exports.upsertActivityHandler = async (req, res) => {
  try {
    const { activity, clo_mappings = [] } = req.body;

    if (!activity || !activity.section_id) {
      return res.status(400).json({
        success: false,
        message: 'activity.section_id is required'
      });
    }

    if (activity.activity_id == null) {
      const required = [
        'section_id',
        'score_ratio_id',
        'activity_type',
        'activity_name'
      ];

      for (const f of required) {
        if (activity[f] == null) {
          return res.status(400).json({
            success: false,
            message: `${f} is required for create`
          });
        }
      }

      const createdActivity = await activityModel.createActivityBySection(activity);

      const cloResult = await activityModel.upsertActivityCloMapping(
        createdActivity.id,
        activity.score_ratio_id,
        clo_mappings
      );

      await activityModel.recalculateActivityScore(createdActivity.id);

      return res.status(201).json({
        success: true,
        data: {
          activity: createdActivity,
          clo_mappings: cloResult
        }
      });
    }

    const old = await activityModel.getActivityById(activity.activity_id);
    if (!old) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const updatedActivity = await activityModel.updateActivity({
      activity_id: activity.activity_id,
      activity_type: activity.activity_type ?? old.activity_type,
      activity_name: activity.activity_name ?? old.activity_name,
      description: activity.description ?? old.description,
      score: old.score_number 
    });

    const cloResult = await activityModel.upsertActivityCloMapping(
      activity.activity_id,
      old.score_ratio_id,
      clo_mappings
    );

    await activityModel.recalculateActivityScore(activity.activity_id);

    res.status(200).json({
      success: true,
      data: {
        activity: updatedActivity,
        clo_mappings: cloResult
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * ดึงข้อมูลกิจกรรมการประเมินทั้งหมดภายในกลุ่มเรียน (Section) โดยจัดกลุ่มตามสัดส่วนคะแนน (Score Ratio)
 */
exports.getActivityHandler = async (req, res) => {
  try {
    const { section_id } = req.params;

    if (!section_id) {
      return res.status(400).json({
        success: false,
        message: 'section_id is required'
      });
    }

    const rows =
      await activityModel.getScoreRatioWithActivitiesBySectionId(section_id);

    const map = new Map();

    for (const r of rows) {
      if (!map.has(r.score_ratio_id)) {
        map.set(r.score_ratio_id, {
          score_ratio_id: r.score_ratio_id,
          score_category: r.score_category,
          weight: r.score_ratio_weight,
          activities: []
        });
      }

      if (r.activity_id) {
        map.get(r.score_ratio_id).activities.push({
          activity_id: r.activity_id,
          activity_type: r.activity_type,
          activity_name: r.activity_name,
          description: r.description,
          total_score: r.score_number,
          created_at: r.created_at,
          updated_at: r.updated_at
        });
      }
    }

    res.status(200).json({
      success: true,
      result: Array.from(map.values())
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * ดึงรายละเอียดของกิจกรรมพร้อมข้อมูลการแมป CLO (CLO Mappings) ที่เชื่อมโยงอยู่กับกิจกรรมนั้นๆ
 */
exports.getActivityCloMapHandler = async (req, res) => {
  try {
    const { activity_id } = req.params;

    if (!activity_id) {
      return res.status(400).json({
        success: false,
        message: 'activity_id is required'
      });
    }

    const activity = await activityModel.getActivityById(activity_id);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    const cloMaps = await activityModel.getActivityCloMappingsWithDetail(activity_id);

    const mappedClo = cloMaps.map(c => ({
      activity_clo_map_id: c.activity_clo_map_id,
      sequence_order: c.sequence_order,
      detail: c.detail,          
      score: c.score,
      weight: c.weight,
      clo: {
        clo_id: c.clo_id,
        clo_number: c.clo_number,
        clo_detail: c.clo_detail,
        plo_list: c.plo_list,              
        teaching_method: c.teaching_method,
        assessment_method: c.assessment_method
      }
    }));

    res.status(200).json({
      success: true,
      result: {
        activity: {
          activity_id: activity.id,
          section: activity.section_id, 
          score_ratio_id: activity.score_ratio_id,
          activity_type: activity.activity_type,
          activity_name: activity.activity_name,
          description: activity.description,
          score: activity.score_number
        },
        clo_mappings: mappedClo
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * ลบข้อมูลกิจกรรมการประเมินออกจากระบบตามรหัสกิจกรรมที่ระบุ
 */
exports.deleteActivityHandler = async (req, res) => {
  try {
    const { activity_id } = req.params;

    if (!activity_id) {
      return res.status(400).json({
        success: false,
        message: 'activity_id is required'
      });
    }

    const result = await activityModel.deleteActivity(activity_id);

    res.status(200).json({
      success: true,
      result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * ดึงข้อมูลกิจกรรมตามปีการศึกษาและรหัสวิชา (ยังไม่ได้ระบุรายละเอียด Logic)
 */
exports.getActivityFromYearAndSubID = async (req,res) =>{
    try {
 
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * ดึงข้อมูลกิจกรรมทั้งหมดที่เกี่ยวข้องกับรายวิชาและหลักสูตรที่ระบุ
 */
exports.getActivityFromSubjectAndProgram = async (req, res) => {
  try {
    const { subject_id, program_id } = req.params;

    if (!subject_id || !program_id) {
      return res.status(400).json({
        success: false,
        message: 'subject_id and program_id are required'
      });
    }

    const activities =
      await activityModel.getActivityFromSubjectAndProgram(
        subject_id,
        program_id
      );

    return res.json({
      success: true,
      count: activities.length,
      data: activities
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};