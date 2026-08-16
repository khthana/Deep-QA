// controllers/courseSectionsController.js
const courseSectionsModel = require('../models/courseSectionsModel');
const userModel = require('../models/userModel');
const programsModel = require('../models/programsModel');
const semesterCoursesModel = require('../models/semesterCoursesModel');
const subjectsModel = require('../models/subjectsModel')

/**
 * สร้างกลุ่มเรียน (Section) และเพิ่มรายชื่ออาจารย์ผู้สอนเข้าสู่ระบบพร้อมตรวจสอบข้อมูลที่เกี่ยวข้อง
 */
exports.createSectionAndTeacher = async (req, res) => {
  try {
    const { semester_course_id, section_number, teacher_emails } = req.body;

    if (!semester_course_id || !section_number || !Array.isArray(teacher_emails)) {
      return res.status(400).json({
        success: false,
        message: "semester_course_id, section_number, teacher_emails (array) are required"
      });
    }

    const existingSection = await courseSectionsModel.getSectionBySemesterAndNumber(semester_course_id, section_number);
    if (existingSection) {
      return res.status(400).json({ success: false, message: "Section ซ้ำ" });
    }

    const section = await courseSectionsModel.createCourseSection({ semester_course_id, section_number });

    const teachers = [];
    const existingTeacherIds = await courseSectionsModel.getTeachersBySectionId(section.section_id);

    for (const email of teacher_emails) {
      const user = await userModel.findUserByEmail(email);
      if (!user) throw new Error(`Teacher with email ${email} not found`);

      if (existingTeacherIds.includes(user.user_id)) {
        return res.status(400).json({ success: false, message: `Teacher ${email} ซ้ำใน section` });
      }

      await courseSectionsModel.createCourseSectionTeacher({
        semester_course_id,
        section_id: section.section_id,
        user_id: user.user_id
      });

      teachers.push({
        first_name_th: user.first_name_th,
        last_name_th: user.last_name_th,
        first_name_en: user.first_name_en,
        last_name_en: user.last_name_en,
        email: user.email
      });
    }

    const semesterCourse = await semesterCoursesModel.getSemesterCourseById(semester_course_id);
    const program = await programsModel.getProgramById(semesterCourse.program_id);
    const subject = await subjectsModel.getSubjectById(semesterCourse.subject_id)

    const responseSection = {
      semester_course_id: section.semester_course_id,
      year : semesterCourse.academic_year,
      semester : semesterCourse.semester,
      program_id: program.program_id,
      program_name_th: program.program_name_th,
      program_name_en: program.program_name_en,
      subject : subject.subject_id,
      subject_name_th : subject.subject_name_th,
      subject_name_en : subject.subject_name_en,
      section_id: section.section_id,
      section_number: section.section_number,
      
      teachers
    };

    return res.status(200).json({ success: true, data: responseSection });

  } catch (error) {
    console.error("Error creating section and teachers:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ลบข้อมูลกลุ่มเรียน (Section) ออกจากระบบตาม ID ที่ระบุ
 */
exports.deleteSection = async (req, res) => {
  try {
    const { section_id } = req.body;

    if (!section_id) {
      return res.status(400).json({ success: false, message: "section_id ต้องระบุ" });
    }

    const deleted = await courseSectionsModel.deleteSection(section_id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: `Section id ${section_id} ไม่พบ` });
    }

    res.status(200).json({
      success: true,
      message: "ลบ section เรียบร้อย",
      data: deleted
    });
  } catch (error) {
    console.error("Error deleting section:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * อัปเดตหมายเลขกลุ่มเรียนและเปลี่ยนรายชื่ออาจารย์ผู้สอนแบบกลุ่ม (Batch)
 */
exports.updateSectionTeacher = async (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ success: false, message: "data ต้องเป็น array" });
    }

    const results = [];

    for (const item of data) {
      const { section_id, new_section_number, teacher_emails } = item;

      if (!section_id || !new_section_number || !Array.isArray(teacher_emails)) {
        return res.status(400).json({ success: false, message: "section_id, new_section_number, teacher_emails ต้องระบุ" });
      }

      const updatedSection = await courseSectionsModel.updateSectionNumber(section_id, new_section_number);

      await courseSectionsModel.deleteTeachersBySectionId(section_id);

      const semester_course_id = await courseSectionsModel.getSemesterCourseIdBySectionId(section_id);
      const teachers = [];

      for (const email of teacher_emails) {
        const user = await userModel.findUserByEmail(email);
        if (!user) throw new Error(`User with email ${email} not found`);

        const teacher = await courseSectionsModel.addTeacherToSection({
          semester_course_id,
          section_id,
          user_id: user.user_id
        });

        teachers.push({
          user_id: user.user_id,
          first_name_th: user.first_name_th,
          last_name_th: user.last_name_th,
          first_name_en: user.first_name_en,
          last_name_en: user.last_name_en,
          email: user.email
        });
      }

      results.push({
        section_id,
        section_number: new_section_number,
        teachers
      });
    }

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("Error updating section teachers:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};