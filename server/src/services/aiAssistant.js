/**
 * FINNOVA AI Assistant Service
 *
 * Data-grounded assistant: every reply is computed from the authenticated user's REAL
 * database records (profile, expenses & spending history, goals, emergency fund,
 * bills/EMIs including overdue, family dependents, saved plans with their live
 * status, scheme matches) — never from stale or frontend-supplied context.
 *
 * Provider abstraction: `callLLM` tries, in order:
 *   1. Google Gemini  (GEMINI_API_KEY in .env)
 *   2. OpenAI         (OPENAI_API_KEY in .env)
 *   3. Local rule-based fallback  (keeps the demo functional & honest even with no key)
 */
import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import Goal from '../models/Goal.js';
import BillEmi from '../models/BillEmi.js';
import User from '../models/User.js';
import Dependent from '../models/Dependent.js';
import Scheme from '../models/Scheme.js';
import SavedPlan from '../models/SavedPlan.js';
import { schemeMatchScore } from './schemeScoring.js';
import { calculateFinancialHealth } from './financialHealth.js';
import { recommendedCoverAmount } from './coverageCalculator.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const formatINR = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

// ---------------------------------------------------------------------------
// Context construction (fetch fresh from DB — never accept from the frontend)
// ---------------------------------------------------------------------------

const computeRequiredMonthlySavings = (goal) => {
  const now = new Date();
  const targetDate = new Date(goal.targetDate);
  const monthsRemaining = Math.max(
    1,
    (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth())
  );
  const remaining = Math.max(0, (goal.targetAmount || 0) - (goal.savedAmount || 0));
  return Math.ceil(remaining / monthsRemaining);
};

const getEmergencyFund = async (userId) => {
  const fund = await Goal.findOne({ user: userId, type: 'emergency_fund' });
  if (!fund) return null;
  const progressPct =
    fund.targetAmount > 0 ? Math.min(100, Math.round((fund.savedAmount / fund.targetAmount) * 100)) : 0;
  return { targetAmount: fund.targetAmount, savedAmount: fund.savedAmount, progressPct };
};

// Top 3 scheme matches computed FRESH via the same scoring engine used by the UI.
const computeTopSchemeMatches = async (user) => {
  const dependents = await Dependent.find({ user: user._id });
  const schemes = await Scheme.find();
  const healthData = await calculateFinancialHealth(user._id);
  const efProgress = healthData.factors?.emergencyFundProgress || 0;

  const scored = schemes.map((scheme) => {
    const result = schemeMatchScore(user, dependents, scheme);
    let score = result.score;
    const reasons = [...result.matchedReasons];
    // Same urgency multiplier wired into GET /api/schemes/recommended
    if (efProgress < 0.8 && (scheme.category === 'health' || scheme.category === 'accident')) {
      score = Math.min(100, score + Math.round((1 - efProgress) * 15));
      reasons.push('Urgency boost: low emergency fund savings');
    }
    return { name: scheme.name, category: scheme.category, score, reasons: reasons.slice(0, 3) };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
};
/**
 * Build the structured context object for a user.
 * Every leaf value is pulled from MongoDB at request time.
 */
export const buildContextObject = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) throw new Error('User not found');

  const income = user.monthlyIncome || user.monthlyAllowance || 0;

  // --- this month spending ---
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthlyExpenses = await Expense.find({
    user: userId,
    date: { $gte: startOfMonth, $lt: endOfMonth },
  });
  const totalSpent = monthlyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const catMap = {};
  monthlyExpenses.forEach((e) => {
    catMap[e.category] = (catMap[e.category] || 0) + (e.amount || 0);
  });
  const topCategories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }));

  // --- upcoming dues in the next 15 days ---
  const horizon = new Date(now.getTime() + 15 * DAY_MS);
  const dueRecords = await BillEmi.find({
    user: userId,
    dueDate: { $gte: now, $lte: horizon },
    status: { $ne: 'paid' },
  }).sort({ dueDate: 1 });

  const emisNext15Days = [];
  const billsNext15Days = [];
  let totalDueNext15Days = 0;
  dueRecords.forEach((r) => {
    const daysLeft = Math.max(0, Math.ceil((new Date(r.dueDate) - now) / DAY_MS));
    const item = { title: r.title, amount: r.amount, dueDate: new Date(r.dueDate).toISOString().slice(0, 10), daysLeft };
    totalDueNext15Days += r.amount;
    if (r.type === 'emi') emisNext15Days.push(item);
    else billsNext15Days.push(item);
  });
