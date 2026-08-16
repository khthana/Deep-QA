// routes/learningOutcomeRoutes.js
const express = require("express");
const router = express.Router();
const learningOutcomeController = require("../controllers/learningOutcomeController");
const { verifyToken } = require("../middleware/authMiddleware"); // 🔥 import middleware

// POST /api/learning-outcomes
router.post("/create", verifyToken, learningOutcomeController.createPLO);
router.post("/get-plo-by-program-id", verifyToken, learningOutcomeController.getPLOsByProgram);
router.post("/update-plo", verifyToken, learningOutcomeController.updatePLO);
router.post("/delete-plo", verifyToken, learningOutcomeController.deletePLO);

module.exports = router;
