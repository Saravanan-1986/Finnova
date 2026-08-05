import express from 'express';
import BillEmi from '../models/BillEmi.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// @route   GET /api/bills-emi?type=emi|bill
// @desc    Get bills/EMIs for the user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { user: req.user._id };
    if (type === 'emi' || type === 'bill') {
      filter.type = type;
    }

    const records = await BillEmi.find(filter).sort({ dueDate: 1 });
    res.json({ success: true, records });
  } catch (error) {
    console.error('Get bills/EMIs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/bills-emi
// @desc    Add a new bill or EMI
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { type, title, amount, dueDate, recurring, category } = req.body;

    if (!type || !['bill', 'emi'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid type (bill or emi)' });
    }
    if (!title) {
      return res.status(400).json({ success: false, message: 'Please provide a title' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid amount' });
    }
    if (!dueDate) {
      return res.status(400).json({ success: false, message: 'Please provide a due date' });
    }

    const record = await BillEmi.create({
      user: req.user._id,
      type,
      title,
      amount: Number(amount),
      dueDate: new Date(dueDate),
      recurring: recurring || false,
      category: category || '',
    });

    res.status(201).json({ success: true, record });
  } catch (error) {
    console.error('Create bill/EMI error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/bills-emi/:id/pay
// @desc    Mark a bill/EMI as paid
// @access  Private
router.patch('/:id/pay', async (req, res) => {
  try {
    const record = await BillEmi.findOne({ _id: req.params.id, user: req.user._id });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    record.status = 'paid';
    record.paidOn = new Date();
    await record.save();

    res.json({ success: true, record });
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;