// --- savings goals ---
  const goals = await Goal.find({ user: userId, type: 'goal' }).sort({ createdAt: -1 });
  const goalList = goals.map((g) => ({
    title: g.title,
    targetAmount: g.targetAmount,
    savedAmount: g.savedAmount,
    progressPct: g.targetAmount > 0 ? Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100)) : 0,
    requiredMonthlySavings: computeRequiredMonthlySavings(g),
  }));

  const emergencyFund = await getEmergencyFund(userId);
  const health = await calculateFinancialHealth(userId);

  // --- saved plans (schemes & insurance, with live status + product details) ---
  const savedPlanDocs = await SavedPlan.find({ user: userId })
    .populate({ path: 'itemId', refPath: 'itemTypeModel' })
    .sort({ savedAt: -1 });
  const savedPlans = savedPlanDocs
    .filter((p) => p.itemId)
    .slice(0, 10)
    .map((p) => {
      const item = p.itemId;
      const base = {
        itemType: p.itemType,
        status: p.status, // interested | applied | active
        name: item.name || item.title || 'Plan',
        savedAt: new Date(p.savedAt).toISOString().slice(0, 10),
      };
      if (p.itemType === 'insurance') {
        const tiers = (item.coverTiers || []).map((t) => ({
          cover: t.coverAmount,
          annualPremium: t.indicativeAnnualPremium,
        }));
        return {
          ...base,
          insurer: item.insurer,
          category: item.category,
          coverTiers: tiers,
          claimSettlementRatio: item.claimSettlementRatio,
          keyFeatures: (item.keyFeatures || []).slice(0, 3),
          officialLink: item.officialLink,
        };
      }
      return {
        ...base,
        issuer: item.issuer,
        category: item.category,
        benefits: (item.benefits || []).slice(0, 3),
        applyOnline: item.applyOnline,
        officialLink: item.officialLink,
      };
    });

  // --- family dependents (drive insurance cover recommendations) ---
  const dependents = await Dependent.find({ user: userId }).sort({ createdAt: 1 });
  const dependentList = dependents.map((d) => ({ name: d.name, relation: d.relation, age: d.age }));

  // --- spending history: 3-month view + all-time totals + recent transactions ---
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const [recentExpenseDocs, historyExpenses, allTimeAgg] = await Promise.all([
    Expense.find({ user: userId }).sort({ date: -1 }).limit(5),
    Expense.find({
      user: userId,
      date: { $gte: threeMonthsAgo },
      category: { $nin: ['Savings', 'Bills & EMI'] },
    }),
    Expense.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(String(userId)) } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);
  const historyMonths = new Set();
  historyExpenses.forEach((e) => historyMonths.add(`${e.date.getFullYear()}-${e.date.getMonth()}`));
  const historyTotal = historyExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const historyCatMap = {};
  historyExpenses.forEach((e) => {
    historyCatMap[e.category] = (historyCatMap[e.category] || 0) + (e.amount || 0);
  });
  const spendingHistory = {
    hasData: historyExpenses.length > 0 || recentExpenseDocs.length > 0,
    avgMonthlySpend3Months: historyMonths.size > 0 ? Math.round(historyTotal / historyMonths.size) : 0,
    topCategories3Months: Object.entries(historyCatMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount })),
    totalAllTime: allTimeAgg[0]?.total || 0,
    expenseCountAllTime: allTimeAgg[0]?.count || 0,
    recentExpenses: recentExpenseDocs.map((e) => ({
      description: e.description || e.category,
      category: e.category,
      amount: e.amount,
      date: new Date(e.date).toISOString().slice(0, 10),
    })),
  };

  // --- full dues picture: overdue items + total outstanding (beyond the 15-day window) ---
  const allPendingDues = await BillEmi.find({ user: userId, status: { $ne: 'paid' } }).sort({ dueDate: 1 });
  const billsSummary = {
    pendingCount: allPendingDues.length,
    totalOutstanding: allPendingDues.reduce((s, r) => s + (r.amount || 0), 0),
    overdue: allPendingDues
      .filter((r) => new Date(r.dueDate) < now)
      .slice(0, 5)
      .map((r) => ({
        type: r.type,
        title: r.title,
        amount: r.amount,
        dueDate: new Date(r.dueDate).toISOString().slice(0, 10),
        daysOverdue: Math.max(1, Math.ceil((now - new Date(r.dueDate)) / DAY_MS)),
      })),
  };

  // --- fresh top scheme matches ---
  const topSchemeMatches = await computeTopSchemeMatches(user);

  // --- recommended cover amounts ---
  const totalSavings = goals.reduce((s, g) => s + (g.savedAmount || 0), 0) + (emergencyFund?.savedAmount || 0);
  const coverRecs = recommendedCoverAmount(user, dependents, totalDueNext15Days, totalSavings);

  return {
    profile: {
      name: user.name,
      age: user.age ?? null,
      gender: user.gender || 'unknown',
      occupationType: user.occupationType || 'not-set',
      occupationDetail:
        user.occupationType === 'student'
          ? { college: user.college || 'not-set', monthlyAllowance: user.monthlyAllowance || 0 }
          : { sector: user.sector || 'not-set' },
      monthlyIncome: income,
      monthlyAllowance: user.monthlyAllowance || 0,
      region: user.region || 'not-set',
      currency: user.currency || 'INR',
      memberSince: user.createdAt ? new Date(user.createdAt).toISOString().slice(0, 10) : null,
    },
    thisMonth: {
      hasData: monthlyExpenses.length > 0,
      totalSpent,
      monthlyIncome: income,
      incomeLeft: Math.max(0, income - totalSpent),
      topCategories,
    },
    upcomingDues: {
      hasData: dueRecords.length > 0,
      emisNext15Days: emisNext15Days.slice(0, 5),
      billsNext15Days: billsNext15Days.slice(0, 5),
      totalDueNext15Days,
    },
    goals: goalList,
    emergencyFund,
    financialHealthScore: health,
    savedPlans,
    dependents: dependentList,
    spendingHistory,
    bills: billsSummary,
    topSchemeMatches,
    recommendedCover: {
      health: coverRecs.health.amount,
      life: coverRecs.life.amount,
      healthBreakdown: coverRecs.health.breakdown,
      lifeBreakdown: coverRecs.life.breakdown,
    },
  };
};
// Which context fields have real data (used for the transparency footnote)
const hasData = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'object') {
    if (Array.isArray(value)) return value.length > 0;
    return Object.keys(value).length > 0;
  }
  return Boolean(value);
};

