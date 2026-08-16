// routes/subjectPloMapping.js
const express = require("express");
const router = express.Router();
const subjectPloMappingController = require("../controllers/subjectPloMappingController");
const { verifyToken } = require("../middleware/authMiddleware"); // 🔥 import middleware

router.post("/create", verifyToken, subjectPloMappingController.createPloMapping);
router.post('/get-subject-plo-mapping', verifyToken, subjectPloMappingController.getSubjectPloMapping);
router.post('/update', verifyToken, subjectPloMappingController.updateSubjectPloMapping);
router.post('/delete', verifyToken, subjectPloMappingController.deleteSubjectPloMapping);
router.post('/get-mapping-in-subject', verifyToken, subjectPloMappingController.getSubjectPloMappingController);

module.exports = router;
