import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, CalendarClock, CreditCard, Check, Loader2, AlertTriangle } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getCurrencySymbol, BILL_CATEGORIES } from '../constants/categories.js';
import Modal from '../components/ui/Modal.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

const BillsEmi = () => {
  const { user } = useAuth();
  const currency = getCurrencySymbol(user?.currency);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'bill' ? 'bill' : 'emi';

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    type: activeTab,
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    category: '',
    recurring: false,
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = async (type = activeTab) => {
    setLoading(true);
    try {
      const res = await api.get('/bills-emi', { params: { type } });
      setRecords(res.data.records);
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const switchTab = (tab) => {
    setSearchParams({ tab });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.title || !form.amount || form.amount <= 0 || !form.dueDate) {
      setFormError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/bills-emi', {
        type: activeTab,
        title: form.title,
        amount: Number(form.amount),
        dueDate: form.dueDate,
        category: form.category,
        recurring: form.recurring,
      });
      setShowModal(false);
      setForm({
        title: '',
        type: activeTab,
        amount: '',
        dueDate: new Date().toISOString().split('T')[0],
        category: '',
        recurring: false,
      });
      fetchRecords(activeTab);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Failed to add record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      await api.patch(`/bills-emi/${id}/pay`);
      // Optimistic update
      setRecords((prev) =>
        prev.map((r) =>
          r._id === id ? { ...r, status: 'paid', paidOn: new Date().toISOString() } : r
        )
      );
    } catch (error) {
      console.error('Failed to mark as paid:', error);
    }
  };

  const isDueSoon = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 15;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const upcoming = records.filter((r) => r.status === 'pending');
  const paid = records.filter((r) => r.status === 'paid');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Bills & EMI</h1>
          <p className="text-gray-400 text-sm mt-1">Never miss a payment</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 self-start">
          <Plus size={18} />
          Add {activeTab === 'emi' ? 'EMI' : 'Bill'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 max-w-xs">
        <button
          onClick={() => switchTab('emi')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'emi'
              ? 'bg-gradient-accent text-white shadow-glow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <CreditCard size={16} />
          EMI
        </button>
        <button
          onClick={() => switchTab('bill')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'bill'
              ? 'bg-gradient-accent text-white shadow-glow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <CalendarClock size={16} />
          Bills
        </button>
      </div>

      {/* Upcoming */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-3">Upcoming</h2>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="glass-card">
            <EmptyState
              icon={CalendarClock}
              title={`No upcoming ${activeTab === 'emi' ? 'EMIs' : 'bills'}`}
              subtitle={`Add a new ${activeTab === 'emi' ? 'EMI' : 'bill'} to track it here`}
            />
          </div>
        ) : (
          <div className="glass-card divide-y divide-white/5">
            {upcoming.map((record) => (
              <div key={record._id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isDueSoon(record.dueDate) ? 'bg-amber-500/20' : 'bg-accent-start/20'
                }`}>
                  {activeTab === 'emi' ? (
                    <CreditCard size={18} className={isDueSoon(record.dueDate) ? 'text-amber-400' : 'text-accent-start'} />
                  ) : (
                    <CalendarClock size={18} className={isDueSoon(record.dueDate) ? 'text-amber-400' : 'text-accent-end'} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{record.title}</p>
                    {isDueSoon(record.dueDate) && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-medium border border-amber-500/30 flex items-center gap-1 shrink-0">
                        <AlertTriangle size={10} />
                        Due Soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Due {formatDate(record.dueDate)}
                    {record.recurring && ' · Recurring'}
                    {record.category && ` · ${record.category}`}
                  </p>
                </div>
                <span className="text-sm font-semibold text-white">
                  {currency}
                  {record.amount.toLocaleString('en-IN')}
                </span>
                <button
                  onClick={() => handleMarkPaid(record._id)}
                  className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5"
                >
                  <Check size={14} />
                  Mark Paid
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paid */}
      {paid.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3">Paid</h2>
          <div className="glass-card divide-y divide-white/5 opacity-60">
            {paid.map((record) => (
              <div key={record._id} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                  <Check size={18} className="text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate line-through">{record.title}</p>
                  <p className="text-xs text-gray-500">
                    Paid on {formatDate(record.paidOn)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-400">
                  {currency}
                  {record.amount.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={`Add ${activeTab === 'emi' ? 'EMI' : 'Bill'}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="label-text">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={activeTab === 'emi' ? 'e.g. iPhone EMI' : 'e.g. Electricity Bill'}
              className="input-field"
            />
          </div>

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
            <label className="label-text">Due Date</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
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
              <option value="">Select category</option>
              {BILL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
              className="w-4 h-4 rounded accent-accent-start"
            />
            <span className="text-sm text-gray-300">Recurring payment</span>
          </label>

          <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
            {submitting && <Loader2 size={18} className="animate-spin" />}
            {submitting ? 'Adding...' : `Add ${activeTab === 'emi' ? 'EMI' : 'Bill'}`}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default BillsEmi;