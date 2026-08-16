
 // routes/protected.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const userRole = require("../models/user_rolesModel");

router.get("/profile", verifyToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const roles = await userRole.getAllRolesByUserId(user_id);
    
    res.status(200).json({
      user_id: req.user.user_id,
      title_th: req.user.title_th,
      first_name_th: req.user.first_name_th || null,
      last_name_th: req.user.last_name_th || null,
      first_name_en: req.user.first_name_en || null,
      last_name_en: req.user.last_name_en || null,
      email: req.user.email,
      profile_picture: req.user.profile_picture || null,
      role: roles || [],
    });
  } catch (err) {
    console.error("Error retrieving profile:", err);
    res.status(500).json({ message: "Error retrieving profile", error: err.message });
  }
});

module.exports = router;
