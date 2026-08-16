// models/usersModel.js
const db = require('../config/db')

/**
 * ค้นหาข้อมูลผู้ใช้งานจาก ID
 */
exports.findUserById = async (user_id) => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".users WHERE user_id = $1`,
    [user_id],
  )
  return result.rows[0]
}

/**
 * สร้างข้อมูลผู้ใช้งานใหม่เข้าสู่ระบบ
 */
exports.createUser = async (user) => {
  const result = await db.query(
    `INSERT INTO "${process.env.DB_SCHEMA}".users
    (user_id, email, phone, title_th, first_name_th, last_name_th,
     title_en, first_name_en, last_name_en, department_id, program_id,
     is_verified, verification_token, password)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *`,
    [
      user.user_id || null,
      user.email || null,
      user.phone || null,
      user.title_th || null,
      user.first_name_th || null,
      user.last_name_th || null,
      user.title_en || null,
      user.first_name_en || null,
      user.last_name_en || null,
      user.department_id || null,
      user.program_id || null,
      user.is_verified || true,
      user.verification_token || null,
      user.password || null,
    ],
  )
  return result.rows[0]
}

/**
 * ค้นหาผู้ใช้งานจาก Verification Token สำหรับการยืนยันอีเมล
 */
exports.findUserByVerificationToken = async (token) => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".users WHERE verification_token = $1`,
    [token],
  )
  return result.rows[0]
}

/**
 * อัปเดตสถานะการยืนยันตัวตนของผู้ใช้งาน
 */
exports.updateUserVerification = async (user_id, is_verified) => {
  const result = await db.query(
    `UPDATE "${process.env.DB_SCHEMA}".users
     SET is_verified = $1, verification_token = NULL
     WHERE user_id = $2
     RETURNING *`,
    [is_verified, user_id],
  )
  return result.rows[0]
}

/**
 * อัปเดตข้อมูลผู้ใช้งานแบบ Dynamic ตามฟิลด์ที่ส่งมา
 */
exports.updateUser = async (userId, fields) => {
  const setClauses = []
  const values = []
  let idx = 1

  for (const key in fields) {
    if (fields[key] !== undefined) {
      setClauses.push(`${key} = $${idx}`)
      values.push(fields[key])
      idx++
    }
  }

  if (setClauses.length === 0) return null

  values.push(userId)

  const query = `
    UPDATE "${process.env.DB_SCHEMA}".users
    SET ${setClauses.join(', ')}
    WHERE user_id = $${idx}
    RETURNING *;
  `

  const result = await db.query(query, values)
  return result.rows[0]
}

/**
 * อัปเดต Verification Token ใหม่สำหรับผู้ใช้งาน
 */
exports.updateUserVerificationToken = async (userId, token) => {
  const result = await db.query(
    `UPDATE "${process.env.DB_SCHEMA}".users SET verification_token = $1 WHERE user_id = $2 RETURNING *`,
    [token, userId],
  )
  return result.rows[0]
}

/**
 * ดึงข้อมูลผู้ใช้งานทั้งหมดที่มีสถานะปกติและยืนยันตัวตนแล้ว
 */
exports.getAllUsers = async () => {
  const query = `
    SELECT 
      user_id, email, phone, title_th, first_name_th, last_name_th,
      title_en, first_name_en, last_name_en, department_id, program_id, status
    FROM "${process.env.DB_SCHEMA}".users
    WHERE is_verified = TRUE
      AND status = 'active';
  `
  const result = await db.query(query)
  return result.rows
}

/**
 * ค้นหาข้อมูลนักศึกษาจากรหัสนักศึกษา
 */
exports.findStudentById = async (studentId) => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".student WHERE student_id = $1`,
    [studentId],
  )
  return result.rows[0]
}

/**
 * สลับสถานะการใช้งานของผู้ใช้งาน (Active/Inactive)
 */
exports.swapStatus = async (userId, status) => {
  const isVerified = status === 'active'

  const result = await db.query(
    `
    UPDATE "${process.env.DB_SCHEMA}".users
    SET status = $1,
        is_verified = $2,
        updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok'
    WHERE user_id = $3
    RETURNING user_id, status, is_verified;
    `,
    [status, isVerified, userId],
  )

  return result.rows[0]
}

