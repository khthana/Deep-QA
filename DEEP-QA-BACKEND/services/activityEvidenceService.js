const fs = require('fs');
const path = require('path');
const { BASE_PATH } = require('../config/evidence');
const model = require('../models/activityEvidenceModel');

exports.saveEvidenceFile = async ({
  file,
  section_id,
  activity_id,
  evidence_type,
  description,
  uploaded_by
}) => {
  const dir = path.join(
    BASE_PATH,
    `section_${section_id}`,
    `activity_${activity_id}`
  );

  fs.mkdirSync(dir, { recursive: true });

  const utf8FileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
  const storedName = `${Date.now()}_${utf8FileName}`; // ใช้ชื่อที่แก้แล้วตั้งชื่อไฟล์จริง

  // const storedName = `${Date.now()}_${file.originalname}`;
  const fullPath = path.join(dir, storedName);


  const dbPath = fullPath.replace(/\\/g, '/');

  fs.writeFileSync(fullPath, file.buffer);

  return model.insertEvidence({
    section_id,
    activity_id,
    evidence_type,
    description,
    file_name: utf8FileName,
    // file_name: file.originalname,
    file_path: dbPath,   
    mime_type: file.mimetype,
    file_size: file.size,
    uploaded_by
  });
};


