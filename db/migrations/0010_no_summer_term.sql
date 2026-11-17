-- No ภาคฤดูร้อน - the owner's answer of 17 พ.ย. 2569 (#279), option ข: struck system-wide
-- rather than only hidden from the Offerings screen's term picker.
--
-- Hidden only, a semester-3 Offering would still be accepted by the column and the
-- routes and then drawn by no screen, so nobody could see or cancel it. The routes
-- refuse 3 from the same commit (`backend/routes/offerings.js` SEMESTERS); this
-- makes the column agree, so no path below the routes can write one either.
--
-- Measured before writing it, on 17 พ.ย. 2569: no row has semester 3 in `deep_core` or in
-- `deep_core_e2e`, so the narrower check validates against what is there. A
-- database that does hold one fails this migration rather than losing the row,
-- which is the answer wanted: those Offerings are somebody's decision to make.
--
-- The check 0002 wrote inline carries PostgreSQL's default name.

ALTER TABLE semester_courses
  DROP CONSTRAINT semester_courses_semester_check;

ALTER TABLE semester_courses
  ADD CONSTRAINT semester_courses_semester_check CHECK (semester IN (1, 2));
