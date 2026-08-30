import Subscription from '../models/Subscription.js';
import Expense from '../models/Expense.js';

// Month key like "2026-08" — used as a per-subscription once-per-month guard
export const getMonthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Next date this subscription will auto-charge (for display)
export const computeNextChargeDate = (sub, now = new Date()) => {
  const day = Math.min(Math.max(Number(sub.autoPayDate) || 1, 1), 28);
  if (sub.lastChargedMonth === getMonthKey(now)) {
    // Already charged this month -> next month's auto-pay date
    return new Date(now.getFullYear(), now.getMonth() + 1, day);
  }
  if (day >= now.getDate()) {
    return new Date(now.getFullYear(), now.getMonth(), day);
  }
  return new Date(now.getFullYear(), now.getMonth() + 1, day);
};

// Auto-pay engine: every active subscription whose auto-pay day has arrived
// this month gets its amount deducted by creating an Expense (which deducts
// from monthly income and appears in Spending History — same mechanism as
// Bills & EMI). lastChargedMonth makes this idempotent: at most ONE charge
// per subscription per month, no matter how often this runs.
export const processDueSubscriptions = async (userId) => {
  const now = new Date();
  const today = now.getDate();
  const currentKey = getMonthKey(now);

  const subs = await Subscription.find({
    user: userId,
    status: 'active',
    autoPay: true,
  });

  let chargedCount = 0;
  for (const sub of subs) {
    if (sub.lastChargedMonth === currentKey) continue; // already charged this month
    if (Number(sub.autoPayDate) > today) continue; // auto-pay day not reached yet

    const expense = await Expense.create({
      user: userId,
      amount: sub.amount,
      category: sub.category || 'Entertainment',
      description: `Subscription: ${sub.name}${sub.plan ? ` (${sub.plan})` : ''}`,
      date: now,
      source: 'manual',
    });

    sub.lastChargedMonth = currentKey;
    sub.charges.push({ amount: sub.amount, date: now, expense: expense._id });
    await sub.save();
    chargedCount += 1;
  }

  return chargedCount;
};
