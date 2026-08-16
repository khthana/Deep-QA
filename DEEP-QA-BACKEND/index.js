// index.js
require('dotenv').config()
const express = require('express')
const session = require('express-session')
const passport = require('passport')
require('./config/passport')
const cookieParser = require('cookie-parser')
const cors = require('cors')

const routes = require('./routes/all_routes')
const app = express()

// รวม Origins จาก .env และค่าที่ใช้บ่อย
const allowedOrigins = [
  // process.env.FRONTEND_URL,
  'https://portfolio.deep-core.net',
  'https://deep-core.net',
  'http://localhost:3000', // พอร์ต Backend
  'http://localhost:5000', // พอร์ต Frontend (ทั่วไป)
  'http://localhost:5173', // พอร์ต Vite/React

  'http://10.240.68.8:5000',
  'http://10.240.68.8:80',
  'http://10.240.68.8',

].filter(Boolean); // ลบค่าที่เป็น undefined ออก

// 1. จำเป็นมากสำหรับ Cloud KMITL ที่รันหลัง Proxy
app.set('trust proxy', 1)

app.use(cookieParser())

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true, // ห้ามลืม! เพื่อให้ส่ง Cookie ได้
  }),
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const isProduction = process.env.NODE_ENV === 'production'

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      // หาก Production เป็น HTTP (ไม่มี S) ให้เปลี่ยน None เป็น Lax
      sameSite: isProduction ? 'None' : 'Lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 วัน
    },
  }),
)

app.use(passport.initialize())
app.use(passport.session())

// Static Files - ตรวจสอบ Path ให้ตรงกับที่เก็บรูปภาพใน DEEP-QA
app.use('/static', express.static('/data/evidence'))

// Prefix หลักของ API
app.use('/api', routes)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`)
  console.log(` Environment: ${process.env.NODE_ENV}`)
})
