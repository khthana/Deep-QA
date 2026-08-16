// controllers/userController.js
const xlsx = require('xlsx')
const fs = require('fs')
const userModel = require('../models/userModel')
const user_rolesModel = require('../models/user_rolesModel')
const departmentModel = require('../models/departmentModel')
const programModel = require('../models/programsModel')
const roleModel = require('../models/rolesModel')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')
const SALT_ROUNDS = 10
const path = require('path')
const { USER_IMAGE_PATH } = require('../config/evidence')
const userService = require('../services/userService')

/**
 * เพิ่มผู้ใช้ใหม่เข้าสู่ระบบพร้อมกำหนดสิทธิ์โดยผู้ใช้งานปัจจุบัน
 */
exports.addUser = async (req, res) => {
  try {
    const assigned_by = req.user.user_id
    const user = await userService.addUser(req.body, assigned_by)

    res.status(201).json({
      message: 'User added successfully',
      user,
    })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

/**
 * นำเข้าข้อมูลผู้ใช้จำนวนมากผ่านไฟล์ Excel (xlsx)
 */
exports.importUsers = async (req, res) => {
  try {
    const file = req.file
    const assigned_by = req.user.user_id

    if (!file) {
      return res.status(400).json({ message: 'Please upload a file' })
    }

    const result = await userService.importUsers(file.path, assigned_by)

    res.status(200).json({
      success: true,
      message: [result],
    })
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.errors || err.message,
    })
  }
}

/**
 * อัปเดตข้อมูลส่วนตัวของผู้ใช้งาน (เช่น ชื่อ-นามสกุล, เบอร์โทรศัพท์) ตาม Email
 */
