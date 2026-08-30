import express from 'express';
import Subscription from '../models/Subscription.js';
import Expense from '../models/Expense.js';
import {
  processDueSubscriptions,
  computeNextChargeDate,
  getMonthKey,
} from '../services/subscriptionAutoPay.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Enrich a subscription doc with display helpers
const enrich = (sub, now = new Date()) => ({
  ...sub.toObject(),
  nextChargeDate: sub.autoPay ? computeNextChargeDate(sub, now) : null,
  chargedThisMonth: sub.lastChargedMonth === getMonthKey(now),
});

const listPayload = (subs, chargedCount, now = new Date()) => {
  const active = subs.filter((s) => s.status === 'active');
  return {
    success: true,
    chargedCount,
    subscriptions: subs.map((s) => enrich(s, now)),
    summary: {
      activeCount: active.length,
      totalMonthly: active.reduce((sum, s) => sum + s.amount, 0),
      autoPayCount: active.filter((s) => s.autoPay).length,
    },
  };
};

const validateAmountAndAutoPay = ({ amount, autoPay, autoPayDate }) => {
  if (!amount || Number(amount) <= 0) {
    return 'Please provide a valid amount';
  }
  if (autoPay) {
    const day = Number(autoPayDate);
    if (!autoPayDate || !Number.isInteger(day) || day < 1 || day > 28) {
      return 'Auto-pay date must be a day of the month (1-28)';
    }
  }
  return null;
};

// @route   GET /api/subscriptions
// @desc    List subscriptions. Runs the auto-pay engine first so any payment
//          due today (or since the last visit) is deducted automatically and
//          reflected in Spending History.
// @access  Private
router.get('/', async (req, res) => {
  try {
    const chargedCount = await processDueSubscriptions(req.user._id);
    const subs = await Subscription.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(listPayload(subs, chargedCount));
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/subscriptions
// @desc    Add a subscription. If auto-pay is on and the chosen day has
//          already passed this month, the first deduction happens right away.
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { serviceKey, name, plan, amount, category, autoPay, autoPayDate } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a subscription name' });
    }
    const validationError = validateAmountAndAutoPay({ amount, autoPay, autoPayDate });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    await Subscription.create({
      user: req.user._id,
      serviceKey: serviceKey || 'other',
      name: name.trim(),
      plan: plan || '',
      amount: Number(amount),
      category: category || 'Entertainment',
      autoPay: !!autoPay,
      autoPayDate: autoPay ? Number(autoPayDate) : 1,
    });

    // Deduct immediately if the auto-pay day already passed this month
    const chargedCount = await processDueSubscriptions(req.user._id);
    const subs = await Subscription.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(201).json(listPayload(subs, chargedCount));
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/subscriptions/:id
// @desc    Update a subscription (amount, plan, auto-pay toggle/date, status)
// @access  Private
router.patch('/:id', async (req, res) => {
  try {
    const sub = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const { serviceKey, name, plan, amount, category, autoPay, autoPayDate, status } = req.body;
    const validationError = validateAmountAndAutoPay({
      amount: amount ?? sub.amount,
      autoPay: autoPay ?? sub.autoPay,
      autoPayDate: autoPayDate ?? sub.autoPayDate,
    });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    if (serviceKey !== undefined) sub.serviceKey = serviceKey || 'other';
    if (name !== undefined && name.trim()) sub.name = name.trim();
    if (plan !== undefined) sub.plan = plan;
    if (amount !== undefined) sub.amount = Number(amount);
    if (category !== undefined) sub.category = category;
    if (autoPay !== undefined) sub.autoPay = !!autoPay;
    if (autoPayDate !== undefined) sub.autoPayDate = Number(autoPayDate);
    if (status !== undefined && ['active', 'cancelled'].includes(status)) sub.status = status;

    await sub.save();

    // If auto-pay was just enabled/changed and its day already passed, charge now
    await processDueSubscriptions(req.user._id);
    const fresh = await Subscription.findById(req.params.id);
    res.json({ success: true, subscription: enrich(fresh) });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/subscriptions/:id/pay
// @desc    Manual "Pay Now" — deducts from income & shows in Spending History
// @access  Private
router.patch('/:id/pay', async (req, res) => {
  try {
    const sub = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }
    if (sub.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Subscription is not active' });
    }
    if (sub.lastChargedMonth === getMonthKey()) {
      return res.status(400).json({ success: false, message: 'Already paid for this month' });
    }

    const now = new Date();
    const expense = await Expense.create({
      user: req.user._id,
      amount: sub.amount,
      category: sub.category || 'Entertainment',
      description: `Subscription: ${sub.name}${sub.plan ? ` (${sub.plan})` : ''}`,
      date: now,
      source: 'manual',
    });

    sub.lastChargedMonth = getMonthKey(now);
    sub.charges.push({ amount: sub.amount, date: now, expense: expense._id });
    await sub.save();

    res.json({ success: true, subscription: enrich(sub, now), expense });
  } catch (error) {
    console.error('Pay subscription error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/subscriptions/:id
// @desc    Remove a subscription (stops future auto-pay; past charges remain
//          in Spending History)
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const sub = await Subscription.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }
    res.json({ success: true, message: 'Subscription removed' });
  } catch (error) {
    console.error('Delete subscription error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

