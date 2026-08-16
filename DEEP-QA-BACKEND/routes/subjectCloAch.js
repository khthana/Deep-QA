// routes/subjectCloAch.js
const express = require('express');
const router = express.Router();
const subjectCloAchController = require('../controllers/subjectCloAchController');
const { verifyToken } = require("../middleware/authMiddleware"); // 🔥 import middleware

router.post('/create', verifyToken, subjectCloAchController.createSubjectClo);
router.get('/get/:section_id/:clo_id', verifyToken, subjectCloAchController.getSubjectClo);
router.post('/update', verifyToken, subjectCloAchController.updateSubjectClo);
router.delete('/delete/:id', verifyToken, subjectCloAchController.deleteSubjectClo);

module.exports = router;
