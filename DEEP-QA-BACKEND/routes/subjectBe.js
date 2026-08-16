// routes/subjectBe.js
const express = require("express");
const router = express.Router();
const subjectBeController = require("../controllers/subjectBeController");
const { verifyToken } = require("../middleware/authMiddleware"); // 🔥 import middleware

// POST /subject-be
router.post("/create", verifyToken, subjectBeController.createSubjectBe);
router.get("/get/:section_id/:clo_id", verifyToken, subjectBeController.getSubjectBeByFilter);
router.post("/update", verifyToken, subjectBeController.updateSubjectBe);
router.delete("/delete/:id", verifyToken, subjectBeController.deleteSubjectBe);

module.exports = router;
