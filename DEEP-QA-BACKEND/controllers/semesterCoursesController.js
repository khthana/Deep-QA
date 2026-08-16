// controllers/semesterCoursesController.js
const userModel = require('../models/userModel');
const courseSectionsModel = require('../models/courseSectionsModel');
const semesterCoursesModel = require('../models/semesterCoursesModel');
const cloPlanModel = require('../models/cloPlanModel');

/**
 * สร้างข้อมูลวิชาที่เปิดสอนในเทอม (Semester Course) พร้อมสร้างรอบการประเมิน CLO (Cycle) ให้ทันที
 */
exports.createSemesterCourse = async (req, res) => {
  try {
    const { academic_year, semester, subject_id, program_id } = req.body;

    if (!academic_year || !semester || !subject_id || !program_id) {
      return res.status(400).json({
        success: false,
        message: "กรุณาส่ง academic_year, semester, subject_id, program_id"
      });
    }

    const semesterCourse =
      await semesterCoursesModel.createSemesterCourse({
        academic_year,
        semester,
        subject_id,
        program_id
      });

    const cloplanCycle =
      await cloPlanModel.createCycle(semesterCourse.id);

    res.status(201).json({
      success: true,
      message: "สร้าง semester course และ CLO plan สำเร็จ",
      data: {
        semester_course: semesterCourse,
        cloplan_cycle: cloplanCycle
      }
    });

  } catch (err) {
    console.error("Error creating semester course:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * ดึงข้อมูลวิชาที่เปิดสอนตามปีการศึกษาและเทอมที่ระบุ พร้อมทั้งจัดกลุ่มข้อมูล Section และรายชื่ออาจารย์ผู้สอน
 */
exports.getCourseByYearTerm = async (req, res) => {
  try {
    const { academic_year, semester, program_id } = req.body;

    if (!academic_year || !semester || !program_id) {
      return res.status(400).json({ success: false, message: 'academic_year, semester, program_id ต้องระบุ' });
    }

    const courses = await semesterCoursesModel.getCourseByYearTerm({ academic_year, semester, program_id });

    const result = [];

    for (const course of courses) {
      const sectionRows = await courseSectionsModel.getSectionsWithTeachers(course.semester_course_id);

      const sectionsMap = {};
      sectionRows.forEach(row => {
        if (!sectionsMap[row.section_id]) {
          sectionsMap[row.section_id] = {
            section_id: row.section_id,
            section_number: row.section_number,
            teachers: []
          };
        }
        if (row.user_id) {
          sectionsMap[row.section_id].teachers.push({
            user_id: row.user_id,
            title_th: row.title_th,
            first_name_th: row.first_name_th,
            last_name_th: row.last_name_th,
            title_en:row.title_en,
            first_name_en: row.first_name_en,
            last_name_en: row.last_name_en,
            email: row.email
          });
        }
      });

      result.push({
        ...course,
        sections: Object.values(sectionsMap)
      });
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error getCourseByYearTerm:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ลบข้อมูลวิชาที่เปิดสอนในเทอมตาม ID ที่ระบุ
 */
exports.deleteSemesterCourse = async (req, res) => {
  try {
    const { semester_course_id :id } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "id ต้องระบุ" });
    }

    const deleted = await semesterCoursesModel.deleteSemesterCourse(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: `Semester course id ${id} ไม่พบ` });
    }

    res.status(200).json({ success: true, message: "ลบข้อมูลเรียบร้อย", data: deleted });
  } catch (error) {
    console.error("Error deleting semester course:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * คัดลอกข้อมูลวิชาที่เปิดสอนจากปีการศึกษาเก่าไปยังปีการศึกษาใหม่
 */
exports.copySemesterCoursesController = async (req, res) => {
  try {
    const { academic_year_now, academic_year_old, semester } = req.body;

    if (!academic_year_now || !academic_year_old) {
      return res.status(400).json({
        message: "academic_year_now and academic_year_old are required"
      });
    }

    const result = await semesterCoursesModel.copySemesterCourses({
      academic_year_now,
      academic_year_old,
      semester: semester === undefined ? null : semester,
    });

    res.json({
      message: "Copied successfully",
      ...result
    });
  } catch (err) {
    console.error("Error copying semester courses:", err);
    res.status(500).json({ message: err.message });
  }
};