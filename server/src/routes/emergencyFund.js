import express from 'express';
import Goal from '../models/Goal.js';
import Expense from '../models/Expense.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Helper: compute average monthly spending (last 3 months)
// Counts only real consumption — Savings transfers (goal & emergency-fund
// contributions) and pre-committed Bills & EMI payments are NOT consumer
// spending. Without this exclusion, contributing to a goal or the emergency
// fund would inflate the fund's own target (a circular loop where saving
// money makes the safety-net goal grow forever).
const getAverageMonthlySpending = async (userId) => {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const expenses = await Expense.find({
    user: userId,
    date: { $gte: threeMonthsAgo },
    category: { $nin: ['Savings', 'Bills & EMI'] },
  });

  if (expenses.length === 0) return null;

  // Average across the number of distinct months that actually have data
  // (not a hard ÷3), so a user with only one month of history still gets a
  // fair estimate of their monthly living cost.
  const monthKeys = new Set();
  expenses.forEach((e) => monthKeys.add(`${e.date.getFullYear()}-${e.date.getMonth()}`));

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  return total / Math.max(1, monthKeys.size);
};

// Helper: get or create the emergency fund goal
const getOrCreateEmergencyFund = async (userId) => {
  let fund = await Goal.findOne({ user: userId, type: 'emergency_fund' });

  if (!fund) {
    const now = new Date();
    fund = await Goal.create({
      user: userId,
      title: 'Emergency Fund',
      targetAmount: 0,
      targetDate: new Date(now.getFullYear() + 5, now.getMonth(), now.getDate()),
      savedAmount: 0,
      type: 'emergency_fund',
      targetMonths: 3,
    });
  }

  return fund;
};

// Helper: build the enriched emergency fund response
const buildFundResponse = async (fund, user) => {
  const avgMonthlySpending = await getAverageMonthlySpending(user._id);
  const monthlySpending =
    avgMonthlySpending !== null ? avgMonthlySpending : (user.monthlyIncome || user.monthlyAllowance || 0) * 0.3;

  const target3 = Math.round(monthlySpending * 3);
  const target6 = Math.round(monthlySpending * 6);
  const targetMonths = fund.targetMonths || 3;
  const activeTarget = targetMonths === 6 ? target6 : target3;

  // Update target amount to match the active target
  if (fund.targetAmount !== activeTarget) {
    fund.targetAmount = activeTarget;
    await fund.save();
  }

  return {
    ...fund.toObject(),
    monthlySpending: Math.round(monthlySpending),
    target3Months: target3,
    target6Months: target6,
    activeTargetMonths: targetMonths,
    progress: fund.targetAmount > 0 ? Math.min(100, (fund.savedAmount / fund.targetAmount) * 100) : 0,
  };
};

// @route   GET /api/emergency-fund
// @desc    Get emergency fund (auto-creates if missing)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const fund = await getOrCreateEmergencyFund(req.user._id);
    const data = await buildFundResponse(fund, req.user);
    res.json({ success: true, fund: data });
  } catch (error) {
    console.error('Get emergency fund error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/emergency-fund/contribute
// @desc    Add contribution to emergency fund
// @access  Private
router.patch('/contribute', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid contribution amount' });
    }

    const fund = await getOrCreateEmergencyFund(req.user._id);
    fund.savedAmount = Math.min(fund.targetAmount, fund.savedAmount + Number(amount));

    // Sync: record the contribution in spending history so it deducts from monthly
    // income and is visible in Spending History.
    const expense = await Expense.create({
      user: req.user._id,
      amount: Number(amount),
      category: 'Savings',
      description: 'Emergency Fund contribution',
      date: new Date(),
      source: 'manual',
    });

    fund.contributions.push({ amount: Number(amount), date: new Date(), expense: expense._id });
    await fund.save();

    const data = await buildFundResponse(fund, req.user);
    res.json({ success: true, fund: data });
  } catch (error) {
    console.error('Contribute to emergency fund error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/emergency-fund/target
// @desc    Switch between 3mo / 6mo target
// @access  Private
router.patch('/target', async (req, res) => {
  try {
    const { months } = req.body;

    if (![3, 6].includes(Number(months))) {
      return res.status(400).json({ success: false, message: 'Target must be 3 or 6 months' });
    }

    const fund = await getOrCreateEmergencyFund(req.user._id);
    fund.targetMonths = Number(months);
    await fund.save();

    const data = await buildFundResponse(fund, req.user);
    res.json({ success: true, fund: data });
  } catch (error) {
    console.error('Switch emergency fund target error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;