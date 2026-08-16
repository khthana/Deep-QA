// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;
const userModel = require("../models/userModel");
const { setTokenCookie } = require("../utils/cookieHelper");

exports.verifyToken = (req, res, next) => {

  const token = req.cookies?.token;

  if (!token)
    return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);

    const now = Math.floor(Date.now() / 1000);

    const remainingTime = decoded.exp - now;

    if (remainingTime < 600) {

      const newToken = jwt.sign(
        {
          user_id: decoded.user_id,
          email: decoded.email,
          title_th: decoded.title_th,
          first_name_en: decoded.first_name_en,
          last_name_en: decoded.last_name_en,
          first_name_th: decoded.first_name_th,
          last_name_th: decoded.last_name_th,
        },
        SECRET_KEY,
        { expiresIn: "30m" }
      );

      setTokenCookie(res, newToken);
    }

    req.user = decoded;
    next();

  } catch (err) {
    if (err.name === "TokenExpiredError")
      return res.status(401).json({ message: "Session expired" });

    return res.status(403).json({ message: "Invalid token" });
  }
};


// middleware/authMiddleware.js
exports.blockDirectAccess = (req, res, next) => {
  // ถ้าไม่ใช่ Production (เช่น รัน localhost) ให้ผ่านไปได้เลย ไม่ต้องบล็อก
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  const origin = req.headers.origin || req.headers.referer;
  const frontendUrl = process.env.FRONTEND_URL;

  // ถ้ามาจากหน้าบ้านเราจริง ให้ผ่าน
  if (origin && origin.startsWith(frontendUrl)) {
    return next();
  }

  // ถ้าพิมพ์ URL มาตรงๆ ในเบราว์เซอร์ ให้ดีดไปหน้าเว็บหน้าบ้าน
  res.redirect(`${frontendUrl}/page-not-found`);
};