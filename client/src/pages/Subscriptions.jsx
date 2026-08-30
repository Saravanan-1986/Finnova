import { useEffect, useState } from 'react';
import {
  Plus,
  Loader2,
  Repeat,
  Zap,
  Wallet,
  CalendarClock,
  Trash2,
  Pencil,
  Check,
  BadgeCheck,
  AlertTriangle,
} from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getCurrencySymbol, EXPENSE_CATEGORIES } from '../constants/categories.js';
import { SUBSCRIPTION_PROVIDERS, getProvider } from '../constants/subscriptions.js';
import SubscriptionLogo from '../components/ui/SubscriptionLogo.jsx';
import Modal from '../components/ui/Modal.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

const DEFAULT_FORM = {
  serviceKey: '',
  name: '',
  plan: '',
  amount: '',
  category: 'Entertainment',
  autoPay: false,
  autoPayDate: 1,
};

const Subscriptions = () => {
  const { user } = useAuth();
  const currency = getCurrencySymbol(user?.currency);

  const [subscriptions, setSubscriptions] = useState([]);
  const [summary, setSummary] = useState({ activeCount: 0, totalMonthly: 0, autoPayCount: 0 });
  const [loading, setLoading] = useState(true);
  const [autoPaidNotice, setAutoPaidNotice] = useState(0);
  const [pageError, setPageError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [payingId, setPayingId] = useState(null);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/subscriptions');
      setSubscriptions(res.data.subscriptions);
      setSummary(res.data.summary);
      setAutoPaidNotice(res.data.chargedCount || 0);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      setPageError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (sub) => {
    setEditing(sub);
    setForm({
      serviceKey: sub.serviceKey || 'other',
      name: sub.name,
      plan: sub.plan || '',
      amount: String(sub.amount),
      category: sub.category || 'Entertainment',
      autoPay: !!sub.autoPay,
      autoPayDate: sub.autoPayDate || 1,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleProviderPick = (provider) => {
    setForm((f) => ({
      ...f,
      serviceKey: provider.key,
      name: editing ? f.name : provider.key === 'other' ? '' : provider.name,
      amount:
        editing || !provider.typicalAmount ? f.amount : String(provider.typicalAmount),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const name =
      form.serviceKey && form.serviceKey !== 'other'
        ? getProvider(form.serviceKey)?.name || form.name
        : form.name;
    if (!name || !name.trim()) {
      setFormError('Please enter the subscription name');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setFormError('Please enter a valid monthly amount');
      return;
    }
    if (form.autoPay && (!form.autoPayDate || form.autoPayDate < 1 || form.autoPayDate > 28)) {
      setFormError('Please choose an auto-pay date (1-28)');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        serviceKey: form.serviceKey || 'other',
        name: name.trim(),
        plan: form.plan,
        amount: Number(form.amount),
        category: form.category,
        autoPay: form.autoPay,
        autoPayDate: Number(form.autoPayDate),
      };
      if (editing) {
        await api.patch(`/subscriptions/${editing._id}`, payload);
      } else {
        const res = await api.post('/subscriptions', payload);
        if (res.data.chargedCount > 0) {
          setAutoPaidNotice((n) => n + res.data.chargedCount);
        }
      }
      setShowModal(false);
      setEditing(null);
      setForm(DEFAULT_FORM);
      fetchSubscriptions();
    } catch (error) {
      setFormError(error.response?.data?.message || 'Failed to save subscription');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayNow = async (sub) => {
    setPageError('');
    setPayingId(sub._id);
    try {
      await api.patch(`/subscriptions/${sub._id}/pay`);
      fetchSubscriptions();
    } catch (error) {
      setPageError(error.response?.data?.message || 'Payment failed');
    } finally {
      setPayingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/subscriptions/${deleteTarget._id}`);
      setDeleteTarget(null);
      fetchSubscriptions();
    } catch (error) {
      setPageError(error.response?.data?.message || 'Failed to remove subscription');
    } finally {
      setDeleting(false);
    }
  };

  const ordinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const nextAutoPay = activeSubs
    .filter((s) => s.autoPay && s.nextChargeDate)
    .sort((a, b) => new Date(a.nextChargeDate) - new Date(b.nextChargeDate))[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscription Tracker</h1>
          <p className="text-gray-400 text-sm mt-1">All your recurring payments in one place</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 self-start">
          <Plus size={18} />
          Add Subscription
        </button>
      </div>

      {/* Auto-pay notice */}
      {autoPaidNotice > 0 && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm">
          <Zap size={16} className="shrink-0" />
          <span>
            {autoPaidNotice} subscription{autoPaidNotice > 1 ? 's' : ''} auto-paid just now —
            deducted from your income and added to Spending History.
          </span>
        </div>
      )}

      {pageError && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{pageError}</span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <Wallet size={14} className="text-accent-start" />
            Monthly cost
          </div>
          <p className="text-xl font-bold text-white">
            {currency}
            {(summary.totalMonthly || 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <BadgeCheck size={14} className="text-emerald-400" />
            Active
          </div>
          <p className="text-xl font-bold text-white">{summary.activeCount || 0}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <Zap size={14} className="text-amber-400" />
            On auto-pay
          </div>
          <p className="text-xl font-bold text-white">{summary.autoPayCount || 0}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <CalendarClock size={14} className="text-accent-end" />
            Next auto-pay
          </div>
          <p className="text-xl font-bold text-white">
            {nextAutoPay
              ? new Date(nextAutoPay.nextChargeDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              : '—'}
          </p>
        </div>
      </div>

      {/* Subscription list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={Repeat}
            title="No subscriptions yet"
            subtitle="Add Netflix, Prime, ZEE5 and more to auto-track your monthly spend"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((s) => (
            <div
              key={s._id}
              className={`glass-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
                s.status !== 'active' ? 'opacity-60' : ''
              }`}
            >
              <SubscriptionLogo serviceKey={s.serviceKey} name={s.name} size={48} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-white">{s.name}</p>
                  {s.plan && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-300">
                      {s.plan}
                    </span>
                  )}
                  {s.autoPay ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-start/15 text-accent-start border border-accent-start/30 flex items-center gap-1">
                      <Zap size={10} />
                      Auto-pay · {ordinal(s.autoPayDate)}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-400 border border-white/10">
                      Manual
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {s.autoPay
                    ? s.chargedThisMonth
                      ? `Charged this month · next auto-pay ${formatDate(s.nextChargeDate)}`
                      : `First auto-pay ${formatDate(s.nextChargeDate)}`
                    : s.chargedThisMonth
                      ? 'Paid this month'
                      : 'Not paid this month'}
                  {' · '}
                  {s.category}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-lg font-bold text-white">
                  {currency}
                  {s.amount.toLocaleString('en-IN')}
                  <span className="text-xs text-gray-500 font-normal">/mo</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {s.status === 'active' && !s.chargedThisMonth && (
                  <button
                    onClick={() => handlePayNow(s)}
                    disabled={payingId === s._id}
                    className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {payingId === s._id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    Pay Now
                  </button>
                )}
                <button
                  onClick={() => openEdit(s)}
                  title="Edit"
                  className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeleteTarget(s)}
                  title="Remove"
                  className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditing(null);
        }}
        title={editing ? 'Edit Subscription' : 'Add Subscription'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="label-text">Choose a service</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {SUBSCRIPTION_PROVIDERS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleProviderPick(p)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
                    form.serviceKey === p.key
                      ? 'border-accent-start bg-accent-start/10 shadow-glow'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <SubscriptionLogo serviceKey={p.key} name={p.name} size={34} />
                  <span className="text-[10px] text-gray-300 leading-tight text-center">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {(!form.serviceKey || form.serviceKey === 'other') && (
            <div>
              <label className="label-text">Subscription name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Crunchyroll"
                className="input-field"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Plan (optional)</label>
              <input
                type="text"
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                placeholder="e.g. Premium"
                className="input-field"
              />
            </div>
            <div>
              <label className="label-text">Amount ({currency}/mo)</label>
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
          </div>

          <div>
            <label className="label-text">Expense category</label>
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

          {/* Auto-pay toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="min-w-0 pr-3">
              <p className="text-sm font-medium text-white">Enable Auto-pay</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Deduct the amount automatically every month
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.autoPay}
              onClick={() => setForm({ ...form, autoPay: !form.autoPay })}
              className={`shrink-0 w-11 h-6 rounded-full relative transition-colors ${
                form.autoPay ? 'bg-gradient-accent' : 'bg-white/15'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                  form.autoPay ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {form.autoPay && (
            <div>
              <label className="label-text">Auto-pay date (day of month)</label>
              <select
                value={form.autoPayDate}
                onChange={(e) => setForm({ ...form, autoPayDate: Number(e.target.value) })}
                className="input-field"
              >
                {[...Array(28)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {ordinal(i + 1)} of every month
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-2 flex items-start gap-1.5">
                <Zap size={12} className="shrink-0 mt-0.5 text-accent-start" />
                Every month on this day the amount is automatically deducted from your income and
                shown in Spending History. If the date already passed this month, the first
                deduction happens today.
              </p>
            </div>
          )}

          {!form.autoPay && (
            <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
              <Check size={12} className="shrink-0 mt-0.5 text-accent-start" />
              You'll pay manually each month with "Pay Now" — the amount is then deducted from
              your income and shown in Spending History.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={18} className="animate-spin" />}
            {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Add Subscription'}
          </button>

        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Subscription">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-300">
              Remove <span className="font-semibold text-white">{deleteTarget?.name}</span>? Future
              auto-pay deductions will stop. Payments already made stay in your Spending History.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-semibold bg-red-500/90 hover:bg-red-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting && <Loader2 size={16} className="animate-spin" />}
              {deleting ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Subscriptions;