exports.updateUser = async (req, res) => {
  try {
    const {
      email,
      phone,
      title_th,
      first_name_th,
      last_name_th,
      title_en,
      first_name_en,
      last_name_en,
    } = req.body

    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }

    const existingUser = await userModel.findUserByEmail(email)

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' })
    }
    const updatedUser = await userModel.updateUser(existingUser.user_id, {
      phone,
      title_th,
      first_name_th,
      last_name_th,
      title_en,
      first_name_en,
      last_name_en,
    })

    if (!updatedUser) {
      return res.status(500).json({ message: 'Failed to update user' })
    }

    const responseUser = {
      user_id: updatedUser.user_id,
      email: updatedUser.email,
      phone: updatedUser.phone,
      title_th: updatedUser.title_th,
      first_name_th: updatedUser.first_name_th,
      last_name_th: updatedUser.last_name_th,
      title_en: updatedUser.title_en,
      first_name_en: updatedUser.first_name_en,
      last_name_en: updatedUser.last_name_en,
      department_id: updatedUser.department_id,
      program_id: updatedUser.program_id,
    }

    await userService.addUserLog(existingUser.user_id, "UPDATE_PROFILE");

    res.status(200).json({ 
      message: 'User updated successfully', 
      user: responseUser 
    })

  } catch (error) {
    console.error('Update User error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}



/**
 * ดึงข้อมูลผู้ใช้ทั้งหมดโดยกรองตามระดับสิทธิ์ (Priority) และขอบเขต (Scope)
 */
// exports.getAllUsers = async (req, res) => {
//   try {
//     const { role_id, scope_id } = req.body

//     if (!role_id || !scope_id) {
//       return res.status(400).json({ message: 'Missing role_id or scope_id' })
//     }

//     const callerPriority = await roleModel.getRolePriority(role_id)
//     if (callerPriority === null) {
//       return res.status(400).json({ message: 'Invalid role_id' })
//     }

//     const users = await userModel.getAllUsersByRolePriority(role_id, scope_id)

//     const usersWithRolesAndNames = await Promise.all(
//       users.map(async (user) => {
//         const rawRoles = await user_rolesModel.getAllRolesByUserId(user.user_id)

//         const role_list = []
//         for (const r of rawRoles) {
//           const p = await roleModel.getRolePriority(r.role_id)
//           if (p >= callerPriority) {
//             role_list.push(r.role_id)
//           }
//         }

//         const department_name_th = user.department_id
//           ? (await departmentModel.getDepartmentById(user.department_id))
//               ?.department_name_th || null
//           : null

//         const program_name_th = user.program_id
//           ? (await programModel.getProgramById(user.program_id))
//               ?.program_name_th || null
//           : null

//         return {
//           ...user,
//           department_name_th,
//           program_name_th,
//           role_list,
//           department_id: undefined,
//           program_id: undefined,
//         }
//       }),
//     )

//     const uniqueUsers = Object.values(
//       usersWithRolesAndNames.reduce((acc, user) => {
//         if (!acc[user.user_id]) {
//           acc[user.user_id] = user
//         }
//         return acc
//       }, {}),
//     )

//     res.status(200).json(uniqueUsers)
//   } catch (error) {
//     console.error('Error in getAllUsers:', error)
//     res
//       .status(500)
//       .json({ message: 'Internal Server Error', error: error.message })
//   }
// }

exports.getAllUsers = async (req, res) => {
  try {
    const { role_id, scope_id } = req.body;
    const callerUserId = req.user.user_id;

    if (!role_id || !scope_id) {
      return res.status(400).json({ message: 'Missing role_id or scope_id' });
    }

    const rawData = await userModel.getAllUsersWithFilter(role_id, scope_id, callerUserId);

    const userGroups = rawData.reduce((acc, row) => {
      const uid = row.user_id;

      if (!acc[uid]) {
        acc[uid] = {
          user_id: row.user_id,
          email: row.email,
          phone: row.phone,
          title_th: row.title_th,
          first_name_th: row.first_name_th,
          last_name_th: row.last_name_th,
          title_en: row.title_en,
          first_name_en: row.first_name_en,
          last_name_en: row.last_name_en,
          status: row.status,
          current_role_id: row.assigned_role, 
          department_name_th: row.department_name_th || "ไม่ระบุ",
          program_name_th: row.program_name_th || "ไม่ระบุ",
          role_list: [],
          _highest_priority: row.role_priority // ใช้สำหรับเปรียบเทียบภายใน
        };
      }

      // เก็บสิทธิ์ทั้งหมดที่กรองมาแล้วลง list
      if (!acc[uid].role_list.includes(row.assigned_role)) {
        acc[uid].role_list.push(row.assigned_role);
      }

      // อัปเดต current_role_id: ถ้าเจอ Role ที่ Priority สูงกว่า (เลขน้อยกว่า) ให้เปลี่ยน
      if (row.role_priority < acc[uid]._highest_priority) {
        acc[uid].current_role_id = row.assigned_role;
        acc[uid]._highest_priority = row.role_priority;
      }

      return acc;
    }, {});

    // ลบตัวแปรชั่วคราวออกก่อนส่ง Response
    const result = Object.values(userGroups).map(({_highest_priority, ...rest}) => rest);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ดึงรายชื่ออาจารย์ที่สังกัดอยู่ในแผนก (Department) ที่ระบุ
 */
exports.getTeacherByDepartmentId = async (req, res) => {
  try {
    const { department_id } = req.body

    if (!department_id) {
      return res.status(400).json({ message: 'department_id is required' })
    }

    const teachers = await user_rolesModel.findTeacher(department_id)
    // const teacherList = await Promise.all(
    //   teachers.map(async (t) => {
    //     const user = await userModel.findUserById(t.user_id)
    //     return {
    //       user_id: t.user_id,
    //       role_id: t.role_id,
    //       scope_id: t.scope_id,
    //       first_name_th: user?.first_name_th || null,
    //       last_name_th: user?.last_name_th || null,
    //       email: user?.email || null,
    //     }
    //   }),
    // )

    return res.status(200).json({
      success: true,
      data: teachers,
    })
  } catch (error) {
    console.error('Error in getTeacherByDepartmentId:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    })
  }
}

/**
 * สลับสถานะการใช้งานของผู้ใช้ (เช่น Active / Inactive) และบันทึก Log
 */
exports.swapStatusController = async (req, res) => {
  try {
    const { user_id, status } = req.body

    if (!user_id || !status) {
      return res
        .status(400)
        .json({ message: 'user_id and status are required' })
    }

    const updatedUser = await userModel.swapStatus(user_id, status)

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' })
    }
    await userService.addUserLog(user_id, status.toUpperCase());

    res.status(200).json({
      message: 'Status updated successfully',
      data: updatedUser,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Internal server error' })
  }
}



/**
 * เปลี่ยนรหัสผ่านของผู้ใช้งาน โดยต้องตรวจสอบรหัสผ่านเดิมและความยาวรหัสผ่านใหม่
 */
exports.changePassword = async (req, res) => {
  try {
    const user_id = req.user.user_id
    const { old_password, new_password } = req.body

    if (!old_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่',
      })
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร',
      })
    }

    const user = await userModel.getPasswordByUserId(user_id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้',
      })
    }

    const isMatch = await bcrypt.compare(old_password, user.password)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'รหัสผ่านเดิมไม่ถูกต้อง',
      })
    }

    const isSamePassword = await bcrypt.compare(new_password, user.password)
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม',
      })
    }

    const hashedPassword = await bcrypt.hash(new_password, 10)
    await userModel.updatePassword(user_id, hashedPassword)
    await userService.addUserLog(user_id,"CHANGE_PASSWORD");

    return res.status(200).json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จ',
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' })
  }
}

