import express from 'express';
import Dependent from '../models/Dependent.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// @route   GET /api/dependents
// @desc    Get all dependents of the logged-in user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const dependents = await Dependent.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, dependents });
  } catch (error) {
    console.error('Get dependents error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/dependents
// @desc    Create a new dependent for the logged-in user
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { name, relation, age, gender } = req.body;

    // Validations
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!relation || !['spouse', 'child', 'parent', 'sibling', 'other'].includes(relation)) {
      return res.status(400).json({ success: false, message: 'Valid relation is required (spouse, child, parent, sibling, other)' });
    }
    if (age === undefined || age === null || isNaN(age) || Number(age) < 0) {
      return res.status(400).json({ success: false, message: 'Valid age (>= 0) is required' });
    }
    if (!gender || !['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({ success: false, message: 'Valid gender is required (male, female, other)' });
    }

    const dependent = await Dependent.create({
      user: req.user._id,
      name: name.trim(),
      relation,
      age: Number(age),
      gender,
    });

    res.status(201).json({ success: true, dependent });
  } catch (error) {
    console.error('Create dependent error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/dependents/:id
// @desc    Update an existing dependent
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { name, relation, age, gender } = req.body;

    // Find the dependent first to check ownership
    const dependent = await Dependent.findOne({ _id: req.params.id, user: req.user._id });
    if (!dependent) {
      return res.status(404).json({ success: false, message: 'Dependent not found' });
    }

    // Validations
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      }
      dependent.name = name.trim();
    }

    if (relation !== undefined) {
      if (!['spouse', 'child', 'parent', 'sibling', 'other'].includes(relation)) {
        return res.status(400).json({ success: false, message: 'Valid relation is required (spouse, child, parent, sibling, other)' });
      }
      dependent.relation = relation;
    }

    if (age !== undefined) {
      if (age === null || isNaN(age) || Number(age) < 0) {
        return res.status(400).json({ success: false, message: 'Valid age (>= 0) is required' });
      }
      dependent.age = Number(age);
    }

    if (gender !== undefined) {
      if (!['male', 'female', 'other'].includes(gender)) {
        return res.status(400).json({ success: false, message: 'Valid gender is required (male, female, other)' });
      }
      dependent.gender = gender;
    }

    await dependent.save();
    res.json({ success: true, dependent });
  } catch (error) {
    console.error('Update dependent error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/dependents/:id
// @desc    Delete a dependent
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const dependent = await Dependent.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!dependent) {
      return res.status(404).json({ success: false, message: 'Dependent not found' });
    }

    res.json({ success: true, message: 'Dependent deleted successfully' });
  } catch (error) {
    console.error('Delete dependent error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
