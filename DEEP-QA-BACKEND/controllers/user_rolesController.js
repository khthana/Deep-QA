// controllers/user_rolesController.js
const user_rolesModel = require("../models/user_rolesModel");
const userModel = require("../models/userModel");
const roleModel = require("../models/rolesModel");
const programModel = require("../models/programsModel");
const departmentModel = require("../models/departmentModel");
const facultyModel = require("../models/facultyModel");

/**
 * ตรวจสอบว่าขอบเขต (Scope) ที่ต้องการกำหนด อยู่ภายใต้ขอบเขตของผู้มอบอำนาจหรือไม่
 */
function isScopeWithin(assignerScopeId, targetScopeId, assignerRoleId) {
  if (assignerRoleId === 'FULL_ADMIN') return true;
  if (assignerRoleId === 'FACULTY_ADMIN') {
    return targetScopeId.startsWith(assignerScopeId);
  }
  if (assignerRoleId === 'DEPT_ADMIN') {
    return targetScopeId === assignerScopeId;
  }
  if (assignerRoleId === 'PROG_MANAGER') {
    return targetScopeId === assignerScopeId;
  }
  return false;
}

/**
 * กำหนดสิทธิ์และบทบาท (Role & Scope) ให้กับผู้ใช้งาน พร้อมบันทึกผู้ที่เป็นคนมอบอำนาจ
 */
exports.addUserRole = async (req, res) => {
  try {
    const { user_email, role_id, scope_id, assigned_by } = req.body;

    const user = await userModel.findUserByEmail(user_email);
    const assigner = await userModel.findUserByEmail(assigned_by);

    const newUserRole = await user_rolesModel.createUserRole({
      user_id: user.user_id,
      role_id,
      scope_id,
      assigned_by: assigner.user_id
    });

    res.status(201).json({
      message: 'User role assigned successfully',
      data: newUserRole
    });

  } catch (error) {
    console.error('Error assigning user role:', error);
    res.status(500).json({ message: 'Failed to assign user role' });
  }
};

/**
 * ดึงรายการบทบาท (Roles) ที่ผู้ใช้งานปัจจุบันสามารถมอบอำนาจให้กับผู้ใช้เป้าหมายได้ ตามเงื่อนไข Priority และกฎทางธุรกิจ
 */
exports.getAssignableRoles = async (req, res) => {
  try {
    const { role: roleName, targetUserEmail } = req.body;

    if (!roleName || !targetUserEmail) {
      return res.status(400).json({ message: 'role and targetUserEmail are required in request body' });
    }

    const role = await roleModel.getRoleByName(roleName);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    const currentRoleData = await roleModel.getRoleById(role.role_id);
    const allRoles = await roleModel.getAllRoles();

    const targetUser = await userModel.findUserByEmail(targetUserEmail);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    const targetUserRoles = await user_rolesModel.getAllRolesByUserId(targetUser.user_id);
    const targetUserRoleIds = targetUserRoles.map(r => r.role_id);

    if (targetUserRoleIds.includes("STUDENT")) {
      return res.status(400).json({
        message: "นักเรียนไม่สามารถ Assign Role อื่นได้"
      });
    }

    if (targetUserRoleIds.includes("GUEST")) {
      return res.status(400).json({
        message: "Guest ไม่สามารถเพิ่ม Role อื่นได้"
      });
    }

    let assignableRoles = allRoles
      .filter(r => r.priority > currentRoleData.priority)   
      .filter(r => r.role_id === "PROG_MANAGER" || !targetUserRoleIds.includes(r.role_id))

    // if (targetUserRoleIds.length > 0) {
    //   assignableRoles = assignableRoles.filter(r => r.role_id !== "STUDENT");
    // }

    res.status(200).json({
      assignableRoles
    });

  } catch (error) {
    console.error('Error fetching assignable roles:', error);
    res.status(500).json({ message: 'Failed to fetch assignable roles' });
  }
};

/**
 * ดึงรายการขอบเขต (Scope) เช่น คณะ ภาควิชา หรือหลักสูตร ที่สัมพันธ์กับบทบาทที่ระบุเพื่อใช้ในการเลือกขอบเขตสิทธิ์
 */
