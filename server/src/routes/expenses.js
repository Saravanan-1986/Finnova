import express from 'express';
import Expense from '../models/Expense.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// @route   GET /api/expenses?month=&year=
// @desc    Get expenses for a given month (defaults to current month)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1; // 1-12
    const year = parseInt(req.query.year) || now.getFullYear();

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const expenses = await Expense.find({
      user: req.user._id,
      date: { $gte: start, $lt: end },
    }).sort({ date: -1 });

    res.json({ success: true, expenses });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/expenses
// @desc    Add a new expense
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { amount, category, description, date, source } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid amount' });
    }
    if (!category) {
      return res.status(400).json({ success: false, message: 'Please provide a category' });
    }

    const expense = await Expense.create({
      user: req.user._id,
      amount: Number(amount),
      category,
      description: description || '',
      date: date ? new Date(date) : new Date(),
      source: source || 'manual',
    });

    res.status(201).json({ success: true, expense });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/expenses/months
// @desc    Get list of months that have expense records
// @access  Private
router.get('/months', async (req, res) => {
  try {
    const records = await Expense.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
    ]);

    const months = records.map((r) => ({
      year: r._id.year,
      month: r._id.month,
      label: new Date(r._id.year, r._id.month - 1, 1).toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    }));

    res.json({ success: true, months });
  } catch (error) {
    console.error('Get months error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;