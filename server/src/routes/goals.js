import express from 'express';
import Goal from '../models/Goal.js';
import Expense from '../models/Expense.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Helper: compute required monthly savings on the fly
const computeRequiredMonthlySavings = (goal) => {
  const now = new Date();
  const targetDate = new Date(goal.targetDate);
  const monthsRemaining = Math.max(
    1,
    (targetDate.getFullYear() - now.getFullYear()) * 12 +
      (targetDate.getMonth() - now.getMonth())
  );
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
  return Math.ceil(remaining / monthsRemaining);
};

// @route   GET /api/goals
// @desc    Get all lifestyle goals (excludes emergency fund)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user._id, type: 'goal' }).sort({ createdAt: -1 });

    const enriched = goals.map((goal) => ({
      ...goal.toObject(),
      requiredMonthlySavings: computeRequiredMonthlySavings(goal),
      progress: goal.targetAmount > 0 ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100) : 0,
    }));

    res.json({ success: true, goals: enriched });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/goals
// @desc    Create a new goal
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { title, targetAmount, targetDate } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Please provide a title' });
    }
    if (!targetAmount || targetAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid target amount' });
    }
    if (!targetDate) {
      return res.status(400).json({ success: false, message: 'Please provide a target date' });
    }

    const target = new Date(targetDate);
    if (target <= new Date()) {
      return res.status(400).json({ success: false, message: 'Target date must be in the future' });
    }

    const goal = await Goal.create({
      user: req.user._id,
      title,
      targetAmount: Number(targetAmount),
      targetDate: target,
      type: 'goal',
    });

    res.status(201).json({
      success: true,
      goal: {
        ...goal.toObject(),
        requiredMonthlySavings: computeRequiredMonthlySavings(goal),
        progress: 0,
      },
    });
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/goals/:id/contribute
// @desc    Add contribution to a goal
// @access  Private
router.patch('/:id/contribute', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid contribution amount' });
    }

    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id, type: 'goal' });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    const amountNum = Number(amount);
    goal.savedAmount = Math.min(goal.targetAmount, goal.savedAmount + amountNum);

    // Sync: record the contribution in spending history so it deducts from monthly
    // income and is visible in Spending History.
    const expense = await Expense.create({
      user: req.user._id,
      amount: amountNum,
      category: 'Savings',
      description: `Goal contribution: ${goal.title}`,
      date: new Date(),
      source: 'manual',
    });

    goal.contributions.push({ amount: amountNum, date: new Date(), expense: expense._id });
    await goal.save();

    res.json({
      success: true,
      goal: {
        ...goal.toObject(),
        requiredMonthlySavings: computeRequiredMonthlySavings(goal),
        progress: goal.targetAmount > 0 ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Contribute to goal error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;