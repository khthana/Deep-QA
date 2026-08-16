// controllers/subjectCloController.js
const subjectCloModel = require('../models/subjectCloModel')

/**
 * สร้างผลลัพธ์การเรียนรู้ของรายวิชา (CLO) ใหม่ พร้อมทั้งตรวจสอบการซ้ำซ้อนของข้อมูลในแต่ละกลุ่มเรียน
 */
exports.createCloController = async (req, res) => {
  try {
    const {
      section_id,
      clo_number,
      clo_detail,
      teaching_method,
      assessment_method,
      plo_id
    } = req.body
    const created_by = req.user.user_id
    
    if (!section_id || !clo_number) {
      return res.status(400).json({
        success: false,
        message: 'section_id และ clo_number จำเป็นต้องมี'
      })
    }

    const newClo = await subjectCloModel.createClo({
      section_id,
      clo_number,
      clo_detail,
      teaching_method,
      assessment_method,
      plo_id,
      created_by
    })

    res.status(201).json({
      success: true,
      data: newClo
    })

  } catch (err) {
    console.error(err)

    if (err.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'CLO นี้มีอยู่แล้วใน section นี้'
      })
    }

    res.status(500).json({
      success: false,
      message: 'Server Error'
    })
  }
}

/**
 * อัปเดตข้อมูลรายละเอียดของ CLO เช่น วิธีการสอน วิธีการประเมิน หรือการแมปกับ PLO
 */
exports.updateCloController = async (req, res) => {
  try {
    const {
      clo_id,
      clo_detail,
      teaching_method,
      assessment_method,
      plo_id
    } = req.body

    if (!clo_id) {
      return res.status(400).json({
        success: false,
        message: 'clo_id is required'
      })
    }

    const updatedClo = await subjectCloModel.updateClo({
      clo_id,
      clo_detail,
      teaching_method,
      assessment_method,
      plo_id
    })

    if (!updatedClo) {
      return res.status(404).json({
        success: false,
        message: 'CLO not found'
      })
    }

    res.json({
      success: true,
      data: updatedClo
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({
      success: false,
      message: 'Server Error'
    })
  }
}

/**
 * ดึงข้อมูลรายการ CLO ทั้งหมดที่เกี่ยวข้องกับกลุ่มเรียน (Section) ที่ระบุ
 */
exports.getSubjectCloController = async (req, res) => {
  try {
    const { section_id } = req.params

    if (!section_id) {
      return res.status(400).json({
        success: false,
        message: 'section_id is required'
      })
    }

    const clos = await subjectCloModel.getSubjectCloBySection(section_id)

    res.json({
      success: true,
      data: clos
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({
      success: false,
      message: 'Server Error'
    })
  }
}

/**
 * ดึงข้อมูลการแมปผลลัพธ์การเรียนรู้ระดับหลักสูตร (PLO) ที่เชื่อมโยงอยู่กับ CLO ที่ระบุ
 */
exports.getPLOmappedinCLO = async (req, res) => {
  try {
    const { section_id, clo_id } = req.params

    if (!section_id || !clo_id) {
      return res.status(400).json({
        success: false,
        message: 'section_id และ clo_id จำเป็นต้องส่งมา'
      })
    }

    const clo = await subjectCloModel.getCloWithPLO(section_id, clo_id)

    if (!clo) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบ CLO ที่ระบุ'
      })
    }

    if (!clo.plo_id) {
      return res.json({
        success: true,
        clo_id,
        data: []
      })
    }

    const plo = await subjectCloModel.getPLOById(clo.plo_id)

    res.json({
      success: true,
      clo: {
        clo_id: clo.clo_id,
        clo_number: clo.clo_number,
        clo_detail: clo.clo_detail
      },
      data: plo ? [plo] : []
    })

  } catch (err) {
    console.error('getPLOmappedinCLO error:', err)
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message
    })
  }
}

/**
 * ลบข้อมูล CLO ออกจากระบบ โดยมีการตรวจสอบก่อนว่ามีการนำไปใช้งานในส่วนอื่นหรือไม่
 */
exports.deleteCLO = async (req, res) => {
  try {
    const { clo_id } = req.params;

    const isUsed = await subjectCloModel.isCLOUsed(clo_id);

    if (isUsed) {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถลบ CLO ได้ เนื่องจากมีการใช้งานอยู่'
      });
    }

    const deleted = await subjectCloModel.deleteCLO(clo_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบ CLO ที่ต้องการลบ'
      });
    }

    res.json({
      success: true,
      message: 'ลบ CLO สำเร็จ'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบ CLO'
    });
  }
};