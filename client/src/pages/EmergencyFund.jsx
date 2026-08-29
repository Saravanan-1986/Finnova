import { useEffect, useState } from 'react';
import { Shield, Loader2, TrendingUp, Info, History } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getCurrencySymbol } from '../constants/categories.js';
import Modal from '../components/ui/Modal.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';

const EmergencyFund = () => {
  const { user } = useAuth();
  const currency = getCurrencySymbol(user?.currency);

  const [fund, setFund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributing, setContributing] = useState(false);

  const fetchFund = async () => {
    setLoading(true);
    try {
      const res = await api.get('/emergency-fund');
      setFund(res.data.fund);
    } catch (error) {
      console.error('Failed to fetch emergency fund:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFund();
  }, []);

  const handleContribute = async (e) => {
    e.preventDefault();
    if (!contributionAmount || contributionAmount <= 0) return;

    setContributing(true);
    try {
      const res = await api.patch('/emergency-fund/contribute', {
        amount: Number(contributionAmount),
      });
      setFund(res.data.fund);
      setShowModal(false);
      setContributionAmount('');
    } catch (error) {
      console.error('Failed to contribute:', error);
    } finally {
      setContributing(false);
    }
  };

  const handleSwitchTarget = async (months) => {
    try {
      const res = await api.patch('/emergency-fund/target', { months });
      setFund(res.data.fund);
    } catch (error) {
      console.error('Failed to switch target:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Emergency Fund</h1>
        <p className="text-gray-400 text-sm mt-1">Your financial safety net</p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-32" />
        </div>
      ) : fund ? (
        <>
          {/* Main fund card */}
          <div className="glass-card p-6 relative overflow-hidden">
            <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-accent-end/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-glow">
                  <Shield size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Safety Net</h2>
                  <p className="text-xs text-gray-500">
                    Based on your avg monthly spending of {currency}
                    {fund.monthlySpending.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Target toggle */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => handleSwitchTarget(3)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    fund.activeTargetMonths === 3
                      ? 'bg-gradient-accent text-white shadow-glow'
                      : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                  }`}
                >
                  3 Months
                </button>
                <button
                  onClick={() => handleSwitchTarget(6)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    fund.activeTargetMonths === 6
                      ? 'bg-gradient-accent text-white shadow-glow'
                      : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                  }`}
                >
                  6 Months
                </button>
              </div>

              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">
                    {currency}
                    {fund.savedAmount.toLocaleString('en-IN')} saved
                  </span>
                  <span className="text-white font-medium">
                    {currency}
                    {fund.targetAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-accent transition-all duration-500"
                    style={{ width: `${fund.progress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-xs">
                  <span className="text-gray-500">{Math.round(fund.progress)}% complete</span>
                  <span className="text-accent-end font-medium">
                    Target range: {currency}
                    {fund.target3Months.toLocaleString('en-IN')} – {currency}
                    {fund.target6Months.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowModal(true)}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <TrendingUp size={18} />
                Add Contribution
              </button>
            </div>
          </div>

          {/* Contribution History */}
          {fund.contributions && fund.contributions.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                <History size={16} className="text-accent-start" />
                Contribution History ({fund.contributions.length})
              </h3>
              <ul className="space-y-2">
                {[...fund.contributions]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((c, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-2"
                    >
                      <span className="text-gray-400">
                        {new Date(c.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="font-semibold text-white">
                        {currency}
                        {Number(c.amount).toLocaleString('en-IN')}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Info card */}
          <div className="glass-card p-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent-start/20 flex items-center justify-center shrink-0">
                <Info size={18} className="text-accent-start" />
              </div>
              <div>
                <h3 className="font-medium text-white mb-1">Why 3–6 months?</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Financial experts recommend keeping 3 to 6 months of essential expenses in an
                  easily accessible account. This covers unexpected job loss, medical emergencies,
                  or major repairs without derailing your long-term goals.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Contribution Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add to Emergency Fund">
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
              <History size={12} className="shrink-0 mt-0.5 text-accent-start" />
              This amount is saved to your emergency fund's contribution history, deducted
              from your monthly income, and appears under "Savings" in Spending History.
            </p>
          </div>
          <button type="submit" disabled={contributing} className="btn-primary w-full flex items-center justify-center gap-2">
            {contributing && <Loader2 size={18} className="animate-spin" />}
            {contributing ? 'Adding...' : 'Add Contribution'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default EmergencyFund;