import { useEffect, useState } from 'react';
import { Plus, Target, Loader2, TrendingUp, History, ChevronDown, ChevronUp, Trash2, AlertTriangle } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getCurrencySymbol } from '../constants/categories.js';
import Modal from '../components/ui/Modal.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

const GoalPlanner = () => {
  const { user } = useAuth();
  const currency = getCurrencySymbol(user?.currency);

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    targetAmount: '',
    targetDate: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Contribution state
  const [contributionGoal, setContributionGoal] = useState(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributing, setContributing] = useState(false);

  // Goal removal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/goals');
      setGoals(res.data.goals);
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.title || !form.targetAmount || form.targetAmount <= 0 || !form.targetDate) {
      setFormError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/goals', {
        title: form.title,
        targetAmount: Number(form.targetAmount),
        targetDate: form.targetDate,
      });
      setShowModal(false);
      setForm({ title: '', targetAmount: '', targetDate: '' });
      fetchGoals();
    } catch (error) {
      setFormError(error.response?.data?.message || 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    if (!contributionAmount || contributionAmount <= 0) return;

    setContributing(true);
    try {
      const res = await api.patch(`/goals/${contributionGoal._id}/contribute`, {
        amount: Number(contributionAmount),
      });
      setGoals((prev) => prev.map((g) => (g._id === res.data.goal._id ? res.data.goal : g)));
      setContributionGoal(null);
      setContributionAmount('');
    } catch (error) {
      console.error('Failed to contribute:', error);
    } finally {
      setContributing(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/goals/${deleteTarget._id}`);
      setGoals((prev) => prev.filter((g) => g._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to remove goal:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Contribution history expand state
  const [openHistory, setOpenHistory] = useState(null);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Goal Planner</h1>
          <p className="text-gray-400 text-sm mt-1">Save towards what matters</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 self-start">
          <Plus size={18} />
          Add Goal
        </button>
      </div>

      {/* Goals grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={Target}
            title="No goals yet"
            subtitle="Create your first savings goal to get started"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => (
            <div key={goal._id} className="glass-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white">{goal.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">Target: {formatDate(goal.targetDate)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDeleteTarget(goal)}
                    title="Remove goal"
                    className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="w-10 h-10 rounded-xl bg-accent-start/20 flex items-center justify-center">
                    <Target size={18} className="text-accent-start" />
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">
                    {currency}
                    {goal.savedAmount.toLocaleString('en-IN')} saved
                  </span>
                  <span className="text-white font-medium">
                    {currency}
                    {goal.targetAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-accent transition-all duration-500"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-xs">
                  <span className="text-gray-500">{Math.round(goal.progress)}% complete</span>
                  <span className="text-accent-start font-medium">
                    {currency}
                    {goal.requiredMonthlySavings.toLocaleString('en-IN')}/mo needed
                  </span>
                </div>
              </div>

              {/* Contribute */}
              <button
                onClick={() => setContributionGoal(goal)}
                className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
              >
                <TrendingUp size={16} />
                Add Contribution
              </button>

              {/* Contribution history */}
              {goal.contributions && goal.contributions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <button
                    onClick={() => setOpenHistory(openHistory === goal._id ? null : goal._id)}
                    className="flex items-center justify-between w-full text-xs font-medium text-gray-400 hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <History size={13} />
                      Contribution History ({goal.contributions.length})
                    </span>
                    {openHistory === goal._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {openHistory === goal._id && (
                    <ul className="mt-3 space-y-2">
                      {[...goal.contributions]
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((c, idx) => (
                          <li
                            key={idx}
                            className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-2"
                          >
                            <span className="text-gray-400">
                              {formatDate(c.date)}
                            </span>
                            <span className="font-semibold text-white">
                              {currency}
                              {Number(c.amount).toLocaleString('en-IN')}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Goal Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New Goal">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="label-text">Goal Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. New Laptop"
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text">Target Amount ({currency})</label>
            <input
              type="number"
              value={form.targetAmount}
              onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text">Target Date</label>
            <input
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              className="input-field"
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
            {submitting && <Loader2 size={18} className="animate-spin" />}
            {submitting ? 'Creating...' : 'Create Goal'}
          </button>
        </form>
      </Modal>

      {/* Contribution Modal */}
      <Modal
        open={!!contributionGoal}
        onClose={() => setContributionGoal(null)}
        title={`Contribute to ${contributionGoal?.title || ''}`}
      >
        <form onSubmit={handleContribute} className="space-y-4">
          <div>
            <label className="label-text">Amount ({currency})</label>
            <input
              type="number"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="input-field"
              autoFocus
            />
            <p className="text-[11px] text-gray-500 mt-2 flex items-start gap-1.5">
              <TrendingUp size={12} className="shrink-0 mt-0.5 text-accent-start" />
              This amount is saved to this goal's contribution history, deducted from your
              monthly income, and appears under "Savings" in Spending History.
            </p>
          </div>
          <button type="submit" disabled={contributing} className="btn-primary w-full flex items-center justify-center gap-2">
            {contributing && <Loader2 size={18} className="animate-spin" />}
            {contributing ? 'Adding...' : 'Add Contribution'}
          </button>
        </form>
      </Modal>

      {/* Remove Goal Confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Goal">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-300">
              Remove <span className="font-semibold text-white">{deleteTarget?.title}</span> from
              your goals? Contributions you already made stay in your Spending History.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={handleDeleteGoal}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-semibold bg-red-500/90 hover:bg-red-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting && <Loader2 size={16} className="animate-spin" />}
              {deleting ? 'Removing...' : 'Remove Goal'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GoalPlanner;