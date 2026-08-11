/**
 * Evaluates the match score and justifications of a government scheme for a user and their dependents.
 *
 * Scoring Rules:
 * - Age band match: +30
 * - Income bracket match: +25
 * - Occupation match: +20
 * - Geography / State match: +15
 * - Gender-specific match bonus: +10
 *
 * @param {Object} user - The user document.
 * @param {Array} dependents - Array of user's dependents.
 * @param {Object} scheme - The scheme document.
 * @returns {Object} { score, matchedReasons: [String] }
 */
export const schemeMatchScore = (user, dependents = [], scheme) => {
  const evaluateForPerson = (person, isUser) => {
    let score = 0;
    const matchedReasons = [];

    // 1. Age band match: +30
    const age = Number(person.age);
    const minAge = scheme.eligibility.minAge !== undefined ? scheme.eligibility.minAge : 0;
    const maxAge = scheme.eligibility.maxAge !== undefined ? scheme.eligibility.maxAge : 100;
    if (age >= minAge && age <= maxAge) {
      score += 30;
      matchedReasons.push(`Matches age limit: ${age} years (Scheme allows ${minAge}-${maxAge} years)`);
    }

    // 2. Income bracket match: +25 (based on user's annual income)
    //    Use monthlyAllowance for students so income-based eligibility is evaluated
    //    against their real money, mirroring financialHealth.js behaviour.
    const annualIncome = (user.monthlyIncome || user.monthlyAllowance || 0) * 12;
    const minIncome = scheme.eligibility.minIncome !== undefined ? scheme.eligibility.minIncome : 0;
    const maxIncome = scheme.eligibility.maxIncome !== undefined ? scheme.eligibility.maxIncome : 999999999;
    if (annualIncome >= minIncome && annualIncome <= maxIncome) {
      score += 25;
      const maxIsUnlimited = maxIncome >= 999999999;
      let incomeLabel;
      if (minIncome > 0 && maxIsUnlimited) {
        incomeLabel = `above ₹${(minIncome / 100000).toFixed(1)}L/yr`;
      } else if (minIncome > 0) {
        incomeLabel = `between ₹${(minIncome / 100000).toFixed(1)}L and ₹${(maxIncome / 100000).toFixed(1)}L/yr`;
      } else {
        incomeLabel = `under ₹${(maxIncome / 100000).toFixed(1)}L/yr`;
      }
      matchedReasons.push(`Matches income bracket (Household income: ₹${(annualIncome / 100000).toFixed(1)}L/yr is ${incomeLabel})`);
    }

    // 3. Occupation match: +20 (based on user's occupation)
    const userOccupation = (user.occupationType || '').toLowerCase();
    const schemeOccupations = (scheme.eligibility.occupation || []).map((o) => o.toLowerCase());
    const occupationMatch =
      schemeOccupations.includes('any') ||
      schemeOccupations.includes(userOccupation) ||
      schemeOccupations.length === 0;
    if (occupationMatch) {
      score += 20;
      matchedReasons.push(`Matches occupation: suitable for ${user.occupationType}`);
    }

    // 4. Geography / State match: +15 (based on user's region/state)
    const userRegion = (user.region || '').toLowerCase();
    const schemeStates = (scheme.eligibility.applicableStates || []).map((s) => s.toLowerCase());
    const stateMatch =
      schemeStates.includes('any') ||
      schemeStates.length === 0 ||
      schemeStates.some((state) => userRegion.includes(state) || state.includes(userRegion));
    if (stateMatch) {
      score += 15;
      matchedReasons.push(`Applicable in your state/region: ${user.region || 'All India'}`);
    }

    // 5. Gender-specific match: +10
    const personGender = (person.gender || '').toLowerCase();
    const schemeGender = (scheme.eligibility.gender || 'any').toLowerCase();
    if (schemeGender === 'any') {
      score += 10;
      matchedReasons.push('Open to all genders');
    } else if (personGender === schemeGender) {
      score += 10;
      matchedReasons.push(`Matches gender requirement: specifically for ${scheme.eligibility.gender}`);
    }

    return { score, matchedReasons, name: isUser ? 'you' : person.name };
  };

  // Evaluate for user
  const userResult = evaluateForPerson(user, true);

  // Evaluate for each dependent
  const dependentResults = (dependents || []).map((dep) =>
    evaluateForPerson(
      {
        name: dep.name,
        age: dep.age,
        gender: dep.gender,
      },
      false
    )
  );

  // Find the highest score
  let bestResult = userResult;
  for (const depResult of dependentResults) {
    if (depResult.score > bestResult.score) {
      bestResult = depResult;
    }
  }

  // Prepend descriptive headers based on who matched best
  let finalMatchedReasons = [...bestResult.matchedReasons];
  if (bestResult !== userResult) {
    finalMatchedReasons.unshift(`Recommended for family member: ${bestResult.name}`);
  } else {
    finalMatchedReasons.unshift(`Matches your profile`);
  }

  return {
    score: bestResult.score,
    matchedReasons: finalMatchedReasons,
  };
};
