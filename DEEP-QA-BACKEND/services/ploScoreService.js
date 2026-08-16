const normalizeUtil = require('./cloNormalizeUtil');
const ploScoreModel = require('../models/ploScoreModel');

const MAX_SCORE =5;

exports.getStudentPloByProgram = async ({ programId, studentId }) => {
  const studentInfo = await ploScoreModel.getStudentInfo(studentId);
  if (!studentInfo) {
    throw new Error('Student not found');
  }

  const plos = await ploScoreModel.getPloByProgram(programId);
  const rawRows = await ploScoreModel.getStudentPloStructure(studentId, programId);

  const cloMap = new Map();
  rawRows.forEach(r => {
    if (!cloMap.has(r.clo_id)) {
      cloMap.set(r.clo_id, {
        plo_id: r.plo_id,
        subject_id: r.subject_id,
        subject_name_en: r.subject_name_en,
        subject_type: r.subject_type,
        section_id: r.section_id,
        clo_number: r.clo_number,
        clo_detail: r.clo_detail,
        activities: []
      });
    }
    if (Number(r.full_score) > 0) {
      cloMap.get(r.clo_id).activities.push({
        score: Number(r.student_score ?? 0),
        fullScore: Number(r.full_score),
        weight: Number(r.weight ?? 0)
      });
    }
  });

  const cloResults = [];
  cloMap.forEach((clo, cloId) => {
    const cloScore = normalizeUtil.weightedCloScore(clo.activities);
    cloResults.push({
      ...clo,
      clo_id: cloId,
      earned_score: cloScore !== null ? Number(cloScore.toFixed(2)) : null
    });
  });

  const ploScoreMap = new Map();
  cloResults.forEach(clo => {
    if (!ploScoreMap.has(clo.plo_id)) ploScoreMap.set(clo.plo_id, []);
    if (clo.earned_score !== null) ploScoreMap.get(clo.plo_id).push(clo.earned_score);
  });

  const ploFinalScore = new Map();
  ploScoreMap.forEach((scores, ploId) => {
    if (scores.length === 0) {
      ploFinalScore.set(ploId, null);
      return;
    }
    const avg = scores.reduce((sum, val) => sum + val, 0) / scores.length;
    ploFinalScore.set(ploId, Number(avg.toFixed(2)));
  });

  const nestedMap = new Map();
  cloResults.forEach(clo => {
    if (!nestedMap.has(clo.plo_id)) nestedMap.set(clo.plo_id, new Map());
    const subjectMap = nestedMap.get(clo.plo_id);
    if (!subjectMap.has(clo.subject_id)) {
      subjectMap.set(clo.subject_id, {
        subject_id: clo.subject_id,
        subject_name_en: clo.subject_name_en,
        subject_type: clo.subject_type,
        section_id: [],
        clos: []
      });
    }
    const subject = subjectMap.get(clo.subject_id);
    if (!subject.section_id.includes(clo.section_id)) {
      subject.section_id.push(clo.section_id);
    }
    subject.clos.push({
      clo_id: clo.clo_id,
      clo_number: clo.clo_number,
      clo_detail: clo.clo_detail,
      earned_score: clo.earned_score,
      full_score: MAX_SCORE
    });
  });

  const merged = plos.map(p => ({
    plo_id: p.plo_id,
    plo_code: p.plo_code,
    plo_name: p.plo_name,
    plo_score: ploFinalScore.get(p.plo_id) ?? null,
    full_score: MAX_SCORE,
    subjects: nestedMap.has(p.plo_id) ? Array.from(nestedMap.get(p.plo_id).values()) : []
  }));

  merged.sort((a, b) => {
       // ดึงตัวเลขจาก PLO-1, PLO-2 มาเทียบกัน (ถ้า plo_code เป็น string)
       const numA = parseInt(a.plo_code.replace(/^\D+/g, ''));
       const numB = parseInt(b.plo_code.replace(/^\D+/g, ''));
       return numA - numB;
    });

  return {
    program_id: programId,
    student_id: studentInfo.student_id,
    title: studentInfo.title_th,
    first_name: studentInfo.first_name_th,
    last_name: studentInfo.last_name_th,
    data: merged
  };
};

