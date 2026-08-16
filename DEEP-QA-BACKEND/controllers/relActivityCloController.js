//controllers/relActivityCloController.js
const relActivityCloNModel = require('../models/relActivityCloNModel');

/**
 * ดึงความสัมพันธ์ระหว่าง ActivityClo กับ Section
 */
exports.getRelActivityCloBySection = async (req, res) => {
  try {
    const { section_id } = req.params;
    const rows = await relActivityCloNModel.getRelationBySection(section_id);

    if (!rows || rows.length === 0) {
      return res.json({});
    }

    const meta = rows[0];

    const cloMap = {};
    const activitySet = new Set();

    let totalWeight = 0;
    let totalRelation = 0;

    rows.forEach(r => {
      if (!cloMap[r.clo_id]) {
        cloMap[r.clo_id] = {
          clo_id: r.clo_id,
          clo_number: r.clo_number,
          clo_detail: r.clo_detail,
          map_activity: []
        };
      }

      if (r.activity_id) {
        cloMap[r.clo_id].map_activity.push({
          activity_id: r.activity_id,
          activity_name: r.activity_name,
          weight: r.weight
        });

        activitySet.add(r.activity_id);
        totalWeight += Number(r.weight || 0);
        totalRelation++;
      }
    });

    const totalCLO = Object.keys(cloMap).length;

    res.json({
      section_id: meta.section_id,
      subject_id: meta.subject_id,
      subject_name: meta.subject_name,
      semester: meta.semester,
      year: meta.year,

      total_clo: totalCLO,
      total_activity: activitySet.size,
      total_relation: totalRelation,
      average_weight_per_clo:
        totalCLO ? Number((totalWeight / totalCLO).toFixed(2)) : 0,

      map_clo_activity: Object.values(cloMap)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
