// controllers/studentCourseController.js
const studentCourseModel = require('../models/studentCourseModel');
const xlsx = require('xlsx');

/**
 * เพิ่มนักศึกษาเข้าสู่กลุ่มเรียน (Section) ที่ระบุ
 */
exports.addStudentToSection = async (req, res) => {
  try {
    const { student_id, section_id } = req.body;
    if (!student_id || !section_id) return res.status(400).json({ error: 'student_id and section_id are required' });

    const added = await studentCourseModel.addStudentToSection({ student_id, section_id });
    res.json({ success: true, data: added });
  } catch (err) {
    console.error('addStudentToSection Error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

/**
 * ดึงรายชื่อนักศึกษาทั้งหมดที่ลงทะเบียนในกลุ่มเรียน (Section) ที่ระบุ
 */
exports.getStudentsInSection = async (req, res) => {
  try {
    const { section_id } = req.params;
    if (!section_id) {
      return res.status(400).json({
        success: false,
        message: 'section_id is required',
      });
    }

    const students = await studentCourseModel.getStudentsInSections(section_id);

    res.json({
      success: true,
      data: students,
    });
  } catch (err) {
    console.error('getStudentsInSection Error:', err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * นำเข้าข้อมูลนักศึกษาเข้าสู่กลุ่มเรียนจำนวนมากจากไฟล์ Excel พร้อมตรวจสอบความถูกต้องของข้อมูลและป้องกันการลงทะเบียนซ้ำ
 */
exports.importStudentsToSection = async (req, res) => {
  try {
    const { section_id } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is required'
      });
    }

    if (!section_id) {
      return res.status(400).json({
        success: false,
        message: 'section_id is required'
      });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Excel is empty'
      });
    }

    const errors = [];
    const seenStudentIds = new Set();

    for (let i = 0; i < rows.length; i++) {
      const excelRow = i + 2; 
      const row = rows[i];

      const student_id = row.student_id?.toString().trim();
      const first_name = row.first_name_th?.toString().trim();
      const last_name = row.last_name_th?.toString().trim();

      if (!student_id || !first_name || !last_name) {
        errors.push({
          row: excelRow,
          student_id: student_id ?? null,
          error: 'Missing student_id / first_name / last_name'
        });
        continue;
      }

      if (seenStudentIds.has(student_id)) {
        errors.push({
          row: excelRow,
          student_id,
          error: 'Duplicate student in Excel file'
        });
        continue;
      }
      seenStudentIds.add(student_id);

      const validStudent = await studentCourseModel.checkStudentInDB(
        student_id,
        first_name,
        last_name
      );

      if (!validStudent) {
        errors.push({
          row: excelRow,
          student_id,
          error: 'ID/name mismatch'
        });
        continue;
      }

      const alreadyInSection =
        await studentCourseModel.checkStudentInSection(
          student_id,
          section_id
        );

      if (alreadyInSection) {
        errors.push({
          row: excelRow,
          student_id,
          error: 'Duplicate student in section'
        });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors
      });
    }

    for (const row of rows) {
      const student_id = row.student_id.toString().trim();
      await studentCourseModel.addStudentToSection({
        student_id,
        section_id
      });
    }

    return res.json({
      success: true,
      message: {
        section_id
      }
    });

  } catch (err) {
    console.error('importStudentsToSection Error:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * ลบนักศึกษาออกจากกลุ่มเรียน โดยจะตรวจสอบก่อนว่านักศึกษามีการผูกกับกลุ่มกิจกรรม (Group) ใดๆ อยู่หรือไม่
 */
exports.deleteStudentFromSection = async (req, res) => {
  try {
    const { student_id, section_id } = req.body;

    if (!student_id || !section_id) {
      return res.status(400).json({ success: false, error: 'student_id and section_id are required' });
    }

    const groups = await studentCourseModel.getStudentGroups(student_id, section_id);
    if (groups.length > 0) {
      const groupNames = groups.map(g => g.group_name);
      return res.status(400).json({
        success: false,
        error: `Cannot delete student ${student_id} because they belong to group(s): ${groupNames.join(', ')}`
      });
    }

    const deleted = await studentCourseModel.deleteStudentFromSection(student_id, section_id);

    res.json({
      success: true,
      message: `Student ${student_id} removed from section ${section_id}`,
      data: deleted
    });

  } catch (err) {
    console.error('deleteStudentFromSection Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};