/**
 * ค้นหาผู้ใช้งานจากชื่อ-นามสกุล ทั้งภาษาไทยและภาษาอังกฤษ
 */
exports.findUserByName = async (name) => {
  const query = `
    SELECT *
    FROM "${process.env.DB_SCHEMA}".users
    WHERE (first_name_th || ' ' || last_name_th) ILIKE $1
       OR (first_name_en || ' ' || last_name_en) ILIKE $1
    LIMIT 1;
  `
  const { rows } = await db.query(query, [`%${name}%`])
  return rows[0]
}

/**
 * ลบข้อมูลผู้ใช้งาน (Hard Delete) หรือทำการ Soft Delete หากมีข้อมูลเชื่อมโยงอยู่
 */
exports.deleteUser = async (user_id, academic_year) => {
  const uid = user_id.toString().trim()

  try {
    // 1. เช็ค Logic ทางธุรกิจ (Business Logic)
    const courseCheck = await db.query(
      `SELECT COUNT(*) AS cnt FROM "deep-qa".student_course WHERE student_id = $1`,
      [uid],
    )
    if (parseInt(courseCheck.rows[0].cnt) > 0) {
      return {
        status: 'forbidden',
        message: 'ไม่สามารถลบได้ เนื่องจากนักศึกษายังมีการลงเรียนในรายวิชา',
      }
    }

    if (academic_year) {
      const yearCheck = await db.query(
        `SELECT COUNT(*) AS cnt 
         FROM "deep-qa".course_sections_teacher t
         JOIN "deep-qa".semester_courses s ON t.semester_course_id = s.id
         WHERE t.user_id = $1 AND s.academic_year = $2`,
        [uid, academic_year],
      )

      if (parseInt(yearCheck.rows[0].cnt) > 0) {
        return {
          status: 'forbidden',
          message: `ไม่สามารถลบได้ เนื่องจากอาจารย์ท่านนี้มีภาระงานสอนในปีการศึกษา ${academic_year}`,
        }
      }
    }

    // --- ส่วนที่เพิ่มใหม่: กวาดล้างข้อมูลในตารางที่มีปัญหาออกแบบ Manual ---
    // ลบทุก record ของอาจารย์คนนี้ใน course_sections_teacher ทิ้งให้หมด (ทุกปี)
    await db.query(
      `DELETE FROM "deep-qa".course_sections_teacher WHERE user_id = $1`,
      [uid],
    )

    // 2. สั่งลบจากตารางหลัก (users)
    const result = await db.query(
      `DELETE FROM "deep-qa".users WHERE user_id = $1`,
      [uid],
    )

    return result.rowCount > 0 ? { status: 'deleted' } : { status: 'not_found' }
  } catch (error) {
    console.error('Database Error during deleteUser:', error)
    if (error.code === '23503') {
      return {
        status: 'forbidden',
        message:
          'ลบไม่ได้: ยังติด Foreign Key ในตารางอื่น (โปรดเช็ค CASCADE อีกครั้ง)',
      }
    }
    throw error
  }
}

/**
 * ดึงข้อมูลผู้ใช้งานตามลำดับความสำคัญของสิทธิ์ (Role Priority) และขอบเขตพื้นที่ (Scope)
 */
exports.getAllUsersByRolePriority = async (role_id, scope_id) => {
  const roleResult = await db.query(
    `SELECT priority FROM "${process.env.DB_SCHEMA}".roles WHERE role_id = $1`,
    [role_id],
  )

  if (roleResult.rowCount === 0) {
    throw new Error('Invalid role_id')
  }

  const myPriority = roleResult.rows[0].priority

  let query = `
    SELECT DISTINCT
      u.user_id, u.email, u.phone, u.title_th, u.first_name_th, u.last_name_th,
      u.title_en, u.first_name_en, u.last_name_en, u.department_id, u.program_id,
      u.status, r.role_id AS current_role_id
    FROM "${process.env.DB_SCHEMA}".users u
    JOIN "${process.env.DB_SCHEMA}".user_roles ur ON u.user_id = ur.user_id
    JOIN "${process.env.DB_SCHEMA}".roles r ON ur.role_id = r.role_id
    WHERE 1=1
  `

  const params = []

  if (role_id === 'FULL_ADMIN') {
    // No additional conditions
  } else if (role_id === 'FACULTY_ADMIN') {
    query += ` AND r.role_id != 'FULL_ADMIN'`
  } else {
    params.push(myPriority)
    query += ` AND r.priority >= $${params.length}`

    params.push(scope_id)
    query += ` AND u.department_id = $${params.length}`
  }

  const result = await db.query(query, params)
  return result.rows
}

