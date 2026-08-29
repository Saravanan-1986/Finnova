import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { protect } from '../middleware/auth.js';
import Expense from '../models/Expense.js';
import { parseReceiptText } from '../services/receiptParser.js';
import { ocrReceiptImage } from '../services/receiptOcr.js';

const router = express.Router();
router.use(protect);

// (resolve to <repo>/server/uploads/receipts — two levels up from src/routes/)
const UPLOAD_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../uploads/receipts'
);
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${randomUUID()}${safeExt}`);
  },
});

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12 MB — camera photos are large

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files (JPG/PNG/WebP) are allowed'));
  },
});

/**
 * POST /api/receipts/scan
 * Upload a receipt image → OCR → parse → auto-create expense in Spending
 * History.
 *
 * Responses:
 *  200 { success, expense, extracted, warnings, text }        → saved
 *  422 { success:false, cannotExtract:true, message, warnings } → can't proceed
 *  400 validation / upload errors
 */
router.post('/scan', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 12 MB)' : err.message;
      return res.status(400).json({ success: false, message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No receipt image provided' });
    }

        const imageUrl = `/uploads/receipts/${req.file.filename}`;

    // 1. OCR — wrap in its own try so a corrupt/unreadable image yields a
    //    controlled "cannot proceed" (422) rather than a 500, and never leaks
    //    an orphaned file on disk.
    let ocrResult;
    try {
      ocrResult = await ocrReceiptImage(req.file.path);
    } catch (ocrErr) {
      console.error('OCR error:', ocrErr?.message || ocrErr);
      fs.unlink(req.file.path, () => {});
      return res.status(422).json({
        success: false,
        cannotExtract: true,
        message:
          'We could not read the information in this image. Cannot proceed — please use a clearer, well-lit photo or add the expense manually in Spending History.',
        warnings: [],
      });
    }
    const { text, confidence } = ocrResult;

    // 2. Parse into structured fields
    const parsed = parseReceiptText(text);

    const warnings = [];
    if (confidence > 0 && confidence < 40) {
      warnings.push(
        `OCR confidence is low (${confidence.toFixed(0)}%) — the receipt may be blurry or poorly lit. Review the extracted details carefully.`
      );
    }

    // 3. Failed extraction → tell the user we cannot proceed (don't add junk)
    const bareMinText = (text || '').replace(/[^a-zA-Z0-9]/g, '').length;
    if (!parsed.hasTotal || bareMinText < 15 || confidence === 0) {
      // Clean up the orphaned upload so the disk never fills with junk scans
      fs.unlink(req.file.path, () => {});
      return res.status(422).json({
        success: false,
        cannotExtract: true,
        message:
          'We could not extract the information from this receipt. Cannot proceed — please use a clearer, well-lit photo or add the expense manually in Spending History.',
        warnings,
      });
    }

    // 4. Auto-create the expense (source 'ocr' → shows in Spending History)
    const expense = await Expense.create({
      user: req.user._id,
      amount: parsed.total,
      category: parsed.category,
      description: parsed.vendor || 'Receipt expense',
      date: parsed.date,
      source: 'ocr',
      receiptImageUrl: imageUrl,
    });

    return res.json({
      success: true,
      expense,
      extracted: {
        vendor: parsed.vendor,
        total: parsed.total,
        category: parsed.category,
        date: parsed.date,
        confidence: Math.round(confidence),
      },
      warnings,
      text,
    });
  } catch (error) {
    console.error('Receipt scan error:', error);
    if (req.file && req.file.path) fs.unlink(req.file.path, () => {});
    res.status(500).json({ success: false, message: 'Receipt scan failed. Please try again.' });
  }
});

// @route   GET /api/receipts/recent
// @desc    Get the user's most recent OCR-scanned expenses (for the "Recent" strip)
// @access  Private
router.get('/recent', async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id, source: 'ocr' })
      .sort({ date: -1 })
      .limit(12);
    res.json({ success: true, expenses });
  } catch (error) {
    console.error('Get recent receipts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;