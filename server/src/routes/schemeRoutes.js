import express from 'express';
import Scheme from '../models/Scheme.js';
import Dependent from '../models/Dependent.js';
import { protect } from '../middleware/auth.js';
import { schemeMatchScore } from '../services/schemeScoring.js';

import { calculateFinancialHealth } from '../services/financialHealth.js';

const router = express.Router();
router.use(protect);

// @route   GET /api/schemes
// @desc    Get all government schemes with optional filters
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { category, state, occupation, search } = req.query;
    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (state) {
      // Find schemes where applicableStates contains 'any' or matches query state
      filter['eligibility.applicableStates'] = { 
        $in: ['any', new RegExp(`^${state}$`, 'i'), state] 
      };
    }

    if (occupation) {
      // Find schemes where occupation list contains 'any' or matches query occupation
      filter['eligibility.occupation'] = { 
        $in: ['any', new RegExp(`^${occupation}$`, 'i'), occupation] 
      };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { fullDescription: { $regex: search, $options: 'i' } },
      ];
    }

    const schemes = await Scheme.find(filter).sort({ name: 1 });
    res.json({ success: true, schemes });
  } catch (error) {
    console.error('Get schemes error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/schemes/recommended
// @desc    Get matching recommended government schemes ranked by score
// @access  Private
router.get('/recommended', async (req, res) => {
  try {
    const includeFamily = req.query.includeFamily === 'true';

    let dependents = [];
    if (includeFamily) {
      dependents = await Dependent.find({ user: req.user._id });
    }

    const schemes = await Scheme.find();
    
    // Fetch user's financial health to calculate urgency boosts
    const healthData = await calculateFinancialHealth(req.user._id);
    const emergencyFundProgress = healthData.factors.emergencyFundProgress || 0;

    const scoredSchemes = schemes.map((scheme) => {
      const scoringResult = schemeMatchScore(req.user, dependents, scheme);
      let adjustedScore = scoringResult.score;

      // Urgency Ranking Multiplier Integration:
      // Code Logic Comment Requirement:
      // If the user's emergency fund progress is low, they are financially vulnerable to immediate health
      // or accidental shocks. Therefore, we boost match scores of essential 'health' and 'accident' schemes
      // by up to +15 points. This pushes critical safety net schemes to the top of their recommendations feed
      // over optional or investment-linked schemes (like pension/life plans), functioning as FINNOVA's primary
      // smart differentiator over static matching tools.
      if (emergencyFundProgress < 0.8 && (scheme.category === 'health' || scheme.category === 'accident')) {
        const boost = Math.round((1 - emergencyFundProgress) * 15);
        adjustedScore = Math.min(100, adjustedScore + boost);
        scoringResult.matchedReasons.push(`Urgency Boost: Recommended due to low emergency fund savings (safety net needed)`);
      }

      return {
        ...scheme.toObject(),
        matchScore: adjustedScore,
        matchedReasons: scoringResult.matchedReasons,
      };
    });

    // Sort by recommendation score descending
    scoredSchemes.sort((a, b) => b.matchScore - a.matchScore);

    res.json({ success: true, schemes: scoredSchemes });
  } catch (error) {
    console.error('Get recommended schemes error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/schemes/:id
// @desc    Get a single government scheme with its calculated score
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const scheme = await Scheme.findById(req.params.id);
    if (!scheme) {
      return res.status(404).json({ success: false, message: 'Scheme not found' });
    }

    // Always fetch dependents to get comprehensive family scoring details
    const dependents = await Dependent.find({ user: req.user._id });
    const scoringResult = schemeMatchScore(req.user, dependents, scheme);
    let adjustedScore = scoringResult.score;

    // Apply same urgency ranking boost for single scheme view
    const healthData = await calculateFinancialHealth(req.user._id);
    const emergencyFundProgress = healthData.factors.emergencyFundProgress || 0;

    if (emergencyFundProgress < 0.8 && (scheme.category === 'health' || scheme.category === 'accident')) {
      const boost = Math.round((1 - emergencyFundProgress) * 15);
      adjustedScore = Math.min(100, adjustedScore + boost);
      scoringResult.matchedReasons.push(`Urgency Boost: Recommended due to low emergency fund savings (safety net needed)`);
    }

    res.json({
      success: true,
      scheme: {
        ...scheme.toObject(),
        matchScore: adjustedScore,
        matchedReasons: scoringResult.matchedReasons,
      },
    });
  } catch (error) {
    console.error('Get scheme by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
