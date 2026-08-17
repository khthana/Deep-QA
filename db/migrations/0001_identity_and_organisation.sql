-- Identity and organisation: the tables every other screen hangs off.
--
-- Column types here are recovered from the SQL the inherited models actually
-- issue, not from docs/02, which disagrees with the code in several places.
-- Where the two conflict the code wins, and the divergence is commented at the
-- column it affects.
--
-- Two width rules, applied throughout:
--
--   * A faculty, department or programme code is varchar(10). user_roles.scope_id
--     holds any of the three interchangeably - findScopeHierarchy() tries
--     programs, then departments, then faculty against the same value - plus the
--     literal 'FULL_ADMIN'. That makes the three interchangeable and so gives
--     them one width; docs/02 gives departments.department_id as Varchar(2),
--     and widening it is what makes the comparison honest.
--   * A person's identifier - user_id, student_id, and every created_by /
--     updated_by / assigned_by that points at one - is varchar(20), the widest
--     of the documented variants.
--   * A subject code is varchar(8), which is neither of the above and so is a
--     rule of its own. It gets no headroom, and deliberately: the code is a
--     fixed eight-digit university-wide format - 01076105 - and widening it
--     would mean changing every faculty's catalogue at once, so the width is
--     not going to drift the way a departmental series might. docs/02 disagrees
--     with itself here, giving subjects.subject_id as Varchar(20) against
--     semester_courses.subject_id's Varchar(8); the real format settles it.
--     Every later table pointing at a subject must match this exactly - a
--     varchar-to-varchar foreign key is created happily across different
--     widths, so a mismatch would not be reported here.
--
-- A code is capped tighter than an identifier because the two are issued
-- differently: a faculty, department or programme code is assigned by the
-- university from a short numbered series - 0501 and the like, never more than
-- four digits - while an identifier can be a staff number, a student number or
-- an imported external one, and the documented variants already disagree at 8
-- and 20. Ten leaves the codes room to double; twenty is the widest already
-- seen.
--
-- The second rule is the asymmetry: too narrow needs a new migration and a data
-- fix, too wide costs nothing. scope_id therefore takes the identifier width
-- rather than the code width, even though every code fits in 10 - the sentinel
-- it also has to hold is shaped like a role name, and FACULTY_ADMIN is 13.
--
-- Deletion is RESTRICT on the reference tables by design. deleteDepartment,
-- deleteProgram, deleteSubject and deleteUser all count referencing rows before
-- deleting and soft-delete instead when any exist - deleteProgramSubject goes
-- further and treats SQLSTATE 23503 as the signal to set is_active = false.
-- RESTRICT is the database saying the same thing the application already says.
-- The exceptions are rows with no meaning of their own once their subject is
-- gone: a role grant and a log line both CASCADE from users.

-- status_enum keeps the name docs/02 §8 gives it, rather than the
-- user_status_enum its single use would suggest. The document is the shared
-- vocabulary, and a type renamed here reads as a different type there.
CREATE TYPE status_enum AS ENUM ('active', 'inactive');
CREATE TYPE student_status_enum AS ENUM ('active', 'inactive', 'graduated', 'suspended');
CREATE TYPE subject_type_enum AS ENUM ('required', 'elective');

-- Timestamps are timestamptz, not timestamp. The inherited code is inconsistent
-- about this - upsertSubject writes CURRENT_TIMESTAMP AT TIME ZONE
-- 'Asia/Bangkok' while updateSubject writes NOW() - which silently mixes two
-- meanings in one column. timestamptz stores an instant and renders it in
-- whatever zone the session asks for, so the ambiguity cannot arise.

CREATE TABLE faculty (
  faculty_id       varchar(10)  PRIMARY KEY,
  faculty_name_en  varchar(200) NOT NULL,
  faculty_name_th  varchar(200) NOT NULL,
  is_active        boolean      NOT NULL DEFAULT true
);

CREATE TABLE departments (
  department_id       varchar(10)  PRIMARY KEY,
  department_name_en  varchar(200),
  department_name_th  varchar(200),
  faculty_id          varchar(10)  REFERENCES faculty (faculty_id) ON DELETE RESTRICT,
  is_active           boolean      NOT NULL DEFAULT true
);