exports.getPloByAdmissionYear = async ({ programId, academicYear }) => {
  const students = await ploScoreModel.getStudentsByAdmissionYear(programId, academicYear);
  const plos = await ploScoreModel.getPloByProgram(programId);
  const result = [];

  for (const student of students) {
    const rawRows = await ploScoreModel.getStudentPloStructure(student.student_id, programId);
    const cloMap = new Map();

    rawRows.forEach(r => {
      if (!cloMap.has(r.clo_id)) {
        cloMap.set(r.clo_id, { plo_id: r.plo_id, activities: [] });
      }
      if (Number(r.full_score) > 0) {
        cloMap.get(r.clo_id).activities.push({
          score: Number(r.student_score ?? 0),
          fullScore: Number(r.full_score),
          weight: Number(r.weight ?? 0)
        });
      }
    });

    const cloResults = [];
    cloMap.forEach((clo) => {
      const cloScore = normalizeUtil.weightedCloScore(clo.activities);
      cloResults.push({
        plo_id: clo.plo_id,
        earned_score: cloScore !== null ? Number(cloScore.toFixed(2)) : null
      });
    });

    const ploScoreMap = new Map();
    cloResults.forEach(clo => {
      if (!ploScoreMap.has(clo.plo_id)) ploScoreMap.set(clo.plo_id, []);
      if (clo.earned_score !== null) ploScoreMap.get(clo.plo_id).push(clo.earned_score);
    });

    const ploFinalScore = new Map();
    ploScoreMap.forEach((scores, ploId) => {
      if (scores.length === 0) {
        ploFinalScore.set(ploId, null);
        return;
      }
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      ploFinalScore.set(ploId, Number(avg.toFixed(2)));
    });

    const merged = plos.map(p => ({
      plo_id: p.plo_id,
      plo_code: p.plo_code,
      plo_name: p.plo_name,
      score: ploFinalScore.get(p.plo_id) ?? null,
      full_score: MAX_SCORE
    }));

    merged.sort((a, b) => {
       // ดึงตัวเลขจาก PLO-1, PLO-2 มาเทียบกัน (ถ้า plo_code เป็น string)
       const numA = parseInt(a.plo_code.replace(/^\D+/g, ''));
       const numB = parseInt(b.plo_code.replace(/^\D+/g, ''));
       return numA - numB;
    });

    result.push({
      student_id: student.student_id,
      title_th: student.title_th ?? null,
      first_name: student.first_name_th,
      last_name: student.last_name_th,
      plos: merged
    });
  }

  return {
    program_id: programId,
    academic_year: academicYear,
    students: result
  };
};

