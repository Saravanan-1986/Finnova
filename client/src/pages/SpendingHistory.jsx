import { useEffect, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, List, Loader2 } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getCurrencySymbol, getCategoryIcon, EXPENSE_CATEGORIES } from '../constants/categories.js';
import CategoryIcon from '../components/ui/CategoryIcon.jsx';
import Modal from '../components/ui/Modal.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

const SpendingHistory = () => {
  const { user } = useAuth();
  const currency = getCurrencySymbol(user?.currency);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [expenses, setExpenses] = useState([]);
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [form, setForm] = useState({
    amount: '',
    category: 'Food & Dining',
    customCategory: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenses = async (m = month, y = year) => {
    setLoading(true);
    try {
      const res = await api.get('/expenses', { params: { month: m, year: y } });
      setExpenses(res.data.expenses);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonths = async () => {
    try {
      const res = await api.get('/expenses/months');
      setMonths(res.data.months);
    } catch (error) {
      console.error('Failed to fetch months:', error);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchMonths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeMonth = (delta) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setMonth(newMonth);
    setYear(newYear);
    fetchExpenses(newMonth, newYear);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.amount || form.amount <= 0) {
      setFormError('Please provide a valid amount');
      return;
    }

    const category = form.category === 'Other' ? form.customCategory || 'Other' : form.category;

    setSubmitting(true);
    try {
      await api.post('/expenses', {
        amount: Number(form.amount),
        category,
        description: form.description,
        date: form.date,
      });
      setShowModal(false);
      setForm({
        amount: '',
        category: 'Food & Dining',
        customCategory: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      fetchExpenses();
      fetchMonths();
    } catch (error) {
      setFormError(error.response?.data?.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  // Group expenses by date
  const grouped = expenses.reduce((acc, expense) => {
    const dateKey = new Date(expense.date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(expense);
    return acc;
  }, {});

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Spending History</h1>
          <p className="text-gray-400 text-sm mt-1">Track and review your expenses</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 self-start">
          <Plus size={18} />
          Add Spending Record
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-between glass-card px-4 py-3 max-w-md">
        <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium text-white">{monthLabel}</span>
        <button onClick={() => changeMonth(1)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Expenses list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={List}
            title="No expenses recorded yet for this month"
            subtitle='Click "Add Spending Record" to add your first expense'
          />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateKey, items]) => (
            <div key={dateKey}>
              <h3 className="text-sm font-medium text-gray-400 mb-3">{dateKey}</h3>
              <div className="glass-card divide-y divide-white/5">
                {items.map((expense) => (
                  <div key={expense._id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-accent-start/20 flex items-center justify-center shrink-0">
                      <CategoryIcon icon={getCategoryIcon(expense.category)} size={18} className="text-accent-start" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {expense.description || expense.category}
                      </p>
                      <p className="text-xs text-gray-500">{expense.category}</p>
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {currency}
                      {expense.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Spending Record">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="label-text">Amount ({currency})</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input-field"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value}
                </option>
              ))}
            </select>
          </div>

          {form.category === 'Other' && (
            <div>
              <label className="label-text">Custom Category</label>
              <input
                type="text"
                value={form.customCategory}
                onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                placeholder="e.g. Pet Care"
                className="input-field"
              />
            </div>
          )}

          <div>
            <label className="label-text">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What was this for?"
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input-field"
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
            {submitting && <Loader2 size={18} className="animate-spin" />}
            {submitting ? 'Adding...' : 'Add Expense'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default SpendingHistory;