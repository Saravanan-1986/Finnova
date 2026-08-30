import express from 'express';
import ExtraIncome from '../models/ExtraIncome.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// @route   GET /api/extra-income
// @desc    List the user's extra incomes (newest first)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const incomes = await ExtraIncome.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(50);
    res.json({ success: true, incomes });
  } catch (error) {
    console.error('Get extra income error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/extra-income
// @desc    Add an extra income entry (bonus, cashback, gift, freelance...)
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { amount, note, date } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid amount' });
    }

    const income = await ExtraIncome.create({
      user: req.user._id,
      amount: Number(amount),
      note: note || '',
      date: date ? new Date(date) : new Date(),
    });

    res.status(201).json({ success: true, income });
  } catch (error) {
    console.error('Create extra income error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/extra-income/:id
// @desc    Remove an extra income entry
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const income = await ExtraIncome.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!income) {
      return res.status(404).json({ success: false, message: 'Extra income not found' });
    }
    res.json({ success: true, message: 'Extra income removed' });
  } catch (error) {
    console.error('Delete extra income error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
