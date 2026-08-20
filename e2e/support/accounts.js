'use strict';

const { PASSWORD } = require('../../db/seed');

/**
 * The seeded accounts this suite signs in as, by what they are rather than by
 * their address, so a spec reads as the acceptance row does.
 *
 * The password is imported rather than written out: it is decided in
 * db/seed.js, and a copy here would be a second place to change it.
 */
const ACCOUNTS = {
  departmentAdmin05: 'dept.admin.05@kmitl.ac.th',
  departmentAdmin01: 'dept.admin.01@kmitl.ac.th',
  facultyAdmin: 'faculty.admin@kmitl.ac.th',
  committee0501: 'committee.0501@kmitl.ac.th',
  systemAdmin: 'admin@kmitl.ac.th',
  teacherOne: 'teacher.one@kmitl.ac.th',
};

module.exports = { ACCOUNTS, PASSWORD };
