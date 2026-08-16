// controllers/programsController.js
const programsModel = require("../models/programsModel");
const XLSX = require('xlsx');
const departmentModel = require('../models/departmentModel');

/**
 * สร้างหลักสูตรใหม่ (Program) พร้อมระบบตรวจสอบ ID และชื่อซ้ำ รวมถึงการคืนค่าสถานะ (Reactivate) หากเคยถูกลบ
 */
exports.createProgram = async (req, res) => {
  try {
    const { program_id, program_name_en, program_name_th, department_id, year } = req.body;

    if (!program_id || !program_name_en || !program_name_th || !department_id || !year) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' });
    }

    const existingById = await programsModel.existsProgramById(program_id);
    
    if (existingById) {
      if (!existingById.is_active) {
        if (
          existingById.program_name_en === program_name_en &&
          existingById.program_name_th === program_name_th &&
          existingById.year === year
        ) {
          await programsModel.reactivateProgram(program_id);
          return res.status(200).json({ message: 'หลักสูตรนี้มีการใช้งานอยู่ในระบบแล้ว' });
        } else {
          return res.status(400).json({ message: 'รหัสหลักสูตรนี้มีอยู่ในระบบแล้ว (แต่ข้อมูลไม่ตรงกับรายการที่เคยลบ)' });
        }
      }
      return res.status(409).json({ message: 'หลักสูตรนี้มีการใช้งานอยู่ในระบบแล้ว' });
    }

    // 3. ตรวจสอบชื่อซ้ำ "เฉพาะในปีเดียวกัน"
    const existingByNameAndYear = await programsModel.findByNameAndYear(program_name_en, program_name_th, year);
    
    if (existingByNameAndYear && existingByNameAndYear.is_active) {
      return res.status(409).json({ 
        message: `ชื่อหลักสูตรนี้มีอยู่แล้วในปีการศึกษา ${year}` 
      });
    }

    // 4. บันทึกข้อมูลใหม่
    const newProgram = await programsModel.createProgram({
      program_id,
      program_name_en,
      program_name_th,
      department_id,
      year,
      is_active: true,
    });

    return res.status(201).json({
      message: 'สร้างหลักสูตรใหม่สำเร็จ',
      program: newProgram,
    });

  } catch (error) {
    console.error('Error creating program:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
};

/**
 * ดึงข้อมูลหลักสูตรทั้งหมดที่มีอยู่ในระบบ
 */
exports.getPrograms = async (req, res) => {
  try {
    const program = await programsModel.getAllPrograms();
    res.status(200).json(program);
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * ดึงข้อมูลหลักสูตรตามรหัส ID ที่ระบุ
 */
exports.getProgramsById= async (req, res) => {
  try {
    const { program_id } = req.body; 
    const program = await programsModel.getProgramById(program_id);
    res.status(200).json(program);
  } catch (error) {
    console.error('Error fetching program by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * ดึงข้อมูลหลักสูตรทั้งหมดที่สังกัดอยู่ภายใต้ภาควิชา (Department) ที่ระบุ
 */
exports.getProgramsByDepartmentId= async (req, res) => {
  try {
    const { department_id } = req.body; 
    const program = await programsModel.getProgramsByDepartmentId(department_id);
    res.status(200).json(program);
  } catch (error) {
    console.error('Error fetching program by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * อัปเดตข้อมูลหลักสูตร เช่น ชื่อภาษาไทย/อังกฤษ ภาควิชาที่สังกัด ปีการศึกษา และสถานะการใช้งาน
 */
exports.updateProgram = async (req, res) => {
  try {
    const {
      program_id,
      program_name_th,
      program_name_en,
      department_id,
      year,
      is_active
    } = req.body;

    const currentProgram = await programsModel.existsProgramById(program_id);
    if (!currentProgram) {
      return res.status(404).json({ message: 'ไม่พบรหัสหลักสูตรนี้ในระบบ' });
    }

    const existingByName = await programsModel.findByNameAndYear(program_name_en, program_name_th, year);
    
    if (
      existingByName && 
      existingByName.program_id !== program_id && 
      existingByName.is_active
    ) {
      return res.status(409).json({ 
        message: `ไม่สามารถอัปเดตได้เนื่องจากชื่อนี้มีอยู่แล้วในปีการศึกษา ${year}` 
      });
    }

    const updated = await programsModel.updateProgram(program_id, {
      program_name_th,
      program_name_en,
      department_id,
      year,
      is_active
    });

    res.status(200).json({ message: 'อัปเดตข้อมูลหลักสูตรสำเร็จ', program: updated });
  } catch (error) {
    console.error('Error updating program:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
};

/**
 * ลบหลักสูตรออกจากระบบ  หากข้อมูลมีการเชื่อมโยงกับส่วนอื่น
 */
exports.deleteProgram = async (req, res) => {
  try {
    const { program_id } = req.body;
    const result = await programsModel.deleteProgram(program_id);

    if (result.status === 'forbidden') {
      // ส่ง 400 Bad Request หรือ 409 Conflict
      return res.status(400).json({ 
        message: `ไม่สามารถลบได้ เนื่องจากหลักสูตรนี้ถูกใช้งานอยู่ในระบบ (${result.usageCount} รายการ)` 
      });
    }

    return res.status(200).json({ message: 'ลบหลักสูตรเรียบร้อยแล้ว' });

  } catch (error) {
    console.error('Error deleting program:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};

/**
 * ดึงข้อมูลหลักสูตรตามระดับสิทธิ์ของผู้ใช้งาน (Role) และขอบเขตข้อมูลที่รับผิดชอบ (Scope)
 */
exports.getProgramByRole = async (req, res) => {
  try {
    const { role_id, scope_id } = req.body;
    let programs = [];

    if (role_id === "FACULTY_ADMIN") {
      programs = await programsModel.getAllPrograms();
    } else if (role_id === "DEPT_ADMIN") {
      programs = await programsModel.getProgramsByDepartmentId(scope_id);
    } else if (role_id === "PROG_MANAGER") {
      const program = await programsModel.getProgramById(scope_id);
      programs = program ? [program] : [];
    } else {
      return res.status(400).json({ message: "Invalid role_id" });
    }

    const filteredPrograms = programs.map(program => ({
      program_id: program.program_id,
      program_name_th: program.program_name_th,
      program_name_en: program.program_name_en,
      department_id : program.department_id,
      program_year :  program.year
    }));

    return res.status(200).json(filteredPrograms);

  } catch (error) {
    console.error("Error in getProgramByRole:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/**
 * นำเข้าข้อมูลหลักสูตรจำนวนมากจากไฟล์ Excel พร้อมระบบตรวจสอบความถูกต้องและป้องกันข้อมูลซ้ำซ้อน
 */
exports.importPrograms = async (req, res) => {
  try {
    const { department_id } = req.body;

    if (!department_id) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ department_id'
      });
    }

    const dept = await departmentModel.getDepartmentById(
      department_id.toString().trim()
    );
    if (!dept) {
      return res.status(400).json({
        success: false,
        message: 'department_id ไม่พบในระบบ'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาอัปโหลดไฟล์ Excel'
      });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Excel ว่างเปล่า'
      });
    }

    const errors = [];
    const seenProgramIds = new Set();
    const validatedRows = [];

    for (let i = 0; i < rows.length; i++) {
      const excelRow = i + 2;
      const row = rows[i];

      const program_id = row.program_id?.toString().trim();
      const program_name_en = row.program_name_en?.toString().trim();
      const program_name_th = row.program_name_th?.toString().trim();
      const year = row.year?.toString().trim();

      if (!program_id || !program_name_en || !program_name_th || !year) {
        errors.push({
          row: excelRow,
          program_id: program_id ?? null,
          error: 'ข้อมูลไม่ครบ'
        });
        continue;
      }

      if (seenProgramIds.has(program_id)) {
        errors.push({
          row: excelRow,
          program_id,
          error: 'program_id ซ้ำในไฟล์'
        });
        continue;
      }
      seenProgramIds.add(program_id);

      const existingById = await programsModel.existsProgramById(program_id);
      if (existingById) {
        if (existingById.is_active) {
          errors.push({
            row: excelRow,
            program_id,
            error: 'program_id ซ้ำและ active อยู่แล้ว'
          });
          continue;
        } else {
          if (
            existingById.program_name_en !== program_name_en ||
            existingById.program_name_th !== program_name_th
          ) {
            errors.push({
              row: excelRow,
              program_id,
              error: 'program_id ซ้ำแต่ชื่อไม่ตรง'
            });
            continue;
          }
        }
      }

      const existingByName = await programsModel.findByNameAndYear(
        program_name_en,
        program_name_th,
        year
      );
      if (
        existingByName &&
        existingByName.is_active &&
        existingByName.program_id !== program_id
      ) {
        errors.push({
          row: excelRow,
          program_id,
          error: 'ชื่อซ้ำกับ program active อยู่แล้ว'
        });
        continue;
      }

      validatedRows.push({
        row: excelRow,
        program_id,
        program_name_en,
        program_name_th,
        department_id: department_id.toString().trim(),
        year
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors
      });
    }

    const results = [];

    for (const r of validatedRows) {
      const existing = await programsModel.existsProgramById(r.program_id);

      if (existing && !existing.is_active) {
        await programsModel.reactivateProgram(r.program_id);
        results.push({
          row: r.row,
          program_id: r.program_id,
          status: 'reactivate'
        });
      } else {
        await programsModel.createProgram({
          program_id: r.program_id,
          program_name_en: r.program_name_en,
          program_name_th: r.program_name_th,
          department_id: r.department_id,
          year: r.year,
          is_active: true
        });
        results.push({
          row: r.row,
          program_id: r.program_id,
          status: 'insert'
        });
      }
    }

    return res.json({
      success: true,
      message: results
    });

  } catch (err) {
    console.error('Error importing programs:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};