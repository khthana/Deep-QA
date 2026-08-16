// routes/subjectClo.js
const express = require('express');
const router = express.Router();
const subjectCloController = require('../controllers/subjectCloController');
const { verifyToken } = require("../middleware/authMiddleware"); // 🔥 import middleware

// Create
router.post('/create', verifyToken, subjectCloController.createCloController);
router.post('/update', verifyToken, subjectCloController.updateCloController);
router.get('/get/:section_id', verifyToken, subjectCloController.getSubjectCloController);
router.get('/getPloMappedinCLO/sections/:section_id/clo/:clo_id',verifyToken,subjectCloController.getPLOmappedinCLO)
router.delete('/delete/:clo_id', verifyToken,subjectCloController.deleteCLO);

module.exports = router;
