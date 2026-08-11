import express from 'express';
import InsuranceProduct from '../models/InsuranceProduct.js';
import Dependent from '../models/Dependent.js';
import Goal from '../models/Goal.js';
import SavedPlan from '../models/SavedPlan.js';
import { protect } from '../middleware/auth.js';
import { recommendedCoverAmount } from '../services/coverageCalculator.js';
import { calculateFinancialHealth } from '../services/financialHealth.js';

const router = express.Router();
router.use(protect);

// @route   GET /api/financial-health-score
// @desc    Get user's composite financial health score
// @access  Private
router.get('/financial-health-score', async (req, res) => {
  try {
    const health = await calculateFinancialHealth(req.user._id);
    res.json({ success: true, ...health });
  } catch (error) {
    console.error('Get financial health score error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// @route   GET /api/insurance-products
// @desc    Get all insurance products with optional category filter
// @access  Private
router.get('/insurance-products', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};
    if (category) {
      filter.category = category;
    }

    const products = await InsuranceProduct.find(filter).sort({ insurer: 1, name: 1 });
    res.json({ success: true, products });
  } catch (error) {
    console.error('Get insurance products error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/insurance-products/:id
// @desc    Get details of a single insurance product
// @access  Private
router.get('/insurance-products/:id', async (req, res) => {
  try {
    const product = await InsuranceProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Insurance product not found' });
    }
    res.json({ success: true, product });
  } catch (error) {
    console.error('Get insurance product by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/insurance/coverage-calculator
// @desc    Calculate recommended health and life coverages
// @access  Private
router.get('/insurance/coverage-calculator', async (req, res) => {
  try {
    const dependents = await Dependent.find({ user: req.user._id });

    // Cross-module reuse: pull existing liabilities from Bills/EMI so the
    // calculator reflects the user's real commitments (one connected brain).
    const billsAndEmis = await BillEmi.find({ user: req.user._id });
    const liabilities = billsAndEmis.reduce((sum, item) => sum + (item.amount || 0), 0);

    // Sum up the savedAmount across all user's goals (lifestyle & safety nets)
    const goals = await Goal.find({ user: req.user._id });
    const savings = goals.reduce((sum, goal) => sum + (goal.savedAmount || 0), 0);

    const recommendations = recommendedCoverAmount(req.user, dependents, liabilities, savings);

    res.json({ success: true, dependents: dependents.length, liabilities, savings, ...recommendations });
  } catch (error) {
    console.error('Calculate coverage calculator error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});



export default router;