/**
 * ค้นหาผู้ใช้งานด้วยอีเมล
 */
exports.findUserByEmail = async (email) => {
  const r = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".users WHERE email = $1`,
    [email],
  )
  return r.rows[0]
}

/**
 * ค้นหาข้อมูลภาควิชาจากรหัสหลักสูตร
 */
exports.getDepartmentByProgramId = async (program_id) => {
  const r = await db.query(
    `
    SELECT department_id
    FROM "${process.env.DB_SCHEMA}".programs
    WHERE regexp_replace(program_id, '^0+', '') =
          regexp_replace($1, '^0+', '')
      AND is_active = true
    `,
    [String(program_id)],
  )
  return r.rows[0]
}

/**
 * บันทึกข้อมูลผู้ใช้งานใหม่ (ใช้ Transaction Client)
 */
exports.insertUser = async (client, user) => {
  const r = await client.query(
    `
    INSERT INTO "${process.env.DB_SCHEMA}".users (
      user_id, email, phone,
      title_th, first_name_th, last_name_th,
      title_en, first_name_en, last_name_en,
      department_id, program_id,
      password, status, is_verified
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
      $12,'active',true
    )
    RETURNING *
    `,
    [
      user.user_id,
      user.email,
      user.phone,
      user.title_th,
      user.first_name_th,
      user.last_name_th,
      user.title_en,
      user.first_name_en,
      user.last_name_en,
      user.department_id,
      user.program_id,
      user.password,
    ],
  )
  return r.rows[0]
}

/**
 * กำหนดบทบาทและขอบเขตสิทธิ์ให้กับผู้ใช้งาน (ใช้ Transaction Client)
 */
exports.insertUserRole = async (
  client,
  user_id,
  role_id,
  scope_id,
  assigned_by,
) => {
  await client.query(
    `
    INSERT INTO "${process.env.DB_SCHEMA}".user_roles
      (user_id, role_id, scope_id, assigned_by)
    VALUES ($1, $2, $3, $4)
    `,
    [user_id, role_id, scope_id, assigned_by],
  )
}

/**
 * ดึงรหัสผ่านที่เข้ารหัสแล้วของผู้ใช้งานจาก ID
 */
exports.getPasswordByUserId = async (userId) => {
  const result = await db.query(
    `SELECT password
     FROM "${process.env.DB_SCHEMA}".users
     WHERE user_id = $1`,
    [userId],
  )
  return result.rowCount > 0 ? result.rows[0] : null
}

/**
 * อัปเดตรหัสผ่านใหม่ของผู้ใช้งาน
 */
exports.updatePassword = async (user_id, hashedPassword) => {
  return db.query(
    `UPDATE "${process.env.DB_SCHEMA}".users
     SET password = $1
     WHERE user_id = $2`,
    [hashedPassword, user_id],
  )
}

/**
 * ดึงข้อมูลโปรไฟล์ผู้ใช้งานพร้อมที่อยู่รูปภาพโปรไฟล์
 */
exports.getUserProfileByUserId = async (user_id) => {
  const r = await db.query(
    `
    SELECT
      u.user_id, u.email, u.phone, u.title_th, u.first_name_th, u.last_name_th,
      u.title_en, u.first_name_en, u.last_name_en, u.department_id, u.program_id,
      ui.image_path
    FROM "${process.env.DB_SCHEMA}".users u
    LEFT JOIN "${process.env.DB_SCHEMA}".user_image ui
      ON ui.user_id = u.user_id
    WHERE u.user_id = $1
    `,
    [user_id],
  )
  return r.rows[0]
}

