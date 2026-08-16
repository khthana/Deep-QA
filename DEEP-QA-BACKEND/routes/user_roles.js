// routes/user_roles.js
const express = require("express");
const router = express.Router();
const user_rolesController = require("../controllers/user_rolesController");
const { verifyToken } = require("../middleware/authMiddleware"); // 🔥 import middleware

// ทุก route จะตรวจสอบ token ก่อน
router.post('/add-user-role', verifyToken, user_rolesController.addUserRole);
router.post('/assignable-roles/', verifyToken, user_rolesController.getAssignableRoles);
router.post('/user-roles/', verifyToken, user_rolesController.getUserRoles);
router.post('/get-scope', verifyToken, user_rolesController.getScope);
router.post('/delete_user_role', verifyToken, user_rolesController.deleteUserRole);
router.post('/scope-order', verifyToken, user_rolesController.getScopeHierarchy);

module.exports = router;
