const normalize = require('./cloNormalizeUtil')
const programModel = require('../models/scoreEvaluationProgramModel')

const MAX_SCORE = 5
/* =========================
 * SECTION / STUDENT
 * ========================= */

exports.buildStudentCloResult = (rows) => {
  const cloMap = {}

  rows.forEach((r) => {
    if (!cloMap[r.clo_id]) {
      cloMap[r.clo_id] = {
        clo_id: r.clo_id,
        clo_number: r.clo_number,
        clo_detail: r.clo_detail,
        activities: [],
      }
    }

    if (r.student_score !== null && Number(r.weight) > 0) {
      cloMap[r.clo_id].activities.push({
        score: Number(r.student_score),
        fullScore: Number(r.full_score),
        weight: Number(r.weight),
      })
    }
  })

  return Object.values(cloMap).map((clo) => ({
    clo_id: clo.clo_id,
    clo_number: clo.clo_number,
    clo_detail: clo.clo_detail,
    earned_score: normalize.weightedCloScore(clo.activities),
    full_score: MAX_SCORE,
  }))
}

// ✅ ปรับให้คิดแบบถ่วงน้ำหนัก
exports.buildSectionAverageResult = (clos, rawScores) => {
  const buffer = {}

  rawScores.forEach((r) => {
    if (r.student_score === null || Number(r.weight) <= 0) return

    buffer[r.student_id] ??= {}
    buffer[r.student_id][r.clo_id] ??= []
    buffer[r.student_id][r.clo_id].push({
      score: Number(r.student_score),
      fullScore: Number(r.full_score),
      weight: Number(r.weight),
    })
  })

  const cloTotalScores = {}
  const cloStudentCount = {}

  clos.forEach((c) => {
    cloTotalScores[c.clo_id] = 0
    cloStudentCount[c.clo_id] = 0
  })

  Object.entries(buffer).forEach(([sid, cloObj]) => {
    Object.entries(cloObj).forEach(([clo_id, activities]) => {
      // ✅ เรียกใช้ฟังก์ชันถ่วงน้ำหนัก
      const studentCloScore = normalize.weightedCloScore(activities)
      if (studentCloScore !== null) {
        cloTotalScores[clo_id] += studentCloScore
        cloStudentCount[clo_id] += 1
      }
    })
  })

  return clos.map((c) => {
    const sum = cloTotalScores[c.clo_id]
    const count = cloStudentCount[c.clo_id]
    const sectionAvg = count > 0 ? sum / count : null

    return {
      plo_id: c.plo_id,
      clo_id: c.clo_id,
      clo_number: c.clo_number,
      clo_detail: c.clo_detail,
      earned_score: sectionAvg !== null ? Number(sectionAvg.toFixed(2)) : null,
      full_score: MAX_SCORE,
    }
  })
}

/* =========================
 * PROGRAM : YEARเดียว
 * ========================= */

exports.buildProgramPloResult = (rows) => {
  const ploMap = {}

  rows.forEach((r) => {
    const ploId = r.plo_id

    if (!ploMap[ploId]) {
      ploMap[ploId] = {
        plo_id: r.plo_id,
        plo_code: r.plo_code,
        plo_name: r.plo_name,
        sequence: r.plo_sequence,
        subjects: {},
      }
    }

    if (!ploMap[ploId].subjects[r.subject_id]) {
      ploMap[ploId].subjects[r.subject_id] = {
        subject_id: r.subject_id,
        subject_name_en: r.subject_name_en,
        subject_type: r.subject_type,
        section_id: new Set(),
        clos: {},
      }
    }

    const subject = ploMap[ploId].subjects[r.subject_id]
    subject.section_id.add(r.section_id)

    if (!subject.clos[r.clo_id]) {
      subject.clos[r.clo_id] = {
        clo_id: r.clo_id,
        clo_number: r.clo_number,
        clo_detail: r.clo_detail,
        scores: [],
      }
    }

    if (r.student_score !== null) {
      const normalized =
        (Number(r.student_score) / Number(r.full_score)) * MAX_SCORE
      subject.clos[r.clo_id].scores.push(normalized)
    }
  })

  return Object.values(ploMap)
    .sort((a, b) => a.sequence - b.sequence)
    .map((plo) => {
      let ploScores = []

      const subjects = Object.values(plo.subjects).map((sub) => {
        const clos = Object.values(sub.clos).map((clo) => {
          const avg =
            clo.scores.length > 0
              ? clo.scores.reduce((a, b) => a + b, 0) / clo.scores.length
              : null

          if (avg !== null) ploScores.push(avg)

          return {
            clo_id: clo.clo_id,
            clo_number: clo.clo_number,
            clo_detail: clo.clo_detail,
            earned_score: avg !== null ? Number(avg.toFixed(2)) : null,
            full_score: MAX_SCORE,
          }
        })

        return {
          subject_id: sub.subject_id,
          subject_name_en: sub.subject_name_en,
          subject_type: sub.subject_type,
          section_id: Array.from(sub.section_id),
          clos,
        }
      })

      return {
        plo_id: plo.plo_id,
        plo_code: plo.plo_code,
        plo_name: plo.plo_name,
        plo_score:
          ploScores.length > 0
            ? Number(
                (
                  ploScores.reduce((a, b) => a + b, 0) / ploScores.length
                ).toFixed(2),
              )
            : null,
        full_score: MAX_SCORE,
        subjects,
      }
    })
}