/**
 * ดึงประวัติกิจกรรม (Logs) ของผู้ใช้งาน
 */
exports.getUserLogs = async (user_id) => {
  let query = `
    SELECT 
    ul.id, 
    ul.user_id,
    u.title_th,
    u.first_name_th,
    u.last_name_th, 
    ul.activity, 
    ul.time_stamp

    FROM "${process.env.DB_SCHEMA}".user_log ul
    LEFT JOIN "${process.env.DB_SCHEMA}".users u
      ON ul.user_id = u.user_id
  `
  const values = []
  if (user_id) {
    query += ` WHERE user_id = $1`
    values.push(user_id)
  }
  query += ` ORDER BY time_stamp DESC`
  const result = await db.query(query, values)
  return result.rows
}

/**
 * ค้นหาข้อมูลหลักสูตรจากชื่อและปีการศึกษา
 */
exports.getProgramByNameAndYear = async (programNameTh, year) => {
  const sql = `
    SELECT program_id, department_id 
    FROM "${process.env.DB_SCHEMA}".programs 
    WHERE program_name_th = $1 AND year = $2 AND is_active = true
  `
  const { rows } = await db.query(sql, [programNameTh, year])
  return rows[0]
}

exports.getAllUsersWithFilter = async (callerRole, scopeId, callerUserId) => {
  const query = `
    WITH caller_context AS (
        SELECT priority FROM "deep-qa".roles WHERE role_id = $1
    ),
    -- หาทุกหน่วยงานที่อยู่ภายใต้ scope_id ที่ส่งมา
    target_scopes AS (
        -- กรณีส่ง Faculty ID
        SELECT faculty_id, NULL as department_id, NULL as program_id FROM "deep-qa".faculty WHERE faculty_id = $2
        UNION
        -- หา Dept ที่อยู่ใน Faculty นั้น
        SELECT faculty_id, department_id, NULL FROM "deep-qa".departments WHERE faculty_id = $2 OR department_id = $2
        UNION
        -- หา Program ที่อยู่ใน Dept นั้น (ที่มาจาก Faculty นั้นอีกที)
        SELECT d.faculty_id, p.department_id, p.program_id 
        FROM "deep-qa".programs p
        JOIN "deep-qa".departments d ON p.department_id = d.department_id
        WHERE d.faculty_id = $2 OR d.department_id = $2 OR p.program_id = $2
    )
    SELECT 
        u.user_id, u.email, u.phone, u.title_th, u.first_name_th, u.last_name_th,
        u.title_en, u.first_name_en, u.last_name_en, u.status,
        ur.role_id as assigned_role,
        r.priority as role_priority,
        d.department_name_th,
        p.program_name_th
    FROM "deep-qa".users u
    INNER JOIN "deep-qa".user_roles ur ON u.user_id = ur.user_id
    INNER JOIN "deep-qa".roles r ON ur.role_id = r.role_id
    LEFT JOIN "deep-qa".departments d ON u.department_id = d.department_id
    LEFT JOIN "deep-qa".programs p ON u.program_id = p.program_id
    WHERE u.status = 'active'
      AND u.user_id != $3  -- ไม่เอาตัวเอง
      AND r.priority >= (SELECT priority FROM caller_context) -- สิทธิ์ต่ำกว่าหรือเท่ากับ
      AND (
          -- เช็คว่า User อยู่ในหน่วยงานที่เป็นเป้าหมายหรือไม่
          $2 = 'FULL_ADMIN'
          OR u.department_id IN (SELECT department_id FROM target_scopes WHERE department_id IS NOT NULL)
          OR u.program_id IN (SELECT program_id FROM target_scopes WHERE program_id IS NOT NULL)
          OR ur.scope_id IN (SELECT faculty_id FROM target_scopes)
          OR ur.scope_id IN (SELECT department_id FROM target_scopes WHERE department_id IS NOT NULL)
          OR ur.scope_id IN (SELECT program_id FROM target_scopes WHERE program_id IS NOT NULL)
      )
    ORDER BY u.user_id ASC, r.priority ASC;
  `

  const result = await db.query(query, [callerRole, scopeId, callerUserId])
  return result.rows
}