CREATE TABLE programs (
  program_id       varchar(10)  PRIMARY KEY,
  program_name_en  varchar(200),
  program_name_th  varchar(200),
  department_id    varchar(10)  REFERENCES departments (department_id) ON DELETE RESTRICT,
  year             varchar(4),
  is_active        boolean      NOT NULL DEFAULT true,
  created_at       timestamptz  NOT NULL DEFAULT now(),
  updated_at       timestamptz  NOT NULL DEFAULT now()
);

-- Every column an insert may omit carries a default, because createUser and
-- insertUser are the only inserts there are and between them they omit
-- status, created_at and updated_at entirely. is_verified is defaulted too:
-- createUser passes it but insertUser does not.
CREATE TABLE users (
  user_id             varchar(20)  PRIMARY KEY,
  email               varchar(100) NOT NULL UNIQUE,
  phone               varchar(30),
  title_th            varchar(50),
  first_name_th       varchar(100),
  last_name_th        varchar(100),
  title_en            varchar(50),
  first_name_en       varchar(100),
  last_name_en        varchar(100),
  department_id       varchar(10)  REFERENCES departments (department_id) ON DELETE RESTRICT,
  program_id          varchar(10)  REFERENCES programs (program_id) ON DELETE RESTRICT,
  status              status_enum  NOT NULL DEFAULT 'active',
  is_verified         boolean      NOT NULL DEFAULT false,
  verification_token  varchar(255),
  password            varchar(255),
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

-- No foreign key from student_id to users.user_id, against docs/02, which marks
-- it "PK, FK -> users". Students are imported without accounts: createStudent
-- and insertStudent write no users row, and all three read queries LEFT JOIN
-- users. A real foreign key would make the import fail on its first row.
--
-- admission_year is a plain column, also against docs/02, which marks it
-- Generated. Both insert paths supply it explicitly, and an insert into a
-- generated column is an error. full_name_th is only ever read, so it stays
-- generated.
CREATE TABLE student (
  student_id      varchar(20)         PRIMARY KEY,
  first_name_th   varchar(100)        NOT NULL,
  last_name_th    varchar(100)        NOT NULL,
  -- text, not the varchar(200) docs/02 gives: two varchar(100) inputs and a
  -- space make 201, so the documented width would reject a legal pair of names.
  full_name_th    text                GENERATED ALWAYS AS (first_name_th || ' ' || last_name_th) STORED,
  department_id   varchar(10)         NOT NULL REFERENCES departments (department_id) ON DELETE RESTRICT,
  program_id      varchar(10)         NOT NULL REFERENCES programs (program_id) ON DELETE RESTRICT,
  admission_year  varchar(4),
  status          student_status_enum NOT NULL DEFAULT 'active',
  created_at      timestamptz         NOT NULL DEFAULT now(),
  updated_at      timestamptz         NOT NULL DEFAULT now()
);

CREATE TABLE subjects (
  subject_id       varchar(8)   PRIMARY KEY,
  subject_name_en  varchar(200) NOT NULL,
  subject_name_th  varchar(200) NOT NULL,
  credits          integer      NOT NULL,
  description_th   text,
  description_en   text,
  department_id    varchar(10)  REFERENCES departments (department_id) ON DELETE RESTRICT,
  is_active        boolean      NOT NULL DEFAULT true,
  created_by       varchar(20)  REFERENCES users (user_id) ON DELETE SET NULL,
  updated_by       varchar(20)  REFERENCES users (user_id) ON DELETE SET NULL,
  created_at       timestamptz  NOT NULL DEFAULT now(),
  updated_at       timestamptz  NOT NULL DEFAULT now()
);

-- ADR-0001 tier 2: the surrogate id docs/02 gives this table is dropped and
-- (program_id, subject_id) becomes the primary key. Confirmed by usage, not
-- just by the ADR - every read, update, delete and reactivate in
-- program_subjectsModel keys on the pair, and nothing anywhere selects,
-- returns or joins on id.
CREATE TABLE program_subjects (
  program_id    varchar(10)       NOT NULL REFERENCES programs (program_id) ON DELETE RESTRICT,
  subject_id    varchar(8)        NOT NULL REFERENCES subjects (subject_id) ON DELETE RESTRICT,
  subject_type  subject_type_enum NOT NULL,
  is_active     boolean           NOT NULL DEFAULT true,
  created_by    varchar(20)       REFERENCES users (user_id) ON DELETE SET NULL,
  updated_by    varchar(20)       REFERENCES users (user_id) ON DELETE SET NULL,
  created_at    timestamptz       NOT NULL DEFAULT now(),
  updated_at    timestamptz       NOT NULL DEFAULT now(),
  PRIMARY KEY (program_id, subject_id)
);

-- role_name is not unique: getRoleByName ends in LIMIT 1, so the code does not
-- rely on it being. It is a display label rather than a code, and docs/02's
-- Varchar(20) would not hold a Thai one, so it takes a name's width instead.
--
-- priority is the authorisation rank, ascending - a lower number is more
-- senior, which is why getAllUsersByRolePriority filters r.priority >= the
-- viewer's.
CREATE TABLE roles (
  role_id    varchar(20)  PRIMARY KEY,
  role_name  varchar(100) NOT NULL,
  priority   integer      NOT NULL,
  is_active  boolean      NOT NULL DEFAULT true
);

-- ADR-0001 tier 2 again, and ADR-0002's source of truth: (user_id, role_id,
-- scope_id) is how every read, delete and existence check in
-- user_rolesModel addresses a grant.
--
-- scope_id has no foreign key. findScopeHierarchy resolves it against programs,
-- then departments, then faculty in turn - it is polymorphic, and there is no
-- one table to point it at.
--
-- scope_id is NOT NULL, which a primary key column has to be. The read side
-- already assumes the global sentinel: user_rolesController compares a
-- scope_id it read back out of the database against the literal 'FULL_ADMIN'.
-- The write side is where this diverges - userService can pass null when a
-- grant has no scope. So the sentinel is settled here rather than merely
-- recovered, and ticket #6's seed must write 'FULL_ADMIN' for a global grant,
-- never null.
CREATE TABLE user_roles (
  user_id      varchar(20) NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  role_id      varchar(20) NOT NULL REFERENCES roles (role_id) ON DELETE RESTRICT,
  scope_id     varchar(20) NOT NULL,
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  assigned_by  varchar(20) REFERENCES users (user_id) ON DELETE SET NULL,
  is_active    boolean     NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, role_id, scope_id)
);

