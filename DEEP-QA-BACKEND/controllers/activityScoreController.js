//controllers/activityScoreController.js
const activityScoreModel = require('../models/activityScoreModel');
const service = require('../services/validateScoreService');
const XLSX = require('xlsx');

/**
 * ปรับปรุงและตรวจสอบความถูกต้องของคะแนน (Normalize) ให้เป็นไปตามเกณฑ์คะแนนเต็มของแต่ละ CLO
 */
function normalizeScore({ student_id, cloId, rawScore, cloMaxMap, cloNumberMap }) {
  const max = cloMaxMap[String(cloId)];

  if (max === undefined) {
    return {
      student_id,
      clo_id: cloId,
      clo_number: cloNumberMap[cloId],
      rawScore,
      score: 0,
      warning: 'Invalid CLO ID'
    };
  }

  if (rawScore < 0) {
    return {
      student_id,
      clo_id: cloId,
      clo_number: cloNumberMap[cloId],
      rawScore,
      score: 0,
      warning: 'คะแนนติดลบ'
    };
  }

  if (rawScore > max) {
    return {
      student_id,
      clo_id: cloId,
      clo_number: cloNumberMap[cloId],
      rawScore,
      score: 0,
      warning: `กรอกคะแนนเกินคะแนนเต็ม ${max}`
    };
  }

  return {
    student_id,
    clo_id: cloId,
    rawScore,
    score: rawScore
  };
}

/**
 * บันทึกคะแนนกิจกรรมการประเมิน (Activity Score) รองรับทั้งการให้คะแนนรายบุคคลและรายกลุ่ม 
 * รวมถึงการกระจายคะแนนแบบเฉลี่ย (Average) และแบบระบุตาม CLO
 */
