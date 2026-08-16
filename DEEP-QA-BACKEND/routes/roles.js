// routes/rolesRoutes.js
const express = require('express');
const router = express.Router();
const rolesController = require('../controllers/rolesController');
const { verifyToken } = require("../middleware/authMiddleware"); // 🔥 import middleware

router.post('/create_roles', verifyToken, rolesController.createRole);

module.exports = router;
