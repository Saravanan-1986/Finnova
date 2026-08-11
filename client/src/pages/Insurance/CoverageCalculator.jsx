import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, Heart, Shield, RefreshCw, ArrowRight, HelpCircle, Loader2 } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const CoverageCalculator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  // Editable Form Inputs (prefilled from DB)
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [dependents, setDependents] = useState([]);
  const [includeFamily, setIncludeFamily] = useState(true);
  const [liabilities, setLiabilities] = useState(0);
  const [savings, setSavings] = useState(0);

  const fetchPrefilledData = async () => {
    setLoading(true);
    try {
      // 1. Prefill income from Auth user profile
      if (user) {
        setMonthlyIncome(user.monthlyIncome || 0);
      }

      // 2. Fetch dependents
      const depRes = await api.get('/dependents');
      setDependents(depRes.data.dependents || []);

      // 3. Fetch bills/EMIs to calculate liabilities
      const billsRes = await api.get('/bills-emi');
      const billsList = billsRes.data.records || [];
      // Calculate total monthly EMI/bills liability
      const totalLiabilities = billsList.reduce((sum, item) => sum + (item.amount || 0), 0);
      setLiabilities(totalLiabilities);

      // 4. Fetch savings from Goals (lifestyle goals + safety nets/emergency fund)
      const goalsRes = await api.get('/goals');
      const goalsList = goalsRes.data.goals || [];
      const totalSavings = goalsList.reduce((sum, item) => sum + (item.savedAmount || 0), 0);
      setSavings(totalSavings);
    } catch (error) {
      console.error('Failed to load prefilled calculator data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrefilledData();
  }, [user]);

  // Live Calculations (Calculated on the fly based on editable state variables)
  const activeDependents = includeFamily ? dependents : [];
  
  // Health Recommendation calculation
  let healthCoverAmount = 500000 + activeDependents.length * 300000;
  const hasMinorOrSenior = activeDependents.some((d) => d.age < 18 || d.age >= 60);
  let healthFloorApplied = false;
  if (hasMinorOrSenior && healthCoverAmount < 1000000) {
    healthCoverAmount = 1000000;
    healthFloorApplied = true;
  }

  const healthBreakdown = [
    'Base coverage for individual: ₹5,00,000',
    `Added cover for dependents: +₹${(activeDependents.length * 300000).toLocaleString('en-IN')} (₹3,00,000 per person)`,
  ];
  if (healthFloorApplied) {
    healthBreakdown.push('Welfare Floor Applied: ₹10,00,000 recommended because you have a minor (<18) or senior (≥60) dependent');
  }

  // Term Life Recommendation calculation
  const annualIncome = monthlyIncome * 12;
  const rawLifeCover = annualIncome * 12 - savings;
  const lifeCoverFloor = annualIncome * 10;
  let lifeCoverAmount = Math.max(0, rawLifeCover);
  let lifeFloorApplied = false;
  if (lifeCoverAmount < lifeCoverFloor) {
    lifeCoverAmount = lifeCoverFloor;
    lifeFloorApplied = true;
  }

  const lifeBreakdown = [
    `Standard target (12x annual income): ₹${(annualIncome * 12).toLocaleString('en-IN')}`,
    `Deducted current savings: -₹${savings.toLocaleString('en-IN')}`,
    `Raw term cover requirement: ₹${Math.max(0, rawLifeCover).toLocaleString('en-IN')}`,
  ];
  if (lifeFloorApplied) {
    lifeBreakdown.push(`Welfare Floor Applied: Minimum of 10x annual income (₹${lifeCoverFloor.toLocaleString('en-IN')}) recommended`);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-accent-start animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Loading coverage calculator parameters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calculator className="text-accent-start" size={24} />
          Coverage Target Calculator
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Input your financial variables to calculate optimal insurance coverage targets for your family.
        </p>
      </div>

      {/* Grid Inputs vs Outputs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Inputs Block (5 cols) */}
        <div className="lg:col-span-5 space-y-4 glass-card p-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h3 className="font-bold text-white text-base">Your Financial Profile</h3>
            <button
              onClick={fetchPrefilledData}
              className="p-1 text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-all"
              title="Reset to database defaults"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Monthly Income Input */}
          <div>
            <label className="label-text">Monthly Income (₹)</label>
            <input
              type="number"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(Number(e.target.value))}
              className="input-field"
              min="0"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Annual Income: ₹{(monthlyIncome * 12).toLocaleString('en-IN')}
            </p>
          </div>

          {/* Savings Input */}
          <div>
            <label className="label-text">Total Current Savings (₹)</label>
            <input
              type="number"
              value={savings}
              onChange={(e) => setSavings(Number(e.target.value))}
              className="input-field"
              min="0"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Sum of active wealth goals + emergency fund saved.
            </p>
          </div>

          {/* Liabilities Input */}
          <div>
            <label className="label-text">Monthly EMI & Bill Liabilities (₹)</label>
            <input
              type="number"
              value={liabilities}
              onChange={(e) => setLiabilities(Number(e.target.value))}
              className="input-field"
              min="0"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Monthly cash flow locked in dues and utilities.
            </p>
          </div>

          {/* Dependents Selection */}
          <div className="pt-2 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white">Include Dependents ({dependents.length})</label>
              <button
                onClick={() => setIncludeFamily(!includeFamily)}
                className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                  includeFamily ? 'bg-accent-start' : 'bg-white/10'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                    includeFamily ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {includeFamily && dependents.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                {dependents.map((dep, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-white/5 border border-white/5 text-xs flex justify-between items-center capitalize text-gray-300">
                    <span>{dep.name} ({dep.relation})</span>
                    <span className="text-white">{dep.age} years old</span>
                  </div>
                ))}
              </div>
            )}

            {includeFamily && dependents.length === 0 && (
              <p className="text-xs text-gray-500 italic">No dependents registered. Go to "Family & Dependents" to add.</p>
            )}
          </div>
        </div>

        {/* Outputs Block (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Health Recommendation Output */}
          <div className="glass-card p-6 border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/5 to-white/5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Health Cover Target</h3>
                <div className="text-3xl font-extrabold text-white mt-1">
                  ₹{healthCoverAmount.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Heart size={20} />
              </div>
            </div>

            {/* Line-item explanation breakdown */}
            <div className="space-y-2 border-t border-white/5 pt-3">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Calculation Breakdown:</span>
              <ul className="space-y-1.5 pl-1">
                {healthBreakdown.map((line, idx) => (
                  <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0 mt-2" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => navigate(`/insurance/products?category=health`)}
              className="btn-secondary py-2 w-full text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              Find Matching Health Plans
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Term Life Recommendation Output */}
          <div className="glass-card p-6 border-l-4 border-l-sky-500 bg-gradient-to-r from-sky-500/5 to-white/5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-sky-400 uppercase tracking-wider">Term Life Cover Target</h3>
                <div className="text-3xl font-extrabold text-white mt-1">
                  ₹{lifeCoverAmount.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <Shield size={20} />
              </div>
            </div>

            {/* Line-item explanation breakdown */}
            <div className="space-y-2 border-t border-white/5 pt-3">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Calculation Breakdown:</span>
              <ul className="space-y-1.5 pl-1">
                {lifeBreakdown.map((line, idx) => (
                  <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-sky-400 shrink-0 mt-2" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => navigate(`/insurance/products?category=term_life`)}
              className="btn-secondary py-2 w-full text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              Find Matching Life Plans
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverageCalculator;