exports.getProgramPloScores = async (programId, academicYear) => {
  const allPlos = await programModel.getProgramPLOs(programId)
  const rows = await programModel.getProgramCloRawScores(
    programId,
    academicYear,
  )
  const calculated = exports.buildProgramPloResult(rows)

  const calculatedMap = {}
  calculated.forEach((p) => {
    calculatedMap[p.plo_id] = p
  })

  return allPlos.map((p) => {
    const found = calculatedMap[p.plo_id]

    if (!found) {
      return {
        plo_id: p.plo_id,
        plo_code: p.plo_code,
        plo_name: p.plo_name,
        plo_score: null,
        full_score: MAX_SCORE,
        subjects: [],
      }
    }

    return found
  })
}

/* =========================
 * PROGRAM : หลายปี
 * ========================= */

exports.getProgramPloScoresByYearRange = async (
  programId,
  startYear,
  endYear,
) => {
  const allPlos = await programModel.getProgramPLOs(programId)

  const rows = await programModel.getProgramCloRawScoresByYearRange(
    programId,
    startYear,
    endYear,
  )

  const ploMap = {}

  rows.forEach((r) => {
    const year = String(r.academic_year)

    if (!ploMap[r.plo_id]) {
      ploMap[r.plo_id] = {
        plo_id: r.plo_id,
        plo_code: r.plo_code,
        plo_name: r.plo_name,
        scores: {},
        _buffer: {},
      }

      for (let y = Number(startYear); y <= Number(endYear); y++) {
        ploMap[r.plo_id].scores[String(y)] = null
      }
    }

    ploMap[r.plo_id]._buffer[year] ??= {}
    ploMap[r.plo_id]._buffer[year][r.clo_id] ??= []

    if (r.student_score !== null) {
      const normalized =
        (Number(r.student_score) / Number(r.full_score)) * MAX_SCORE
      ploMap[r.plo_id]._buffer[year][r.clo_id].push(normalized)
    }
  })

  Object.values(ploMap).forEach((plo) => {
    Object.entries(plo._buffer).forEach(([year, cloMap]) => {
      const cloAvgs = Object.values(cloMap)
        .map((scores) =>
          scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : null,
        )
        .filter((v) => v !== null)

      plo.scores[year] =
        cloAvgs.length > 0
          ? Number(
              (cloAvgs.reduce((a, b) => a + b, 0) / cloAvgs.length).toFixed(2),
            )
          : null
    })

    delete plo._buffer
  })

  return allPlos.map((p) => {
    const found = ploMap[p.plo_id]

    if (!found) {
      const scores = {}
      for (let y = Number(startYear); y <= Number(endYear); y++) {
        scores[String(y)] = null
      }

      return {
        plo_id: p.plo_id,
        plo_code: p.plo_code,
        plo_name: p.plo_name,
        scores,
      }
    }

    return found
  })
}

