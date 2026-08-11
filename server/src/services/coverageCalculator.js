/**
 * Calculates recommended cover amounts for Health and Term Life insurance.
 *
 * Formulas:
 * - Health cover: Base ₹5,00,000 for individual; +₹3,00,000 per dependent; floor at ₹10,00,000 if any dependent is a minor (<18) or senior (>=60).
 * - Term Life cover: (annualIncome * 12) - (totalSavedInGoals + emergencyFundSaved), floored at 0, with a minimum floor of 10x annual income.
 *
 * @param {Object} user - The user document.
 * @param {Array} dependents - Array of user's dependents.
 * @param {Number} liabilities - Optional total liabilities.
 * @param {Number} savings - Total current savings/assets (goals saved + emergency fund saved).
 * @returns {Object} { health: { amount, breakdown: [String] }, life: { amount, breakdown: [String] } }
 */
export const recommendedCoverAmount = (user, dependents = [], liabilities = 0, savings = 0) => {
  // --- Health Cover ---
  let healthCover = 500000 + dependents.length * 300000;
  const hasMinorOrSenior = dependents.some((d) => d.age < 18 || d.age >= 60);
  let healthFloorApplied = false;

  if (hasMinorOrSenior && healthCover < 1000000) {
    healthCover = 1000000;
    healthFloorApplied = true;
  }

  const healthBreakdown = [
    'Base health cover for individual: ₹5,00,000',
    `Added cover for ${dependents.length} dependent(s): +₹${(dependents.length * 300000).toLocaleString('en-IN')}`,
  ];
  if (healthFloorApplied) {
    healthBreakdown.push('Floored recommendation to ₹10,00,000 because at least one family member is a minor (<18) or senior (≥60)');
  }

  // --- Term Life Cover ---
  const annualIncome = (user.monthlyIncome || 0) * 12;
  const rawLifeCover = annualIncome * 12 - savings;
  const lifeCoverFloor = annualIncome * 10;
  let lifeCover = Math.max(0, rawLifeCover);
  let lifeFloorApplied = false;

  if (lifeCover < lifeCoverFloor) {
    lifeCover = lifeCoverFloor;
    lifeFloorApplied = true;
  }

  const lifeBreakdown = [
    `Target multiplier (12x annual income): ₹${(annualIncome * 12).toLocaleString('en-IN')} (Annual Income: ₹${annualIncome.toLocaleString('en-IN')})`,
    `Deducted current savings (welfare goals & emergency fund): -₹${savings.toLocaleString('en-IN')}`,
    `Calculated raw term life cover: ₹${Math.max(0, rawLifeCover).toLocaleString('en-IN')}`,
  ];
  if (lifeFloorApplied) {
    lifeBreakdown.push(`Minimum floor recommendation (10x annual income) applied: ₹${lifeCoverFloor.toLocaleString('en-IN')}`);
  }

  return {
    health: {
      amount: healthCover,
      breakdown: healthBreakdown,
    },
    life: {
      amount: lifeCover,
      breakdown: lifeBreakdown,
    },
  };
};
