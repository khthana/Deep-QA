'use strict';

const clos = require('./clos-screen');
const criteria = require('./achievements-screen');
const behaviors = require('./behaviors-screen');
const plan = require('./plan-screen');
const activities = require('./activities-screen');

/**
 * The five ผู้สอน screens whose form sits above a list of cards, each card with
 * a pencil and a bin — written for `149a` and shared since #151, whose rows walk
 * the same five. `field` is a box every one of the screen's forms carries,
 * `saved` and `removed` the two banners.
 */
const CARD_SCREENS = [
  {
    name: 'ผลการเรียนรู้รายวิชา',
    file: 'CourseOutcomes.js',
    open: async (page) => {
      const [sectionId] = await clos.mySectionIds(page);
      await clos.openClos(page, sectionId);
    },
    api: clos.API,
    field: 'รายละเอียดผลการเรียนรู้',
    saved: 'บันทึกผลการเรียนรู้รายวิชาแล้ว',
    removed: 'ลบผลการเรียนรู้รายวิชาแล้ว',
  },
  {
    name: 'เกณฑ์การบรรลุผล',
    file: 'AchievementCriteria.js',
    open: async (page) => {
      const [sectionId] = await criteria.mySectionIds(page);
      const [clo] = await criteria.myClos(page, sectionId);
      await criteria.openCriteria(page, sectionId, clo.clo_id);
    },
    api: criteria.API,
    field: 'เกณฑ์การประเมิน',
    saved: 'บันทึกเกณฑ์การบรรลุผลแล้ว',
    removed: 'ลบเกณฑ์การบรรลุผลแล้ว',
  },
  {
    name: 'พฤติกรรมบ่งชี้',
    file: 'MeasurableBehaviors.js',
    open: async (page) => {
      const [sectionId] = await behaviors.mySectionIds(page);
      const [clo] = await behaviors.myClos(page, sectionId);
      await behaviors.openBehaviors(page, sectionId, clo.clo_id);
    },
    api: behaviors.API,
    field: 'รายละเอียดพฤติกรรม',
    saved: 'บันทึกพฤติกรรมบ่งชี้แล้ว',
    removed: 'ลบพฤติกรรมบ่งชี้แล้ว',
  },
  {
    name: 'แผนการสอน',
    file: 'TeachingPlan.js',
    open: async (page) => {
      const [sectionId] = await plan.mySectionIds(page);
      await plan.openPlan(page, sectionId);
    },
    api: plan.API,
    field: 'หัวข้อ',
    saved: 'บันทึกแผนการสอนแล้ว',
    removed: 'ลบหัวข้อออกจากแผนการสอนแล้ว',
  },
  {
    name: 'กิจกรรมการเรียนรู้',
    file: 'LearningActivities.js',
    open: async (page) => {
      const [sectionId] = await activities.mySectionIds(page);
      await activities.openActivities(page, sectionId);
    },
    api: activities.API,
    field: 'ชื่อกิจกรรม',
    saved: 'บันทึกกิจกรรมแล้ว',
    removed: 'ลบกิจกรรมแล้ว',
  },
];

/** Every card's pencil and bin, whose labels start with แก้ไข and ลบ on all five. */
const pencils = (page) => page.getByRole('button', { name: /^แก้ไข/ });
const bins = (page) => page.getByRole('button', { name: /^ลบ./ });

/** The box a row types into, inside the one form on the screen. */
const boxOf = (page, label) => page.locator('form').first().getByLabel(label, { exact: true });

module.exports = { CARD_SCREENS, pencils, bins, boxOf };
