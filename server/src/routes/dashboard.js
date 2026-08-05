import express from 'express';
import Expense from '../models/Expense.js';
import BillEmi from '../models/BillEmi.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// @route   GET /api/dashboard/summary
// @desc    Get dashboard summary: income left, recent expenses, upcoming EMIs/bills
// @access  Private
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const fifteenDaysFromNow = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    // This month's expenses
    const monthExpenses = await Expense.find({
      user: req.user._id,
      date: { $gte: startOfMonth, $lt: startOfNextMonth },
    });

    const totalSpentThisMonth = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const incomeLeft = Math.max(0, (req.user.monthlyIncome || 0) - totalSpentThisMonth);

    // Recent 5 expenses (all time, newest first)
    const recentExpenses = await Expense.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(5);

    // Upcoming EMIs and bills due in next 15 days
    const upcoming = await BillEmi.find({
      user: req.user._id,
      status: 'pending',
      dueDate: { $gte: now, $lte: fifteenDaysFromNow },
    }).sort({ dueDate: 1 });

    const upcomingEmis = upcoming.filter((r) => r.type === 'emi');
    const upcomingBills = upcoming.filter((r) => r.type === 'bill');

    res.json({
      success: true,
      summary: {
        monthlyIncome: req.user.monthlyIncome || 0,
        totalSpentThisMonth,
        incomeLeft,
        recentExpenses,
        upcomingEmis,
        upcomingBills,
      },
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;