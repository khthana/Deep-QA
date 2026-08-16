// // services/validateScoreService.js
const model = require('../models/activityScoreModel')


// services/validateScoreService.js
async function validateImportActivityScore({
  rows,
  section_id,
  activity_id,
  score_type,
  isGroup,
}) {
  const errors = [];

  // ==========================
  // 🔹 PRELOAD
  // ==========================
  const studentsInSection = new Set(
    await model.getAllStudentInSection(section_id)
  );

  const groupIds = await model.getAllGroupsInSection(section_id);
  const groupMap = {};

  for (const gid of groupIds) {
    const info = await model.getGroupInfo(gid);
    const members = await model.getStudentIngroup(gid);
    groupMap[info.group_name] = members.map(String);
  }

  const activityMaxScore = await model.getActivityMaxScore(activity_id);

  // clo_id -> max_score (acm.score)
  const cloMaxMap = await model.getActivityCLOScoreMap(activity_id);
  const cloIds = Object.keys(cloMaxMap).map(Number);

  const sumMaxScore = cloIds.reduce(
    (s, id) => s + (cloMaxMap[String(id)] || 0),
    0
  );

  // 🔑 สำคัญ: map clo_number -> clo_id (สำหรับ header)
  const activityCLOs = await model.getWeightScoreCLO(activity_id);
  const cloNumberMap = {};
  activityCLOs.forEach(c => {
    cloNumberMap[String(c.clo_number)] = c.clo_id;
  });

  // ==========================
  // 🔹 HEADER-LEVEL CLO CHECK (แบบเดิม แต่ใช้ได้จริง)
  // ==========================
  if (rows.length > 0 && score_type === 'clo') {
    const headerRow = rows[0];

    Object.keys(headerRow).forEach(originalKey => {
      const t = originalKey.trim();
      if (!t.startsWith('CLO-')) return;

      const cloNumber = t.replace('CLO-', '');

      if (!/^\d+$/.test(cloNumber)) {
        errors.push({
          row: 1,
          field: t,
          message: 'รูปแบบ CLO ไม่ถูกต้อง'
        });
        return;
      }

      // ✅ เช็คด้วย clo_number ตามที่คุณต้องการ
      if (!cloNumberMap[cloNumber]) {
        errors.push({
          row: 1,
          field: t,
          message: `CLO-${cloNumber} ไม่ได้อยู่ใน activity นี้`
        });
      }
    });
  }

  if (errors.length > 0) return errors;

  // ==========================
  // 🔹 ROW-LEVEL VALIDATION
  // ==========================
  rows.forEach((row, index) => {
    const excelRow = index + 2;
    let targetStudents = [];

    // ----- group / individual -----
    if (isGroup) {
      if (!row.group_name || !groupMap[row.group_name]) {
        errors.push({
          row: excelRow,
          field: 'group_name',
          value: row.group_name,
          message: 'ไม่พบกลุ่มใน section นี้'
        });
        return;
      }
      targetStudents = groupMap[row.group_name];
    } else {
      const student_id = row.student_id ?? row.id ?? null;
      if (!student_id || !studentsInSection.has(String(student_id))) {
        errors.push({
          row: excelRow,
          field: 'student_id',
          value: student_id,
          message: 'นักศึกษาไม่ได้อยู่ใน section นี้'
        });
        return;
      }
      targetStudents = [String(student_id)];
    }

    // ==========================
    // 🔹 CLO MODE
    // ==========================
    if (score_type === 'clo') {
      Object.keys(row).forEach(k => {
        const t = k.trim();
        if (!t.startsWith('CLO-')) return;

        const cloNumber = t.replace('CLO-', '');
        if (!/^\d+$/.test(cloNumber)) return;

        const score = Number(row[k] ?? 0);
        if (Number.isNaN(score)) {
          errors.push({
            row: excelRow,
            field: t,
            value: row[k],
            message: 'คะแนนต้องเป็นตัวเลข'
          });
          return;
        }

        if (score < 0) {
          errors.push({
            row: excelRow,
            field: t,
            value: score,
            message: 'คะแนนต้องไม่ติดลบ'
          });
          return;
        }

        const cloId = cloNumberMap[cloNumber];
        const max = cloMaxMap[String(cloId)] ?? 0;

        if (score > max) {
          errors.push({
            row: excelRow,
            field: t,
            value: score,
            message: `คะแนนเกินคะแนนเต็ม ${max}`
          });
        }
      });
    }

    // ==========================
    // 🔹 AVERAGE MODE
    // ==========================
    if (score_type === 'average') {
      const total =
        row.total ?? row.total_score ?? row.TOTAL ?? null;

      const baseScore = Number(total);
      if (total === null || Number.isNaN(baseScore)) {
        errors.push({
          row: excelRow,
          field: 'total',
          value: total,
          message: 'total score ไม่ถูกต้อง'
        });
        return;
      }

      if (baseScore < 0) {
        errors.push({
          row: excelRow,
          field: 'total',
          value: baseScore,
          message: 'total score ต้องไม่ติดลบ'
        });
        return;
      }

      if (baseScore > activityMaxScore) {
        errors.push({
          row: excelRow,
          field: 'total',
          value: baseScore,
          message: `total score เกินคะแนนเต็มของกิจกรรม (${activityMaxScore})`
        });
        return;
      }

      for (const cloId of cloIds) {
        const max = cloMaxMap[String(cloId)] || 0;
        const raw =
          sumMaxScore === 0
            ? 0
            : (baseScore * max) / sumMaxScore;

        if (raw > max) {
          errors.push({
            row: excelRow,
            field: 'total',
            message: `คะแนนหลังคำนวณเกิน max ของ CLO`
          });
        }
      }
    }
  });

  return errors;
}

module.exports = { validateImportActivityScore };
