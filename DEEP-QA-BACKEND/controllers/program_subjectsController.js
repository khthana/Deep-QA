// controllers/programSubjectController.js
const departmentModel = require('../models/departmentModel')
const programModel = require('../models/programsModel');
const programSubjectModel = require('../models/program_subjectsModel')
const subjectPloMappingModel = require('../models/subjectPloMappingModel')
const learningOutcomeModel = require('../models/learningOutcomeModel')
const userModel = require('../models/userModel')
const subjectModel = require('../models/subjectsModel')
const XLSX = require('xlsx')

const SUBJECT_TYPE_ENUM = ['required', 'elective']

/**
 * เพิ่มรายวิชาเข้าสู่หลักสูตร (Program Subject) พร้อมสร้าง placeholder สำหรับการแมป PLO
 */
exports.createProgramSubject = async (req, res) => {
  try {
    const { email, program_id, subject_id, subject_type } = req.body

    if (!email || !program_id || !subject_id || !subject_type) {
      return res
        .status(400)
        .json({
          message: 'กรุณาระบุ email, program_id, subject_id และ subject_type',
        })
    }

    const mappedType = SUBJECT_TYPE_ENUM.find(
      (t) => t.toLowerCase() === subject_type.toLowerCase(),
    )
    if (!mappedType) {
      return res
        .status(400)
        .json({
          message: `subject_type ต้องเป็น: ${SUBJECT_TYPE_ENUM.join(', ')}`,
        })
    }

    const user = await userModel.findUserByEmail(email)
    if (!user) {
      return res
        .status(404)
        .json({ message: 'ไม่พบผู้ใช้งานจาก email ที่ระบุ' })
    }

    const subject = await subjectModel.getSubjectById(subject_id)
    if (!subject) {
      return res
        .status(404)
        .json({ message: `ไม่พบ subject_id: ${subject_id}` })
    }

    const payload = {
      program_id,
      subject_id: subject.subject_id,
      subject_type: mappedType,
      created_by: user.user_id,
      updated_by: user.user_id,
    }

    const newProgramSubject = await programSubjectModel.createProgramSubject(
      payload,
    )

    const mapping = await subjectPloMappingModel.createPloMapping({
      program_id,
      outcome_id: null,
      subject_id: subject.subject_id,
      mapping_level: 'E',
      created_by: user.user_id,
      updated_by: user.user_id,
    })

    return res.status(201).json({
      success: true,
      message: 'Program subject created and placeholder PLO mapping prepared',
      data: {
        program_subject: newProgramSubject,
        mapping,
      },
    })
  } catch (error) {
    console.error('Error creating program subject:', error)
    return res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * อัปเดตข้อมูลรายวิชาในหลักสูตร เช่น ประเภทวิชา (Required/Elective) หรือสถานะการใช้งาน
 */
exports.updateProgramSubject = async (req, res) => {
  try {
    const { email, program_id, subject_id, subject_type, is_active } = req.body

    if (!email || !program_id || !subject_id) {
      return res
        .status(400)
        .json({ message: 'กรุณาระบุ email, program_id, และ subject_id' })
    }

    let mappedType = null
    if (subject_type) {
      mappedType = SUBJECT_TYPE_ENUM.find(
        (t) => t.toLowerCase() === subject_type.toLowerCase(),
      )
      if (!mappedType) {
        return res
          .status(400)
          .json({
            message: `subject_type ต้องเป็น: ${SUBJECT_TYPE_ENUM.join(', ')}`,
          })
      }
    }

    const user = await userModel.findUserByEmail(email)
    if (!user) {
      return res
        .status(404)
        .json({ message: 'ไม่พบผู้ใช้งานจาก email ที่ระบุ' })
    }

    const updated_by = user.user_id

    const updatedProgramSubject = await programSubjectModel.updateProgramSubject(
      {
        program_id,
        subject_id,
        subject_type: mappedType,
        is_active,
        updated_by,
      },
    )

    return res.status(200).json({ success: true, data: updatedProgramSubject })
  } catch (error) {
    console.error('Error updating program subject:', error)
    return res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * ดึงข้อมูลความสัมพันธ์ระหว่างหลักสูตรและรายวิชาทั้งหมดในระบบ
 */
exports.getAllProgramSubjects = async (req, res) => {
  try {
    const programSubjects = await programSubjectModel.getAllProgramSubjects()
    return res.status(200).json({ success: true, data: programSubjects })
  } catch (error) {
    console.error('Error getting all program subjects:', error)
    return res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * ดึงข้อมูลรายวิชาในหลักสูตรที่ระบุตามรหัสหลักสูตรและรหัสวิชา
 */
exports.getProgramSubjectById = async (req, res) => {
  try {
    const { program_id, subject_id } = req.body

    if (!program_id || !subject_id) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'กรุณาระบุ program_id และ subject_id',
        })
    }

    const programSubject = await programSubjectModel.getProgramSubjectById(
      program_id,
      subject_id,
    )

    if (!programSubject) {
      return res
        .status(404)
        .json({ success: false, message: 'ไม่พบข้อมูล program_subject' })
    }

    return res.status(200).json({ success: true, data: programSubject })
  } catch (error) {
    console.error('Error getting program subject by ID:', error)
    return res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * ดึงรายชื่อวิชาทั้งหมดที่สังกัดอยู่ในหลักสูตร (Program) ที่ระบุ
 */
exports.getProgramSubjectsByProgramId = async (req, res) => {
  try {
    const { program_id } = req.body

    if (!program_id) {
      return res
        .status(400)
        .json({ success: false, message: 'กรุณาระบุ program_id' })
    }

    const programSubjects = await programSubjectModel.getProgramSubjectsByProgramId(
      program_id,
    )

    return res.status(200).json({ success: true, data: programSubjects })
  } catch (error) {
    console.error('Error getting program subjects by program_id:', error)
    return res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * ลบรายวิชาออกจากหลักสูตร หรือเปลี่ยนสถานะเป็น Inactive หากมีการใช้งานข้อมูลอยู่
 */
exports.deleteProgramSubject = async (req, res) => {
  try {
    const { program_id, subject_id } = req.body

    if (!program_id || !subject_id) {
      return res
        .status(400)
        .json({ message: 'program_id and subject_id are required' })
    }

    const result = await programSubjectModel.deleteProgramSubject(
      program_id,
      subject_id,
    )

    if (result.action === 'deleted') {
      return res.status(200).json({
        success: true,
        message: 'ProgramSubject deleted successfully',
        data: result.data,
      })
    }

    if (result.action === 'deactivated') {
      return res.status(200).json({
        success: true,
        message:
          'ProgramSubject could not be deleted. Marked as inactive instead.',
        data: result.data,
      })
    }

    return res.status(404).json({ message: 'ProgramSubject not found' })
  } catch (error) {
    console.error('Error in deleteProgramSubject:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    })
  }
}

/**
 * นำเข้าข้อมูลรายวิชาเข้าสู่หลักสูตรจำนวนมากจากไฟล์ Excel พร้อมตรวจสอบความสอดคล้องของแผนกและข้อมูลซ้ำ
 */
// exports.importProgramSubjects = async (req, res) => {
//   try {
//     const { program_id } = req.body;

//     if (!program_id) {
//       return res.status(400).json({
//         success: false,
//         message: 'กรุณาระบุ program_id'
//       });
//     }

//     const user_id = req.user.user_id;

//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: 'กรุณาอัปโหลดไฟล์ Excel'
//       });
//     }

//     const program = await programModel.getProgramById(program_id);
//     if (!program) {
//       return res.status(404).json({
//         success: false,
//         message: `ไม่พบ program_id: ${program_id}`
//       });
//     }

//     const dept = await departmentModel.getDepartmentById(program.department_id);
//     if (!dept) {
//       return res.status(404).json({
//         success: false,
//         message: 'ไม่พบ department ของ program'
//       });
//     }

//     const workbook = XLSX.readFile(req.file.path);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

//     if (!rows.length) {
//       return res.status(400).json({
//         success: false,
//         message: 'Excel ว่างเปล่า'
//       });
//     }

//     const errors = [];
//     const validatedRows = [];
//     const seenSubjectIds = new Set();

//     for (let i = 0; i < rows.length; i++) {
//       const excelRow = i + 2;
//       const row = rows[i];

//       const subject_id = row.subject_id?.toString().trim();
//       const subject_type = row.subject_type?.toString().trim();

//       if (!subject_id || !subject_type) {
//         errors.push({
//           row: excelRow,
//           subject_id: subject_id ?? null,
//           error: 'ข้อมูลไม่ครบ (subject_id / subject_type)'
//         });
//         continue;
//       }

//       if (seenSubjectIds.has(subject_id)) {
//         errors.push({
//           row: excelRow,
//           subject_id,
//           error: 'subject_id ซ้ำในไฟล์'
//         });
//         continue;
//       }
//       seenSubjectIds.add(subject_id);

//       const mappedType = SUBJECT_TYPE_ENUM.find(
//         t => t.toLowerCase() === subject_type.toLowerCase()
//       );

//       if (!mappedType) {
//         errors.push({
//           row: excelRow,
//           subject_id,
//           error: `subject_type ต้องเป็น: ${SUBJECT_TYPE_ENUM.join(', ')}`
//         });
//         continue;
//       }

//       const subject = await subjectModel.getSubjectById(subject_id);
//       if (!subject) {
//         errors.push({
//           row: excelRow,
//           subject_id,
//           error: 'ไม่พบ subject_id ในระบบ'
//         });
//         continue;
//       }

//       if (subject.department_id !== dept.department_id) {
//         errors.push({
//           row: excelRow,
//           subject_id,
//           error: 'subject_id ไม่อยู่ใน department ของ program'
//         });
//         continue;
//       }

//       const existsProgramSubject =
//         await programSubjectModel.getProgramSubjectById(
//           program_id,
//           subject_id
//         );

//       if (existsProgramSubject) {
//         errors.push({
//           row: excelRow,
//           subject_id,
//           error: 'subject_id มีอยู่ใน program นี้แล้ว'
//         });
//         continue;
//       }

//       validatedRows.push({
//         row: excelRow,
//         subject_id,
//         subject_type: mappedType
//       });
//     }

//     if (errors.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: errors
//       });
//     }

//     const insertedSubjects = [];

//     for (const r of validatedRows) {
//       const subject = await subjectModel.getSubjectById(r.subject_id);

//       await programSubjectModel.createProgramSubject({
//         program_id,
//         subject_id: r.subject_id,
//         subject_type: r.subject_type,
//         created_by: user_id,
//         updated_by: user_id
//       });

//       await subjectPloMappingModel.createPloMapping({
//         program_id,
//         outcome_id: null,
//         subject_id: r.subject_id,
//         mapping_level: 'E',
//         created_by: user_id,
//         updated_by: user_id
//       });

//       insertedSubjects.push({
//         subject_id: subject.subject_id,
//         subject_name_th: subject.subject_name_th
//       });
//     }

//     return res.json({
//       success: true,
//       message: insertedSubjects
//     });

//   } catch (err) {
//     console.error('Error importing program subjects:', err);
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

exports.importProgramSubjects = async (req, res) => {
  try {
    const { program_id } = req.body;
    const user_id = req.user.user_id;

    if (!program_id) return res.status(400).json({ success: false, message: 'กรุณาระบุ program_id' });
    if (!req.file) return res.status(400).json({ success: false, message: 'กรุณาอัปโหลดไฟล์ Excel' });

    const program = await programModel.getProgramById(program_id);
    if (!program) {
      return res.status(404).json({ success: false, message: `ไม่พบ program_id: ${program_id}` });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (!rows.length) return res.status(400).json({ success: false, message: 'Excel ว่างเปล่า' });

    const errors = [];
    const validatedRows = [];
    const seenInFile = new Set(); 

    for (let i = 0; i < rows.length; i++) {
      const excelRow = i + 2;
      const row = rows[i];

      const subject_id = row.subject_id?.toString().trim();
      const subject_type = row.subject_type?.toString().trim();

      if (!subject_id || !subject_type) {
        errors.push({ row: excelRow, subject_id: subject_id ?? null, error: 'ข้อมูลไม่ครบ' });
        continue;
      }
      if (seenInFile.has(subject_id)) continue;
      seenInFile.add(subject_id);

      const mappedType = SUBJECT_TYPE_ENUM.find(t => t.toLowerCase() === subject_type.toLowerCase());
      if (!mappedType) {
        errors.push({ row: excelRow, subject_id, error: `ประเภทวิชาไม่ถูกต้อง (ต้องเป็น: ${SUBJECT_TYPE_ENUM.join(', ')})` });
        continue;
      }

      const subjectMaster = await subjectModel.getSubjectById(subject_id);
      if (!subjectMaster) {
        errors.push({ row: excelRow, subject_id, error: 'ไม่พบรหัสวิชานี้ในฐานข้อมูลหลัก (Subjects)' });
        continue;
      }
      if (subjectMaster.department_id !== program.department_id) {
        errors.push({ 
          row: excelRow, 
          subject_id, 
          error: `วิชาสังกัดภาค ${subjectMaster.department_id} แต่หลักสูตรนี้เป็นของภาค ${program.department_id}` 
        });
        continue;
      }

      validatedRows.push({ 
        subject_id, 
        subject_type: mappedType, 
        subject_name_th: subjectMaster.subject_name_th 
      });
    }

    if (errors.length > 0) return res.status(400).json({ success: false, message: errors });


    const summary = { inserted: 0, reactivated: 0, skipped: 0 };
    const importedList = [];

    for (const r of validatedRows) {
      const existingPS = await programSubjectModel.existsInProgram(program_id, r.subject_id);

      if (existingPS) {
        if (!existingPS.is_active) {
          await programSubjectModel.reactivateProgramSubject(program_id, r.subject_id, user_id);
          summary.reactivated++;
        } else {
          summary.skipped++;
          continue; 
        }
      } else {
        await programSubjectModel.createProgramSubject({
          program_id,
          subject_id: r.subject_id,
          subject_type: r.subject_type,
          created_by: user_id,
          updated_by: user_id
        });
        summary.inserted++;
      }

      const mappingExists = await subjectPloMappingModel.checkMappingExists(program_id, r.subject_id);
      if (!mappingExists) {
        await subjectPloMappingModel.createPloMapping({
          program_id,
          outcome_id: null,
          subject_id: r.subject_id,
          mapping_level: 'E',
          created_by: user_id,
          updated_by: user_id
        });
      }

      importedList.push({ subject_id: r.subject_id, name: r.subject_name_th });
    }

    return res.json({
      success: true,
      message: `นำเข้าวิชาสำเร็จ (เพิ่มใหม่: ${summary.inserted}, กู้คืน: ${summary.reactivated}, ข้าม: ${summary.skipped})`,
      summary,
      data: importedList
    });

  } catch (err) {
    console.error('Import Error:', err);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายในระบบ: ' + err.message });
  }
};