exports.getProgramPloScoresByStudent = async (
  programId,
  academicYear,
  studentId,
) => {
  const allPlos = await programModel.getProgramPLOs(programId)

  const rows = await programModel.getProgramStudentCloRawScores(
    programId,
    academicYear,
    studentId,
  )

  const ploMap = {}

  rows.forEach((r) => {
    const ploId = r.plo_id

    if (!ploMap[ploId]) {
      ploMap[ploId] = {
        plo_id: r.plo_id,
        plo_code: r.plo_code,
        plo_name: r.plo_name,
        sequence: r.plo_sequence,
        subjects: {},
      }
    }

    if (!ploMap[ploId].subjects[r.subject_id]) {
      ploMap[ploId].subjects[r.subject_id] = {
        subject_id: r.subject_id,
        subject_name_en: r.subject_name_en,
        subject_type: r.subject_type,
        section_id: new Set(),
        clos: {},
      }
    }

    const subject = ploMap[ploId].subjects[r.subject_id]
    subject.section_id.add(r.section_id)

    if (!subject.clos[r.clo_id]) {
      subject.clos[r.clo_id] = {
        clo_id: r.clo_id,
        clo_number: r.clo_number,
        clo_detail: r.clo_detail,
        scores: [],
      }
    }

    if (r.student_score !== null) {
      const normalized =
        (Number(r.student_score) / Number(r.full_score)) * MAX_SCORE
      subject.clos[r.clo_id].scores.push(normalized)
    }
  })

  const calculatedPlos = Object.values(ploMap)
    .sort((a, b) => a.sequence - b.sequence)
    .map((plo) => {
      let ploScores = []

      const subjects = Object.values(plo.subjects).map((sub) => {
        const clos = Object.values(sub.clos).map((clo) => {
          const avg =
            clo.scores.length > 0
              ? clo.scores.reduce((a, b) => a + b, 0) / clo.scores.length
              : null

          if (avg !== null) ploScores.push(avg)

          return {
            clo_id: clo.clo_id,
            clo_number: clo.clo_number,
            clo_detail: clo.clo_detail,
            earned_score: avg !== null ? Number(avg.toFixed(2)) : null,
            full_score: MAX_SCORE,
          }
        })

        return {
          subject_id: sub.subject_id,
          subject_name_en: sub.subject_name_en,
          subject_type: sub.subject_type,
          section_id: Array.from(sub.section_id),
          clos,
        }
      })

      return {
        plo_id: plo.plo_id,
        plo_code: plo.plo_code,
        plo_name: plo.plo_name,
        plo_score:
          ploScores.length > 0
            ? Number(
                (
                  ploScores.reduce((a, b) => a + b, 0) / ploScores.length
                ).toFixed(2),
              )
            : null,
        full_score: MAX_SCORE,
        subjects,
      }
    })

  const calculatedMap = {}
  calculatedPlos.forEach((p) => {
    calculatedMap[p.plo_id] = p
  })

  return allPlos.map((p) => {
    const found = calculatedMap[p.plo_id]

    if (!found) {
      return {
        plo_id: p.plo_id,
        plo_code: p.plo_code,
        plo_name: p.plo_name,
        plo_score: null,
        full_score: MAX_SCORE,
        subjects: [],
      }
    }

    return found
  })
}

exports.buildProgramStudentPloResult = (rows) => {
  const ploMap = {}

  rows.forEach((r) => {
    if (!r.plo_id) return

    if (!ploMap[r.plo_id]) {
      ploMap[r.plo_id] = {
        plo_id: r.plo_id,
        plo_code: r.plo_code,
        plo_name: r.plo_name,
        sequence: r.plo_sequence,
        scores: [],
      }
    }

    if (r.student_score !== null && r.full_score) {
      ploMap[r.plo_id].scores.push(
        (Number(r.student_score) / Number(r.full_score)) * MAX_SCORE,
      )
    }
  })

  return Object.values(ploMap)
    .sort((a, b) => a.sequence - b.sequence)
    .map((p) => ({
      plo_id: p.plo_id,
      plo_code: p.plo_code,
      plo_name: p.plo_name,
      plo_score:
        p.scores.length > 0
          ? Number(
              (p.scores.reduce((a, b) => a + b, 0) / p.scores.length).toFixed(
                2,
              ),
            )
          : null,
      full_score: MAX_SCORE,
    }))
}

exports.buildProgramStudentsPloResult = (rows, allPlos) => {
  const studentMap = new Map()

  for (const row of rows) {
    const studentId = row.student_id

    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, {
        student_id: studentId,
        title_th: row.title_th,
        first_name: row.first_name,
        last_name: row.last_name,
        plos: [],
      })
    }

    const student = studentMap.get(studentId)

    student.plos.push({
      plo_id: row.plo_id,
      plo_code: row.plo_code,
      plo_name: row.plo_name,
      score: Number(row.plo_avg_score),
      full_score: Number(row.full_score),
    })
  }

  return Array.from(studentMap.values()).map((student) => {
    const ploMap = {}
    student.plos.forEach((p) => {
      ploMap[p.plo_id] = p
    })

    student.plos = allPlos.map((p) => {
      const found = ploMap[p.plo_id]

      if (!found) {
        return {
          plo_id: p.plo_id,
          plo_code: p.plo_code,
          plo_name: p.plo_name,
          score: null,
          full_score: MAX_SCORE,
        }
      }

      return found
    })

    return student
  })
}

exports.buildProgramAllStudentsPloResult = (students, scoreRows, allPlos) => {
  const scoreMap = new Map()

  for (const row of scoreRows) {
    if (!scoreMap.has(row.student_id)) {
      scoreMap.set(row.student_id, {})
    }

    scoreMap.get(row.student_id)[row.plo_id] = {
      plo_id: row.plo_id,
      plo_code: row.plo_code,
      plo_name: row.plo_name,
      score: Number(row.plo_avg_score),
      full_score: Number(row.full_score),
    }
  }

  return students.map((st) => {
    const ploScoreMap = scoreMap.get(st.student_id) || {}

    return {
      student_id: st.student_id,
      title_th: st.title_th,
      first_name: st.first_name,
      last_name: st.last_name,
      plos: allPlos.map((p) => {
        return (
          ploScoreMap[p.plo_id] || {
            plo_id: p.plo_id,
            plo_code: p.plo_code,
            plo_name: p.plo_name,
            score: null,
            full_score: MAX_SCORE,
          }
        )
      }),
    }
  })
}
