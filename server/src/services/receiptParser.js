/**
 * Receipt text → structured expense extraction.
 *
 * Takes the raw OCR text of a store receipt and extracts:
 *  - total amount
 *  - vendor / store name
 *  - expense category (keyword matched against the app's spending categories)
 *  - purchase date (fallback: today)
 *
 * Pure functions, no side effects — easy to unit test.
 */

// Mirrors client/src/constants/categories.js (kept here so the server stays
// self-contained and does not import across package roots).
export const EXPENSE_CATEGORY_VALUES = [
  'Food & Dining',
  'Transport',
  'Shopping',
  'Entertainment',
  'Health',
  'Education',
  'Rent',
  'Utilities',
  'Travel',
  'Groceries',
  'Savings',
  'Bills & EMI',
  'Insurance',
  'Other',
];

// Keyword rules in priority order. First match wins.
const CATEGORY_RULES = [
  {
    category: 'Food & Dining',
    keywords: [
      'restaurant', 'cafe', 'café', 'resto', 'food court', 'food', 'pizza', 'burger',
      'sandwich', 'swiggy', 'zomato', 'dominos', 'kfc', 'mcdonald', 'starbucks',
      'canteen', 'cafeteria', 'biryani', 'dosa', 'tiffin', 'snacks', 'bakery',
      'sweet shop', 'coffee', 'chaat', 'grill', 'hotel', 'bar', 'juice',
    ],
  },
  {
    category: 'Groceries',
    keywords: [
      'grocery', 'supermarket', 'super market', 'bigbasket', 'dmart', 'more supermarket',
      'vegetable', 'fruit', 'milk', 'dairy', 'meat', 'fish', 'ration', 'kirana', 'provision',
    ],
  },
  {
    category: 'Transport',
    keywords: [
      'fuel', 'petrol', 'diesel', 'indian oil', 'hpcl', 'bharat petroleum', 'iocl', 'shell',
      'expressway', 'toll', 'metro', 'bus', 'taxi', 'uber', 'ola', 'cab', 'parking', 'train',
      'railway', 'airport taxi', 'indane', 'cng',
    ],
  },
  {
    category: 'Shopping',
    keywords: [
      'retail', 'showroom', 'mall', 'fashion', 'apparel', 'clothing', 'shoes', 'footwear',
      'lifestyle', 'zudio', 'max', 'pantaloons', 'electronics', 'mobile store', 'gadget',
      'home centre', 'furniture', 'jewellery', 'jewelry', 'superstore', 'bazaar',
    ],
  },
  {
    category: 'Utilities',
    keywords: [
      'electricity', 'water', 'gas bill', 'bngl', 'msedcl', 'tneb', 'kseb', 'ceb', 'uppcl',
      'aepc', 'gst bill', 'broadband', 'internet', 'airtel', 'jio', 'postpaid',
    ],
  },
  {
    category: 'Health',
    keywords: [
      'pharmacy', 'medical', 'hospital', 'apollo pharmacy', 'medplus', 'netmeds', 'chemist',
      'diagnostic', 'clinic', 'doctor', 'ayurveda', 'drug store',
    ],
  },
  {
    category: 'Entertainment',
    keywords: [
      'cinema', 'movie', 'multiplex', 'pvr', 'inox', 'gaming', 'arcade', 'playzone',
      'theatre', 'amusement', 'bowling', 'bookmyshow',
    ],
  },
  {
    category: 'Education',
    keywords: [
      'book store', 'books', 'stationery', 'school fee', 'college fees', 'tuition',
      'coaching', 'academy', 'course fee', 'library',
    ],
  },
  {
    category: 'Travel',
    keywords: [
      'airline', 'airways', 'air india', 'indigo', 'spicejet', 'vistara', 'flight',
      'resort', 'lodge', 'homestay', 'campsite', 'oyo', 'make my trip', 'mmt',
    ],
  },
  {
    category: 'Bills & EMI',
    keywords: [
      'loan', 'emi', 'installment', 'credit card', 'billdesk', 'bharat billpay',
    ],
  },
  {
    category: 'Rent',
    keywords: ['rent', 'lease', 'tenancy', 'nobroker', 'magicbricks'],
  },
];
const AMOUNT_TEXT_RE = /(?:₹\s?|rs\.?\s?|inr\s?)([\d,]+(?:\.\d{1,2})?)/gi;
const TOTAL_KEYWORD_RE =
  /(grand\s*total|\btotal\b|amount\s*payable|amount\s*due|payable|net\s*amount|balance|sub\s*-?\s*total|bill\s*amount|due\s*amount)/i;
const DATE_RE = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/;
const DATE_RE_ALT = /\b(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})\b/;

// Lines matching these (case-insensitive) are boilerplate and never used as
// the vendor/store name.
const VENDOR_BLOCK_RE = new RegExp(
  [
    'receipt', 'tax ?invoice', 'invoice', 'gst', 'gstin', 'pan no', 'cst', 'tin',
    'cgst', 'sgst', 'igst', 'phone', 'tel[:.]', 'mobile', 'www\\.', '\\.com',
    '\\.in', 'e&oe', 'address', 'cashier', 'operator', 'server', 'thank',
    'sub ?total', 'grand ?total', 'total', 'amount', 'items', 'qty', 'rate',
    'customer', 'copy', 'original', 'bill no', 'invoice no', 'date', 'time',
    'payment', 'mode', 'cash', 'card', 'upi', 'change', 'balance', 'return',
    'counter', 'store manager', 'bill of supply', 'sale', 'registered',
    'no[:.]', 'cin', 'cancelled', 'ref no', 'reference', 'narration', 'shop',
    'welcome', 'visit', 'enjoy', 'order no', 'table no', 'covers',
  ].join('|'),
  'i'
);

