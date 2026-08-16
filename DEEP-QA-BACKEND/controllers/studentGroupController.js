// controllers/studentGroupController.js
const studentGroupModel = require('../models/studentGroupModel');
const xlsx = require('xlsx');

/**
 * อัปเดตข้อมูลกลุ่มนักศึกษา (Upsert) ทั้งการเปลี่ยนชื่อกลุ่ม และการเพิ่มหรือนำนักศึกษาออกจากกลุ่ม
 */
exports.updateStudentGroup = async (req, res) => {
  try {
    const { group_id, section_id, group_name, performed_by, students } = req.body;
    if (!section_id || !group_name || !performed_by || !students) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const result = await studentGroupModel.updateStudentGroup({ group_id, section_id, group_name, students, performed_by });

    res.json({
      success: true,
      data: {
        group_id: result.group_id,
        added: result.addResults.map(r => r.student_id),
        removed: result.removeResults.map(r => r.student_id),
        details: { addResults: result.addResults, removeResults: result.removeResults }
      }
    });
  } catch (err) {
    console.error('UpdateStudentGroup Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * ดึงข้อมูลกลุ่มทั้งหมดที่มีอยู่ในกลุ่มเรียน (Section) ที่ระบุ
 */
exports.getAllGroupInSection = async (req, res) => {
  try {
    const { section_id } = req.params;
    if (!section_id) return res.status(400).json({ success: false, error: 'section_id required' });

    const groups = await studentGroupModel.getAllGroupInSection(section_id);
    res.json({ success: true, data: groups });
  } catch (err) {
    console.error('getAllGroupInSection Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * ดึงรายชื่อนักศึกษาทั้งหมดที่อยู่ในกลุ่ม (Group) ที่ระบุ
 */
exports.getStudentInGroup = async (req, res) => {
  try {
    const { group_id } = req.params;
    if (!group_id) return res.status(400).json({ success: false, error: 'group_id required' });

    const students = await studentGroupModel.getStudentInGroup(group_id);
    res.json({ success: true, data: students });
  } catch (err) {
    console.error('getStudentInGroup Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * ลบกลุ่มนักศึกษาออกจากระบบโดยอ้างอิงจากรหัสกลุ่ม
 */
exports.deleteGroup = async (req, res) => {
  try {
    const { group_id, performed_by } = req.body;
    if (!group_id || !performed_by) return res.status(400).json({ success: false, error: 'Missing required fields' });

    const result = await studentGroupModel.deleteGroup({ group_id, performed_by });
    if (!result) return res.status(404).json({ success: false, error: 'Group not found' });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('deleteGroup Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * นำเข้าข้อมูลการจัดกลุ่มนักศึกษาจำนวนมากจากไฟล์ Excel พร้อมตรวจสอบสิทธิ์การลงทะเบียนใน Section และความซ้ำซ้อนของข้อมูล
 */
exports.importStudentGroups = async (req, res) => {
  try {
    const { section_id } = req.body;
    const performed_by = req.user.user_id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!section_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing section_id'
      });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Excel ว่างเปล่า'
      });
    }

    const studentsInSection = new Set(
      await studentGroupModel.getStudentsInSection(section_id)
    );

    const studentsAlreadyInGroup = new Set(
      await studentGroupModel.getStudentsAlreadyInGroup(section_id)
    );

    const errors = [];
    const validatedGroups = [];
    const seenStudentsInFile = new Set();

    rows.forEach((row, index) => {
      const excelRow = index + 2;
      const group_name = row.group_name?.toString().trim();

      if (!group_name) {
        errors.push({
          row: excelRow,
          field: 'group_name',
          error: 'ไม่พบ group_name'
        });
        return;
      }

      const allowedKeys = new Set([
        'group_name',
        ...Array.from({ length: 10 }, (_, i) => `group_member_${i + 1}`)
      ]);

      const extraKeys = Object.keys(row).filter(
        k => !allowedKeys.has(k) && row[k]
      );

      if (extraKeys.length > 0) {
        errors.push({
          row: excelRow,
          group_name,
          error: 'จำนวนสมาชิกในกลุ่มเกิน 10 คน'
        });
        return;
      }

      const students = [];

      for (let i = 1; i <= 10; i++) {
        const col = `group_member_${i}`;
        if (!row[col]) continue;

        const student_id = row[col].toString().trim();

        if (seenStudentsInFile.has(student_id)) {
          errors.push({
            row: excelRow,
            group_name,
            student_id,
            error: 'student_id ซ้ำในไฟล์'
          });
          continue;
        }
        seenStudentsInFile.add(student_id);

        if (!studentsInSection.has(student_id)) {
          errors.push({
            row: excelRow,
            group_name,
            student_id,
            error: 'นักเรียนไม่ได้ลงทะเบียนใน section นี้'
          });
          continue;
        }

        if (studentsAlreadyInGroup.has(student_id)) {
          errors.push({
            row: excelRow,
            group_name,
            student_id,
            error: 'นักเรียนอยู่ใน group อื่นแล้ว'
          });
          continue;
        }

        students.push({ student_id });
      }

      validatedGroups.push({
        row: excelRow,
        group_name,
        students
      });
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors
      });
    }

    const results = [];

    for (const g of validatedGroups) {
      const result = await studentGroupModel.updateStudentGroup({
        section_id,
        group_name: g.group_name,
        students: g.students,
        performed_by
      });

      results.push({
        group_name: g.group_name,
        added: result.addResults.length
      });
    }

    return res.json({
      success: true,
      message: results
    });

  } catch (err) {
    console.error('ImportStudentGroups Error:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * ดึงประวัติกิจกรรม (Logs) ของการจัดการกลุ่มนักศึกษาภายในกลุ่มเรียนที่ระบุ
 */
exports.getLogsBySection = async (req, res) => {
  try {
    const { section_id } = req.params;

    if (!section_id) {
      return res.status(400).json({
        success: false,
        message: 'section_id is required',
      });
    }

    const logs = await studentGroupModel.getLogsBySection(section_id);

    return res.status(200).json({
      success: true,
      data: logs,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};