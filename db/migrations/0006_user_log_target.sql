-- What the log line was done *to* — the open item #13 left behind.
--
-- `user_log` says who acted, what they did and when. It does not say which
-- record they did it to, so `admin01`'s history reads "แก้ไขข้อมูลผู้ใช้" nine
-- times in a row with nothing to tell the nine apart. These two columns name
-- the record.
--
-- What this deliberately does *not* change: the row still belongs to the
-- person who acted. A line written when `admin01` edits `teach01` stays in
-- `admin01`'s history and does not appear in `teach01`'s. The history screen
-- answers "what did this account do", and that is the question it was asked to
-- answer; "who edited this record" is a search across every account's log by
-- object, which no screen does today and which these columns are the
-- precondition for rather than the answer to.
--
-- Reads are still not logged. Recording every screen somebody opens is a
-- policy decision about audit volume and retention, and it was made: no.
--
-- ADR-0001 does not reach here either. `user_log` is its stated tier-3
-- exception - a log line has no natural key - and nothing below adds one.

ALTER TABLE user_log
  -- Which sort of record, in the same open-varchar shape as `activity` and for
  -- the same reason: the set grows with every ticket that audits something new
  -- (USER today; SUBJECT, CLO, SECTION as those screens arrive), and an enum
  -- is bad at exactly that. Same width as `activity`.
  ADD COLUMN target_kind varchar(20),

  -- The record's own id, as text. Not a foreign key, and that is the point: an
  -- audit line has to outlive the thing it names. A reference would have to
  -- choose between CASCADE, which erases the evidence when the record is
  -- deleted, and SET NULL, which blanks the one field the column exists for -
  -- and neither is an audit trail. It is also one column for many tables, so
  -- there is no single table to point at.
  --
  -- Wider than the varchar(20) every id in 0001 uses, because a record is not
  -- always named by one id: ADR-0003 puts a CLO at (program, subject, year),
  -- and the honest reading of that line is the three of them together.
  ADD COLUMN target_id varchar(60);

-- Both are nullable and both stay null for the actions that have no object
-- other than the actor: LOGIN, GOOGLE_LOGIN, LOGOUT, SWITCH_ROLE and
-- CHANGE_PASSWORD are done by an account to itself, and the row already names
-- that account. IMPORT_USERS is null too, and that one is a limit rather than
-- a natural absence: its object is a whole roster, which two columns cannot
-- name, and the import writes one line for the upload rather than one per
-- account created. Which accounts arrived in which upload is therefore still
-- only answerable from the file.
--
-- Written together or not at all: a kind without an id names nothing, an id
-- without a kind cannot be looked up in any table.
ALTER TABLE user_log
  ADD CONSTRAINT user_log_target_whole
  CHECK ((target_kind IS NULL) = (target_id IS NULL));

-- No index on (target_kind, target_id). Nothing queries by object yet - the
-- history route reads by `user_id` and orders by time, which the existing
-- index already serves. Whoever builds the "who touched this record" search
-- adds it then, when there is a query to shape it against.
