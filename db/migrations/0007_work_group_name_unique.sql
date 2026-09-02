-- A work group's name, unique within its section - the index 0003 could not
-- write.
--
-- 0003 left `student_group.group_name` unconstrained and said why: it defaults
-- to the empty string, so a plain UNIQUE (section_id, group_name) would make
-- two unnamed groups collide on their first day. That reasoning is right about
-- the default and wrong about the general case, and #26 is where the
-- difference costs something.
--
-- The log is why. `student_group_change_log` copies `group_name` into every
-- row rather than pointing at the group, so that the name a group had at the
-- time survives a rename - which is the whole reason the history is readable a
-- term later. Two live groups sharing a name make every one of those copies
-- ambiguous to the person reading it: a history saying a student was added to
-- กลุ่มที่ 2 names two different groups, and the `group_id` that would tell
-- them apart is not on the screen and is not what anybody calls a group.
--
-- A partial index says both things at once: named groups are unique within
-- their section, and unnamed ones are not compared at all. #26's routes
-- require a name, so nothing the application writes lands in the exception -
-- the seed and 0003's own tests are what keep it exercised.
--
-- It is an index and not a table constraint because a partial UNIQUE cannot be
-- one in PostgreSQL. `isDuplicate` reads 23505 either way, so the route does
-- not know the difference.
CREATE UNIQUE INDEX student_group_section_id_group_name_key
  ON student_group (section_id, group_name)
  WHERE group_name <> '';
