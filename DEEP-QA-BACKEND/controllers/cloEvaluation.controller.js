// controllers/cloEvaluation.controller.js
const model = require('../models/cloEvaluation.model');

/**
 * ดึงข้อมูลการประเมินผลการเรียนรู้ตามรายวิชา (CLO Evaluation) ของแต่ละกลุ่มเรียน 
 * โดยคำนวณสัดส่วนจำนวนนักศึกษาที่ผ่านเกณฑ์ในแต่ละกิจกรรม (Indicator) และสรุปผลการบรรลุเป้าหมาย
 */
exports.getCLOEvaluationBySection = async (req, res) => {
  try {
    const { section_id } = req.params;

    const [
      clos,
      mappings,
      scores,
      totalStudents,
    ] = await Promise.all([
      model.getCLOBySection(section_id),
      model.getActivityCLOMappingBySection(section_id),
      model.getActivityScoresBySection(section_id),
      model.getTotalStudentsBySection(section_id),
    ]);

    const sec = await model.getSectionSummary(section_id);

    const scoreMap = {};
    for (const s of scores) {
      const key = `${s.clo_id}_${s.activity_id}`;
      if (!scoreMap[key]) scoreMap[key] = [];
      scoreMap[key].push(Number(s.score));
    }

    for (const clo of clos) {
      const indicators = mappings.filter(
        (m) => m.clo_id === clo.clo_id
      );

      clo.indicators = indicators.map((m) => {
        const key = `${m.clo_id}_${m.activity_id}`;
        const scoreList = scoreMap[key] || [];

        const passStudents = scoreList.filter(
          (score) => score / m.max_score >= 0.5
        ).length;

        const passPercent =
          totalStudents === 0
            ? 0
            : Math.round((passStudents / totalStudents) * 100);

        return {
          activity_id: m.activity_id,
          activity_name: m.activity_name,
          max_score: m.max_score,
          weight: m.weight,
          pass_students: passStudents,
          total_students: totalStudents,
          pass_percent: passPercent,
          result: passPercent >= 60 ? 'Y' : 'N',
        };
      });
    }

    res.json({
      section_id: sec.section_id,
      subject_id: sec.subject_id,
      subject_name: sec.subject_name,
      semester: sec.semester,
      year: sec.year,
      data: clos,
    });
  } catch (err) {
    console.error('getCLOEvaluationBySection error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};