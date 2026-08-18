-- How long an external assessor's account is good for — ticket #11, criterion 4.
--
-- R005 is mandatory and says the system must create an external assessor's
-- account "พร้อมกำหนดช่วงเวลาการใช้งาน", and ROLE-6 calls the result a
-- "บัญชีชั่วคราว". Both name the *account*, not the grant, and CONTEXT.md
-- follows them: an external assessor is a time-boxed account. So the window
-- lands on `users` and not on `user_roles`.
--
-- Putting it on the grant would have been the more general shape - one account,
-- several grants, each with its own life - but nothing in the requirements asks
-- for that, and `user_roles` is #12's table. A column there would mean #11 and
-- #12 both writing the same row for different reasons, which is the sort of
-- shared ownership that ends with one of them quietly undoing the other.
--
-- Both columns are nullable and both are open-ended on their own: null
-- `valid_from` means "good from the moment it exists", null `valid_until` means
-- "until somebody says otherwise". An ordinary staff account leaves both null
-- and is therefore unaffected by everything below, which is why this is not a
-- NOT NULL column with a far-future default - a default would put a date on
-- every account in the university and invite a reader to believe it means
-- something.
--
-- ADR-0001 does not reach here: no new table, no new key. 0001's widths bind
-- as usual, though neither column is a string.

ALTER TABLE users
  -- date, not timestamptz. The window is stated by a person in a form as a
  -- calendar day - "this assessor is reviewing during the March round" - and a
  -- timestamp would silently attach a midnight to it and then a timezone to the
  -- midnight, so an account created for "until 31 March" would stop working
  -- during the afternoon of the 31st in Bangkok if the server were reading UTC.
  -- Comparing dates against CURRENT_DATE has no such edge.
  ADD COLUMN valid_from  date,
  ADD COLUMN valid_until date;

-- The window has to be a window. Reversed dates are the one thing a form can
-- send that the columns cannot represent honestly: an account valid from the
-- 30th until the 1st is refused on every day of its life, which is a mistake
-- that looks like a working account until somebody tries to sign in. Equal
-- dates are allowed - a one-day assessment visit is a real thing.
--
-- Named rather than left to PostgreSQL, so the handler can recognise 23514 on
-- this constraint and answer with the reason rather than a bare 500.
ALTER TABLE users
  ADD CONSTRAINT users_validity_window_ordered
  CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_from <= valid_until);
