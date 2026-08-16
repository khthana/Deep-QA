const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const userModel = require("../models/userModel");

passport.serializeUser((user, done) => done(null, user.email));
passport.deserializeUser(async (email, done) => {
  try {
    const user = await userModel.findUserByEmail(email);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

const isProduction = process.env.NODE_ENV === "production";


const cleanBackendUrl = process.env.BACKEND_URL ? process.env.BACKEND_URL.replace(/\/$/, "") : "";

const CALLBACK_URL = isProduction 
  ? `${cleanBackendUrl}/api/auth/google/callback` 
  : "http://localhost:3000/api/auth/google/callback";

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: CALLBACK_URL,
  proxy: true 
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const allowedDomain = "@kmitl.ac.th";

    console.log("===== Google Profile Data =====");
    console.log(JSON.stringify(profile, null, 2));

    if (!email.endsWith(allowedDomain)) {
      return done(null, false, { message: `กรุณาใช้เมล ${allowedDomain} ในการเข้าใช้งาน` });
    }
    const user = await userModel.findUserByEmail(email);

    if (!user) {
      return done(null, false, { message: "ไม่พบข้อมูลผู้ใช้งานในระบบ กรุณาติดต่อเจ้าหน้าที่เพื่อลงทะเบียน" });
    }

    if (user.status === 'inactive') {
      return done(null, false, { message: "บัญชีนี้ถูกระงับการใช้งาน" });
    }

    if (!user.is_verified) {
      return done(null, false, { message: "บัญชีนี้ยังไม่ได้ผ่านการยืนยันตัวตน" });
    }

    /// Profile image /////
    const profilePicture = profile.photos && profile.photos.length > 0 
      ? profile.photos[0].value 
      : null;

    console.log("User Profile Image URL:", profilePicture);

    user.profile_picture = profilePicture;

    /// -------------  ///

    return done(null, user);
    
  } catch (err) {
    console.error("GoogleStrategy Error:", err);
    return done(err, null);
  }
}));