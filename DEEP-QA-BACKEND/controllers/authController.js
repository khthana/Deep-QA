// controllers/authController.js

const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const userModel = require('../models/userModel')
const { setTokenCookie, clearTokenCookie } = require('../utils/cookieHelper')
const userService = require('../services/userService')
const studentModel = require("../models/studentModel");

const SECRET_KEY = process.env.SECRET_KEY

/**
 * สร้าง JSON Web Token (JWT) สำหรับผู้ใช้งานโดยบรรจุข้อมูลพื้นฐานที่จำเป็นลงใน Payload
 */
exports.generateToken = (user) => {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      title_th: user.title_th,
      first_name_en: user.first_name_en,
      last_name_en: user.last_name_en,
      first_name_th: user.first_name_th,
      last_name_th: user.last_name_th,
      profile_picture: user.profile_picture
    },
    SECRET_KEY,
    { expiresIn: '30m' },
  )
}

/**
 * ดำเนินการตรวจสอบสิทธิ์การเข้าใช้งาน (Login) ตรวจสอบรหัสผ่าน บันทึกประวัติกิจกรรม และสร้าง Cookie สำหรับเก็บ Token
 */
exports.loginUser = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({
      message: 'Please enter your Email or Password',
    })
  }

  try {
    const user = await userModel.findUserByEmail(email)
    const isStudent = await studentModel.existsStudentById(user.user_id);

    if (!user)
      return res.status(400).json({ message: 'Invalid email' })

    if (!user.is_verified)
      return res
        .status(401)
        .json({ message: 'Please verify your email before login.' })

    const match = await bcrypt.compare(password, user.password)

    if (!match)
      return res.status(401).json({ message: 'Incorrect password' })

    const token = exports.generateToken(user)
    setTokenCookie(res, token)
    await userService.addUserLog(user.user_id , "LOGIN");

    res.status(200).json({
      message: 'Login successful',
      is_student: isStudent,
      user: {
        user_id: user.user_id,
        email: user.email,
        title_th: user.title_th,
        first_name_th: user.first_name_th,
        last_name_th: user.last_name_th,
        first_name_en: user.first_name_en,
        last_name_en: user.last_name_en,
      },
    })
  } catch (err) {
    console.error('Login Error:', err)
    res.status(500).json({
      message: 'Server error',
      error: err.message,
    })
  }
}

/**
 * ดำเนินการออกจากระบบ (Logout) โดยการบันทึก Log และทำการล้างข้อมูล Cookie ของ Token ทิ้ง
 */
exports.logout = async (req, res) => {
  const user_id = req.user.user_id
  await userService.addUserLog(user_id,"LOGOUT")
  clearTokenCookie(res)
  res.status(200).json({ message: 'Logged out' })
}

/**
 * ตรวจสอบสถานะการเชื่อมต่อกับ Server (Health Check)
 */
exports.ping = (req, res) => {
  res.status(200).json({
    message: 'pong',
    status: 'connected',
  })
}