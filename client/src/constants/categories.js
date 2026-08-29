// Shared category list — reused by Expense form, future Analytics, Budget Alerts, etc.
export const EXPENSE_CATEGORIES = [
  { value: 'Food & Dining', icon: 'utensils' },
  { value: 'Transport', icon: 'car' },
  { value: 'Shopping', icon: 'shopping-bag' },
  { value: 'Entertainment', icon: 'clapperboard' },
  { value: 'Health', icon: 'heart-pulse' },
  { value: 'Education', icon: 'graduation-cap' },
  { value: 'Rent', icon: 'home' },
  { value: 'Utilities', icon: 'zap' },
  { value: 'Travel', icon: 'plane' },
  { value: 'Groceries', icon: 'shopping-cart' },
  { value: 'Savings', icon: 'piggy-bank' },
  { value: 'Bills & EMI', icon: 'credit-card' },
  { value: 'Insurance', icon: 'shield' },
  { value: 'Other', icon: 'more-horizontal' },
];

export const BILL_CATEGORIES = [
  'Electricity',
  'Water',
  'Internet',
  'Phone',
  'Rent',
  'Loan',
  'Insurance',
  'Subscription',
  'Other',
];

export const SECTORS = ['IT', 'Finance', 'Healthcare', 'Education', 'Other'];

export const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export const getCurrencySymbol = (currency) => CURRENCY_SYMBOLS[currency] || '₹';

// Map a category name (e.g. "Food & Dining") to its icon key (e.g. "utensils")
export const getCategoryIcon = (category) => {
  const found = EXPENSE_CATEGORIES.find(
    (c) => c.value.toLowerCase() === (category || '').toLowerCase()
  );
  return found?.icon || 'wallet';
};
