import express from 'express';
import Goal from '../models/Goal.js';
import Expense from '../models/Expense.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Helper: compute average monthly spending (last 3 months)
const getAverageMonthlySpending = async (userId) => {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const expenses = await Expense.find({
    user: userId,
    date: { $gte: threeMonthsAgo },
  });

  if (expenses.length === 0) return null;

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  return total / 3;
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
  const monthlySpending = avgMonthlySpending !== null ? avgMonthlySpending : user.monthlyIncome * 0.3;

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