const express = require("express");
const router = express.Router();
const controller = require("../controllers/cloPLanController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/create-cycle", verifyToken, controller.createCloplanCycle);
router.post("/detail/upsert", verifyToken, controller.upsertCloplanDetail);
router.get("/section/:section_id", verifyToken, controller.getCloplanBySectionOnly);
router.get("/semester-course/:section_id", verifyToken, controller.getCloplanBySemesterCourse);
router.delete("/:plan_detail_id/delete", verifyToken, controller.deleteCloplanDetail);

module.exports = router;