const toAmount = (str) => parseFloat(String(str).replace(/,/g, ''));

/**
 * Extract the total amount from receipt text.
 * Prefers amounts on keyword lines like "TOTAL ₹1,250.00", then falls back to
 * the largest plausible amount found in the document.
 */
export const extractTotal = (text) => {
  if (!text) return null;
  const totalCandidates = [];
  const grandTotalCandidates = [];
  const plainCandidates = [];

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim().toLowerCase();
    if (!line) continue;

    // Amounts prefixed with the rupee marker
    for (const m of line.matchAll(AMOUNT_TEXT_RE)) {
      const value = toAmount(m[1]);
      if (Number.isFinite(value) && value > 0) plainCandidates.push(value);
    }

    // Lines that explicitly look like a total
    if (TOTAL_KEYWORD_RE.test(line)) {
      const tail = line.match(/([\d,]+(?:\.\d{1,2})?)\s*$/);
      if (tail) {
        const value = toAmount(tail[1]);
        if (Number.isFinite(value) && value > 0) {
          const bucket = /grand\s*total/.test(line) ? grandTotalCandidates : totalCandidates;
          bucket.push(value);
        }
      } else {
        const anyAmount = line.match(/([\d,]+(?:\.\d{1,2})?)/g);
        if (anyAmount) {
          const values = anyAmount.map(toAmount).filter((v) => Number.isFinite(v) && v > 0);
          if (values.length) {
            const bucket = /grand\s*total/.test(line) ? grandTotalCandidates : totalCandidates;
            bucket.push(Math.max(...values));
          }
        }
      }
    }
  }

  // Rupee-marked amounts anywhere in the document
  for (const m of text.matchAll(AMOUNT_TEXT_RE)) {
    const value = toAmount(m[1]);
    if (Number.isFinite(value) && value > 0) plainCandidates.push(value);
  }

  // Bare numbers that could be totals. Requires a decimal (>= ₹10) or a
  // reasonably large amount (>= ₹500) to avoid treating stray digits like
  // dates, quantities, or phone fragments as the total.
  for (const m of text.matchAll(/(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d{2,7}(?:\.\d{1,2})?)/g)) {
    const str = m[1];
    const value = toAmount(str);
    const hasDecimal = str.includes('.');
    if (Number.isFinite(value) && ((hasDecimal && value >= 10) || value >= 500) && value <= 5000000) {
      plainCandidates.push(value);
    }
  }

  // Prefer "Grand Total", else the LAST total-like figure (receipts list
  // "Sub Total" before "Grand Total"), else the maximum plausible amount.
  const chosen =
    grandTotalCandidates.length > 0
      ? grandTotalCandidates[0]
      : totalCandidates.length > 0
      ? totalCandidates[totalCandidates.length - 1]
      : plainCandidates.length > 0
      ? Math.max(...plainCandidates)
      : null;

  return chosen !== null && chosen !== undefined ? Math.round(chosen * 100) / 100 : null;
};

/** Extract the vendor/store name (typically the first clean line of a receipt). */
export const extractVendor = (text, maxLength = 45) => {
  if (!text) return null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/[*_\-—–]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (!line) continue;
    if (line.length < 2 || line.length > 60) continue;
    if (/^\d/.test(line)) continue; // starts with a number (price/qty line)
    if (VENDOR_BLOCK_RE.test(line)) continue;
    if (/(gstin|pan|cash|card|upi|invoice)/i.test(line)) continue;
    if (/^(inr|rs|bill|tax|cash|upi|total|net|paid)[:.\s]/i.test(line)) continue;
    const cleaned = line
      .replace(/:\s*(gstin|no|bill|date|time|ph)[:.\s]*/i, '')
      .replace(/[.,;:]+$/, '')
      .trim();
    if (cleaned.length >= 2) return cleaned.slice(0, maxLength);
  }
  return null;
};

/** Match the receipt text + vendor against spending categories. */
export const extractCategory = (text = '', vendor = '') => {
  const haystack = `${vendor} ${text}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) return rule.category;
  }
  return 'Other';
};

/** Extract a purchase date from the receipt; falls back to today. */
export const extractDate = (text) => {
  if (!text) return new Date();
  const tryMatch = (m) => {
    if (!m) return null;
    let year;
    let month;
    let day;
    if (m[0].length === 4 || Number(m[1]) > 12) {
      year = Number(m[1]); // yyyy-mm-dd variant
      month = Number(m[2]);
      day = Number(m[3]);
    } else {
      year = Number(m[3]); // dd-mm-yyyy variant
      day = Number(m[1]);
      month = Number(m[2]);
    }
    if (year < 1990 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(year, month - 1, day);
  };
  return tryMatch(text.match(DATE_RE_ALT)) || tryMatch(text.match(DATE_RE)) || new Date();
};

/**
 * Full parse of one receipt's OCR text.
 * @returns {Object} { vendor, total, category, date, hasTotal }
 */
export const parseReceiptText = (text = '') => {
  const normalized = (text || '').replace(/\r/g, '').trim();
  const vendor = extractVendor(normalized);
  const total = extractTotal(normalized);
  const category = extractCategory(normalized, vendor || '');
  const date = extractDate(normalized);

  return {
    vendor,
    total, // number | null
    category,
    date,
    hasTotal: total !== null,
  };
};

export default parseReceiptText;