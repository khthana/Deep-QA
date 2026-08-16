//controllers/rolesController.js
const rolesModel = require('../models/rolesModel');

/**
 * สร้าง Role
 */
exports.createRole = async (req, res) => {
  try {
    const { role_name, priority } = req.body;

    if (!role_name || !priority) {
      return res.status(400).json({ message: 'role_name และ priority ต้องระบุ' });
    }

    const role_id = role_name;

    const newRole = await rolesModel.createRole(role_id, role_name, priority);
    return res.status(201).json(newRole);
  } catch (error) {
    console.error('Error creating role:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};
