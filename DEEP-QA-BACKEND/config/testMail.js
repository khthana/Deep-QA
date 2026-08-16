require('dotenv').config();
const nodemailer = require('nodemailer');

// เช็คว่าตัวแปร env โหลดมาหรือยัง
console.log("EMAIL_USER =", process.env.EMAIL_USER);
console.log("EMAIL_PASS =", process.env.EMAIL_PASS ? "****" : undefined);

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // ใช้ TLS
  auth: {
    user: process.env.EMAIL_USER,  // อีเมล Gmail
    pass: process.env.EMAIL_PASS,  // รหัสผ่านหรือ App Password
  },
});

(async () => {
  try {
    let info = await transporter.sendMail({
      from: `"Your Name" <${process.env.EMAIL_USER}>`,
      to: "66015095@kmitl.ac.th",  // เปลี่ยนเป็นอีเมลที่ต้องการส่ง
      subject: "Hello ✔",
      text: "Hello world, this is a real email!",
      html: "<b>Hello world, this is a real email!</b>",
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
})();
