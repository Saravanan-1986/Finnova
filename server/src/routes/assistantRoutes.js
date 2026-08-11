import express from 'express';
import ChatMessage from '../models/ChatMessage.js';
import { protect } from '../middleware/auth.js';
import { getAssistantReply } from '../services/aiAssistant.js';

const router = express.Router();
router.use(protect);

/**
 * Simple in-memory rate limiter (per user) to avoid runaway API costs during
 * demos/tests. Resets on server restart — acceptable for this scope. Swap for
 * a DB-backed counter in production.
 */
const rateLimitMap = new Map();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = Number(process.env.ASSISTANT_RATE_LIMIT || 20);

const checkRateLimit = (userId) => {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }
  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  entry.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS - entry.count };
};

// @route   GET /api/assistant/history
// @desc    Last N chat messages of the authenticated user (oldest first)
// @access  Private
router.get('/history', async (req, res) => {
  try {
    const messages = await ChatMessage.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(60);
    messages.reverse(); // oldest first for the chat UI
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Get assistant history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/assistant/query
// @desc    Ask the data-grounded assistant a question
// @access  Private
router.post('/query', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const rate = checkRateLimit(String(req.user._id));
    if (!rate.allowed) {
      return res.status(429).json({
        success: false,
        message: `You've reached the demo rate limit (${MAX_REQUESTS} messages per hour). Please try again later.`,
      });
    }

    // Security: the frontend only ever supplies conversational history.
    // The user-data context is rebuilt server-side from the DB every request,
    // so answers can never be stale or spoofed.
    const result = await getAssistantReply(String(message).trim(), conversationHistory, req.user._id);

    // Persist the exchange so history survives a page refresh.
    await ChatMessage.create({ user: req.user._id, role: 'user', content: String(message).trim() });
    const assistantMsg = await ChatMessage.create({ user: req.user._id, role: 'assistant', content: result.reply });

    // Deliberately return ONLY the reply + trimmed footnote labels —
    // never the raw system prompt or the full context object.
    res.json({
      success: true,
      reply: result.reply,
      contextUsed: result.contextUsed,
      provider: result.provider,
      messageId: assistantMsg._id,
    });
  } catch (error) {
    console.error('Assistant query error:', error);
    res.status(500).json({ success: false, message: 'Server error while generating a response' });
  }
});

export default router;