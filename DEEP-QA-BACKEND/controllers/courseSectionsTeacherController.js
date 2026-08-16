//controllers/courseSectionsTeacherController.js
const courseSectionTeacherModel = require('../models/courseSectionsTeacherModel');


/**
 * ดึงข้อมุลรายวิชาที่อาจรย์สอน
 */
exports.getTeacherCourse = async (req, res) => {
  try {
    const {  academic_year, semester } = req.body;
    const user_id = req.user.user_id;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const validSemesters = ['1', '2', 'all'];
    if (!semester || !validSemesters.includes(semester.toString())) {
      return res.status(400).json({ error: 'semester must be 1, 2, or all' });
    }

    if (!academic_year) {
      return res.status(400).json({ error: 'academic_year is required' });
    }

    const courses = await courseSectionTeacherModel.getTeacherCourse(user_id, academic_year, semester);

    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Error in getTeacherCourse:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};