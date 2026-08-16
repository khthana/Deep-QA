// controllers/scoreEvaluationController.js
const sectionModel = require('../models/scoreEvaluationSectionModel');
const baseModel = require('../models/scoreEvaluationBaseModel');
const programModel = require('../models/scoreEvaluationProgramModel');
const cloScoreService = require('../services/cloScoreService');
const normalizeUtil = require('../services/cloNormalizeUtil');

/**
 * ดึงคะแนน CLO ของนักศึกษาแต่ละคนภายในกลุ่มเรียน (Section) โดยระบุจากรหัสกลุ่มเรียนและรหัสนักศึกษา
 */
// exports.getStudentCloScoreBySection = async (req, res) => {
//   try {
//     const section_id = Number(req.params.section_id);
//     const { studentId } = req.params;

//     const meta = await baseModel.getSectionMeta(section_id);
//     if (!meta) return res.status(404).json({ message: 'Section not found' });

//     const rows = await sectionModel.getStudentCloRaw(section_id, studentId);
//     const data = cloScoreService.buildStudentCloResult(rows);
//     const student = await baseModel.getStudentInfo(studentId);

//     res.json({
//       section_id,
//       subject_id: meta.subject_id,
//       subject_name: meta.subject_name,
//       semester: meta.semester,
//       year: meta.academic_year,
//       student_id: student.student_id,
//       title_th: student.title_th,
//       first_name: student.first_name_th,
//       last_name: student.last_name_th,
//       total_clo: data.length,
//       data
//     });
//   } catch {
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };
exports.getStudentCloScoreBySection = async (req, res) => {
  try {
    const section_id = Number(req.params.section_id);
    const { studentId } = req.params;

    // 1. ดึง Metadata และข้อมูลนักศึกษา
    const meta = await baseModel.getSectionMeta(section_id);
    if (!meta) return res.status(404).json({ message: 'Section not found' });
    
    const student = await baseModel.getStudentInfo(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // 2. ดึง CLO ทั้งหมดใน Section นี้มาเป็น Master (จาก Model ที่เราแก้ใหม่)
    const rows = await sectionModel.getStudentCloRaw(section_id, studentId);
    
    // 3. ใช้ Service ในการ Build ข้อมูล 
    // หมายเหตุ: ตัว buildStudentCloResult ควรจัดการกรณี student_score เป็น null ให้คืนค่า earned_score เป็น null ด้วย
    const data = cloScoreService.buildStudentCloResult(rows);

    res.json({
      section_id,
      subject_id: meta.subject_id,
      subject_name: meta.subject_name,
      semester: meta.semester,
      year: meta.academic_year,
      student_id: student.student_id,
      title_th: student.title_th,
      first_name: student.first_name_th,
      last_name: student.last_name_th,
      total_clo: data.length, // ตอนนี้จะได้ 10 ตามตัวอย่างของคุณ
      data
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * คำนวณค่าเฉลี่ยคะแนน CLO ของทั้งกลุ่มเรียน (Section Average) พร้อมสรุปอัตราการสอบผ่านตามเกณฑ์ที่กำหนด
 */
exports.getSectionCloAverage = async (req, res) => {
  try {
    const section_id = Number(req.params.section_id);
    const PASSING_SCORE = 3.0;

    const meta = await baseModel.getSectionMeta(section_id);
    if (!meta) return res.status(404).json({ message: 'Section not found' });

    const clos = await baseModel.getSectionCLOs(section_id);
    const rawScores = await baseModel.getRawStudentScores(section_id);
    const totalStudent = await baseModel.getTotalStudentInSection(section_id);

    const data = cloScoreService.buildSectionAverageResult(clos, rawScores);

    const passed = data.filter(d => d.earned_score >= PASSING_SCORE).length;

    res.json({
      section_id,
      subject_id: meta.subject_id,
      subject_name: meta.subject_name,
      semester: meta.semester,
      year: meta.academic_year,
      type: 'section_average',
      total_clo: data.length,
      total_student: totalStudent,
      passing_rate:
        data.length > 0
          ? Number(((passed / data.length) * 100).toFixed(2))
          : 0,
      data
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * ดึงคะแนน CLO ของนักศึกษาทุกคนในกลุ่มเรียน โดยมีการคำนวณคะแนนสรุปแต่ละ CLO แบบถ่วงน้ำหนัก (Weighted Score)
 */
exports.getStudentCloScoresBySection = async (req, res) => {
  try {
    const section_id = Number(req.params.section_id);
    const meta = await baseModel.getSectionMeta(section_id);
    if (!meta) return res.status(404).json({ message: 'Section not found' });

    const clos = await baseModel.getSectionCLOs(section_id);
    const students = await baseModel.getStudentsInSection(section_id);
    const rawScores = await baseModel.getRawStudentScores(section_id);

    const studentMap = {};
    students.forEach(s => {
      studentMap[s.student_id] = {
        student_id: s.student_id,
        title_th: s.title_th,
        first_name: s.first_name,
        last_name: s.last_name,
        score: {}
      };
      clos.forEach(c => (studentMap[s.student_id].score[c.clo_number] = null));
    });

    const buffer = {};
    rawScores.forEach(r => {
      if (r.student_score === null || Number(r.weight) <= 0) return;
      
      buffer[r.student_id] ??= {};
      buffer[r.student_id][r.clo_number] ??= [];
      buffer[r.student_id][r.clo_number].push({
        score: Number(r.student_score),
        fullScore: Number(r.full_score),
        weight: Number(r.weight)
      });
    });

    Object.entries(buffer).forEach(([sid, cloObj]) => {
      Object.entries(cloObj).forEach(([clo, activities]) => {
        const finalScore = normalizeUtil.weightedCloScore(activities);
        studentMap[sid].score[clo] = finalScore;
      });
    });

    Object.values(studentMap).forEach(stu => {
      const vals = Object.values(stu.score).filter(v => v !== null);
      stu.score.average =
        vals.length > 0
          ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2))
          : null;
    });

    res.json({
      section_id,
      subject_id: meta.subject_id,
      subject_name: meta.subject_name,
      semester: meta.semester,
      year: meta.academic_year,
      clo: Object.fromEntries(clos.map(c => [c.clo_id, c.clo_number])),
      data: Object.values(studentMap)
    });
  } catch {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * ดึงข้อมูลวิชาเดียวกันในหลักสูตรแต่ต่างปีการศึกษา เพื่อใช้ในการเปรียบเทียบแนวโน้มผลการเรียนรู้
 */
exports.getSameSubjectDifferentYears = async (req, res) => {
  const section_id = Number(req.params.section_id);
  const rows = await baseModel.getSameSubjectProgramDifferentYears(section_id);
  res.json({
    base_section_id: section_id,
    data: rows
  });
};

// /**
//  * ดึงคะแนนสรุป PLO ของหลักสูตรแยกตามปีการศึกษาที่ระบุ
//  */
// exports.getProgramPloScoresByYear = async (req, res) => {
//   try {
//     const { program_id, academic_year } = req.params;
//     const result = await cloScoreService.getProgramPloScores(
//       program_id,
//       academic_year
//     );
//     res.json({
//       program_id,
//       academic_year,
//       data: result
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       message: 'Internal server error',
//       error: err.message
//     });
//   }
// };

// /**
//  * ดึงคะแนนสรุป PLO ของหลักสูตรแบบช่วงปีการศึกษา เพื่อดูพัฒนาการของผลลัพธ์การเรียนรู้ในระยะยาว
//  */
// exports.getProgramPloScoresByYearRange = async (req, res) => {
//   try {
//     const { program_id, start_year, end_year } = req.params;
//     const data = await cloScoreService.getProgramPloScoresByYearRange(
//       program_id,
//       start_year,
//       end_year
//     );
//     res.json({
//       program_id,
//       start_year,
//       end_year,
//       data
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       message: 'Internal server error',
//       error: err.message
//     });
//   }
// };

// /**
//  * ดึงคะแนน PLO รายบุคคลของนักศึกษาภายในหลักสูตรและปีการศึกษาที่กำหนด
//  */
// exports.getProgramPloScoresByStudent = async (req, res) => {
//   try {
//     const { program_id, academic_year, student_id } = req.params;
//     const data = await cloScoreService.getProgramPloScoresByStudent(
//       program_id,
//       academic_year,
//       student_id
//     );
//     res.json({
//       program_id,
//       academic_year,
//       student_id,
//       data
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };

// /**
//  * ดึงคะแนนค่าเฉลี่ย PLO ของนักศึกษาทุกคนในหลักสูตร พร้อมข้อมูลรายละเอียด PLO ทั้งหมดที่เกี่ยวข้อง
//  */
// exports.getProgramAllStudentsPloScores = async (req, res) => {
//   try {
//     const { program_id, academic_year } = req.params;
//     const [
//       students,
//       scoreRows,
//       allPlos
//     ] = await Promise.all([
//       programModel.getStudentsByProgram(program_id),
//       programModel.getProgramStudentsPloAvgScores(
//         program_id,
//         academic_year
//       ),
//       programModel.getProgramPLOs(program_id)
//     ]);
//     const result = cloScoreService.buildProgramAllStudentsPloResult(
//       students,
//       scoreRows,
//       allPlos
//     );
//     res.json({
//       program_id,
//       academic_year,
//       students: result
//     });
//   } catch (err) {
//     console.error('[getProgramAllStudentsPloScores]', err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };