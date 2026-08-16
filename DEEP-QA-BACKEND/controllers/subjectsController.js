// controllers/subjectsController.js
const XLSX = require('xlsx')
const subjectModel = require('../models/subjectsModel')
const userModel = require('../models/userModel')
const departmentModel = require('../models/departmentModel')

/**
 * สร้างรายวิชาใหม่ (Subject) เข้าสู่ระบบ
 */
exports.createSubject = async (req, res) => {
  try {
    const newSubject = await subjectModel.createSubject(req.body)
    res.status(201).json({
      message: 'Subject created successfully',
      data: newSubject,
    })
  } catch (error) {
    console.error('Error creating subject:', error)
    res.status(500).json({ message: 'Failed to create subject' })
  }
}

/**
 * ดึงข้อมูลรายวิชาทั้งหมดที่มีอยู่ในระบบ
 */
exports.getAllSubjects = async (req, res) => {
  try {
    const subjects = await subjectModel.getAllSubjects()
    res.status(200).json({ success: true, data: subjects })
  } catch (error) {
    console.error('Error fetching subjects:', error)
    res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
}

/**
 * อัปเดตข้อมูลรายวิชา โดยมีการตรวจสอบตัวตนผู้แก้ไขและข้อมูลภาควิชาที่เกี่ยวข้อง
 */
exports.updateSubject = async (req, res) => {
  try {
    const {
      subject_id,
      subject_name_en,
      subject_name_th,
      credits,
      description_th,
      description_en,
      email,
      department,
    } = req.body

    if (!subject_id || !email) {
      return res
        .status(400)
        .json({ success: false, message: 'subject_id และ email ต้องระบุ' })
    }

    const user = await userModel.findUserByEmail(email)
    const dept = await departmentModel.getDepartmentById(department)

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: `ไม่พบผู้ใช้งานจาก email: ${email}` })
    }

    const updated_by = user.user_id
    const department_id = dept.department_id

    const checkSubject = await subjectModel.updateSubject({
      subject_id,
      subject_name_en,
      subject_name_th,
      credits,
      description_th,
      description_en,
      updated_by,
      department_id,
    })

    res.status(200).json({ success: true, data: checkSubject })
  } catch (error) {
    console.error('Error updating subject:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * ดึงข้อมูลรายละเอียดของรายวิชาตามรหัสวิชา (subject_id) ที่ระบุ
 */
exports.getSubjectsById = async (req, res) => {
  try {
    const { subjects_id } = req.body
    const subjects = await subjectModel.getSubjectById(subjects_id)
    res.status(200).json(subjects)
  } catch (error) {
    console.error('Error fetching subjects by ID:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

/**
 * ดึงข้อมูลรายวิชาทั้งหมดที่สังกัดอยู่ในภาควิชา (Department) ที่ระบุ
 */
exports.getSubjectsByDepartmentId = async (req, res) => {
  try {
    const { department_id } = req.body
    const subjects = await subjectModel.getSubjectsByDepartmentId(department_id)
    res.status(200).json(subjects)
  } catch (error) {
    console.error('Error fetching subjects by ID:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

/**
 * ลบรายวิชาออกจากระบบ
 */
exports.deleteSubject = async (req, res) => {
  try {
    const { subject_id } = req.body;

    if (!subject_id) {
      return res.status(400).json({ error: 'subject_id is required' });
    }

    const result = await subjectModel.deleteSubject(subject_id);
    res.json(result);

  } catch (err) {
    console.error('Error in deleteSubject:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * นำเข้าข้อมูลรายวิชาจำนวนมากจากไฟล์ Excel พร้อมตรวจสอบความถูกต้องของข้อมูลและป้องกันการซ้ำซ้อนของรหัสวิชา
 */
exports.importSubject = async (req, res) => {
  try {
    const { department_id } = req.body;
    const user_id = req.user?.user_id; // ดึงจาก middleware auth

    // 1. Validation เบื้องต้น
    if (!user_id || !department_id) {
      return res.status(400).json({
        success: false,
        message: `กรุณาระบุข้อมูลให้ครบถ้วน (user_id: ${user_id}, dept_id: ${department_id})`
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาอัปโหลดไฟล์ Excel (.xlsx หรือ .xls)'
      });
    }

    // 2. ตรวจสอบว่า Department มีอยู่จริงหรือไม่
    const dept = await departmentModel.getDepartmentById(department_id.toString().trim());
    if (!dept) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลภาควิชา (Department) ในระบบ'
      });
    }

    // 3. อ่านไฟล์ Excel
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'ไฟล์ Excel ไม่มีข้อมูล'
      });
    }

    const errors = [];
    const validatedRows = [];
    const seenSubjectIds = new Set();

    // 4. วนลูปตรวจสอบข้อมูลในแต่ละแถว (Validation Loop)
    for (let i = 0; i < rows.length; i++) {
      const excelRow = i + 2; // แถวที่ใน Excel (เริ่มนับ 1 + header)
      const row = rows[i];

      const subject_id = row.subject_id?.toString().trim();
      const subject_name_en = row.subject_name_en?.toString().trim();
      const subject_name_th = row.subject_name_th?.toString().trim();
      const credits = row.credit; // หรือใช้ row.credits ตามหัวตาราง Excel

      // เช็คค่าว่าง
      if (!subject_id || !subject_name_en || !subject_name_th || credits === null) {
        errors.push({
          row: excelRow,
          subject_id: subject_id || 'N/A',
          error: 'ข้อมูลบังคับไม่ครบ (รหัสวิชา, ชื่อไทย, ชื่ออังกฤษ, หน่วยกิต)'
        });
        continue;
      }

      // เช็ค ID ซ้ำภายในไฟล์เดียวกัน
      if (seenSubjectIds.has(subject_id)) {
        errors.push({
          row: excelRow,
          subject_id,
          error: 'รหัสวิชานี้ซ้ำกับแถวอื่นในไฟล์ Excel'
        });
        continue;
      }
      seenSubjectIds.add(subject_id);

      validatedRows.push({
        row: excelRow,
        subject_id,
        subject_name_en,
        subject_name_th,
        credits: parseInt(credits, 10),
        description_th: row.description_th || null,
        description_en: row.description_en || null
      });
    }

    // 5. ถ้ามี Error ในไฟล์ ให้ตีกลับทันที ไม่ทำรายการต่อ
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'พบข้อผิดพลาดในไฟล์ Excel',
        errors: errors
      });
    }

    // 6. บันทึกข้อมูล (Process Loop - Upsert)
    const importResults = [];

    for (const r of validatedRows) {
      // เรียกใช้ฟังก์ชัน upsertSubject ที่เราเพิ่มใน Model
      const result = await subjectModel.upsertSubject({
        subject_id: r.subject_id,
        subject_name_en: r.subject_name_en,
        subject_name_th: r.subject_name_th,
        credits: r.credits,
        description_th: r.description_th,
        description_en: r.description_en,
        department_id: department_id.toString().trim(),
        created_by: user_id,
        updated_by: user_id
      });

      importResults.push({
        row: r.row,
        subject_id: r.subject_id,
        status: result.action === 'insert' ? 'เพิ่มใหม่' : 'อัปเดตข้อมูลเดิม'
      });
    }

    return res.status(200).json({
      success: true,
      message: `นำเข้าสำเร็จทั้งหมด ${importResults.length} รายการ`,
      details: importResults
    });

  } catch (err) {
    console.error('Error during subject import:', err);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์: ' + err.message
    });
  }
};