exports.saveActivityScore = async (req, res) => {
  try {
    const {
      section_id,
      activity_id,
      score_type,
      group,
      clo = [],
      list_student = []
    } = req.body;

    const cloWeights = await activityScoreModel.getWeightScoreCLO(activity_id);
    const cloMaxMap = await activityScoreModel.getActivityCLOScoreMap(activity_id);

    const cloNumberMap = {};
    cloWeights.forEach(c => {
      cloNumberMap[c.clo_id] = c.clo_number;
    });

    const warnings = [];
    const normalizedRows = [];

    for (const item of list_student) {
      const refId = item.id;

      const targetStudents = group
        ? await activityScoreModel.getStudentIngroup(refId)
        : [refId];

      for (const student_id of targetStudents) {
        const valid = await activityScoreModel.checkStudentInSection(student_id, section_id);

        if (!valid) {
          warnings.push({
            student_id,
            message: 'นักศึกษาไม่ได้อยู่ในรายวิชานี้'
          });
          continue;
        }

        if (score_type === 'clo') {
          for (let i = 0; i < clo.length; i++) {
            const cloId = clo[i];
            const rawScore = Number(item.list_score?.[i] ?? 0);

            const result = normalizeScore({
              student_id,
              cloId,
              rawScore,
              cloMaxMap,
              cloNumberMap
            });

            if (result.warning) {
              warnings.push({
                student_id,
                clo_id: result.clo_id,
                clo_number: result.clo_number,
                score: rawScore,
                max_score: cloMaxMap[String(cloId)],
                message: result.warning
              });
            }

            normalizedRows.push(result);
          }
        }

        if (score_type === 'average') {
          const baseScore = Number(item.list_score?.[0] ?? 0);

          const sumMaxScore = clo.reduce(
            (sum, cloId) => sum + (cloMaxMap[String(cloId)] || 0),
            0
          );

          for (const cloId of clo) {
            const max = cloMaxMap[String(cloId)] || 0;

            const rawScore =
              sumMaxScore === 0 ? 0 : (baseScore * max) / sumMaxScore;

            const result = normalizeScore({
              student_id,
              cloId,
              rawScore,
              cloMaxMap,
              cloNumberMap
            });

            if (result.warning) {
              warnings.push({
                student_id,
                clo_id: result.clo_id,
                clo_number: result.clo_number,
                score: rawScore,
                max_score: max,
                message: result.warning
              });
            }

            normalizedRows.push(result);
          }
        }
      }
    }

    for (const row of normalizedRows) {
      await activityScoreModel.upsertActivityScore(
        row.student_id,
        activity_id,
        row.clo_id,
        row.score
      );
    }

    return res.json({
      success: true,
      message: 'บันทึกคะแนนเสร็จสิ้น',
      warnings
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * ดึงข้อมูลคะแนนกิจกรรมการประเมินตามรหัสกลุ่มเรียนและกิจกรรมที่ระบุ 
 * โดยคำนวณคะแนนเฉลี่ยหากเป็นการดึงข้อมูลแบบรายกลุ่ม (Group)
 */
exports.getActivityScore = async (req, res) => {
  try {
    const { section_id, activity_id, score_type, group } = req.body;

    if (!section_id || !activity_id || score_type !== 'clo') {
      return res.status(400).json({
        success: false,
        message: 'รองรับเฉพาะ clo'
      });
    }

    const cloWeights = await activityScoreModel.getWeightScoreCLO(activity_id);
    const cloMaxMap = await activityScoreModel.getActivityCLOScoreMap(activity_id);
    const scores = await activityScoreModel.getActivityScoreByActivity(activity_id);

    const cloList = cloWeights.map(c => ({
      clo_id: c.clo_id,
      clo_number: c.clo_number,
      weight: c.weight,
      max_score: cloMaxMap[String(c.clo_id)] ?? 0
    }));

    const list_student = [];

    if (group === true) {
      const groups = await activityScoreModel.getAllGroupsInSection(section_id);

      for (const groupId of groups) {
        const groupInfo = await activityScoreModel.getGroupInfo(groupId);
        const members = await activityScoreModel.getStudentIngroup(groupId);
        const memberCount = members.length || 1;

        const scoreMap = {};
        cloList.forEach(c => (scoreMap[c.clo_id] = 0));

        for (const studentId of members) {
          scores.forEach(sc => {
            if (
              String(sc.student_id) === String(studentId) &&
              scoreMap.hasOwnProperty(sc.clo_id)
            ) {
              scoreMap[sc.clo_id] += Number(sc.score || 0);
            }
          });
        }

        const list_score = cloList.map(c =>
          Number((scoreMap[c.clo_id] / memberCount).toFixed(2))
        );

        list_student.push({
          id: groupId,
          group_name: groupInfo?.group_name || '',
          list_score
        });
      }
    } else {
      const students = await activityScoreModel.getAllStudentInSection(section_id);

      for (const student_id of students) {
        const info = await activityScoreModel.getStudentInfo(student_id);

        const scoreMap = {};
        cloList.forEach(c => (scoreMap[c.clo_id] = 0));

        scores.forEach(sc => {
          if (
            sc.student_id === student_id &&
            scoreMap.hasOwnProperty(sc.clo_id)
          ) {
            scoreMap[sc.clo_id] = Number(sc.score || 0);
          }
        });

        const list_score = cloList.map(c =>
          Number((scoreMap[c.clo_id] || 0).toFixed(2))
        );

        list_student.push({
          id: student_id,
          title_th:info?.title_th || '',
          first_name: info?.first_name || '',
          last_name: info?.last_name || '',
          list_score
        });
      }
    }

    return res.json({
      section_id,
      activity_id,
      score_type: 'clo',
      group,
      clo: cloList,
      list_student
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * นำเข้าคะแนนกิจกรรมการประเมินจากไฟล์ Excel พร้อมระบบตรวจสอบความถูกต้อง 
 * และคำนวณการกระจายคะแนนตามประเภทของคะแนนที่กำหนด (CLO หรือ Average)
 */
exports.importActivityScore = async (req, res) => {
  try {
    const { section_id, activity_id, score_type, group } = req.body;
    const isGroup = group === true || group === 'true';

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    const validationErrors = await service.validateImportActivityScore({
      rows,
      section_id,
      activity_id,
      score_type,
      isGroup,
      // activityScoreModel
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors
      });
    }

    const cloMaxMap = await activityScoreModel.getActivityCLOScoreMap(activity_id);
    const cloIds = Object.keys(cloMaxMap).map(Number);

    const sumMaxScore = cloIds.reduce(
      (sum, cloId) => sum + (cloMaxMap[String(cloId)] || 0),
      0
    );

    const normalizedRows = [];

    for (const row of rows) {
      let targetStudents = [];

      if (isGroup) {
        const groupId = await activityScoreModel.getGroupIdByNameAndSection(
          row.group_name,
          section_id
        );
        targetStudents = await activityScoreModel.getStudentIngroup(groupId);
      } else {
        const studentId = row.student_id ?? row.id;
        targetStudents = [String(studentId)];
      }

      if (score_type === 'clo') {
        const cloKeyMap = {};
        Object.keys(row).forEach(k => {
          const t = k.trim();
          if (t.startsWith('CLO-')) cloKeyMap[t] = k;
        });

        for (const student_id of targetStudents) {
          for (const [cloKey, originalKey] of Object.entries(cloKeyMap)) {
            const cloNumber = cloKey.replace('CLO-', '');
            if (!/^\d+$/.test(cloNumber)) continue;

            const clo_id = await activityScoreModel.getCloIdByCloNumberAndSection(
              Number(cloNumber),
              section_id
            );
            if (!clo_id) continue;

            const max = cloMaxMap[String(clo_id)] || 0;

            let score = Number(row[originalKey] ?? 0);
            if (Number.isNaN(score) || score < 0) score = 0;
            if (score > max) score = max;

            normalizedRows.push({
              student_id,
              clo_id,
              score
            });
          }
        }
      }

      if (score_type === 'average') {
        let baseScore = Number(
          row.total ?? row.total_score ?? row.TOTAL ?? 0
        );

        if (Number.isNaN(baseScore) || baseScore < 0) baseScore = 0;

        for (const student_id of targetStudents) {
          for (const cloId of cloIds) {
            const max = cloMaxMap[String(cloId)] || 0;

            const rawScore =
              sumMaxScore === 0
                ? 0
                : (baseScore * max) / sumMaxScore;

            const finalScore =
              rawScore < 0 ? 0 :
              rawScore > max ? max : rawScore;

            normalizedRows.push({
              student_id,
              clo_id: cloId,
              score: finalScore
            });
          }
        }
      }
    }

    for (const r of normalizedRows) {
      await activityScoreModel.upsertActivityScore(
        r.student_id,
        activity_id,
        r.clo_id,
        r.score
      );
    }

    const activityCLOs = await activityScoreModel.getWeightScoreCLO(activity_id);

    return res.json({
      success: true,
      message: {
        CLO: activityCLOs.map(c => `CLO-${c.clo_number}`)
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};