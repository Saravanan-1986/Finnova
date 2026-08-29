import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, CreditCard, TrendingDown, Wallet } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getCurrencySymbol, getCategoryIcon } from '../constants/categories.js';
import CategoryIcon from '../components/ui/CategoryIcon.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

const Dashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const currency = getCurrencySymbol(user?.currency);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get('/dashboard/summary');
        setSummary(res.data.summary);
      } catch (error) {
        console.error('Failed to fetch dashboard summary:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-white">Hi, {firstName} 👋</h1>
        <p className="text-gray-400 text-sm mt-1">Here's your financial overview</p>
      </div>

      {/* Income left card */}
      <div className="rounded-2xl p-6 relative overflow-hidden bg-gradient-hero border border-accent-start/25 shadow-glow">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-purple-200/80 mb-2">
            <Wallet size={16} />
            <span className="text-sm">Income left this month</span>
          </div>
          {loading ? (
            <Skeleton className="h-12 w-48" />
          ) : (
            <div className="text-4xl font-bold text-white drop-shadow-[0_0_18px_rgba(216,180,254,0.45)]">
              {currency}
              {summary?.incomeLeft?.toLocaleString('en-IN') ?? '0'}
            </div>
          )}
          <div className="flex gap-6 mt-4 text-sm">
            <div>
              <span className="text-white">Income: </span>
              <span className="text-white font-medium">
                {currency}
                {summary?.monthlyIncome?.toLocaleString('en-IN') ?? '0'}
              </span>
            </div>
            <div>
              <span className="text-white">Spent: </span>
              <span className="text-white font-medium">
                {currency}
                {summary?.totalSpentThisMonth?.toLocaleString('en-IN') ?? '0'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent spending + EMI/Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Spending */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Recent Spending</h2>
            <Link
              to="/spending"
              className="flex items-center gap-1 text-sm text-accent-start hover:text-accent-end transition-colors"
            >
              View Full History
              <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : summary?.recentExpenses?.length > 0 ? (
            <div className="space-y-3">
              {summary.recentExpenses.map((expense) => (
                <div key={expense._id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-accent-start/20 flex items-center justify-center shrink-0">
                    <CategoryIcon icon={getCategoryIcon(expense.category)} size={16} className="text-accent-start" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {expense.description || expense.category}
                    </p>
                    <p className="text-xs text-gray-500">{expense.category} · {formatDate(expense.date)}</p>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {currency}
                    {expense.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={TrendingDown}
              title="No expenses yet"
              subtitle="Add your first expense to see it here"
            />
          )}
        </div>

        {/* EMI & Bills */}
        <div className="space-y-6">
          {/* EMI card */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-accent-start" />
                <h2 className="font-semibold text-white">EMIs Due</h2>
              </div>
              {summary?.upcomingEmis?.length > 1 && (
                <span className="px-2.5 py-1 rounded-full bg-accent-start/20 text-accent-start text-xs font-medium border border-accent-start/30">
                  {summary.upcomingEmis.length} due
                </span>
              )}
            </div>

            {loading ? (
              <Skeleton className="h-20" />
            ) : summary?.upcomingEmis?.length > 0 ? (
              <div className="space-y-2">
                {summary.upcomingEmis.slice(0, 3).map((emi) => (
                  <div key={emi._id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <div>
                      <p className="text-sm font-medium text-white">{emi.title}</p>
                      <p className="text-xs text-gray-500">Due {formatDate(emi.dueDate)}</p>
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {currency}
                      {emi.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">No EMIs due in the next 15 days</p>
            )}

            <Link
              to="/bills-emi?tab=emi"
              className="mt-4 flex items-center gap-1 text-sm text-accent-start hover:text-accent-end transition-colors"
            >
              View All EMIs
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Bills card */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarClock size={18} className="text-accent-end" />
                <h2 className="font-semibold text-white">Bills Due</h2>
              </div>
              {summary?.upcomingBills?.length > 1 && (
                <span className="px-2.5 py-1 rounded-full bg-accent-end/20 text-accent-end text-xs font-medium border border-accent-end/30">
                  {summary.upcomingBills.length} due
                </span>
              )}
            </div>

            {loading ? (
              <Skeleton className="h-20" />
            ) : summary?.upcomingBills?.length > 0 ? (
              <div className="space-y-2">
                {summary.upcomingBills.slice(0, 3).map((bill) => (
                  <div key={bill._id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <div>
                      <p className="text-sm font-medium text-white">{bill.title}</p>
                      <p className="text-xs text-gray-500">Due {formatDate(bill.dueDate)}</p>
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {currency}
                      {bill.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">No bills due in the next 15 days</p>
            )}

            <Link
              to="/bills-emi?tab=bill"
              className="mt-4 flex items-center gap-1 text-sm text-accent-start hover:text-accent-end transition-colors"
            >
              View All Bills
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;