exports.getPloByAdmissionYearAggregate = async ({ programId, academicYear }) => {
  const students = await ploScoreModel.getStudentsByAdmissionYear(programId, academicYear);
  const totalStudents = students.length; // ✅ ใช้จำนวนนักศึกษาทั้งหมดมาเป็นตัวหาร

  if (!totalStudents) {
    return {
      program_id: programId,
      academic_year: academicYear,
      data: []
    };
  }

  const plos = await ploScoreModel.getPloByProgram(programId);
  const cloAggregateMap = new Map();

  for (const student of students) {
    const rawRows = await ploScoreModel.getStudentPloStructure(student.student_id, programId);
    const cloMap = new Map();

    rawRows.forEach(r => {
      if (!cloMap.has(r.clo_id)) {
        cloMap.set(r.clo_id, {
          plo_id: r.plo_id,
          subject_id: r.subject_id,
          subject_name_en: r.subject_name_en,
          subject_type: r.subject_type,
          section_id: r.section_id,
          clo_number: r.clo_number,
          clo_detail: r.clo_detail,
          activities: []
        });
      }
      if (Number(r.full_score) > 0) {
        cloMap.get(r.clo_id).activities.push({
          score: Number(r.student_score ?? 0),
          fullScore: Number(r.full_score),
          weight: Number(r.weight ?? 0)
        });
      }
    });

    cloMap.forEach((clo, cloId) => {
      const cloScore = normalizeUtil.weightedCloScore(clo.activities);
      if (cloScore !== null) {
        if (!cloAggregateMap.has(cloId)) {
          cloAggregateMap.set(cloId, {
            plo_id: clo.plo_id,
            subject_id: clo.subject_id,
            subject_name_en: clo.subject_name_en,
            subject_type: clo.subject_type,
            section_id: clo.section_id,
            clo_number: clo.clo_number,
            clo_detail: clo.clo_detail,
            scores: []
          });
        }
        cloAggregateMap.get(cloId).scores.push(Number(cloScore.toFixed(4)));
      }
    });
  }

  const cloResults = [];
  cloAggregateMap.forEach((clo, cloId) => {
    // ✅ หารด้วยจำนวนนักศึกษาทั้งรุ่น ไม่ใช่แค่คนที่ส่งงาน
    const sum = clo.scores.reduce((a, b) => a + b, 0);
    const avg = totalStudents > 0 ? sum / totalStudents : 0;

    cloResults.push({
      ...clo,
      clo_id: cloId,
      earned_score: Number(avg.toFixed(2))
    });
  });

  const ploScoreMap = new Map();
  cloResults.forEach(clo => {
    if (!ploScoreMap.has(clo.plo_id)) {
      ploScoreMap.set(clo.plo_id, []);
    }
    ploScoreMap.get(clo.plo_id).push(clo.earned_score);
  });

  const ploFinalScore = new Map();
  ploScoreMap.forEach((scores, ploId) => {
    if (scores.length === 0) {
      ploFinalScore.set(ploId, null);
      return;
    }
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    ploFinalScore.set(ploId, Number(avg.toFixed(2)));
  });

  const nestedMap = new Map();
  cloResults.forEach(clo => {
    if (!nestedMap.has(clo.plo_id)) nestedMap.set(clo.plo_id, new Map());
    const subjectMap = nestedMap.get(clo.plo_id);
    if (!subjectMap.has(clo.subject_id)) {
      subjectMap.set(clo.subject_id, {
        subject_id: clo.subject_id,
        subject_name_en: clo.subject_name_en,
        subject_type: clo.subject_type,
        section_id: [],
        clos: []
      });
    }
    const subject = subjectMap.get(clo.subject_id);
    if (!subject.section_id.includes(clo.section_id)) {
      subject.section_id.push(clo.section_id);
    }
    subject.clos.push({
      clo_id: clo.clo_id,
      clo_number: clo.clo_number,
      clo_detail: clo.clo_detail,
      earned_score: clo.earned_score,
      full_score: MAX_SCORE
    });
  });

  const merged = plos.map(p => ({
    plo_id: p.plo_id,
    plo_code: p.plo_code,
    plo_name: p.plo_name,
    plo_score: ploFinalScore.get(p.plo_id) ?? null,
    full_score: MAX_SCORE,
    subjects: nestedMap.has(p.plo_id) ? Array.from(nestedMap.get(p.plo_id).values()) : []
  }));

  return {
    program_id: programId,
    academic_year: academicYear,
    data: merged
  };
};

exports.getPloByYearRange = async ({ programId, startYear, endYear }) => {
  const plos = await ploScoreModel.getPloByProgram(programId);
  const years = [];
  
  for (let y = Number(startYear); y <= Number(endYear); y++) {
    years.push(String(y));
  }

  const result = plos.map(p => ({
    plo_id: p.plo_id,
    plo_code: p.plo_code,
    plo_name: p.plo_name,
    scores: years.reduce((acc, year) => {
      acc[year] = null;
      return acc;
    }, {})
  }));

  for (const year of years) {
    const aggregate = await exports.getPloByAdmissionYearAggregate({
      programId,
      academicYear: year
    });

    aggregate.data.forEach(p => {
      const target = result.find(r => r.plo_id === p.plo_id);
      if (target) {
        target.scores[year] = p.plo_score !== null ? Number(p.plo_score) : null;
      }
    });
  }

  return {
    program_id: programId,
    start_year: String(startYear),
    end_year: String(endYear),
    data: result
  };
};