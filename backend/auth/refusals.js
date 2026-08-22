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
  // R005's time-boxed account, refused outside its window. Named rather than
  // folded into `inactive`, because the two need different things done about
  // them: an account that was suspended is a decision somebody made, and one
  // whose review round has ended needs its dates extended.
  outsideValidity: 'บัญชีนี้อยู่นอกช่วงเวลาที่กำหนดให้ใช้งาน',
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

  // The shell - #10, and #12's revoke. These three do name what went wrong,
  // and may: they are about a choice the caller made - their own acting role,
  // their own password, or a grant they just asked to undo and could already
  // see - so there is nobody else's business to leak. A role picker that answered "no" without
  // saying which of the two things was wrong would be unusable.
  roleNotHeld: 'บัญชีนี้ไม่ได้รับบทบาทที่เลือก',
  wrongPassword: 'รหัสผ่านเดิมไม่ถูกต้อง',
  weakPassword: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร',

  // Managing other people's accounts - #11. These name what is wrong with the
  // form that was sent, which is the caller's own submission and so nobody
  // else's business to leak. `userNotFound` is the exception worth reading
  // twice: it is also what an administrator gets for an account that exists
  // outside their scope, so the answer cannot be used to discover who exists
  // elsewhere in the university.
  userNotFound: 'ไม่พบบัญชีผู้ใช้ที่ระบุ',
  duplicateEmail: 'อีเมลนี้ถูกใช้งานแล้ว',
  duplicateUserId: 'รหัสผู้ใช้นี้ถูกใช้งานแล้ว',
  invalidUser: 'ข้อมูลบัญชีไม่ครบถ้วนหรือไม่ถูกต้อง',
  invalidValidity: 'ช่วงเวลาใช้งานไม่ถูกต้อง วันสิ้นสุดต้องไม่มาก่อนวันเริ่มต้น',
  // The roles the sign-in rule sends to the password form rather than to
  // Google. An account of one of those created without a password can sign in
  // by neither path, which is the state #11's second criterion rules out.
  passwordRequired: 'บทบาทนี้ต้องกำหนดรหัสผ่านตอนสร้างบัญชี',
  // A scope identifier that names nothing - #12. Not a leak: the caller was
  // told about their own typing, and the three scope tables are what
  // `/users/grantable` already hands them.
  scopeUnknown: 'ขอบเขตที่เลือกไม่มีอยู่ในระบบ',

  scopeNotYours: 'ไม่สามารถจัดการบัญชีนอกขอบเขตที่รับผิดชอบได้',
  roleNotAssignable: 'ไม่สามารถกำหนดบทบาทนี้ได้',
  importEmpty: 'ไม่พบข้อมูลในไฟล์ที่นำเข้า',
  importRejected: 'ไฟล์นำเข้ามีข้อผิดพลาด ระบบไม่ได้บันทึกรายการใด',
  // #56. The refusal for a file that is not this screen's template at all -
  // a programmes export dropped into the departments box. Every row of it
  // fails on the same missing field, and reporting that per row sends the
  // reader looking for bad data inside a file whose data is fine. The
  // sentence names the download button, because that is the way out.
  importWrongTemplate:
    'หัวคอลัมน์ในไฟล์ไม่ตรงกับแบบฟอร์มของหน้านี้ — ตรวจว่าดาวน์โหลดแบบฟอร์มมาจากหน้าถูกหรือไม่',

  // Departments - #14. `departmentNotFound` is `userNotFound`'s counterpart and
  // is given for the same two cases: a department that does not exist, and one
  // that exists in a faculty this administrator does not hold. `departmentInUse`
  // is the one refusal here that names a consequence rather than a mistake, and
  // has to: the caller asked to destroy a record that other records depend on,
  // and the useful thing to tell them is the way round it.
  departmentNotFound: 'ไม่พบภาควิชาที่ระบุ',
  duplicateDepartmentId: 'รหัสภาควิชานี้ถูกใช้งานแล้ว',
  invalidDepartment: 'ข้อมูลภาควิชาไม่ครบถ้วนหรือไม่ถูกต้อง',
  departmentInUse: 'ภาควิชานี้มีข้อมูลอื่นอ้างอิงอยู่ จึงลบไม่ได้ หากต้องการเลิกใช้งานให้ปิดการใช้งานแทน',
  facultyNotYours: 'ไม่สามารถจัดการภาควิชานอกคณะที่รับผิดชอบได้',

  // Programmes - #15. `programNotFound` covers both the programme that does not
  // exist and the one in a department this administrator does not hold, for the
  // same reason `departmentNotFound` does: a different answer for the second
  // would turn the route into a way of listing other departments' programmes.
  // `departmentNotYours` is the refusal for the other direction - the body
  // names the department a programme is to be filed under, and a department
  // administrator naming somebody else's is refused rather than obeyed.
  programNotFound: 'ไม่พบหลักสูตรที่ระบุ',
  duplicateProgramId: 'รหัสหลักสูตรนี้ถูกใช้งานแล้ว',
  invalidProgram: 'ข้อมูลหลักสูตรไม่ครบถ้วนหรือไม่ถูกต้อง',
  departmentNotYours: 'ไม่สามารถจัดการหลักสูตรนอกภาควิชาที่รับผิดชอบได้',

  // Subjects - #16. The catalogue entry, and the same three shapes as
  // programmes above: not found covers both the subject that does not exist and
  // the one in another department, a duplicate code is its own refusal because
  // the code is what the registrar knows a subject by, and
  // `subjectDepartmentNotYours` is the body naming a department this
  // administrator does not hold. It is a separate key from
  // `departmentNotYours` rather than a reuse of it because the sentence names
  // what is being managed, and a person told "หลักสูตร" while adding a รายวิชา
  // would go looking for a programme they never touched.
  subjectNotFound: 'ไม่พบรายวิชาที่ระบุ',
  duplicateSubjectId: 'รหัสวิชานี้ถูกใช้งานแล้ว',
  invalidSubject: 'ข้อมูลรายวิชาไม่ครบถ้วนหรือไม่ถูกต้อง',
  subjectDepartmentNotYours: 'ไม่สามารถจัดการรายวิชานอกภาควิชาที่รับผิดชอบได้',

  // Program Subjects - #18. The pair, not the two tables: `programNotYours` is
  // the หลักสูตร named by the body or the path being one this grant does not
  // hold, and it names รายวิชา because that is what the person was doing.
  // `programSubjectNotFound` covers both the pair that was never made and the
  // pair in somebody else's programme, for `subjectNotFound`'s reason.
  //
  // `subjectNotInCatalogue` is the third criterion in as many words, and is a
  // different sentence from `subjectNotFound` on purpose: the person did not
  // mistype a subject they maintain, they named one the university does not
  // teach, and the thing to do about it is to have it added to the catalogue
  // first. `subjectRetired` is the same mistake one step along - the code is
  // real and has been withdrawn - and would be actively misleading if it were
  // folded into the first.
  programSubjectNotFound: 'ไม่พบรายวิชานี้ในหลักสูตรที่ระบุ',
  duplicateProgramSubject: 'รายวิชานี้อยู่ในหลักสูตรนี้แล้ว',
  invalidProgramSubject: 'ข้อมูลรายวิชาในหลักสูตรไม่ครบถ้วนหรือไม่ถูกต้อง',
  subjectNotInCatalogue: 'ไม่พบรหัสวิชานี้ในคลังรายวิชา กรุณาเพิ่มรายวิชาเข้าคลังก่อน',
  subjectRetired: 'รายวิชานี้ถูกปิดการใช้งานแล้ว จึงเพิ่มเข้าหลักสูตรไม่ได้',
  programNotYours: 'ไม่สามารถจัดการรายวิชาในหลักสูตรที่ไม่ได้รับผิดชอบได้',

  // Students - #17. The central register. Four of the five are about one
  // student code and they are deliberately not one key. `duplicateStudentId`
  // is a typed form meeting a code the register already holds, which is a 409
  // and a refusal; `repeatedStudentId` is two rows of one spreadsheet claiming
  // it, which the database cannot see because an import that meets an existing
  // code updates it; `studentNotYours` is a code held in another department,
  // which answers neither of those because which department holds them is not
  // the caller's to learn; and `studentNotFound` is the read, covering both the
  // code nobody holds and the one somebody else does, for `subjectNotFound`'s
  // reason. `studentProgramNotYours` is the request naming a หลักสูตร this
  // administrator does not hold, separate from #18's `programNotYours` because
  // the sentence has to be about the student rather than the curriculum.
  studentNotFound: 'ไม่พบข้อมูลนักศึกษานี้',
  studentNotYours: 'ไม่สามารถบันทึกข้อมูลนักศึกษารหัสนี้ได้',
  duplicateStudentId: 'รหัสนักศึกษานี้มีอยู่ในระบบแล้ว',
  repeatedStudentId: 'รหัสนักศึกษาซ้ำกันภายในไฟล์',
  invalidStudent: 'ข้อมูลนักศึกษาไม่ครบถ้วน กรุณาตรวจสอบรหัสนักศึกษา (ตัวเลข 8 หลัก) ชื่อ นามสกุล และหลักสูตร',
  studentProgramNotYours: 'ไม่สามารถบันทึกนักศึกษาในหลักสูตรนี้ได้',

  // Offerings and Sections - #23. The screen that opens a รายวิชา for a term and
  // splits it into ตอนเรียน. Four things about this block are decisions rather
  // than wording.
  //
  // `subjectNotInProgram` is #18's `subjectNotInCatalogue` one tier down. The
  // catalogue holds the code and the person did not mistype it; it has not been
  // placed into this หลักสูตร, and what to do about it is to place it there
  // first. `subjectNotOffered` is the same mistake one step along, exactly as
  // `subjectRetired` is for the tier above: the pairing exists and has been
  // switched off.
  //
  // `offeringInUse` and `sectionInUse` say จึงลบไม่ได้ and stop, where every
  // refusal of this shape above them - `departmentInUse` and its neighbours -
  // goes on to offer switching the row off instead. Neither table has an
  // `is_active` column: an Offering is a fact about one term and a term that
  // happened cannot be un-happened, so there is nothing to offer and a sentence
  // offering it would describe a button that is not there.
  //
  // `teacherNotRegistered` is the fifth criterion in as many words. It names no
  // account, so a caller cannot use the assignment box to find out who is in
  // the register; what it says is what to do, which is to have the person
  // registered first. `teacherNotActive` is that person suspended, separate for
  // `subjectRetired`'s reason - the code is right and the answer is different.
  offeringNotFound: 'ไม่พบรายวิชาที่เปิดสอนตามที่ระบุ',
  duplicateOffering: 'รายวิชานี้ถูกเปิดสอนในปีการศึกษาและภาคการศึกษานี้แล้ว',
  invalidOffering: 'ข้อมูลการเปิดสอนไม่ครบถ้วน กรุณาตรวจสอบหลักสูตร รายวิชา ปีการศึกษา (ตัวเลข 4 หลัก) และภาคการศึกษา (1 2 หรือ 3)',
  subjectNotInProgram: 'รายวิชานี้ยังไม่อยู่ในหลักสูตรที่เลือก กรุณาเพิ่มเข้าหลักสูตรก่อนจึงจะเปิดสอนได้',
  subjectNotOffered: 'รายวิชานี้ถูกปิดการใช้งานในหลักสูตรแล้ว จึงเปิดสอนไม่ได้',
  offeringNotYours: 'ไม่สามารถจัดการการเปิดสอนในหลักสูตรที่ไม่ได้รับผิดชอบได้',
  offeringInUse: 'รายวิชาที่เปิดสอนนี้มีนักศึกษาลงทะเบียนหรือมีการบันทึกคะแนนแล้ว จึงลบไม่ได้',
  sectionNotFound: 'ไม่พบตอนเรียนที่ระบุ',
  duplicateSectionNumber: 'ตอนเรียนนี้มีอยู่ในรายวิชาที่เปิดสอนนี้แล้ว',
  invalidSection: 'ข้อมูลตอนเรียนไม่ครบถ้วนหรือไม่ถูกต้อง',
  sectionInUse: 'ตอนเรียนนี้มีนักศึกษาลงทะเบียนหรือมีการบันทึกคะแนนแล้ว จึงลบไม่ได้',
  teacherNotRegistered: 'ไม่พบผู้ใช้งานตามรหัสที่ระบุ ผู้สอนต้องถูกลงทะเบียนเป็นผู้ใช้งานก่อนจึงจะกำหนดให้สอนได้',
  teacherNotActive: 'บัญชีผู้ใช้งานนี้ถูกระงับการใช้งาน จึงกำหนดให้สอนไม่ได้',

  // What the error handler in app.js says. It names nothing, because an
  // unhandled throw is by definition something nobody decided the wording
  // of, and whatever is in the stack is not the caller's business.
  unexpected: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง',
};

module.exports = { REFUSALS };
