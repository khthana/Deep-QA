// controllers/departmentController.js
const departmentModel = require("../models/departmentModel");
const facultyModel = require('../models/facultyModel');
const XLSX = require('xlsx');

/**
 * สร้างภาควิชาใหม่ (Department) พร้อมตรวจสอบการซ้ำของ ID และชื่อ รวมถึงรองรับการ Reactivate หากเคยถูกลบไปแล้ว
 */
exports.createDepartment = async (req, res) => {
  try {
    const { department_id, department_name_en, department_name_th, faculty_id } = req.body;

    if (!department_id || !department_name_en || !department_name_th || !faculty_id) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    const existingById = await departmentModel.existsDepartmentById(department_id);
    if (existingById) {
      if (!existingById.is_active) {
        if (
          existingById.department_name_en === department_name_en &&
          existingById.department_name_th === department_name_th
        ) {
          await departmentModel.reactivateDepartment(department_id);
          return res.status(200).json({ message: 'Department reactivated successfully.' });
        } else {
          return res.status(400).json({ message: 'Department ID exists but names do not match.' });
        }
      }
      return res.status(409).json({ message: 'Department ID already active.' });
    }

    const existingByName = await departmentModel.findByName(department_name_en, department_name_th);
    if (existingByName && existingByName.is_active) {
      return res.status(409).json({ message: 'Department name already exists.' });
    }

    const newDepartment = await departmentModel.createDepartment({
      department_id,
      department_name_en,
      department_name_th,
      faculty_id,
      is_active: true,
    });

    return res.status(201).json({
      message: 'Department created successfully',
      department: newDepartment,
    });
  } catch (error) {
    console.error('Error creating department:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * ดึงข้อมูลภาควิชาทั้งหมดที่มีสถานะการใช้งานเป็นปกติ (Active)
 */
exports.getDepartments = async (req, res) => {
  try {
    const departments = await departmentModel.getAllDepartments();
    res.status(200).json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * ดึงข้อมูลภาควิชาทั้งหมดที่ถูกระงับการใช้งาน (is_active = false)
 */
exports.getDepartmentsFalse = async (req, res) => {
  try {
    const departments = await departmentModel.getAllDepartmentsIs_activeFalse();
    res.status(200).json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * ดึงข้อมูลรายละเอียดของภาควิชาตามรหัส ID ที่ระบุ
 */
exports.getDepartmentById = async (req, res) => {
  try {
    const { department_id } = req.body;
    const department = await departmentModel.getDepartmentById(department_id);
    res.status(200).json(department);
  } catch (error) {
    console.error('Error fetching department by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * ดึงรายชื่อภาควิชาทั้งหมดที่สังกัดอยู่ภายใต้คณะ (Faculty) ที่ระบุ
 */
exports.getDepartmentByFacultyId = async (req, res) => {
  try {
    const { faculty_id } = req.body;

    if (!faculty_id) {
      return res.status(400).json({ message: 'faculty_id is required' });
    }

    const departments = await departmentModel.getDepartmentByFacultyId(faculty_id);
    return res.status(200).json(departments);
  } catch (error) {
    console.error('Error fetching departments by faculty_id:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * แก้ไขข้อมูลภาควิชา เช่น ชื่อภาษาไทย/อังกฤษ สถานะการใช้งาน หรือคณะที่สังกัด
 */
exports.updateDepartment = async (req, res) => {
  try {
    const { department_id, department_name_th, department_name_en, is_active, faculty_id} = req.body;
    const updated = await departmentModel.updateDepartment(department_id, {
      department_name_th,
      department_name_en,
      is_active,
      faculty_id
    });

    if (!updated) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.status(200).json({ message: 'Department updated successfully', department: updated });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * ลบภาควิชาออกจากระบบ หรือเปลี่ยนเป็นสถานะ Inactive หากมีการใช้งานข้อมูลอยู่ในส่วนอื่น
 */
exports.deleteDepartment = async (req, res) => {
  try {
    const { department_id } = req.body;
    const result = await departmentModel.deleteDepartment(department_id);

    if (result.status === 'forbidden') {
      // ส่ง status 400 หรือ 409 พร้อมข้อความแจ้งเตือน
      return res.status(400).json({ 
        message: `ไม่สามารถลบได้ เนื่องจากภาควิชานี้ถูกใช้งานอยู่ในระบบ (${result.usageCount} รายการ)` 
      });
    }

    return res.status(200).json({ message: 'ลบข้อมูลแผนกเรียบร้อยแล้ว' });

  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};

/**
 * นำเข้าข้อมูลภาควิชาจากไฟล์ Excel พร้อมระบบตรวจสอบความถูกต้องของข้อมูล (Validation) รายบรรทัด
 */
exports.importDepartments = async (req, res) => {
  try {
    const { scope: faculty_id } = req.body;

    if (!faculty_id) {
      return res.status(400).json({
        success: false,
        message: [{ row: null, error: 'กรุณาระบุ scope (faculty_id)' }]
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: [{ row: null, error: 'กรุณาอัปโหลดไฟล์ Excel' }]
      });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const errors = [];
    const validatedRows = [];

    for (let i = 0; i < sheetData.length; i++) {
      const row = sheetData[i];
      const rowNumber = i + 2;

      const department_id = row.department_id?.toString().trim();
      const department_name_en = row.department_name_en?.toString().trim();
      const department_name_th = row.department_name_th?.toString().trim();

      if (!department_id || !department_name_en || !department_name_th) {
        errors.push({
          row: rowNumber,
          error: 'ข้อมูลไม่ครบ'
        });
        continue;
      }

      if (!/^\d{1,2}$/.test(department_id)) {
        errors.push({
          row: rowNumber,
          error: 'department_id ต้องเป็นตัวเลขไม่เกิน 2 หลัก'
        });
        continue;
      }

      const facultyExists = await facultyModel.getFacultyById(faculty_id);
      if (!facultyExists) {
        errors.push({
          row: rowNumber,
          error: 'faculty_id (scope) ไม่พบในระบบ'
        });
        continue;
      }

      const existingById = await departmentModel.existsDepartmentById(department_id);
      if (existingById) {
        if (
          existingById.is_active ||
          existingById.department_name_en !== department_name_en ||
          existingById.department_name_th !== department_name_th
        ) {
          errors.push({
            row: rowNumber,
            error: 'department_id ซ้ำหรือข้อมูลไม่ตรงกับของเดิม'
          });
          continue;
        }
      }

      const existingByName = await departmentModel.findByName(
        department_name_en,
        department_name_th
      );
      if (existingByName && existingByName.is_active) {
        errors.push({
          row: rowNumber,
          error: 'ชื่อซ้ำกับ department ที่ active อยู่แล้ว'
        });
        continue;
      }

      validatedRows.push({
        department_id,
        department_name_en,
        department_name_th,
        faculty_id
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors
      });
    }

    const insertedDepartments = [];

    for (const row of validatedRows) {
      const existing = await departmentModel.existsDepartmentById(row.department_id);

      if (existing && !existing.is_active) {
        await departmentModel.reactivateDepartment(row.department_id);
      } else {
        await departmentModel.createDepartment({
          ...row,
          is_active: true
        });
      }

      insertedDepartments.push({
        department_id: row.department_id,
        department_name_th: row.department_name_th,
        department_name_en: row.department_name_en
      });
    }

    return res.status(200).json({
      success: true,
      message: insertedDepartments
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: [{ row: null, error: err.message }]
    });
  }
};