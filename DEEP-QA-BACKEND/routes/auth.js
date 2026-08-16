// routes/auth.js
const express = require('express')
const router = express.Router()
const passport = require('passport')
const authController = require('../controllers/authController')
const { setTokenCookie } = require('../utils/cookieHelper')
const { verifyToken } = require('../middleware/authMiddleware')
const userService = require('../services/userService')
const studentModel = require('../models/studentModel')

// --- Login / Logout / Ping ---
router.post('/login', authController.loginUser)
router.get('/ping', authController.ping)
router.get('/logout', verifyToken, authController.logout)

// --- Google OAuth ---
router.get(
  '/google-login',
  passport.authenticate('google', { scope: ['profile', 'email'] }),
)

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', async (err, user, info) => {
    if (err) {
      console.error('Passport Auth Error:', err)

      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`)
    }

    if (!user) {
      const message = info ? encodeURIComponent(info.message) : 'user_not_found'
      return res.redirect(
        `${process.env.FRONTEND_URL}/user-not-found?reason=${message}`,
      )
    }

    try {
      const isStudent = await studentModel.existsStudentById(user.user_id)
      const token = authController.generateToken(user)
      setTokenCookie(res, token)

      await userService.addUserLog(user.user_id, 'GOOGLE_LOGIN')

      const targetPath = isStudent
        ? process.env.FRONTEND_URL
        : process.env.FRONTEND_URL

      const redirectUrl = new URL('/select-app', targetPath)
      redirectUrl.searchParams.append('login', 'success')
      redirectUrl.searchParams.append('user_id', user.user_id)
      redirectUrl.searchParams.append('is_student', isStudent)

      return res.redirect(redirectUrl.toString())
    } catch (error) {
      console.error('Google Login Process Error:', error)
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=server_error`,
      )
    }
  })(req, res, next)
})

module.exports = router