export const populatedContextLabels = (ctx) => {
  const labels = [];
  if (hasData(ctx.profile) && (ctx.profile?.monthlyIncome || 0) > 0) labels.push('income profile');
  if (ctx.thisMonth?.hasData) labels.push('this month\u2019s spending');
  if (ctx.upcomingDues?.hasData) labels.push('upcoming bills & EMIs');
  if (ctx.goals?.length) labels.push('savings goals');
  if (ctx.emergencyFund) labels.push('emergency fund');
  if (typeof ctx.financialHealthScore?.score === 'number') labels.push('financial health score');
  if (ctx.savedPlans?.length) labels.push('your saved plans');
  if (ctx.dependents?.length) labels.push('family dependents');
  if (ctx.spendingHistory?.hasData) labels.push('spending history');
  if (ctx.bills?.overdue?.length) labels.push('overdue dues');
  if ((ctx.bills?.pendingCount || 0) > 0) labels.push('total outstanding dues');
  if (ctx.topSchemeMatches?.length) labels.push('matching schemes');
  if ((ctx.recommendedCover?.health || 0) > 0 || (ctx.recommendedCover?.life || 0) > 0) labels.push('recommended cover amounts');
  return labels;
};

// ---------------------------------------------------------------------------
// System prompt with sparse-data guardrails
// ---------------------------------------------------------------------------

