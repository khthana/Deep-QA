// controllers/studentController.js
const studentModel = require("../models/studentModel");
const departmentModel = require('../models/departmentModel');
const programModel = require('../models/programsModel');
const userController = require('../controllers/userController');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * ดึงข้อมูลนักศึกษาตามปีที่เข้าเรียน (Admission Year)
 */
exports.getStudentFromAdmissionYear = async (req, res) => {
  try {
    const { year } = req.params

    if (!year) {
      return res.status(400).json({
        message: 'Admission year is required'
      })
    }

    const students = await studentModel.getStudentFromAdmissionYear(year)

    return res.status(200).json({
      success: true,
      message: students.length,
      data: students
    })

  } catch (error) {
    console.error('Error fetching students by admission year:', error)
    return res.status(500).json({
      message: 'Internal server error'
    })
  }
}

/**
 * สร้างข้อมูลนักศึกษาใหม่รายบุคคลเข้าสู่ระบบ
 */
exports.createStudent = async (req, res) => {
  try {
    const student = await studentModel.createStudent(req.body);
    res.status(201).json({ message: 'Student created successfully', student });
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

/**
 * นำเข้าข้อมูลนักศึกษาจำนวนมากจากไฟล์ Excel พร้อมตรวจสอบความถูกต้องของภาควิชา สาขาวิชา และคำนวณปีที่เข้าเรียนอัตโนมัติ
 */
exports.importStudents = async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'Please upload a file' });

  try {
    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      safeUnlink(file.path);
      return res.status(400).json({ message: 'Excel file is empty' });
    }

    const REQUIRED_KEYS = ['ชื่อภาควิชา', 'ชื่อสาขาวิชา', 'รหัสนักศึกษา', 'ชื่อ', 'นามสกุล'];

    for (const key of REQUIRED_KEYS) {
      if (!rows[0].hasOwnProperty(key)) {
        safeUnlink(file.path);
        return res.status(400).json({ message: `Missing required column: ${key}` });
      }
    }

    const departmentName = rows[0]['ชื่อภาควิชา'];
    const programName = rows[0]['ชื่อสาขาวิชา'];

    const invalidRow = rows.find(row =>
      row['ชื่อภาควิชา'] !== departmentName || row['ชื่อสาขาวิชา'] !== programName
    );
    if (invalidRow) {
      safeUnlink(file.path);
      return res.status(400).json({ message: 'ชื่อภาควิชา หรือ ชื่อสาขาวิชา ไม่ตรงกันในไฟล์' });
    }

    const department = await departmentModel.findByName(departmentName);
    const program = await programModel.findByName(programName);

    if (!department || !program) {
      safeUnlink(file.path);
      return res.status(400).json({ message: 'ไม่พบภาควิชา หรือ สาขาวิชาในฐานข้อมูล' });
    }

    let insertedCount = 0;

    for (const row of rows) {
      const exists = await studentModel.existsStudentById(row['รหัสนักศึกษา']);
      if (exists) continue;

      const firstTwoDigits = row['รหัสนักศึกษา'].toString().slice(0, 2);
      const admissionYear = 2500 + parseInt(firstTwoDigits, 10);

      const student = {
        student_id: row['รหัสนักศึกษา'],
        first_name_th: row['ชื่อ'],
        last_name_th: row['นามสกุล'],
        department_id: department.department_id,
        program_id: program.program_id,
        admission_year: admissionYear,
      };

      await studentModel.insertStudent(student);
      insertedCount++;
    }

    safeUnlink(file.path);

    return res.json({ message: `นำเข้าข้อมูลนักศึกษาเรียบร้อย จำนวน ${insertedCount} คน` });
  } catch (error) {
    console.error('Import error:', error);
    safeUnlink(file.path);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล', error: error.message });
  }
};

/**
 * ลบไฟล์ออกจากระบบจัดเก็บข้อมูลชั่วคราวอย่างปลอดภัย
 */
function safeUnlink(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Error deleting file:', err);
  }
}

/**
 * ดึงรายชื่อนักศึกษาทั้งหมดที่สังกัดอยู่ในภาควิชา (Department) ที่ระบุ
 */
exports.getStudentsByDepartmentId = async (req, res) => {
  try {
    const { department_id } = req.body;
    if (!department_id) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุ department_id' });
    }

    const students = await studentModel.getStudentsByDepartmentId(department_id);
    return res.status(200).json({ success: true, data: students });

  } catch (error) {
    console.error('Error getting students by department_id:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ดึงรายชื่อนักศึกษาตามรหัสหลักสูตร (Program ID) พร้อมรายละเอียดชื่อภาควิชาและชื่อหลักสูตรทั้งภาษาไทยและอังกฤษ
 */
exports.getStudentsByProgramId = async (req, res) => {
  try {
    const { program_id } = req.body;
    if (!program_id) return res.status(400).json({ success: false, message: 'กรุณาระบุ program_id' });

    const students = await studentModel.getStudentsByProgramId(program_id);

    const studentsWithNames = await Promise.all(students.map(async (student) => {
      const dept = await departmentModel.getDepartmentById(student.department_id);
      const prog = await programModel.getProgramById(student.program_id);

      return {
        ...student,
        department_name_th: dept?.department_name_th || null,
        department_name_en: dept?.department_name_en || null,
        program_name_th: prog?.program_name_th || null,
        program_name_en: prog?.program_name_en || null
      };
    }));

    return res.status(200).json({ success: true, data: studentsWithNames });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};