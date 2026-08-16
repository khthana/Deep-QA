// // utils/cookieHelper.js
// const setTokenCookie = (res, token, options = {}) => {
//   const defaultOptions = {
//     httpOnly: true,
//     secure: false, // dev = false, prod = true
//     sameSite: 'Lax', // dev ใช้ Lax, prod ใช้ 'None'
//     path: '/',
//     maxAge: 30 * 60 * 1000, // 30 นาที
//   }
//   res.cookie('token', token, { ...defaultOptions, ...options })
// }

// const clearTokenCookie = (res) => {
//   res.clearCookie('token', {
//     httpOnly: true,
//     secure: false,
//     sameSite: 'Lax',
//   })
// }

// module.exports = { setTokenCookie, clearTokenCookie }


// utils/cookieHelper.js
const isProduction = process.env.NODE_ENV === 'production';

const setTokenCookie = (res, token, options = {}) => {
  const defaultOptions = {
    httpOnly: true,
    secure: isProduction, // Production ต้องเป็น true (HTTPS)
    /**
     * ใช้ Lax สำหรับ Production เพื่อให้เบราว์เซอร์ส่ง Cookie เฉพาะตอนอยู่บน Domain เรา
     * และป้องกัน Direct Access ได้ในระดับหนึ่ง
     */
    sameSite: isProduction ? 'Lax' : 'Lax', 
    // เพิ่ม Domain เพื่อให้แชร์ Cookie กันระหว่าง api. กับ หน้าหลัก ได้
    domain: isProduction ? '.deep-core.net' : 'localhost',
    path: '/',
    maxAge: 30 * 60 * 1000, // 30 นาที
  }
  res.cookie('token', token, { ...defaultOptions, ...options })
}

const clearTokenCookie = (res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'Lax' : 'Lax',
    domain: isProduction ? '.deep-core.net' : 'localhost',
    path: '/',
  })
}

module.exports = { setTokenCookie, clearTokenCookie }