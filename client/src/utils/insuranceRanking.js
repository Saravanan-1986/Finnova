/**
 * Shared ranking helpers for the Insurance & Schemes section.
 *
 * `rankInsuranceProducts` scores every private insurance policy against the
 * logged-in user's real profile — age, occupation, income, family size — plus
 * the cover amounts the coverage calculator recommends for them, so the
 * catalogue is always shown in the order that best suits that specific user.
 *
 * The resulting 0–100 `rank` is used both for sorting and as a "Match %" chip.
 */

export const inrLakhs = (amount) => `₹${(Number(amount || 0) / 100000).toFixed(0)}L`;

export const rankInsuranceProducts = (products, calculator, user = {}, familySize = 0) => {
  if (!Array.isArray(products)) return [];

  const monthlyIncome = Number(user.monthlyIncome) || Number(user.monthlyAllowance) || 0;
  const annualIncome = monthlyIncome * 12;
  const age = Number(user.age) || 25;
  const isStudent = user.occupationType === 'student';
  const family = Number(familySize) || 0;

  const ranked = products.map((product) => {
    const tiers = [...(product.coverTiers || [])].sort((a, b) => a.coverAmount - b.coverAmount);
    const maxTier = tiers[tiers.length - 1]?.coverAmount || 0;
    const minPremium = tiers[0]?.indicativeAnnualPremium || 0;
    const csr = product.claimSettlementRatio || 0;

    const target =
      product.category === 'health'
        ? calculator?.health?.amount
        : product.category === 'term_life'
        ? calculator?.life?.amount
        : 0;
    const nearestTier = target > 0 ? tiers.find((t) => t.coverAmount >= target) : null;

    const reasons = [];
    let score = 0;
    let coverReason = '';
    let profileReason = '';
    let affordReason = '';

    // 1) How essential this category is for the user's life stage
    let categoryReason = '';
    if (product.category === 'health') {
      score += 38;
      categoryReason = 'Health cover is the base layer for every household';
      if (family > 0) {
        score += 8;
        profileReason = `Covers your ${family} family dependent(s) under one floater`;
        reasons.push(profileReason);
      } else if (age >= 40) {
        score += 8;
        profileReason = `At ${age}, medical needs rise — a higher sum insured is advised`;
        reasons.push(profileReason);
      }
    } else if (product.category === 'term_life') {
      if (family > 0) {
        score += 18;
        profileReason = 'Your family depends on your income — term cover is a priority';
        reasons.push(profileReason);
      } else if (annualIncome > 0) {
        score += 15;
        profileReason = `Replaces your annual income (₹${(annualIncome / 100000).toFixed(1)}L) if you pass away`;
        reasons.push(profileReason);
      }
      if (age > 0 && age <= 35 && annualIncome > 0) {
        score += 5;
        reasons.push('Lock in low term premiums while you are younger');
      }
      if (score === 0) categoryReason = 'Term life is optional until you have income or dependents';
    } else if (product.category === 'accident') {
      score += 24;
      categoryReason = 'Accidental disability cover matters for people of every age';
      if (isStudent) {
        score += 8;
        profileReason = 'Designed around students who travel daily to college';
        reasons.push(profileReason);
      } else if (age > 0 && age <= 35) {
        score += 10;
        profileReason = 'Younger adults commute more — accident risk is relatively higher';
        reasons.push(profileReason);
      }
    } else {
      score += 8;
      categoryReason = 'Vehicle protection — a great fit if you own a two-wheeler or car';
    }

    // 2) Does it cover the amount the coverage calculator recommends?
    if (nearestTier) {
      score += 25;
      coverReason = `Matches your recommended ${inrLakhs(target)} cover — this plan offers up to ${inrLakhs(
        nearestTier.coverAmount
      )}`;
      reasons.push(coverReason);
    } else if (target > 0) {
      score += 12;
      coverReason = `Offers up to ${inrLakhs(maxTier)} — add a top-up for full cover`;
      reasons.push(coverReason);
    }

    // 3) Premium affordability vs. the user's monthly income
    if (monthlyIncome > 0 && minPremium > 0) {
      const premiumToIncome = minPremium / 12 / monthlyIncome;
      if (premiumToIncome <= 0.05) {
        score += 10;
        affordReason = 'Premium is within 5% of monthly income — comfortably affordable';
        reasons.push(affordReason);
      } else if (premiumToIncome <= 0.1) {
        score += 5;
        affordReason = 'Premium is within 10% of monthly income — moderately priced';
        reasons.push(affordReason);
      }
    }

    // 4) Claim settlement quality
    const csrPoints = csr / 10;
    score += csrPoints;
    reasons.push(`${csr}% claim settlement ratio — reliable payout track record`);

    // Pick the single most useful line for card previews
    const primaryReason =
      coverReason || profileReason || categoryReason || affordReason || `${csr}% claim settlement ratio`;

    return {
      ...product,
      rank: Math.max(2, Math.min(100, Math.round(score))),
      reason: primaryReason,
      reasons,
      recommendedCoverAmount: target,
    };
  });

  return ranked.sort((a, b) => b.rank - a.rank);
};