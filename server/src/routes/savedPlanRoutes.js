import express from 'express';
import SavedPlan from '../models/SavedPlan.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// @route   GET /api/saved-plans
// @desc    Get all saved plans for the authenticated user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const plans = await SavedPlan.find({ user: req.user._id })
      .populate({
        path: 'itemId',
        refPath: 'itemTypeModel',
      })
      .sort({ savedAt: -1 });

    res.json({ success: true, plans });
  } catch (error) {
    console.error('Get saved plans error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/saved-plans
// @desc    Save a scheme or insurance product to user's list
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { itemType, itemId, status } = req.body;

    if (!itemType || !['scheme', 'insurance'].includes(itemType)) {
      return res.status(400).json({ success: false, message: 'Invalid itemType' });
    }
    if (!itemId) {
      return res.status(400).json({ success: false, message: 'itemId is required' });
    }

    const itemTypeModel = itemType === 'scheme' ? 'Scheme' : 'InsuranceProduct';

    // Prevent duplicates by checking if the user already saved this item
    let savedPlan = await SavedPlan.findOne({ user: req.user._id, itemId });
    if (savedPlan) {
      return res.status(400).json({ 
        success: false, 
        message: 'This plan is already saved in your plans list.',
        savedPlan 
      });
    }

    savedPlan = await SavedPlan.create({
      user: req.user._id,
      itemType,
      itemId,
      itemTypeModel,
      status: status || 'interested',
    });

    res.status(201).json({ success: true, savedPlan });
  } catch (error) {
    console.error('Save plan error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/saved-plans/:id/status
// @desc    Update status of a saved plan (interested, applied, active)
// @access  Private
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['interested', 'applied', 'active'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const savedPlan = await SavedPlan.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { status },
      { new: true }
    ).populate({
      path: 'itemId',
      refPath: 'itemTypeModel',
    });

    if (!savedPlan) {
      return res.status(404).json({ success: false, message: 'Saved plan not found' });
    }

    res.json({ success: true, savedPlan });
  } catch (error) {
    console.error('Update saved plan status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/saved-plans/:id
// @desc    Remove a plan from saved list
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const savedPlan = await SavedPlan.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!savedPlan) {
      return res.status(404).json({ success: false, message: 'Saved plan not found' });
    }

    res.json({ success: true, message: 'Plan removed from saved list successfully' });
  } catch (error) {
    console.error('Remove saved plan error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