/**
 * อัปโหลดและบันทึกรูปโปรไฟล์ของผู้ใช้งาน พร้อมลบรูปเก่าออกหากมีการอัปโหลดใหม่
 */
exports.uploadProfileImage = async (req, res) => {
  try {
    const user_id = req.user.user_id

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบไฟล์รูป',
      })
    }

    if (!fs.existsSync(USER_IMAGE_PATH)) {
      fs.mkdirSync(USER_IMAGE_PATH, { recursive: true })
    }

    const ext = path.extname(req.file.originalname)
    const fileName = `${user_id}_${Date.now()}${ext}`
    const fsPath = path.join(USER_IMAGE_PATH, fileName)
    const dbPath = `/user_image/${fileName}`

    const oldImage = await userService.getUserImageByUserId(user_id)
    if (oldImage && oldImage.image_path) {
      const oldFsPath = path.join('/data/evidence', oldImage.image_path)
      if (fs.existsSync(oldFsPath)) {
        fs.unlinkSync(oldFsPath)
      }
    }

    fs.writeFileSync(fsPath, req.file.buffer)
    await userService.upsertUserImage(user_id, dbPath)

    res.status(200).json({
      success: true,
      message: 'อัปโหลดรูปโปรไฟล์สำเร็จ',
      image_path: dbPath,
    })
  } catch (error) {
    console.error('Upload profile image error:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด',
    })
  }
}

/**
 * ดึงข้อมูลโปรไฟล์ของผู้ใช้งานที่กำลังล็อกอินอยู่
 */
exports.getProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        success: false,
        message: 'unauthorized',
      })
    }

    const user_id = req.user.user_id
    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

    const user = await userModel.getUserProfileByUserId(user_id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้',
      })
    }

    const image_url = user.image_path
      ? `${BASE_URL}/static${user.image_path}`
      : `${BASE_URL}/static/default/profile.png`

    return res.json({
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        phone: user.phone,
        title_th: user.title_th,
        first_name_th: user.first_name_th,
        last_name_th: user.last_name_th,
        title_en: user.title_en,
        first_name_en: user.first_name_en,
        last_name_en: user.last_name_en,
        department_id: user.department_id,
        program_id: user.program_id,
        image_url,
      },
    })
  } catch (err) {
    console.error('getProfile error:', err)
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด',
    })
  }
}

/**
 * ดึงประวัติกิจกรรม (Logs) ของผู้ใช้งานที่ระบุ
 */
exports.getUserLogs = async (req, res) => {
  try {
    const { user_id } = req.query

    const logs = await userModel.getUserLogs(user_id)

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    })
  } catch (error) {
    console.error('GET USER LOG ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
}

/**
 * ลบผู้ใช้งานออกจากระบบ หรือเปลี่ยนสถานะเป็น Inactive หากไม่สามารถลบข้อมูลถาวรได้
 */
exports.deleteUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { academic_year } = req.query; // รับจาก ?academic_year=2566

    if (!user_id) {
      return res.status(400).json({ message: 'กรุณาระบุ User ID' });
    }

    // ส่ง academic_year เข้าไปใน Model ด้วย
    const result = await userModel.deleteUser(user_id, academic_year);

    if (result.status === 'forbidden') {
      return res.status(400).json({ message: result.message });
    }

    if (result.status === 'not_found') {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้งาน' });
    }

    return res.status(200).json({ message: 'ลบข้อมูลผู้ใช้งานเรียบร้อยแล้ว' });

  } catch (error) {
    console.error('Error in deleteUser controller:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};