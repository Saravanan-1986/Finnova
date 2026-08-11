import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Trash2, ArrowRight, ExternalLink, BookmarkCheck, Loader2 } from 'lucide-react';
import api from '../../services/api.js';
import Skeleton from '../../components/ui/Skeleton.jsx';

const MyPlans = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('interested'); // 'interested' | 'applied' | 'active'

  const fetchSavedPlans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/saved-plans');
      setPlans(res.data.plans || []);
    } catch (error) {
      console.error('Failed to load saved plans:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedPlans();
  }, []);

  const handleUpdateStatus = async (planId, newStatus) => {
    try {
      const res = await api.patch(`/saved-plans/${planId}/status`, { status: newStatus });
      setPlans((prev) => prev.map((p) => (p._id === planId ? res.data.savedPlan : p)));
    } catch (error) {
      console.error('Failed to update plan status:', error);
    }
  };

  const handleRemovePlan = async (planId) => {
    try {
      await api.delete(`/saved-plans/${planId}`);
      setPlans((prev) => prev.filter((p) => p._id !== planId));
    } catch (error) {
      console.error('Failed to remove plan:', error);
    }
  };

  const filteredPlans = plans.filter((p) => p.status === activeTab);

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
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookmarkCheck className="text-accent-start" size={24} />
          My Saved Plans & Policies
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Track interest, applications, and active coverage states of your shortlisted policies.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-2">
        {[
          { id: 'interested', label: 'Shortlisted / Interested' },
          { id: 'applied', label: 'In Progress / Applied' },
          { id: 'active', label: 'Active Coverage' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-accent-start text-white bg-white/5 rounded-t-xl'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5 rounded-t-xl'
            }`}
          >
            {tab.label}
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 font-bold">
              {plans.filter((p) => p.status === tab.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* List / Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-500 flex flex-col items-center justify-center">
          <Bookmark size={40} className="text-gray-600 mb-4 animate-pulse" />
          <h3 className="text-white font-medium text-lg mb-1">No plans in this category</h3>
          <p className="text-sm max-w-sm mb-6">
            Shortlist government welfare schemes or private insurance policies to start tracking them.
          </p>
          <div className="flex gap-4">
            <button onClick={() => navigate('/insurance/schemes')} className="btn-primary flex items-center gap-1.5">
              Explore Schemes
              <ArrowRight size={14} />
            </button>
            <button onClick={() => navigate('/insurance/products')} className="btn-secondary flex items-center gap-1.5">
              Explore Policies
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPlans.map((plan) => {
            const item = plan.itemId || {};
            const isScheme = plan.itemType === 'scheme';

            return (
              <div
                key={plan._id}
                className="glass-card p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-300 group"
              >
                <div>
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded border uppercase tracking-wider font-extrabold ${
                        isScheme
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/20'
                          : 'bg-sky-500/20 text-sky-300 border-sky-500/20'
                      }`}
                    >
                      {plan.itemType}
                    </span>
                    <span className="text-[10px] text-gray-500">Saved: {formatDate(plan.savedAt)}</span>
                  </div>

                  <h3
                    onClick={() =>
                      navigate(isScheme ? `/insurance/schemes/${item._id}` : `/insurance/products/${item._id}`)
                    }
                    className="text-lg font-bold text-white mb-1 cursor-pointer hover:text-accent-start transition-colors line-clamp-1"
                  >
                    {item.name || 'Unnamed Plan'}
                  </h3>
                  <p className="text-xs text-gray-400 mb-4 font-medium">
                    Provider: {isScheme ? item.issuer : item.insurer}
                  </p>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Status:</span>
                    <select
                      value={plan.status}
                      onChange={(e) => handleUpdateStatus(plan._id, e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg py-1 px-2.5 text-xs text-gray-300 focus:outline-none cursor-pointer hover:bg-white/10 transition-colors"
                    >
                      <option value="interested">Interested</option>
                      <option value="applied">Applied / In Progress</option>
                      <option value="active">Active Policy</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={item.officialLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                      title="Visit official portal"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      onClick={() => handleRemovePlan(plan._id)}
                      className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Remove from saved plans"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyPlans;
