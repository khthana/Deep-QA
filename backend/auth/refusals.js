'use strict';

/**
 * Everything the server says when it will not do what was asked, in one place.
 *
 * One table rather than a message per module, because these are read by the
 * person in front of the screen and they have to sound like one system. It is
 * also the only way a change of wording is a change in one file: #8 left the
 * sign-in refusals here and the session's own two in session.js, and #9 would
 * have added a third site.
 *
 * None of them name a user other than the caller, a table, a column or an
 * identifier. A refusal tells the person what to do next - sign in again, ask
 * for a role, ask someone who has one - and nothing about how the server is
 * built. Ticket #9's second criterion asks for exactly that.
 */

const REFUSALS = {
  // Sign-in.
  domain: 'กรุณาใช้เมล @kmitl.ac.th ในการเข้าใช้งาน',
  unknown: 'ไม่พบข้อมูลผู้ใช้งานในระบบ กรุณาติดต่อเจ้าหน้าที่เพื่อลงทะเบียน',
  noRole: 'บัญชีนี้ยังไม่ได้รับสิทธิ์การใช้งาน กรุณาติดต่อเจ้าหน้าที่เพื่อกำหนดบทบาท',
  inactive: 'บัญชีนี้ถูกระงับการใช้งาน',
  unverified: 'บัญชีนี้ยังไม่ได้ผ่านการยืนยันตัวตน',
  credentials: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  passwordNotAllowed: 'บัญชีนี้ต้องเข้าสู่ระบบด้วยบัญชี Google ของ KMITL',
  googleUnavailable: 'ยังไม่ได้ตั้งค่าการเข้าสู่ระบบด้วย Google บนเซิร์ฟเวอร์นี้',

  // The session.
  noSession: 'ไม่พบการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่',
  expired: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
  invalidSession: 'การเข้าสู่ระบบไม่ถูกต้อง',

  // Authorisation. Deliberately the same message whichever of the two fails:
  // which roles an endpoint accepts, and which scope a record sits in, are
  // both things the caller learns nothing from being told.
  forbidden: 'บัญชีนี้ไม่มีสิทธิ์ใช้งานส่วนนี้',

  // The shell - #10. These three do name what went wrong, and may: all three
  // are about the caller's own account and their own choices, so there is
  // nobody else's business to leak. A role picker that answered "no" without
  // saying which of the two things was wrong would be unusable.
  roleNotHeld: 'บัญชีนี้ไม่ได้รับบทบาทที่เลือก',
  wrongPassword: 'รหัสผ่านเดิมไม่ถูกต้อง',
  weakPassword: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร',

  // What the error handler in app.js says. It names nothing, because an
  // unhandled throw is by definition something nobody decided the wording
  // of, and whatever is in the stack is not the caller's business.
  unexpected: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง',
};

module.exports = { REFUSALS };
