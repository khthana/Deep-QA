// services/userService.js
const bcrypt = require("bcrypt");
const xlsx = require("xlsx");
const fs = require("fs");
const db = require("../config/db");
const userModel = require("../models/userModel");

const SALT_ROUNDS = 10;

/* ===============================
   helpers
================================ */
const safeUnlink = (path) => fs.unlink(path, () => {});

const generateUserId = (email, role_id) => {
  if (role_id === "STUDENT") {
    const match = String(email).match(/^(\d+)@/);
    if (!match) {
      throw new Error("email ของ STUDENT ต้องขึ้นต้นด้วยตัวเลข");
    }
    return match[1];
  }

  const random = Math.random().toString(36).substring(2, 8);
  return `TC${random}`.slice(0, 8);
};

/* ===============================
   addUser (manual)
================================ */

exports.addUser = async (payload, assigned_by) => {
  const {
    email,
    password,
    role_id,
    phone,
    title_th,
    first_name_th,
    last_name_th,
    title_en,
    first_name_en,
    last_name_en,
    program_id,
    scope_id 
  } = payload;

  if (!email || !password || !role_id) {
    throw new Error("ข้อมูลไม่ครบ (email / password / role_id)");
  }

  let finalProgramId = program_id;

  if (role_id === "STUDENT") {
    if (!finalProgramId || finalProgramId === "") {
      finalProgramId = scope_id;
    }
    
    if (!finalProgramId) {
      throw new Error("นักเรียนจำเป็นต้องมีรหัสหลักสูตร (program_id หรือ scope_id)");
    }
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const existingUser = await userModel.findUserByEmail(email);
    if (existingUser) {
      throw new Error("email ถูกใช้งานแล้ว");
    }

    let departmentId = null;
    if (finalProgramId) {
      const program = await userModel.getDepartmentByProgramId(finalProgramId);
      if (program) {
        departmentId = program.department_id;
      } else if (role_id === "STUDENT") {
        throw new Error("ไม่พบข้อมูลหลักสูตรในระบบ");
      }
    }
    const user_id = generateUserId(email, role_id);
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.insertUser(client, {
      user_id,
      email,
      phone,
      title_th,
      first_name_th,
      last_name_th,
      title_en,
      first_name_en,
      last_name_en,
      department_id: (role_id === "STUDENT") ? departmentId : null,
      program_id: (role_id === "STUDENT") ? String(finalProgramId) : null,
      password: hashedPassword
    });

    await userModel.insertUserRole(
      client,
      user_id,
      role_id,
      finalProgramId ? String(finalProgramId) : null,
      assigned_by
    );

    await client.query("COMMIT");
    return user;

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

exports.addUser = async (payload, assigned_by) => {
  const {
    email,
    password,
    role_id,
    phone,
    title_th,
    first_name_th,
    last_name_th,
    title_en,
    first_name_en,
    last_name_en,
    program_id,
    scope_id 
  } = payload;

  if (!email || !password || !role_id) {
    throw new Error("ข้อมูลไม่ครบ (email / password / role_id)");
  }

  let finalProgramId = program_id || scope_id || null;

  if (role_id === "STUDENT") {
    if (!finalProgramId) {
      throw new Error("นักเรียนจำเป็นต้องมีรหัสหลักสูตร (program_id หรือ scope_id)");
    }
  }
  // -----------------------

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const existingUser = await userModel.findUserByEmail(email);
    if (existingUser) {
      throw new Error("email ถูกใช้งานแล้ว");
    }

    let departmentId = null;
    if (finalProgramId) {
      const program = await userModel.getDepartmentByProgramId(finalProgramId);
      if (program) {
        departmentId = program.department_id;
      } else if (role_id === "STUDENT") {
        throw new Error("ไม่พบข้อมูลหลักสูตรในระบบ");
      }
    }

    const user_id = generateUserId(email, role_id);
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.insertUser(client, {
      user_id,
      email,
      phone,
      title_th,
      first_name_th,
      last_name_th,
      title_en,
      first_name_en,
      last_name_en,
      department_id: (role_id === "STUDENT") ? departmentId : null,
      program_id: (role_id === "STUDENT") ? (finalProgramId ? String(finalProgramId) : null) : null,
      password: hashedPassword
    });

    await userModel.insertUserRole(
      client,
      user_id,
      role_id,
      finalProgramId ? String(finalProgramId) : null, 
      assigned_by
    );

    await client.query("COMMIT");
    return user;

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

exports.addUserLog = async (user_id, activity) => {
  return db.query(
    `
    INSERT INTO "${process.env.DB_SCHEMA}".user_log
      (user_id, activity)
    VALUES
      ($1, $2)
    `,
    [user_id, activity]
  );
};

exports.importUsers = async (filePath, assigned_by) => {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  if (!rows.length) {
    safeUnlink(filePath);
    throw new Error("Excel file is empty");
  }

  // ✅ เปลี่ยนจาก program_id เป็น program_name
  const REQUIRED_KEYS = [
    "email",
    "title_th",
    "f_name_th",
    "s_name_th",
    "title_en",
    "f_name_en",
    "s_name_en",
    "role_id",
    "program_name" 
  ];

  const missing = REQUIRED_KEYS.filter(
    k => !Object.keys(rows[0]).includes(k)
  );
  if (missing.length) {
    safeUnlink(filePath);
    throw new Error(`Missing columns: ${missing.join(", ")}`);
  }

  const client = await db.connect();
  const errors = [];
  const prepared = [];

  try {
    /* -------- validate -------- */
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNo = i + 2;

      if (!row.email) {
        errors.push({ row: rowNo, error: "email ว่าง" });
        continue;
      }

      if (await userModel.findUserByEmail(row.email)) {
        errors.push({ row: rowNo, error: "email ซ้ำ" });
        continue;
      }

      let user_id;
      try {
        user_id = generateUserId(row.email, row.role_id);
      } catch (e) {
        errors.push({ row: rowNo, error: e.message });
        continue;
      }

      if (await userModel.findUserById(user_id)) {
        errors.push({ row: rowNo, error: `user_id ซ้ำ (${user_id})` });
        continue;
      }

      if (!row.program_name) {
        errors.push({ row: rowNo, error: "program_name ห้ามว่าง" });
        continue;
      }

      const programParts = String(row.program_name).split('-');
      if (programParts.length < 2) {
         errors.push({ row: rowNo, error: `รูปแบบ program_name ไม่ถูกต้อง ต้องเป็น "ชื่อหลักสูตร-ปี" เช่น "วิศวกรรมคอมพิวเตอร์-2565" (${row.program_name})` });
         continue;
      }

      const pYear = programParts.pop().trim(); 
      const pNameTh = programParts.join('-').trim(); 


      const program = await userModel.getProgramByNameAndYear(pNameTh, pYear);
      if (!program) {
        errors.push({
          row: rowNo,
          error: `ไม่พบข้อมูลหลักสูตร (${pNameTh}) ปี (${pYear}) ในระบบ`
        });
        continue;
      }

      const currentProgramId = program.program_id;
      const currentDeptId = program.department_id;

      prepared.push({
        user_id,
        email: row.email,
        phone: null,
        title_th: row.title_th,
        first_name_th: row.f_name_th,
        last_name_th: row.s_name_th,
        title_en: row.title_en,
        first_name_en: row.f_name_en,
        last_name_en: row.s_name_en,
        department_id: row.role_id === "STUDENT" ? currentDeptId : null,
        users_program_id: row.role_id === "STUDENT" ? currentProgramId : null,
        scope_id: currentProgramId, // ใช้ program_id ที่หามาได้
        role_id: row.role_id
      });
    }

    // ถ้ามี Error แม้แต่แถวเดียว จะโยน Error กลับไปให้ Frontend เลย
    if (errors.length) throw { errors };

    /* -------- insert -------- */
    await client.query("BEGIN");

    for (const u of prepared) {
      const hashedPassword = await bcrypt.hash("Default@123", SALT_ROUNDS);

      await userModel.insertUser(client, {
        user_id: u.user_id,
        email: u.email,
        phone: u.phone,
        title_th: u.title_th,
        first_name_th: u.first_name_th,
        last_name_th: u.last_name_th,
        title_en: u.title_en,
        first_name_en: u.first_name_en,
        last_name_en: u.last_name_en,
        department_id: u.department_id,
        program_id: u.users_program_id, 
        password: hashedPassword
      });

      await userModel.insertUserRole(
        client,
        u.user_id,
        u.role_id,
        u.scope_id,        
        assigned_by
      );
    }

    await client.query("COMMIT");
    safeUnlink(filePath);
    return prepared; // ส่งรายการที่เพิ่มสำเร็จกลับไปให้ Controller

  } catch (err) {
    await client.query("ROLLBACK");
    safeUnlink(filePath);
    throw err;
  } finally {
    client.release();
  }
};

exports.getUserImageByUserId = async (user_id) => {
  const r = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".user_image WHERE user_id = $1`,
    [user_id]
  );
  return r.rows[0];
};

exports.upsertUserImage = async (user_id, image_path) => {
  return db.query(
    `
    INSERT INTO "${process.env.DB_SCHEMA}".user_image (user_id, image_path)
    VALUES ($1, $2)
    ON CONFLICT (user_id)
    DO UPDATE SET
      image_path = EXCLUDED.image_path
    `,
    [user_id, image_path]
  );
};