exports.getScope = async (req, res) => {
  try {
    const { role, scope_id } = req.body;

    if (!role) return res.status(400).json({ message: 'Missing role' });

    const toScopeFormat = (list, idKey, nameKey, getYear = () => null) => {
      return list.map(item => ({
        scope_id: item[idKey],
        nameTH: item[nameKey],
        year: getYear(item)
      }));
    };

    let scopeList = [];

    switch(role) {
      case 'FULL_ADMIN':
      case 'GUEST':
        {
          const faculties = await facultyModel.getAllFaculties();
          const departments = await departmentModel.getAllDepartments();
          const programs = await programModel.getAllPrograms();
          scopeList = [
            ...toScopeFormat(faculties, 'faculty_id', 'faculty_name_th'),
            ...toScopeFormat(departments, 'department_id', 'department_name_th'),
            ...toScopeFormat(programs, 'program_id', 'program_name_th', p => p.year)
          ];
        }
        break;

      case 'FACULTY_ADMIN':
        {
          const faculties = await facultyModel.getAllFaculties();
          scopeList = toScopeFormat(faculties, 'faculty_id', 'faculty_name_th');
        }
        break;

      case 'DEPT_ADMIN':
      case 'TEACHER':
        {
          if (!scope_id) return res.status(400).json({ message: 'Missing scope_id' });

          let departments;
          if (scope_id === 'FULL_ADMIN') {
            departments = await departmentModel.getAllDepartments();
          } else if (role === 'TEACHER' && await departmentModel.checkDepartmentById(scope_id)) {
            const dept = await departmentModel.getDepartmentById(scope_id);
            departments = dept ? [dept] : [];
          } else {
            departments = await departmentModel.getDepartmentByFacultyId(scope_id);
          }
          scopeList = toScopeFormat(departments, 'department_id', 'department_name_th');
        }
        break;

      case 'PROG_MANAGER':
      case 'STUDENT':
        {
          if (!scope_id) return res.status(400).json({ message: 'Missing scope_id' });

          let programs;
          if (scope_id === 'FULL_ADMIN') {
            programs = await programModel.getAllPrograms();
          } else {
            const departments = await departmentModel.getDepartmentByFacultyId(scope_id);
            if (departments.length > 0) {
              programs = [];
              for (const dept of departments) {
                const prog = await programModel.getProgramsByDepartmentId(dept.department_id);
                programs.push(...prog);
              }
            } else {
              programs = await programModel.getProgramsByDepartmentId(scope_id);
            }
          }
          scopeList = toScopeFormat(programs, 'program_id', 'program_name_th', p => p.year);
        }
        break;

      default:
        return res.status(400).json({ message: 'Invalid role or missing scope_id' });
    }

    scopeList = scopeList.map(item => ({
      ...item,
      year: item.year ?? null
    }));

    return res.status(200).json({ scope: scopeList });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * ลบบทบาท (Role) ของผู้ใช้งานออกจากขอบเขต (Scope) ที่ระบุ
 */
exports.deleteUserRole = async (req, res) => {
  try {
    const { email, role_id, scope_id } = req.body;

    if (!email || !scope_id || !role_id) {
      return res.status(400).json({ message: 'Email and scope_id are required' });
    }

    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const deletedRole = await  user_rolesModel.deleteUserRoleByUserIdAndScope(user.user_id, scope_id, role_id);

    if (!deletedRole) {
      return res.status(404).json({ message: 'User role not found for this scope' });
    }

    res.status(200).json({ message: 'User role deleted successfully', user_role: deletedRole });
  } catch (error) {
    console.error('Delete User Role error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * ดึงรายการบทบาทและสิทธิ์ทั้งหมดของผู้ใช้งานเป้าหมาย โดยมีการตรวจสอบ Priority และขอบเขตสิทธิ์ของผู้ร้องขอ (Viewer)
 */
exports.getUserRoles = async (req, res) => {
  try {
    const { email: targetEmail, role_id: viewerRoleId, scope_id: viewerScopeId } = req.body;

    if (!targetEmail || !viewerRoleId || !viewerScopeId) {
      return res.status(400).json({ message: 'targetEmail, viewerRoleId, viewerScopeId are required' });
    }

    const targetUser = await userModel.findUserByEmail(targetEmail);
    if (!targetUser) return res.status(404).json({ message: 'Target user not found' });

    const userRoles = await user_rolesModel.getAllRolesByUserId(targetUser.user_id);
    if (!Array.isArray(userRoles) || userRoles.length === 0) return res.json({ roles: [] });

    const viewerPriority = await roleModel.getRolePriority(viewerRoleId);
    if (viewerPriority === null) return res.status(400).json({ message: 'Invalid viewer role_id' });

    let allowedDepartments = [];
    let allowedPrograms = [];

    if (viewerRoleId === 'FACULTY_ADMIN') {
      const departments = await departmentModel.getDepartmentByFacultyId(viewerScopeId);
      allowedDepartments = departments.map(d => d.department_id);

      for (const deptId of allowedDepartments) {
        const programs = await programModel.getProgramsByDepartmentId(deptId);
        allowedPrograms.push(...programs.map(p => p.program_id));
      }
    } else if (viewerRoleId === 'DEPT_ADMIN') {
      allowedDepartments = [viewerScopeId];
      const programs = await programModel.getProgramsByDepartmentId(viewerScopeId);
      allowedPrograms.push(...programs.map(p => p.program_id));
    } else if (viewerRoleId === 'PROG_MANAGER' || viewerRoleId === 'TEACHER') {
      allowedPrograms = [viewerScopeId];
    }

    const filteredRoles = [];

    for (const userRole of userRoles) {
      const targetPriority = await roleModel.getRolePriority(userRole.role_id);
      if (targetPriority === null) continue;

      if (targetPriority < viewerPriority) continue;
      if (targetPriority === viewerPriority && userRole.role_id !== viewerRoleId) continue;

      let includeRole = false;

      if (viewerRoleId === 'FULL_ADMIN') {
        includeRole = true;
      } else if (viewerRoleId === 'FACULTY_ADMIN') {
        includeRole =
          userRole.scope_id === viewerScopeId ||
          allowedDepartments.includes(userRole.scope_id) ||
          allowedPrograms.includes(userRole.scope_id);
      } else if (viewerRoleId === 'DEPT_ADMIN') {
        includeRole =
          userRole.scope_id === viewerScopeId ||
          allowedPrograms.includes(userRole.scope_id);
      } else if (viewerRoleId === 'PROG_MANAGER' || viewerRoleId === 'TEACHER') {
        includeRole = allowedPrograms.includes(userRole.scope_id);
      }

      let scopeName = null;
      let year = null;
      if (includeRole) {
        if (userRole.scope_id === 'FULL_ADMIN') {
          scopeName = 'FULL_ADMIN';
        } else if (userRole.role_id === 'FACULTY_ADMIN') {
          const faculty = await facultyModel.getFacultyById(userRole.scope_id);
          scopeName = faculty ? faculty.faculty_name_th : null;
        } else if (userRole.role_id === 'DEPT_ADMIN' || userRole.role_id === 'TEACHER') {
          const dept = await departmentModel.getDepartmentById(userRole.scope_id);
          scopeName = dept ? dept.department_name_th : null;
        } else if (userRole.role_id === 'PROG_MANAGER' ) {
          const program = await programModel.getProgramById(userRole.scope_id);
          scopeName = program ? program.program_name_th : null;
          year = program ?  program.year : null;
        }
      }

      if (includeRole) {
        filteredRoles.push({
          role_id: userRole.role_id,
          scope_id: userRole.scope_id,
          scope_name: scopeName,
          year : year
        });
      }
    }

    return res.json({ roles: filteredRoles });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

/**
 * ดึงโครงสร้างลำดับชั้น (Hierarchy) ของขอบเขตสิทธิ์ที่ระบุ เช่น คณะที่สังกัด หรือภาควิชาที่สังกัด
 */
exports.getScopeHierarchy = async (req, res) => {
  try {
    const { scope_id } = req.body;

    if (!scope_id) {
      return res.status(400).json({ message: 'scope_id is required' });
    }

    const result = await user_rolesModel.findScopeHierarchy(scope_id);

    if (!result) {
      return res.status(404).json({ message: 'Scope not found' });
    }

    res.json({
      faculty_id: result.faculty_id,
      faculty_name: result.faculty_name_th,
      department_id: result.department_id,
      department_name: result.department_name_th,
      program_id: result.program_id,
      program_name: result.program_name_th,
    });
  } catch (error) {
    console.error('Error in getScopeHierarchy:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};