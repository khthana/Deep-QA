const express = require('express');
const router = express.Router();
const courseSectionsController = require('../controllers/courseSectionsController');
const { verifyToken } = require('../middleware/authMiddleware'); // 🔥 import middleware

// POST /api/course-sections/create
router.post('/create-section-teacher', verifyToken, courseSectionsController.createSectionAndTeacher);
router.post('/delete', verifyToken, courseSectionsController.deleteSection);
router.post('/update-section-teachers', verifyToken, courseSectionsController.updateSectionTeacher);

module.exports = router;
