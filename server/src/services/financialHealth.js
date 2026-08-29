import Expense from '../models/Expense.js';
import Goal from '../models/Goal.js';
import BillEmi from '../models/BillEmi.js';
import User from '../models/User.js';

/**
 * Calculates a composite 0-100 financial health score for the user based on database records.
 *
 * Scoring Rules (Total 100 points):
 * 1. Spending-to-Income Ratio (30 points) - Lower ratio is healthier.
 * 2. Emergency Fund Progress (30 points) - Progress percentage towards safety net goals.
 * 3. EMI / Bill Burden Ratio (20 points) - Percentage of monthly income committed to bills and debt.
 * 4. Goal Contribution Consistency (20 points) - Calculated from lifestyle savings goals progress.
 *
 * @param {String} userId - The user ID to calculate for.
 * @returns {Object} { score, factors: { spendingRatio, emergencyFundProgress, emiBurdenRatio, goalConsistency } }
 */
export const calculateFinancialHealth = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { score: 0, factors: { spendingRatio: 0, emergencyFundProgress: 0, emiBurdenRatio: 0, goalConsistency: 0 } };
    }

    const monthlyIncome = user.monthlyIncome || user.monthlyAllowance || 1; // Prevent division by zero

    // --- 1. Spending-to-Income Ratio (30 Points) ---
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const expenses = await Expense.find({
      user: userId,
      date: { $gte: startOfMonth, $lt: endOfMonth },
      // 'Savings' transfers (goal & emergency-fund contributions) are NOT
      // consumption — they reduce available income but shouldn't lower the
      // health score as if the money was spent.
      category: { $ne: 'Savings' },
    });
    const totalSpent = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const spendingRatio = totalSpent / monthlyIncome;

    let spendingScore = 0;
    if (spendingRatio <= 0.4) {
      spendingScore = 30; // Highly conservative spending
    } else if (spendingRatio >= 1.0) {
      spendingScore = 0; // Over-spending or matching full income
    } else {
      // Interpolate between 0.4 (30 pts) and 1.0 (0 pts)
      spendingScore = Math.round(30 * (1 - (spendingRatio - 0.4) / 0.6));
    }

    // --- 2. Emergency Fund Progress (30 Points) ---
    const emergencyFundGoal = await Goal.findOne({
      user: userId,
      type: 'emergency_fund',
    });

    let emergencyFundProgress = 0;
    let emergencyFundScore = 0;
    if (emergencyFundGoal) {
      const target = emergencyFundGoal.targetAmount || 1;
      const saved = emergencyFundGoal.savedAmount || 0;
      emergencyFundProgress = Math.min(1, saved / target);
      emergencyFundScore = Math.round(emergencyFundProgress * 30);
    } else {
      // No safety net goals established
      emergencyFundProgress = 0;
      emergencyFundScore = 0;
    }

    // --- 3. EMI / Bill Burden Ratio (20 Points) ---
    const billsAndEmis = await BillEmi.find({ user: userId });
    const totalEmiAmount = billsAndEmis.reduce((sum, item) => sum + (item.amount || 0), 0);
    const emiBurdenRatio = totalEmiAmount / monthlyIncome;

    let emiBurdenScore = 0;
    if (emiBurdenRatio <= 0.15) {
      emiBurdenScore = 20; // Healthy, low debt commitments
    } else if (emiBurdenRatio >= 0.5) {
      emiBurdenScore = 0; // Heavy debt lockups
    } else {
      // Interpolate between 0.15 (20 pts) and 0.5 (0 pts)
      emiBurdenScore = Math.round(20 * (1 - (emiBurdenRatio - 0.15) / 0.35));
    }

    // --- 4. Goal Contribution Consistency (20 Points) ---
    const lifestyleGoals = await Goal.find({
      user: userId,
      type: 'goal',
    });

    let goalConsistency = 0;
    let goalScore = 15; // Default neutral points if no lifestyle goals exist
    if (lifestyleGoals.length > 0) {
      const totalProgress = lifestyleGoals.reduce((sum, goal) => {
        const target = goal.targetAmount || 1;
        const saved = goal.savedAmount || 0;
        return sum + Math.min(1, saved / target);
      }, 0);
      goalConsistency = totalProgress / lifestyleGoals.length;
      goalScore = Math.round(goalConsistency * 20);
    }

    // Composite Score (0-100)
    const compositeScore = spendingScore + emergencyFundScore + emiBurdenScore + goalScore;

    return {
      score: Math.min(100, Math.max(0, compositeScore)),
      factors: {
        spendingRatio: Number(spendingRatio.toFixed(2)),
        emergencyFundProgress: Number(emergencyFundProgress.toFixed(2)),
        emiBurdenRatio: Number(emiBurdenRatio.toFixed(2)),
        goalConsistency: Number(goalConsistency.toFixed(2)),
      },
    };
  } catch (error) {
    console.error('Calculate financial health service error:', error);
    throw error;
  }
};
