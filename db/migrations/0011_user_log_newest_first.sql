-- Every account's log lines, newest first - #305.
--
-- `GET /api/history` reads the whole log in one order (`time_stamp DESC, id
-- DESC`) a page at a time, where until #305 every read was one account's and
-- 0001's `(user_id, time_stamp DESC)` served it. Measured before writing this,
-- on 24 พ.ย. 2569, with half a million lines over the seeded accounts in a
-- transaction rolled back afterwards: page one took 42 ms as a parallel
-- sequential scan and a top-N sort, for the Central Admin and for a department
-- administrator alike, and 0.1 ms with this index - the scope's join probes
-- `users` by its key as the index walks down. The count beside the page is a
-- full scan with or without it (35 ms), which is `GET /users`' shape too and
-- the floor this index does not move.
--
-- Both columns, so the `id` that breaks a timestamp tie is read off the index
-- rather than sorted afterwards.

CREATE INDEX user_log_time_stamp_id_idx ON user_log (time_stamp DESC, id DESC);
