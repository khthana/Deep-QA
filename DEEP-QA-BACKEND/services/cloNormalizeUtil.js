//cloNormoalizeUtil.js

const MAX_SCORE = 5;
exports.normalizeToFiveScale = (score, fullScore) => {
  if (score === null || fullScore === 0) return null;
  return (Number(score) / Number(fullScore)) *MAX_SCORE;
};

exports.weightedCloScore = (activities) => {
  const weightSum = activities.reduce((s, a) => s + a.weight, 0);
  if (weightSum === 0) return null;

  let total = 0;
  activities.forEach(a => {
    total += (a.score / a.fullScore) * (MAX_SCORE * (a.weight / weightSum));
  });

  return Number(total.toFixed(2));
};