export const buildSystemPrompt = (context) => {
  const ctxJson = JSON.stringify(context, null, 2);
  return `You are FINNOVA's financial assistant — a personal finance advisor inside the FINNOVA app who knows the user's account in detail. You can answer ANY question about the user's own data provided below: their profile (age, gender, occupation/college/sector, income or allowance, region, member-since), spending history (3-month average, top categories, recent transactions, all-time totals), pending and overdue bills & EMIs with total outstanding, savings goals, emergency fund, family dependents, saved plans (government schemes and insurance products with their live status: interested / applied / active, plus insurer, cover tiers, premiums, benefits), recommended insurance cover, top-matching schemes, and their financial health score. Be specific — cite actual numbers from their data (e.g. "You have ₹X left this month, and your EMI of ₹Y is due in 5 days"). For saved-plan questions, group by status with active plans first. If asked about something outside personal finance, redirect politely back to money topics. Never invent numbers that are not present in the context. Keep answers concise and actionable (150 words or fewer).

GUARDRAILS:
- If the relevant user data is missing or sparse (e.g. no expenses recorded yet, no goals, no emergency fund, brand-new account), explicitly acknowledge that you don't have data on that yet and give general best-practice guidance instead of fabricating specifics.
- Insurance premiums are indicative only — advise the user to verify with the insurer before purchasing.
- Saved plans carry a status (interested / applied / active) — quote it accurately when the user asks what they own, applied for, or have activated.
- Do not claim to replace professional tax/legal advice.

USER DATA CONTEXT (JSON — fetched live from their account):
${ctxJson}`;
};
// ---------------------------------------------------------------------------
// LLM provider abstraction
// ---------------------------------------------------------------------------

const callGemini = async (systemPrompt, history) => {
  const contents = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
};

const callOpenAI = async (systemPrompt, history) => {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0.4, max_tokens: 1024 }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
};

/**
 * Abstracted LLM call. Falls back down the chain so the feature always works:
 * Gemini -> OpenAI -> local rule-based responder.
 * @returns {Promise<{provider: string, text: string|null}>}
 */
export const callLLM = async (systemPrompt, history) => {
  if (process.env.GEMINI_API_KEY) {
    try {
      const text = await callGemini(systemPrompt, history);
      if (text) return { provider: 'gemini', text };
    } catch (error) {
      console.error('[aiAssistant] Gemini call failed:', error.message);
    }
  }
  if (process.env.OPENAI_API_KEY) {
    try {
      const text = await callOpenAI(systemPrompt, history);
      if (text) return { provider: 'openai', text };
    } catch (error) {
      console.error('[aiAssistant] OpenAI call failed:', error.message);
    }
  }
  return { provider: 'local', text: null };
};
// ---------------------------------------------------------------------------
// Local rule-based responder (no API key configured / provider failure)
// ---------------------------------------------------------------------------

const bullet = (items, prefix = '  • ') => items.map((i) => `${prefix}${i}`).join('\n');

const sparseNote = (topic) =>
  `I don't have data on ${topic} yet — I can only give you general guidance. Log a few expenses (Spending History) or set up a goal and I'll make this specific to you.`;