-- activity stays a plain varchar rather than an enum, against docs/02, which
-- describes it as LOGIN / LOGOUT / VIEW. The callers of addUserLog write seven
-- values and VIEW is not among them: LOGIN, LOGOUT, GOOGLE_LOGIN,
-- UPDATE_PROFILE, CHANGE_PASSWORD, and the account status upper-cased, ACTIVE
-- or INACTIVE. The set is open and grows with each new audited action, which is
-- what an enum is bad at.
--
-- ADR-0001 tier 3 asks a surrogate key to be backed by the full natural key as
-- a UNIQUE constraint. This table is the exception: a log line has no natural
-- key. The same user can do the same thing twice in the same microsecond, and a
-- constraint saying otherwise would drop audit records rather than protect
-- them.
CREATE TABLE user_log (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     varchar(20) NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  activity    varchar(20) NOT NULL,
  time_stamp  timestamptz NOT NULL DEFAULT now()
);

-- Foreign keys that are not already the leftmost column of a key of their own.
-- A RESTRICT check scans the referencing side on every parent delete, so these
-- are what keeps deleting a department from reading the whole users table.
CREATE INDEX departments_faculty_id_idx ON departments (faculty_id);
CREATE INDEX programs_department_id_idx ON programs (department_id);
CREATE INDEX users_department_id_idx ON users (department_id);
CREATE INDEX users_program_id_idx ON users (program_id);
CREATE INDEX student_department_id_idx ON student (department_id);
CREATE INDEX student_program_id_idx ON student (program_id);
CREATE INDEX subjects_department_id_idx ON subjects (department_id);
CREATE INDEX subjects_created_by_idx ON subjects (created_by);
CREATE INDEX subjects_updated_by_idx ON subjects (updated_by);
CREATE INDEX program_subjects_subject_id_idx ON program_subjects (subject_id);
CREATE INDEX program_subjects_created_by_idx ON program_subjects (created_by);
CREATE INDEX program_subjects_updated_by_idx ON program_subjects (updated_by);
CREATE INDEX user_roles_role_id_idx ON user_roles (role_id);
CREATE INDEX user_roles_assigned_by_idx ON user_roles (assigned_by);

-- getUserLogs reads one user's log newest first.
CREATE INDEX user_log_user_id_time_stamp_idx ON user_log (user_id, time_stamp DESC);
