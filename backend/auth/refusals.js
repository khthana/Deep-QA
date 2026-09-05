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

  // A path this server does not have - #95. It is the only refusal here that
  // is about the server rather than about the caller's data, and it earns its
  // place for the reason the rest do: it is read by a person at a screen. The
  // sentence names what is actually wrong, because the wrong sentence cost an
  // hour of looking at cookies, ports and the database while the only thing
  // missing was a restart after a route was added. It names no path: which
  // paths exist is not something an unknown caller is told.
  routeNotFound: 'ไม่พบเส้นทางที่เรียกบนเซิร์ฟเวอร์นี้ เซิร์ฟเวอร์อาจยังไม่ได้อัปเดต',

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

  // Programme Learning Outcomes - #19. What a graduate of a หลักสูตร can do,
  // as a tree. Five keys, and four of them are decisions rather than wording.
  //
  // `ploNotFound` covers the outcome that was never made and the one in a
  // หลักสูตร this caller does not hold, for `programSubjectNotFound`'s reason:
  // telling the two apart would turn the address bar into a way of learning
  // which codes another curriculum uses.
  //
  // `duplicatePloCode` says ในหลักสูตรนี้ and the phrase is the whole ticket.
  // The inherited schema made outcome_code globally unique, which stopped two
  // curricula each having a PLO1 - the thing curricula actually do. The
  // sentence has to say that the collision is local, or the person reads it as
  // the old refusal and renames an outcome that did not need renaming.
  //
  // `ploParentNotFound` is a parent named in another หลักสูตร or not at all.
  // The composite foreign key already makes the first impossible, so this key
  // exists to produce a sentence rather than to provide the safety - the same
  // argument ADR-0003 makes for subject_clo.
  //
  // `ploParentCycle` is a tree refusing to stop being one: an outcome made a
  // child of its own descendant. No foreign key can see this, so it is the one
  // check here that is load-bearing.
  //
  // `ploHasChildren` is a deletion refused rather than turned into a
  // deactivation. Every other master-data screen lets deleteOrDeactivate turn
  // a foreign key violation into "switched off instead", and for a mapping or
  // a CLO that is right. For a sub-outcome it is not: the person asked to
  // remove a main outcome, and switching it off while its ข้อย่อย stay listed
  // underneath is an outcome nobody asked for and nobody would notice. So the
  // children are asked about first and the answer says what to do.
  ploNotFound: 'ไม่พบผลการเรียนรู้ที่ระบุ',
  duplicatePloCode: 'รหัสผลการเรียนรู้นี้มีอยู่ในหลักสูตรนี้แล้ว',
  invalidPlo: 'ข้อมูลผลการเรียนรู้ไม่ครบถ้วน กรุณาตรวจสอบรหัส ชื่อ ประเภท และลำดับการแสดงผล',
  ploProgramNotYours: 'ไม่สามารถจัดการผลการเรียนรู้ของหลักสูตรที่ไม่ได้รับผิดชอบได้',
  ploParentNotFound: 'ไม่พบผลการเรียนรู้ที่จะใช้เป็นข้อหลัก หรือข้อนั้นอยู่คนละหลักสูตร',
  ploParentCycle: 'ไม่สามารถย้ายผลการเรียนรู้ไปอยู่ใต้ข้อย่อยของตัวเองได้',
  ploHasChildren: 'ผลการเรียนรู้ข้อนี้ยังมีข้อย่อยอยู่ กรุณาลบข้อย่อยก่อน',

  // Outcome-to-Subject mapping - #20. How strongly each รายวิชา of a หลักสูตร
  // serves each PLO of it, as a grid. Four keys, and three of them are
  // decisions rather than wording.
  //
  // `mappingProgramNotYours` is its own key rather than #19's
  // `ploProgramNotYours`, because the two sentences are about different verbs.
  // A person refused here was not writing an outcome; they were saying which
  // subject serves one. Reusing #19's would tell them to go and look at a
  // screen they were not on.
  //
  // `mappingSubjectNotInProgram` and `mappingOutcomeNotInProgram` are two keys
  // for what the composite foreign keys would refuse as one violation. They are
  // separate because they are different mistakes on different axes - a row that
  // is not on this grid, and a column that is not - and a person who has just
  // been told "not in this curriculum" needs to know which of the two they got
  // wrong. Neither provides the safety; the keys on subject_plo_mapping do.
  // This is ADR-0003's argument for subject_clo, applied twice.
  //
  // `invalidMapping` names the level rather than the cell, because that is the
  // field a person can get wrong: the row and the column are chosen by clicking
  // a grid the server drew, and the level is chosen from a list.
  //
  // `mappingProgramMissing` is separate from it, and the separation is the point.
  // Reading a grid and writing a cell fail differently: a read that names no
  // หลักสูตร has one field missing, and telling that caller to supply a
  // รายวิชา, an outcome and a level is three instructions they cannot act on
  // and one they can. Asking for every curriculum at once is not what the empty
  // query string means either - the columns of one are not the columns of
  // another, so there is no grid of all of them to ask for.
  mappingProgramNotYours: 'ไม่สามารถจัดการการเชื่อมโยงผลการเรียนรู้ของหลักสูตรที่ไม่ได้รับผิดชอบได้',
  mappingSubjectNotInProgram: 'ไม่พบรายวิชานี้ในหลักสูตรที่ระบุ',
  mappingOutcomeNotInProgram: 'ไม่พบผลการเรียนรู้ข้อนี้ในหลักสูตรที่ระบุ',
  mappingProgramMissing: 'กรุณาระบุหลักสูตรที่ต้องการดูการเชื่อมโยง',
  invalidMapping: 'ข้อมูลการเชื่อมโยงไม่ครบถ้วน กรุณาระบุหลักสูตร รายวิชา ผลการเรียนรู้ และระดับที่เป็นหนึ่งใน E, I, D, P, A',

  // Rubrics - #21. The หลักสูตร's reusable scoring guides. Four keys, and the
  // first of them is the one that copying #19 would get exactly backwards.
  //
  // `duplicateRubricCode` says ทั้งระบบ, which is the opposite of what
  // `duplicatePloCode` says four lines above it. `rubrics.rubric_code` is
  // UNIQUE on its own and not within a หลักสูตร, and 0003 gives the reason: the
  // inherited findRubricByCode(rubric_code) is handed a code with no curriculum
  // beside it, so a code meaning one thing in one หลักสูตร and another
  // elsewhere would resolve to whichever row was found first. The sentence has
  // to name the wider scope, or a กรรมการหลักสูตร who reads ถูกใช้งานแล้ว
  // searches their own list, finds nothing holding that code, and concludes the
  // screen is lying to them. It is the only refusal on this system that has to
  // tell a person about a row they are not allowed to see.
  //
  // `rubricNotFound` covers the rubric that was never made and the one in a
  // หลักสูตร this caller does not hold, for `ploNotFound`'s reason.
  //
  // `invalidRubric` names all four fields the form can get wrong, because the
  // route answers one key for all of them: a message that said only
  // ข้อมูลไม่ครบถ้วน would leave the person hunting which box it meant.
  //
  // `rubricProgramNotYours` is the body naming a หลักสูตร this account does not
  // hold. Separate from #18's `programNotYours` and #19's `ploProgramNotYours`
  // because the sentence names what is being managed, and a person who is
  // refused wants to read the noun they were working on.
  rubricNotFound: 'ไม่พบ Rubric ที่ระบุ',
  duplicateRubricCode: 'รหัส Rubric นี้ถูกใช้งานแล้ว รหัส Rubric ห้ามซ้ำกันทั้งระบบ ไม่ใช่เฉพาะภายในหลักสูตรนี้',
  invalidRubric: 'ข้อมูล Rubric ไม่ครบถ้วน กรุณาตรวจสอบรหัส ชื่อภาษาไทย ชื่อภาษาอังกฤษ และลำดับการแสดงผล',
  rubricProgramNotYours: 'ไม่สามารถจัดการ Rubric ของหลักสูตรที่ไม่ได้รับผิดชอบได้',

  // Rubric criteria - #22. Two keys, and neither of them is about a
  // หลักสูตร: `rubric_details` holds no program_id, so what a caller may
  // write is settled entirely by the rubric named in the address, and the four
  // keys above already say everything there is to say about that rubric.
  //
  // `criterionNotFound` covers three things a screen cannot tell apart and
  // should not be able to: the criterion that was never made, the one addressed
  // by something that is not a number, and the one that exists under a
  // different rubric than the address names. The third is the one worth
  // spelling out - a criterion is reachable only through its own rubric, and
  // saying ไม่พบ rather than ไม่ใช่ของ Rubric นี้ keeps the address bar from
  // reporting which ids exist.
  //
  // `invalidCriterion` names the four bands as well as the names and the
  // weight, because all four descriptions are required by this route and by
  // nothing in the schema: the columns are nullable text. A person who read
  // ข้อมูลไม่ครบถ้วน alone would look at the two name boxes and not at the
  // four description boxes below them.
  criterionNotFound: 'ไม่พบเกณฑ์การให้คะแนนที่ระบุ',
  invalidCriterion:
    'ข้อมูลเกณฑ์ไม่ครบถ้วน กรุณาตรวจสอบชื่อภาษาไทย ชื่อภาษาอังกฤษ น้ำหนัก ลำดับการแสดงผล และคำอธิบายทั้งสี่ระดับ',

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
  subjectClosed: 'รายวิชานี้ถูกปิดการใช้งานในคลังรายวิชาแล้ว จึงเปิดสอนไม่ได้',
  offeringNotYours: 'ไม่สามารถจัดการการเปิดสอนในหลักสูตรที่ไม่ได้รับผิดชอบได้',
  offeringInUse: 'รายวิชาที่เปิดสอนนี้มีนักศึกษาลงทะเบียน มีการบันทึกคะแนน หรือมีแผนการสอนรายสัปดาห์แล้ว จึงลบไม่ได้',
  sectionNotFound: 'ไม่พบตอนเรียนที่ระบุ',
  duplicateSectionNumber: 'ตอนเรียนนี้มีอยู่ในรายวิชาที่เปิดสอนนี้แล้ว',
  invalidSection: 'ข้อมูลตอนเรียนไม่ครบถ้วนหรือไม่ถูกต้อง',
  sectionInUse: 'ตอนเรียนนี้มีนักศึกษาลงทะเบียน มีการบันทึกคะแนน หรือมีแผนการสอนรายสัปดาห์แล้ว จึงลบไม่ได้',
  teacherNotRegistered: 'ไม่พบผู้ใช้งานตามรหัสที่ระบุ ผู้สอนต้องถูกลงทะเบียนเป็นผู้ใช้งานก่อนจึงจะกำหนดให้สอนได้',
  teacherNotActive: 'บัญชีผู้ใช้งานนี้ถูกระงับการใช้งาน จึงกำหนดให้สอนไม่ได้',

  // Section results - #36. A year is refused rather than dropped, because
  // dropping it draws a chart missing a line the person asked for and says
  // nothing about why. The one sentence covers the year that has no offering
  // of this Subject, the year whose CLO numbers are not this year's, the year
  // with nothing marked in it, and this Section's own year - all four are
  // *there is nothing here that can be drawn on these axes*, and separating
  // them would tell a caller which years exist elsewhere in the faculty.
  yearNotComparable:
    'ปีการศึกษาที่เลือกเทียบกับปีนี้ไม่ได้ เพราะไม่มีผลการเรียนรู้รายวิชาชุดเดียวกันที่บันทึกคะแนนไว้',

  // Course Learning Outcomes - #27. ADR-0003 puts the CLO set at the
  // (Program, Subject, academic year) grain, so none of these name a Section
  // even though a Section id is what the caller arrived holding: the thing
  // being refused belongs to the Offering, and a sentence naming the class the
  // person is standing in front of would describe the wrong scope.
  //
  // `cloNotFound` covers the CLO that does not exist and the CLO of another
  // Subject or another year, for `sectionNotFound`'s reason one tier up.
  //
  // `ploNotMapped` is the second criterion in a sentence. It is a 400 and not a
  // 403: the person holds everything they need to hold, and what is wrong is
  // the PLO they picked - the coverage grid has not placed it on this รายวิชา,
  // and the way out is through the committee that owns the grid. Saying so is
  // no leak, because the same request already told them the code.
  //
  // The three removal refusals are three states, not one. The database
  // collapses them: `activity_clo_mapping` restricts as soon as a mapping
  // exists whether a mark was ever entered or not, and
  // `clo_course_cycle_detail_cloplan` cascades, so a CLO carrying a weekly plan
  // would be deleted along with it and nobody told. The route therefore looks
  // for all three itself, before the DELETE, and each sentence names a
  // different way out - unmark, unmap, or take it off the plan. The eighth
  // criterion asks only for the first; the other two exist because a 23503
  // reaching the error handler would answer เกิดข้อผิดพลาดในระบบ for a thing
  // the person could have fixed.
  cloNotFound: 'ไม่พบผลการเรียนรู้รายวิชาที่ระบุ',
  duplicateCloNumber: 'รหัสผลการเรียนรู้นี้ถูกใช้ในรายวิชาและปีการศึกษานี้แล้ว',
  invalidClo: 'ข้อมูลผลการเรียนรู้ไม่ครบถ้วน กรุณาตรวจสอบรหัสและรายละเอียด',
  ploNotMapped: 'ผลการเรียนรู้ของหลักสูตรข้อนี้ยังไม่ถูกผูกกับรายวิชานี้ จึงเลือกไม่ได้',
  cloHasScores: 'ผลการเรียนรู้ข้อนี้มีคะแนนบันทึกไว้แล้ว จึงลบไม่ได้',
  cloInUse: 'ผลการเรียนรู้ข้อนี้ถูกผูกไว้กับกิจกรรมการวัดผล จึงลบไม่ได้ ให้ยกเลิกการผูกที่กิจกรรมก่อน',
  cloInPlan: 'ผลการเรียนรู้ข้อนี้ถูกอ้างถึงในแผนการสอนรายสัปดาห์ จึงลบไม่ได้ ให้นำออกจากแผนก่อน',

  // Measurable Behaviors - #28. พฤติกรรมบ่งชี้ hangs off its CLO and off
  // nothing else, so `behaviorNotFound` covers the row that does not exist and
  // the row that belongs to another CLO, for `cloNotFound`'s reason one tier
  // down. `invalidBehavior` names the three fields the form owns; the two
  // enums would refuse a stray value too, but as a 22P02 raised into
  // `unexpected`, which is the wrong sentence for a value a person picked.
  behaviorNotFound: 'ไม่พบพฤติกรรมบ่งชี้ที่ระบุ',
  invalidBehavior:
    'ข้อมูลพฤติกรรมบ่งชี้ไม่ครบถ้วนหรือไม่ถูกต้อง กรุณาตรวจสอบรายละเอียด ระดับพุทธิพิสัย และประเภทกิจกรรมการเรียนรู้',

  // Achievement Criteria - #29. เกณฑ์การบรรลุผล hangs off its CLO exactly as a
  // พฤติกรรมบ่งชี้ does, so `achievementNotFound` covers the same two cases
  // `behaviorNotFound` does. It is a different key from #22's
  // `criterionNotFound` on purpose: that sentence says เกณฑ์การให้คะแนน, and a
  // Teacher told about a scoring rubric while editing attainment bands would
  // go looking at a screen they were not on. `invalidAchievement` names the
  // two required fields and not the optional description; the CHECK on the
  // band would refuse a stray value too, but as a 23514 raised into
  // `unexpected`, which is the wrong sentence for a value a person picked.
  achievementNotFound: 'ไม่พบเกณฑ์การบรรลุผลที่ระบุ',
  invalidAchievement:
    'ข้อมูลเกณฑ์การบรรลุผลไม่ครบถ้วนหรือไม่ถูกต้อง กรุณาตรวจสอบระดับการบรรลุผลและเกณฑ์การประเมิน',

  // Continuous improvement plan - #41. แผนการปรับปรุงอย่างต่อเนื่อง sits at the
  // same (Program, Subject, academic year) grain the CLO set does, so
  // `improvementEntryNotFound` covers the entry that does not exist and the
  // entry belonging to another ปีการศึกษา of the same รายวิชา, for
  // `cloNotFound`'s reason one table over.
  //
  // `invalidImprovementEntry` names the two fields a person fills and the one
  // they pick, and covers a third case they cannot reach from the screen: a
  // `detail_type` outside the four. The CHECK would refuse that too, but as a
  // 23514 raised into `unexpected` - and this route's caller may equally have
  // sent no type at all, which the CHECK never sees because the column is NOT
  // NULL and the failure is a 23502. One sentence for both, because from the
  // screen they are one mistake: a section of the form that was not chosen.
  improvementEntryNotFound: 'ไม่พบรายการของแผนการปรับปรุงที่ระบุ',
  invalidImprovementEntry:
    'ข้อมูลแผนการปรับปรุงไม่ครบถ้วนหรือไม่ถูกต้อง กรุณาตรวจสอบผลการเรียนรู้ หัวข้อ และข้อความ',

  // Section enrolment - #25. The class list a Teacher builds for their own
  // ตอนเรียน. None of these is one of #17's, which is the whole point of the
  // block: the register and the class list are two different questions about
  // one student code, and the sentences have to say which one is being
  // answered. The one key this block does *not* add is the spreadsheet naming
  // one code twice - that is `repeatedStudentId` above, unchanged, because the
  // mistake is a property of the file rather than of either question.
  //
  // `studentNotInRegister` is the third criterion in as many words. #17's
  // `studentNotFound` says only that the code was not found, which on this
  // screen reads as "not in this class" - the very thing the person is trying
  // to change. So this one names the register as the place to add them, because
  // what to do next is to go there, and doing it here would create the
  // half-formed student record the ticket exists to prevent.
  //
  // `duplicateEnrolment` is not `duplicateStudentId` for the same reason
  // inverted: the code is in the register, correctly, and what is already there
  // is the enrolment. The database refuses it either way - ADR-0001 tier 2 made
  // (student_id, section_id) the key - and this is the sentence that 23505 is
  // turned into.
  //
  // The two removal refusals mirror `cloHasScores` and `cloInUse` one grain
  // down, and they exist for the reason those do: nothing references
  // `student_course`, so a DELETE would succeed and leave the marks and the
  // group membership pointing at somebody no longer in the class. The route
  // looks for both itself, before the DELETE, and each names its own way out.
  studentNotInRegister:
    'ไม่พบรหัสนี้ในทะเบียนนักศึกษากลาง กรุณาเพิ่มนักศึกษาที่หน้าข้อมูลนักศึกษากลางก่อน',
  duplicateEnrolment: 'นักศึกษาคนนี้อยู่ในตอนเรียนนี้แล้ว',
  enrolmentHasScores:
    'นักศึกษาคนนี้มีคะแนนบันทึกไว้แล้ว จึงนำออกจากตอนเรียนไม่ได้',
  enrolmentInGroup:
    'นักศึกษาคนนี้อยู่ในกลุ่มงานของตอนเรียนนี้ จึงนำออกไม่ได้ ให้นำออกจากกลุ่มก่อน',
  invalidEnrolment:
    'รหัสนักศึกษาไม่ถูกต้อง กรุณาตรวจสอบรหัสนักศึกษา (ตัวเลข 8 หลัก)',

  // Work groups - #26. กลุ่มงาน, Section-bound like the class list above and
  // for the same reason: two ตอนเรียน are two rooms, and a group spanning them
  // would be a group nobody can meet with.
  //
  // Three of these are functions, which is more than any other block here, and
  // each one is a criterion that says *name it*. BR-06's ceiling is named
  // rather than implied because "เพิ่มไม่ได้" over a full group reads as a
  // fault; BR-07's other group is named because the person is looking at a
  // roll of fifty-seven and cannot see where else the student already is; and
  // a deletion names its member count because that is the number the
  // confirmation is really about.
  //
  // `studentInAnotherGroup` points at the move rather than at the removal, and
  // that sentence is the ticket's fifth criterion in the negative: a screen
  // that answered this by quietly moving the student would be the delete-and-
  // add the criterion forbids, and the history would lose the fact that
  // somebody was moved at all.
  //
  // `studentNotGrouped` is its mirror and exists for the same reason - a move
  // has a place to come from, and a request to move somebody who is in no
  // group is an add that has been asked for by the wrong verb. Answering it
  // with the add would be the same silent guess in the other direction.
  //
  // `groupNotEmpty` is *not* here. Deleting a group takes its members out
  // rather than refusing, and writes their removals to the log before it goes -
  // see `routes/workGroups.js`. Nothing is lost by that delete: the students
  // stay enrolled, and their marks were never the group's.
  groupNotFound: 'ไม่พบกลุ่มงานที่ระบุ',
  invalidGroup: 'ชื่อกลุ่มงานไม่ถูกต้อง กรุณาตั้งชื่อกลุ่ม ความยาวไม่เกิน 100 ตัวอักษร',
  duplicateGroupName: 'ชื่อกลุ่มงานนี้มีอยู่ในตอนเรียนนี้แล้ว',
  groupFull: (groupName) =>
    `กลุ่ม "${groupName}" มีนักศึกษาครบ 10 คนแล้ว กลุ่มงานหนึ่งกลุ่มรับได้ไม่เกิน 10 คน`,
  studentInAnotherGroup: (groupName) =>
    `นักศึกษาคนนี้อยู่ในกลุ่ม "${groupName}" ของตอนเรียนนี้แล้ว หนึ่งคนอยู่ได้กลุ่มเดียว หากต้องการเปลี่ยนกลุ่มให้ใช้คำสั่งย้ายมากลุ่มนี้`,
  studentNotEnrolled: 'นักศึกษาคนนี้ไม่ได้อยู่ในตอนเรียนนี้ กรุณาเพิ่มเข้าตอนเรียนก่อนจึงจะจัดกลุ่มได้',
  studentNotInGroup: 'ไม่พบนักศึกษาคนนี้ในกลุ่มงานนี้',
  studentNotGrouped:
    'นักศึกษาคนนี้ยังไม่ได้อยู่ในกลุ่มใดของตอนเรียนนี้ จึงย้ายไม่ได้ ให้เพิ่มเข้ากลุ่มแทน',
  studentAlreadyHere: 'นักศึกษาคนนี้อยู่ในกลุ่มนี้อยู่แล้ว',

  // Weighting scheme - #30. สัดส่วนคะแนน, saved whole because the hundred
  // rule is about the whole. Two of these are functions — the first in this
  // file — and each earns it: the ticket's second criterion says the refusal
  // states the current total, and a person told a deletion was refused needs
  // to read which หมวด it was about, since the save they sent named several.
  // The wording still lives here and only here; a function is one sentence
  // with a hole in it, not a second site.
  //
  // `weightNotFound` is the pairing refusal one grain over from
  // `behaviorNotFound`: an id in the body that this Offering does not hold,
  // whether it was never made or belongs to another year's scheme.
  invalidWeight:
    'ข้อมูลสัดส่วนคะแนนไม่ครบถ้วนหรือไม่ถูกต้อง กรุณาตรวจสอบชื่อหมวดคะแนนและน้ำหนัก (จำนวนเต็ม 0 ถึง 100)',
  duplicateWeightCategory: 'ชื่อหมวดคะแนนซ้ำกัน',
  weightNotFound: 'ไม่พบหมวดคะแนนที่ระบุ',
  weightsNotHundred: (total) =>
    `น้ำหนักทุกหมวดรวมกันต้องเท่ากับ 100 ขณะนี้รวมได้ ${total} ระบบไม่ได้บันทึกการแก้ไข`,
  weightInUse: (category) =>
    `หมวดคะแนน "${category}" มีกิจกรรมการวัดผลอ้างอิงอยู่ จึงลบไม่ได้ ให้ย้ายหรือลบกิจกรรมในหมวดนี้ก่อน`,

  // Teaching plan - #31. แผนการสอน, Section-bound. `weekInUse` is a function
  // for `weightInUse`'s reason: the person deleted one week of a plan that
  // holds many, and the sentence has to name which one was refused. The week
  // number is the person's own (the schema deliberately has no key on it - a
  // week may hold several topics), which is why `invalidWeek` speaks about
  // the number's shape and not about collisions.
  invalidWeek:
    'ข้อมูลแผนการสอนไม่ครบถ้วนหรือไม่ถูกต้อง กรุณาตรวจสอบสัปดาห์ (จำนวนเต็มตั้งแต่ 1) และหัวข้อ',
  weekNotFound: 'ไม่พบสัปดาห์ที่ระบุ',
  weekInUse: (weekNo) =>
    `สัปดาห์ที่ ${weekNo} มีกิจกรรมการวัดผลอ้างอิงอยู่ จึงลบไม่ได้ ให้ย้ายหรือลบกิจกรรมออกจากสัปดาห์นี้ก่อน`,

  // Activities - #32. กิจกรรมการเรียนรู้, Section-bound like the plan. Two
  // refusals stand between a delete and a loss, and they are two because the
  // schema fails in two different directions underneath them.
  //
  // `activityHasMarks` guards a CASCADE: the delete would succeed and take a
  // cohort's marks with it, silently, so the sentence does not offer a way to
  // remove the marks first (there is none, and there should be none) - it
  // says what would be lost and why the answer is no.
  //
  // `activityHasEvidence` guards a RESTRICT: the database would refuse on its
  // own, but as 23503 through the error handler, which reads as
  // เกิดข้อผิดพลาดในระบบ for something a person can fix. The ticket asks for
  // the evidence to be named, so the sentence carries a file name - and the
  // count, because soft-deleted evidence still pins the row and a person
  // looking at an empty evidence screen deserves to know that.
  activityNotFound: 'ไม่พบกิจกรรมที่ระบุ',
  activityHasMarks: (marks) =>
    `กิจกรรมนี้มีคะแนนที่บันทึกไว้แล้ว ${marks} รายการ การลบกิจกรรมจะลบคะแนนทั้งหมดไปด้วย จึงไม่อนุญาตให้ลบ`,
  activityHasEvidence: (fileName, count) =>
    `กิจกรรมนี้มีหลักฐานการประเมินแนบอยู่ (${fileName}${count > 1 ? ` และอีก ${count - 1} ไฟล์` : ''}) จึงลบไม่ได้ ให้ลบหลักฐานออกก่อน`,

  // Assessment evidence - #35. Two of these five sentences exist because of a
  // security defect rather than because of a form field.
  //
  // `evidenceNotPdf` is BR-15, and it is deliberately about the file and not
  // about its name: the extension and the Content-Type are the uploader's to
  // write, so the check is on the first five bytes and the sentence has to be
  // true of a PNG called `brief.pdf`. Saying "นามสกุลไฟล์ไม่ถูกต้อง" would be
  // a sentence the check does not make.
  //
  // `evidenceNotFound` is the one a caller gets for a file that is not theirs,
  // for one that has been removed, and for one that never existed - the same
  // sentence for all three, `sectionNotFound`'s reason: which evidence rows
  // exist is not something an unentitled caller learns by being refused.
  evidenceNotFound: 'ไม่พบหลักฐานที่ระบุ',
  evidenceNoFile: 'กรุณาแนบไฟล์',
  evidenceUploadUnreadable: 'อ่านไฟล์ที่แนบมาไม่ได้ กรุณาแนบใหม่อีกครั้ง',
  evidenceNotPdf: 'หลักฐานการประเมินรองรับเฉพาะไฟล์ PDF เท่านั้น ไฟล์ที่แนบมาไม่ใช่ PDF',
  evidenceTooLarge: (megabytes) =>
    `ไฟล์มีขนาดเกินที่ระบบรับได้ ขนาดสูงสุดคือ ${megabytes} MB`,
  evidenceTypeUnknown: 'ประเภทหลักฐานไม่ถูกต้อง กรุณาเลือกจากรายการที่มีให้',
  // The row survived and its bytes did not, which is the one evidence failure
  // that is nobody's mistake. It is separated from ไม่พบ because the answer is
  // different: a file that was never uploaded is uploaded, and this one is
  // reported.
  evidenceFileMissing: 'ไฟล์นี้หายไปจากที่จัดเก็บ กรุณาแจ้งผู้ดูแลระบบ',

  // Activity editor - #33. Writing the work, and attributing it to the
  // outcomes it assesses. Four refusals here are one refusal in four places -
  // an id in the body belonging to a grain the caller is not on - and three of
  // them reuse the sentence a neighbouring ticket already owns, because the
  // thing refused is the same thing: `weightNotFound` for a หมวดคะแนน of
  // another Offering (#30), `weekNotFound` for a week of another Section
  // (#31), `cloNotFound` for a CLO of another Subject or year (#27). One word
  // for one thing, as CONTEXT.md asks; a fourth spelling of ไม่พบ would only
  // be a fourth thing to keep in step.
  //
  // `duplicateActivityClo` names the CLO because the save carried several rows
  // and the person has to know which one to fix. `activityCloWeights` names
  // the total for `weightsNotHundred`'s reason, but says เกิน rather than
  // demanding exactly a hundred: a weight is a share of this Activity's mark,
  // so more than the whole is impossible, while less than the whole is a
  // half-finished attribution somebody is entitled to save and come back to.
  //
  // `activityCloHasMarks` guards what the schema does not. `activity_scores`
  // references `subject_clo` directly rather than the mapping row, so taking a
  // marked CLO off an Activity leaves a cohort's marks attributed to an
  // outcome the Activity no longer claims to assess, and no foreign key says a
  // word. It is `cloHasScores` one grain down, and it offers no way out for
  // the same reason `activityHasMarks` does not.
  invalidActivity:
    'ข้อมูลกิจกรรมไม่ครบถ้วนหรือไม่ถูกต้อง กรุณาตรวจสอบชื่อกิจกรรม ประเภท (งานเดี่ยวหรืองานกลุ่ม) คะแนนเต็ม และวันที่',
  invalidActivityClo:
    'ข้อมูลการเชื่อมโยงผลการเรียนรู้ไม่ถูกต้อง กรุณาตรวจสอบผลการเรียนรู้ที่เลือกและน้ำหนัก (จำนวนเต็ม 0 ถึง 100)',
  activityCloNeedsCategory: 'ต้องเลือกหมวดคะแนนของกิจกรรมก่อน จึงจะเชื่อมโยงผลการเรียนรู้ได้',
  duplicateActivityClo: (cloNumber) =>
    `ผลการเรียนรู้ ${cloNumber} ถูกเพิ่มไว้มากกว่าหนึ่งครั้ง หนึ่งข้อเพิ่มได้ครั้งเดียวต่อกิจกรรม`,
  activityCloWeights: (total) =>
    `น้ำหนักของผลการเรียนรู้ในกิจกรรมนี้รวมกันต้องไม่เกิน 100 ขณะนี้รวมได้ ${total} ระบบไม่ได้บันทึกการแก้ไข`,
  activityCloHasMarks: (cloNumber) =>
    `ผลการเรียนรู้ ${cloNumber} มีคะแนนบันทึกไว้ในกิจกรรมนี้แล้ว จึงนำออกจากกิจกรรมไม่ได้`,

  // Marks — #34. คะแนนกิจกรรมการเรียนรู้, where a grid meets two toggles.
  //
  // Most of these are functions, and they are functions for one reason: a
  // teacher correcting a whole class needs to be told *which cell* was
  // refused. A screen can highlight one; a file cannot, and the file is half
  // this ticket. So the sentence carries the code, the outcome number, or the
  // ceiling that was passed.
  //
  // `activityHasNoClo` is the refusal that looks like a schema detail and is
  // not. `activity_scores.clo_id` is NOT NULL, so an Activity attributed to
  // nothing has nowhere to put a mark — and a screen that answered that with
  // ไม่สำเร็จ would send a teacher hunting for a typo in a number. The way out
  // is on the other screen, so the sentence names it.
  //
  // The four import sentences are the ticket's own list — count, code, name,
  // columns — and each says which of the four failed, because "ไฟล์ไม่ตรงกับ
  // ตอนเรียนนี้" is true of all four and useful for none.
  activityHasNoClo:
    'กิจกรรมนี้ยังไม่ได้เชื่อมโยงกับผลการเรียนรู้ จึงบันทึกคะแนนไม่ได้ กรุณาเพิ่มผลการเรียนรู้ให้กิจกรรมนี้ที่หน้ากิจกรรมการเรียนรู้ในรายวิชาก่อน',
  markOverActivity: (fullMark) =>
    `คะแนนต้องไม่เกินคะแนนเต็มของกิจกรรมนี้ ซึ่งเท่ากับ ${fullMark}`,
  markOverClo: (cloNumber, ceiling) =>
    `คะแนนของผลการเรียนรู้ ${cloNumber} ต้องไม่เกิน ${ceiling} ซึ่งเป็นคะแนนที่กิจกรรมนี้แบ่งให้ข้อนั้น`,
  invalidMark: 'คะแนนไม่ถูกต้อง กรุณากรอกเป็นตัวเลขตั้งแต่ 0 ขึ้นไป หรือเว้นว่างไว้หากยังไม่ให้คะแนน',
  markStudentNotEnrolled: (studentId) =>
    `รหัส ${studentId} ไม่ได้อยู่ในตอนเรียนนี้ จึงบันทึกคะแนนให้ไม่ได้`,
  marksCountMismatch: (expected, found) =>
    `จำนวนนักศึกษาในไฟล์ไม่ตรงกับตอนเรียนนี้ ตอนเรียนนี้มี ${expected} คน แต่ไฟล์มี ${found} แถว`,
  marksStudentMissing: (studentId) =>
    `ไฟล์ไม่มีรหัส ${studentId} ซึ่งเป็นนักศึกษาของตอนเรียนนี้ ไฟล์ต้องมีครบทุกคน`,
  marksNameMismatch: (studentId, expected) =>
    `ชื่อของรหัส ${studentId} ในไฟล์ไม่ตรงกับทะเบียน ซึ่งบันทึกไว้ว่า "${expected}"`,
  marksCloColumns: (expected) =>
    `คอลัมน์คะแนนในไฟล์ไม่ตรงกับผลการเรียนรู้ของกิจกรรมนี้ ซึ่งต้องเป็น ${expected} ตามลำดับ`,
  // The same disagreement as the line above, arriving without a file. The
  // screen sends what it drew, so a mark against an outcome this Activity does
  // not assess means the grid is older than the Activity — not that somebody
  // built the wrong spreadsheet, which is the only thing the sentence above
  // can mean.
  markCloNotInActivity: (expected) =>
    `กิจกรรมนี้ให้คะแนนได้เฉพาะผลการเรียนรู้ ${expected} เท่านั้น กรุณาเปิดหน้านี้ใหม่อีกครั้ง`,

  // What the error handler in app.js says. It names nothing, because an
  // unhandled throw is by definition something nobody decided the wording
  // of, and whatever is in the stack is not the caller's business.
  unexpected: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง',
};

module.exports = { REFUSALS };
