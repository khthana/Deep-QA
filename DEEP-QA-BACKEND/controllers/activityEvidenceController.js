// controllers/activityEvidenceController.js
const service = require('../services/activityEvidenceService')
const activityEvidenceModel = require('../models/activityEvidenceModel')
const fs = require('fs')

/**
 * อัปโหลดไฟล์หลักฐานการประเมินกิจกรรม (Activity Evidence) เข้าสู่ระบบ
 */
exports.uploadEvidence = async (req, res) => {
  try {
    const {
      section_id,
      activity_id,
      evidence_type,
      description,
      user_id,
    } = req.body

    const file = req.file
    const uploaded_by = req.user?.user_id || null

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const result = await service.saveEvidenceFile({
      file,
      section_id,
      activity_id,
      evidence_type,
      description,
      uploaded_by: uploaded_by,
    })

    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Upload failed' })
  }
}

/**
 * ดึงข้อมูลหลักฐานการประเมินกิจกรรมทั้งหมดตามรหัสกลุ่มเรียน (Section ID)
 */
exports.getEvidenceBySection = async (req, res) => {
  const { section_id } = req.params
  const data = await activityEvidenceModel.getEvidenceBySection(section_id)
  res.json(data)
}

/**
 * ดาวน์โหลดไฟล์หลักฐานการประเมินกิจกรรมตามรหัสหลักฐานที่ระบุ
 */
exports.downloadEvidence = async (req, res) => {
  const { evidence_id } = req.params
  const ev = await activityEvidenceModel.getEvidenceById(evidence_id)

  if (!ev || ev.is_deleted) {
    return res.status(404).json({ message: 'File not found' })
  }

  res.download(ev.file_path, ev.file_name)
}

/**
 * แก้ไขข้อมูลหรือเปลี่ยนไฟล์หลักฐานเดิม โดยจะทำการ Soft Delete ข้อมูลเก่าหากมีการอัปโหลดไฟล์ใหม่
 */
exports.replaceEvidence = async (req, res) => {
  const { evidence_id } = req.params;
  const { description, evidence_type } = req.body;
  const file = req.file;
  const userId = req.user?.user_id ;

  const oldEvidence = await activityEvidenceModel.getEvidenceById(evidence_id);
  if (!oldEvidence) {
    return res.status(404).json({ message: "Evidence not found" });
  }

  if (file) {
    await activityEvidenceModel.softDeleteEvidence(evidence_id, userId);

    const result = await service.saveEvidenceFile({
      file,
      section_id: oldEvidence.section_id,
      activity_id: oldEvidence.activity_id,
      evidence_type: evidence_type ?? oldEvidence.evidence_type,
      description: description ?? oldEvidence.description,
      uploaded_by: userId,
    });

    return res.json({ message: "File replaced successfully", data: result });
  } else {
    const updatedData = {
      evidence_type: evidence_type ?? oldEvidence.evidence_type,
      description: description ?? oldEvidence.description,
      updated_by: userId 
    };

    const result = await activityEvidenceModel.updateEvidence(evidence_id, updatedData);
    
    return res.json({ message: "Data updated successfully", data: result });
  }
};

/**
 * ดึงข้อมูลหลักฐานการประเมินกิจกรรมตามรหัสกลุ่มเรียนและรหัสกิจกรรมที่ระบุ
 */
exports.getEvidenceByActivity = async (req, res) => {
  try {
    const { section_id, activity_id } = req.params

    const data = await activityEvidenceModel.getEvidenceBySectionAndActivity(
      section_id,
      activity_id,
    )

    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

/**
 * ลบข้อมูลหลักฐานออกจากระบบ (Soft Delete) โดยอ้างอิงจากรหัสหลักฐาน
 */
exports.DeleteEvidence = async (req,res) => {
  try{
    const { evidence_id } = req.params;
    const userId = req.user?.user_id ;

    const oldEvidence = await activityEvidenceModel.getEvidenceById(evidence_id);
      if (!oldEvidence) {
      return res.status(404).json({ message: "Evidence not found" });
    }

    await activityEvidenceModel.softDeleteEvidence(evidence_id, userId);
    return res.json({ message: "File delete successfully"});

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  }
}