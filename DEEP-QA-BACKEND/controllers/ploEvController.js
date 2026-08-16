const model = require('../models/ploEvModel');

/**
 * ทดลองแต่ไม่ได้ใช้
 */
exports.getProgramPLOEvaluation = async (req, res) => {
  try {
    const { program_id, year } = req.params;
    if (!program_id || !year) {
      return res.status(400).json({
        message: 'program_id and year are required'
      });
    }

    /* 1️⃣ ดึง PLO */
    const plos = await model.getPLOByProgram(program_id);

    /* 2️⃣ ดึง section ของ cohort */
    const sections = await model.getSectionsByProgramYear(program_id, year);

    /* 3️⃣ ประกอบข้อมูล */
    const result = [];

    for (const plo of plos) {
      const ploObj = {
        plo_id: plo.plo_id,
        plo_code: plo.plo_code,
        plo_title: plo.plo_title,
        sections: []
      };

      for (const sec of sections) {
        const clos = await model.getCLOBySectionAndPLO(
          sec.section_id,
          plo.plo_id
        );

        if (clos.length > 0) {
          ploObj.sections.push({
            section_id: sec.section_id,
            subject_id: sec.subject_id,
            subject_name: sec.subject_name,
            clos
          });
        }
      }

      result.push(ploObj);
    }

    res.json({
      program_id,
      year,
      total_plo: result.length,
      plo_summary: result
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
