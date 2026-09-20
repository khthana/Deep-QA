'use strict';

const { PASSWORD } = require('../../db/seed');

/**
 * The seeded accounts this suite signs in as - and, since #130, one it only
 * opens - by what they are rather than by their address, so a spec reads as
 * the acceptance row does.
 *
 * The password is imported rather than written out: it is decided in
 * db/seed.js, and a copy here would be a second place to change it.
 */
const ACCOUNTS = {
  departmentAdmin05: 'dept.admin.05@kmitl.ac.th',
  departmentAdmin01: 'dept.admin.01@kmitl.ac.th',
  facultyAdmin: 'faculty.admin@kmitl.ac.th',
  committee0501: 'prog.manager@kmitl.ac.th',
  committee0503: 'prog.manager.0503@kmitl.ac.th',
  systemAdmin: 'admin@kmitl.ac.th',
  teacherOne: 'teacher.one@kmitl.ac.th',
  teacherTwo: 'teacher.two@kmitl.ac.th',
  multiRole: 'multi.role@kmitl.ac.th',
  externalAssessor: 'external.assessor@tabee-review.org',
  // #130: opened, never signed in as. A person inside department 05 whose only
  // grant is over 01, so a 05 administrator reaches the account and is refused
  // its grant - the one refusal the grants panel can be given without writing
  // anything, now that the self-revoke button is gone.
  crossScope: 'cross.scope@kmitl.ac.th',
};

/**
 * The stored ids of the accounts above, for the rows that read an id rather
 * than an address - the history screen's picker offers `name (user_id)` and
 * the history route is addressed by id.
 */
const IDS = {
  departmentAdmin05: 'deptadm05',
  departmentAdmin01: 'deptadm01',
  facultyAdmin: 'facadm01',
  committee0501: 'comm0501',
  committee0503: 'comm0503',
  systemAdmin: 'admin01',
  teacherOne: 'teach01',
  teacherTwo: 'teach02',
  multiRole: 'multi01',
  externalAssessor: 'ext01',
};

module.exports = { ACCOUNTS, IDS, PASSWORD };