const localReply = (message, ctx) => {
  const msg = message.toLowerCase();
  const used = [];

  const useLabel = (label) => {
    if (!used.includes(label)) used.push(label);
  };

  // --- Off-topic guard (must be checked before finance intents) ---
  const offTopicPatterns = [
    /weather|news today|sports|cricket|football|cook|recipe|movie|song|music|game|politics|election/i,
    /who (are you|made you)|your name/i,
  ];
  if (offTopicPatterns.some((p) => p.test(msg))) {
    return {
      text:
        "I'm a finance assistant, so I try to stick to money matters! I can help with your budget, goals, emergency fund, EMIs and bills, or which government scheme/insurance fits you. What would you like to look at?",
      used: [],
    };
  }

  // --- 1. Greeting ---
  if (/^(hi|hii+|hello|hey|namaste|yo)\b/.test(msg)) {
    const firstName = ctx.profile?.name?.split(' ')[0] || 'there';
    const healthScore = ctx.financialHealthScore?.score;
    const snapshot = [];
    if (typeof healthScore === 'number' && ctx.thisMonth.hasData) {
      useLabel('financial health score');
      useLabel('this month\u2019s spending');
      snapshot.push(`Your financial health score is ${healthScore}/100.`);
    }
    if (ctx.emergencyFund) {
      useLabel('emergency fund');
      snapshot.push(
        `Your emergency fund is ${ctx.emergencyFund.progressPct}% funded (${formatINR(ctx.emergencyFund.savedAmount)} of ${formatINR(ctx.emergencyFund.targetAmount)}).`
      );
    }
    if (ctx.upcomingDues.hasData) {
      useLabel('upcoming bills & EMIs');
      snapshot.push(`${formatINR(ctx.upcomingDues.totalDueNext15Days)} is due in the next 15 days.`);
    }
    const body = snapshot.length ? `\n${bullet(snapshot)}` : '';
    return {
      text: `Hi ${firstName}! I can help you stay on top of your money.\n${body}\n\nTry asking me things like "how much can I safely spend this week?", "am I on track for my goals?", or "which government scheme should I prioritize?".`,
      used,
    };
  }
  // --- 1b. Profile / what do you know about me ---
  if (/who am i|my profile|about me|what do you know about|my (age|gender|occupation|income|allowance|region|college|sector|details)/.test(msg)) {
    useLabel('income profile');
    const p = ctx.profile;
    const occupation =
      p.occupationType === 'student'
        ? `student${p.occupationDetail?.college && p.occupationDetail.college !== 'not-set' ? ` at ${p.occupationDetail.college}` : ''}`
        : p.occupationType === 'professional'
          ? `professional${p.occupationDetail?.sector && p.occupationDetail.sector !== 'not-set' ? ` in ${p.occupationDetail.sector}` : ''}`
          : 'not set';
    const lines = [
      `Name: ${p.name}`,
      `Age: ${p.age ?? 'not set'} | Gender: ${p.gender}`,
      `Occupation: ${occupation}`,
      p.monthlyIncome > 0 ? `Monthly income: ${formatINR(p.monthlyIncome)}` : 'Monthly income: not set yet',
      p.monthlyAllowance > 0 ? `Monthly allowance: ${formatINR(p.monthlyAllowance)}` : null,
      `Region: ${p.region} | Member since: ${p.memberSince || 'unknown'}`,
    ].filter(Boolean);
    if (ctx.dependents?.length) {
      useLabel('family dependents');
      lines.push(`Dependents: ${ctx.dependents.map((d) => `${d.name} (${d.relation}, ${d.age})`).join(', ')}`);
    }
    let text = `Here's what I know about you from your FINNOVA account:\n${bullet(lines)}`;
    if (p.monthlyIncome === 0 && p.monthlyAllowance === 0) {
      text += `\n\nTip: set your monthly income/allowance in your profile so I can size your emergency fund and insurance cover precisely.`;
    }
    return { text, used };
  }

// --- 2. Safe weekly spend / budget ---
  if (/spend|budget|safe|week|left|afford|allowance|recent|transaction|last month/.test(msg)) {
    useLabel('this month\u2019s spending');
    if (!ctx.thisMonth.hasData) {
      return {
        text: `${sparseNote('your spending yet')}\n\nA general rule: keep monthly spending at or below 50\u201360% of income, so savings and EMIs don't crowd each other out.`,
        used,
      };
    }
    const income = ctx.thisMonth.monthlyIncome;
    const left = ctx.thisMonth.incomeLeft;
    const weeklySafe = Math.max(0, Math.round(left / 4));
    const spentPct = income > 0 ? Math.round((ctx.thisMonth.totalSpent / income) * 100) : 0;
    const topCat = ctx.thisMonth.topCategories[0];
    let text = `Here's a snapshot based on this month's actuals:\n`;
    text += `  • Income this month: ${formatINR(income)}\n`;
    text += `  • Spent so far: ${formatINR(ctx.thisMonth.totalSpent)} (≈${spentPct}% of income)\n`;
    text += `  • Income left this month: ${formatINR(left)}\n`;
    text += `  • Safe to spend per week (across the rest of the month): ~${formatINR(weeklySafe)}`;
    if (topCat) {
      text += `\n\nYour biggest category so far is ${topCat.category} at ${formatINR(topCat.amount)}. Consider trimming it first if you need breathing room.`;
    }
    const hist = ctx.spendingHistory;
    if (hist?.hasData) {
      useLabel('spending history');
      text += `\n\nLonger view: your average spend over the last 3 months is ${formatINR(hist.avgMonthlySpend3Months)} (${hist.expenseCountAllTime} expense(s) recorded all-time, totalling ${formatINR(hist.totalAllTime)}).`;
      if (hist.recentExpenses?.length) {
        useLabel('recent transactions');
        const recent = hist.recentExpenses
          .slice(0, 3)
          .map((e) => `${e.description} (${e.category}, ${e.date}) — ${formatINR(e.amount)}`);
        text += `\nRecent transactions:\n${bullet(recent)}`;
      }
    }
    return { text, used };
  }

  // --- 4b. Saved plans (schemes & insurance, with live status) ---
  if (/saved plan|my plan|what plans|plans i|plan status|saved insur|saved scheme|policies|active (plan|policy|insur|scheme)|applied (plan|policy|scheme)|have i (saved|activated|applied)|what.*(saved|activated|applied)/.test(msg)) {
    const plans = ctx.savedPlans || [];
    if (plans.length === 0) {
      return {
        text: `You haven't saved any plans yet. Browse the Insurance Marketplace or Government Schemes pages and tap "Save" — anything you save (interested / applied / active) lands in My Plans, and I can then track and advise on it.`,
        used,
      };
    }
    useLabel('your saved plans');
    const describe = (p) => {
      if (p.itemType === 'insurance') {
        const tiers = p.coverTiers || [];
        const maxCover = tiers.length ? Math.max(...tiers.map((t) => t.cover)) : null;
        const minPremium = tiers.length ? Math.min(...tiers.map((t) => t.annualPremium)) : null;
        return `${p.name} by ${p.insurer}${maxCover ? ` (cover up to ${formatINR(maxCover)}, premium from ${formatINR(minPremium)}/yr)` : ''}`;
      }
      return `${p.name} (${p.issuer})${p.benefits?.length ? ` — ${p.benefits[0]}` : ''}`;
    };
    const group = (status) => plans.filter((p) => p.status === status);
    const active = group('active');
    const applied = group('applied');
    const interested = group('interested');
    let text = `You have ${plans.length} saved plan(s):\n`;
    if (active.length) text += `\nACTIVE:\n${bullet(active.map(describe))}\n`;
    if (applied.length) text += `\nAPPLIED:\n${bullet(applied.map(describe))}\n`;
    if (interested.length) text += `\nINTERESTED:\n${bullet(interested.map(describe))}\n`;
    text += `\nTip: mark a plan "Active" in My Plans once purchased — I weigh active cover when recommending what's still missing.`;
    return { text, used };
  }

  // --- 3. Savings goals tracking ---
  if (/goal|track|sav(e|ing)|on track|invest/.test(msg)) {
    useLabel('savings goals');
    if (ctx.goals.length === 0) {
      return {
        text: `${sparseNote('any savings goals')}\n\nA simple starting point: automate 10\u201320% of income into a goal (e.g. a trip, gadget, or down payment) in Goal Planner.`,
        used,
      };
    }
    const lines = ctx.goals.slice(0, 3).map(
      (g) =>
        `${g.title}: ${g.progressPct}% funded (${formatINR(g.savedAmount)} of ${formatINR(g.targetAmount)}) — ${formatINR(g.requiredMonthlySavings)}/month needed to hit your date.`
    );
    let text = `Here's how your goals are tracking:\n${bullet(lines)}`;
    const slow = ctx.goals.find((g) => g.progressPct < 25 && g.requiredMonthlySavings > 0);
    if (slow) {
      text += `\n\n"${slow.title}" needs ~${formatINR(slow.requiredMonthlySavings)}/month — that's the one I'd prioritize.`;
    }
    return { text, used };
  }

  // --- 4. Emergency fund ---
  if (/emergency|safety net|rainy.day|buffer/.test(msg)) {
    useLabel('emergency fund');
    useLabel('financial health score');
    if (!ctx.emergencyFund) {
      return {
        text: `${sparseNote('an emergency fund yet')}\n\nBest practice: save 3\u20136 months of income into an Emergency Fund goal before aggressively investing.`,
        used,
      };
    }
    const ef = ctx.emergencyFund;
    const gap = Math.max(0, ef.targetAmount - ef.savedAmount);
    const suggestedMonthly = gap > 0 ? Math.max(500, Math.round(gap / 6)) : 0;
    let text = `Your emergency fund is ${ef.progressPct}% funded — ${formatINR(ef.savedAmount)} saved against a ${formatINR(ef.targetAmount)} target.\n`;
    if (ef.progressPct < 100) {
      if (ef.progressPct < 50) {
        text += 'This is below the safety threshold of 50%.\n';
      } else {
        text += 'Good progress.\n';
      }
      text += `To close it in ~6 months, set aside about ${formatINR(suggestedMonthly)}/month.\n`;
      text += 'Tip: pay this first — a funded emergency fund is your cheapest "insurance".';
    } else {
      text += 'You are fully funded. Consider topping it to 6 months of income if you have dependents, then redirect savings to goals/insurance.';
    }
    return { text, used };
  }

// --- 5. Government scheme recommendation ---
  if (/scheme|yojana|government|subsidy|welfare|priorit|recommend/.test(msg)) {
    useLabel('matching schemes');
    useLabel('financial health score');
    if (!ctx.topSchemeMatches || ctx.topSchemeMatches.length === 0) {
      return {
        text: `${sparseNote('matching schemes yet')}\n\nAdd your occupation/region in your profile and I can rank central & state schemes for you against your actual eligibility.`,
        used,
      };
    }
    const lines = ctx.topSchemeMatches.slice(0, 3).map(
      (s, i) => `${i + 1}. ${s.name} — match ${s.score}/100. ${s.reasons[0] || ''}`
    );
    let text = `Based on your real profile, here are the schemes most worth your attention:\n${bullet(lines)}`;
    const ef = ctx.emergencyFund;
    if (ef && ef.progressPct < 50) {
      text += `\n\nSince your emergency fund is only ${ef.progressPct}% funded, I'd start with the health/accident option — that protective layer matters most right now.`;
    }
    return { text, used };
  }

  // --- 7b. Financial health score (before insurance: "financial health" must not hit the bare /health/ in the insurance regex) ---
  if (/health score|score|how healthy|financial health|doing financially/.test(msg)) {
    useLabel('financial health score');
    useLabel('this month\u2019s spending');
    useLabel('upcoming bills & EMIs');
    useLabel('savings goals');
    useLabel('emergency fund');
    const f = ctx.financialHealthScore?.factors;
    const score = ctx.financialHealthScore?.score;
    let text = `Your composite financial health score is ${score}/100 — built from your real FINNOVA data:\n`;
    const rows = [];
    if (f) {
      rows.push(`Spending-to-income: ${Math.round((f.spendingRatio || 0) * 100)}% of income spent this month (lower is healthier)`);
      rows.push(`Emergency fund: ${Math.round((f.emergencyFundProgress || 0) * 100)}% funded`);
      rows.push(`EMI/bill burden: ${Math.round((f.emiBurdenRatio || 0) * 100)}% of income committed to dues`);
      rows.push(`Goal consistency: ${Math.round((f.goalConsistency || 0) * 100)}% average goal progress`);
    }
    text += `${bullet(rows)}`;
    if (score < 60) {
      text += `\n\nBelow 60 means some protective layers are thin — the emergency fund is usually the highest-leverage fix first.`;
    } else {
      text += `\n\nThat's a healthy posture — keep automating savings and it will only improve.`;
    }
    return { text, used };
  }

  // --- 6. Insurance / cover recommendation ---
  if (/insur|cover|health|life cover|term|policy|hospital/.test(msg)) {
    useLabel('recommended cover amounts');
    useLabel('this month\u2019s spending');
    useLabel('savings goals');
    useLabel('emergency fund');
    const rec = ctx.recommendedCover || { health: 0, life: 0 };
    const annualIncome = (ctx.thisMonth.monthlyIncome || 0) * 12;
    const targetMilestone = formatINR(annualIncome * 12);
    let text = `Based on your income, dependents and savings, my recommendation is:\n`;
    text += `  • Health cover: ${formatINR(rec.health)}\n`;
    text += `  • Term life cover: ${formatINR(rec.life)}\n\nWhy:\n`;
    const whys = ['Health = ₹5,00,000 base + ₹3,00,000 for each dependent.'];
    if (annualIncome > 0) {
      whys.push(`Term life = the 12× income target (${targetMilestone}) minus your accumulated savings.`);
    } else {
      whys.push('Set your monthly income in your profile and I can compute the term-life formula precisely.');
    }
    text += `${bullet(whys)}\n\n`;
    text += 'These are indicative figures — please verify the actual premium with the insurer before purchasing.';
    return { text, used };
  }
  // --- 6b. Dependents / family ---
  if (/dependent|family|spouse|wife|husband|kids?|children|parents?/.test(msg)) {
    useLabel('family dependents');
    if (!ctx.dependents?.length) {
      return {
        text: `I don't see any dependents in your profile yet. Add them under Insurance → Dependents — each dependent directly increases the health & term-life cover I recommend for you.`,
        used,
      };
    }
    const lines = ctx.dependents.map((d) => `${d.name} — ${d.relation}, ${d.age} yr(s)`);
    const rec = ctx.recommendedCover || {};
    let text = `Your dependents:\n${bullet(lines)}\n\nWith ${ctx.dependents.length} dependent(s), my cover recommendation is: health ${formatINR(rec.health || 0)}, term life ${formatINR(rec.life || 0)}.`;
    return { text, used };
  }

// --- 7. EMIs / bills / dues / debt ---
  if (/emi|bill|due|owe|debt|loan|lend|outstanding|payment/.test(msg)) {
    useLabel('upcoming bills & EMIs');
    useLabel('financial health score');
    const billsSummary = ctx.bills || { totalOutstanding: 0, pendingCount: 0, overdue: [] };
    if (!ctx.upcomingDues.hasData && billsSummary.pendingCount === 0) {
      return {
        text: `Good news — nothing is pending at all: no bills or EMIs due in the next 15 days and zero outstanding.`,
        used,
      };
    }
    const lines = [];
    ctx.upcomingDues.emisNext15Days.forEach((d) => {
      lines.push(`EMI ${d.title}: ${formatINR(d.amount)} due in ${d.daysLeft} day(s)`);
    });
    ctx.upcomingDues.billsNext15Days.forEach((d) => {
      lines.push(`Bill ${d.title}: ${formatINR(d.amount)} due in ${d.daysLeft} day(s)`);
    });
    let text = `Here's what's hitting your account in the next 15 days:\n${bullet(lines)}\n`;
    text += `Total: ${formatINR(ctx.upcomingDues.totalDueNext15Days)}\n`;
    if (billsSummary.overdue?.length) {
      useLabel('overdue dues');
      const od = billsSummary.overdue.map(
        (o) => `${o.type === 'emi' ? 'EMI' : 'Bill'} ${o.title}: ${formatINR(o.amount)} — ${o.daysOverdue} day(s) OVERDUE`
      );
      text += `\nOverdue (clear these first):\n${bullet(od)}\n`;
    }
    if (billsSummary.totalOutstanding > ctx.upcomingDues.totalDueNext15Days) {
      useLabel('total outstanding dues');
      text += `Total outstanding across ALL pending bills/EMIs: ${formatINR(billsSummary.totalOutstanding)} (${billsSummary.pendingCount} item(s)).\n`;
    }
    const income = ctx.thisMonth.monthlyIncome || 1;
    const ratio = ctx.upcomingDues.totalDueNext15Days / income;
    if (ratio > 0.4) {
      useLabel('this month\u2019s spending');
      text += `\nThat's ${Math.round(ratio * 100)}% of your monthly income — layering in regular spend could stretch you thin. Set reminders a few days before each due date.`;
    }
    return { text, used };
  }

// --- 9. Generic help / what can you do ---
  if (/help|what can you|what do you|how do you|options/.test(msg)) {
    return {
      text:
        'I can answer from your actual FINNOVA data. Ask me about:\n' +
        bullet([
          'Your profile ("what do you know about me?")',
          'A safe weekly budget ("how much can I spend this week?")',
          'Recent spending ("what did I spend on recently?")',
          'Goal tracking ("am I on track for my trip goal?")',
          'Your emergency fund ("what should I do about my emergency fund?")',
          'Bills & EMIs incl. overdue ("what do I owe in total?")',
          'Your saved plans & policies ("which insurance plans have I saved or activated?")',
          'Dependents ("who are my dependents?")',
          'Schemes to prioritize ("which government scheme should I prioritize?")',
          'Insurance cover ("what health/life cover do I need?")',
          'Your overall score ("how is my financial health?")',
        ]),
      used: [],
    };
  }

  // --- 10. Fallback: polite redirect ---
  return {
    text:
      "I want to make sure I give you something useful from your actual data. Try one of these:\n" +
      bullet([
        '"What do you know about me?"',
        '"How much can I safely spend this week?"',
        '"Am I on track for my goals?"',
        '"What should I do about my emergency fund?"',
        '"Which insurance plans have I saved or activated?"',
        '"What is due in the next 15 days?"',
      ]),
    used,
  };
};

/**
 * Main entry used by the route.
 * @returns {Promise<{reply: string, contextUsed: string[], provider: string}>}
 */
export const getAssistantReply = async (message, conversationHistory, userId) => {
  const context = await buildContextObject(userId);
  const systemPrompt = buildSystemPrompt(context);

  const trimmedHistory = (Array.isArray(conversationHistory) ? conversationHistory : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content }))
    .concat([{ role: 'user', content: message }]);

  const llmResult = await callLLM(systemPrompt, trimmedHistory);

  if (llmResult.text) {
    return {
      provider: llmResult.provider,
      reply: llmResult.text,
      contextUsed: populatedContextLabels(context),
    };
  }

  const local = localReply(message, context);
  return {
    provider: 'local',
    reply: local.text,
    contextUsed: local.used.length ? local.used : populatedContextLabels(context),
  };
};

export { localReply };