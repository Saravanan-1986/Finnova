import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Landmark, ShieldCheck, Heart, Shield, Users, Sparkles, AlertTriangle, Loader2, Bookmark, CheckCircle, User, MapPin, Briefcase, Wallet, CalendarDays, ArrowRight, BookmarkCheck } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { rankInsuranceProducts, inrLakhs } from '../../utils/insuranceRanking.js';
import Skeleton from '../../components/ui/Skeleton.jsx';

const categoryColor = (cat) => {
  const map = {
    health: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    life: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    pension: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    term_life: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    crop: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    accident: 'text-red-400 bg-red-500/10 border-red-500/20',
    vehicle: 'text-red-400 bg-red-500/10 border-red-500/20',
    education: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    housing: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };
  return map[cat] || 'text-gray-400 bg-gray-500/10 border-gray-500/20';
};

const InsuranceOverview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schemes, setSchemes] = useState([]);
  const [products, setProducts] = useState([]);
  const [calculator, setCalculator] = useState(null);
  const [health, setHealth] = useState(null);
  const [dependents, setDependents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState(new Set());
  const [savedIds, setSavedIds] = useState(new Set());
  const [includeFamily, setIncludeFamily] = useState(
    () => localStorage.getItem('finnova_include_family') !== 'false'
  );

  const toggleFamily = () => {
    setIncludeFamily((prev) => {
      const next = !prev;
      localStorage.setItem('finnova_include_family', String(next));
      return next;
    });
  };

  const fetchData = async () => {
    setLoading(true);
    // Load every panel independently so one failing request never blanks the
    // whole overview — each section simply renders whatever data arrived.
    try {
      const [schemesRes, productsRes, calcRes, healthRes, plansRes, depsRes] = await Promise.allSettled([
        api.get(`/schemes/recommended?includeFamily=${includeFamily}`),
        api.get('/insurance-products'),
        api.get('/insurance/coverage-calculator'),
        api.get('/financial-health-score'),
        api.get('/saved-plans'),
        api.get('/dependents'),
      ]);

      if (schemesRes.status === 'fulfilled') setSchemes(schemesRes.value.data.schemes || []);
      if (productsRes.status === 'fulfilled') setProducts(productsRes.value.data.products || []);
      if (calcRes.status === 'fulfilled') setCalculator(calcRes.value.data);
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value.data);
      if (depsRes.status === 'fulfilled') setDependents(depsRes.value.data.dependents || []);
      if (plansRes.status === 'fulfilled') {
        const list = plansRes.value.data.plans || [];
        setPlans(list);
        setSavedIds(new Set(list.map((p) => p.itemId?._id || p.itemId)));
      }
    } catch (error) {
      console.error('Failed to load insurance overview:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [includeFamily]);

  // Rank insurance products against the user's real profile (age, occupation,
  // income, family) plus their recommended cover amounts; show the top 4 so the
  // overview feed leads with the policies that suit this user best.
  const rankedProducts = useMemo(() => {
    return rankInsuranceProducts(products, calculator, user, calculator?.dependents).slice(0, 4);
  }, [products, calculator, user]);

  const topSchemes = schemes.slice(0, 4);

  // Interleave the two feeds: scheme, product, scheme, product...
  const feed = [];
  const maxLen = Math.max(topSchemes.length, rankedProducts.length);
  for (let i = 0; i < maxLen; i += 1) {
    if (topSchemes[i]) feed.push({ kind: 'scheme', ...topSchemes[i] });
    if (rankedProducts[i]) feed.push({ kind: 'insurance', ...rankedProducts[i] });
  }

  const handleSave = async (e, itemType, itemId) => {
    e.stopPropagation();
    setSavingIds((prev) => new Set([...prev, itemId]));
    try {
      await api.post('/saved-plans', { itemType, itemId, status: 'interested' });
      setSavedIds((prev) => new Set([...prev, itemId]));
    } catch (error) {
      console.error('Failed to save plan:', error);
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const efProgressPct =
    health?.factors?.emergencyFundProgress !== undefined
      ? Math.round(health.factors.emergencyFundProgress * 100)
      : null;
  const healthScore = health?.score ?? null;
  const scoreColor =
    healthScore >= 70 ? 'text-emerald-400' : healthScore >= 40 ? 'text-amber-400' : 'text-red-400';

  // Summary stats for the overview cards (saved plans + scheme matches)
  const savedSummary = useMemo(() => {
    const summary = { interested: 0, applied: 0, active: 0 };
    (plans || []).forEach((p) => {
      if (summary[p.status] !== undefined) summary[p.status] += 1;
    });
    return summary;
  }, [plans]);
  const matchedSchemeCount = schemes.length;
  const highMatchCount = schemes.filter((s) => s.matchScore >= 70).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-accent-start" size={24} />
            Insurance & Schemes Overview
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            A personalized feed — matched from your real financial data, not a static checklist.
          </p>
        </div>
        <button
          onClick={toggleFamily}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all duration-200 ${
            includeFamily
              ? 'bg-gradient-accent text-white border-transparent shadow-glow'
              : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
          }`}
        >
          <Users size={15} />
          Include family
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full ${
              includeFamily ? 'bg-white/20' : 'bg-white/10 text-gray-500'
            }`}
          >
            {includeFamily ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {/* Quick health strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Financial Health Score
          </p>
          {loading ? (
            <Skeleton className="h-9 w-20" />
          ) : (
            <p className={`text-3xl font-extrabold ${scoreColor}`}>
              {healthScore ?? '—'}
              <span className="text-sm text-gray-500 font-medium">/100</span>
            </p>
          )}
        </div>

        <div className="glass-card p-5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Emergency Fund
          </p>
          {loading ? (
            <Skeleton className="h-9 w-24" />
          ) : (
            <>
              <p className="text-3xl font-extrabold text-white">{efProgressPct ?? 0}%</p>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-accent transition-all duration-500"
                  style={{ width: `${efProgressPct ?? 0}%` }}
                />
              </div>
            </>
          )}
        </div>

        <div className="glass-card p-5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Heart size={11} className="text-emerald-400" /> Recommended Health Cover
          </p>
          {loading ? (
            <Skeleton className="h-9 w-24" />
          ) : (
            <p className="text-3xl font-extrabold text-white">
              {calculator ? inrLakhs(calculator.health.amount) : '—'}
            </p>
          )}
        </div>

        <div className="glass-card p-5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Shield size={11} className="text-sky-400" /> Recommended Term Life
          </p>
          {loading ? (
            <Skeleton className="h-9 w-24" />
          ) : (
            <p className="text-3xl font-extrabold text-white">
              {calculator ? inrLakhs(calculator.life.amount) : '—'}
            </p>
          )}
        </div>
      </div>

{/* Insurance & scheme details of the user — profile, coverage needs, summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User's insurance profile */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2 pb-2 border-b border-white/5">
            <User size={16} className="text-accent-start" /> Your Insurance Profile
          </h3>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <CalendarDays size={14} /> Age
              </span>
              <strong className="text-white">{user?.age ?? '—'} yrs</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Briefcase size={14} /> Occupation
              </span>
              <strong className="text-white capitalize">
                {user?.occupationType || '—'}
                {user?.sector ? ` · ${user.sector}` : ''}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Wallet size={14} /> Income / month
              </span>
              <strong className="text-white">
                {user
                  ? `₹${(user.monthlyIncome || user.monthlyAllowance || 0).toLocaleString('en-IN')}`
                  : '—'}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <MapPin size={14} /> Region
              </span>
              <strong className="text-white">{user?.region || 'All India'}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Users size={14} /> Family members
              </span>
              <strong className="text-white">
                {dependents.length} dependent{dependents.length === 1 ? '' : 's'}
              </strong>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Link
              to="/insurance/family"
              className="btn-secondary flex-1 py-2 text-xs text-center font-semibold"
            >
              Manage Family
            </Link>
            <Link
              to="/insurance/my-plans"
              className="btn-secondary flex-1 py-2 text-xs text-center font-semibold"
            >
              My Plans
            </Link>
          </div>
        </div>

        {/* Recommended coverage needs */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2 pb-2 border-b border-white/5">
            <ShieldCheck size={16} className="text-accent-start" /> Recommended Coverage Needs
          </h3>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Heart size={13} className="text-emerald-400" /> Health cover
                </span>
                <strong className="text-white">
                  {calculator ? inrLakhs(calculator.health.amount) : '—'}
                </strong>
              </div>
              {calculator && (
                <ul className="mt-2 space-y-1">
                  {calculator.health.breakdown.slice(0, 3).map((line, idx) => (
                    <li key={idx} className="text-[10px] text-gray-500 flex gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                      <span className="line-clamp-1">{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Shield size={13} className="text-sky-400" /> Term life cover
                </span>
                <strong className="text-white">
                  {calculator ? inrLakhs(calculator.life.amount) : '—'}
                </strong>
              </div>
              {calculator && (
                <ul className="mt-2 space-y-1">
                  {calculator.life.breakdown.slice(0, 3).map((line, idx) => (
                    <li key={idx} className="text-[10px] text-gray-500 flex gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-sky-400 shrink-0 mt-1.5" />
                      <span className="line-clamp-1">{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <Link
            to="/insurance/calculator"
            className="btn-secondary py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            Open Coverage Calculator <ArrowRight size={13} />
          </Link>
        </div>
{/* User's insurance summary */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2 pb-2 border-b border-white/5">
            <BookmarkCheck size={16} className="text-accent-start" /> Your Coverage Summary
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-2xl font-extrabold text-white">{matchedSchemeCount}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">
                Matching Schemes
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-2xl font-extrabold text-emerald-400">{highMatchCount}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">
                High Match (≥70%)
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-2xl font-extrabold text-white">{savedSummary.interested}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">
                Saved / Interested
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-2xl font-extrabold text-sky-400">{savedSummary.active}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">
                Active Policies
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/insurance/schemes"
              className="btn-secondary flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1"
            >
              <Landmark size={13} /> Schemes
            </Link>
            <Link
              to="/insurance/products"
              className="btn-secondary flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1"
            >
              <ShieldCheck size={13} /> Insurance
            </Link>
          </div>
        </div>
      </div>
      {/* Urgency banner — FINNOVA's differentiator made visible */}
      {!loading && efProgressPct !== null && efProgressPct < 50 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Low safety net detected: </span>
            Your emergency fund is only {efProgressPct}% funded. FINNOVA has ranked health &
            accident protection higher in your feed below, because that protective layer matters
            most before investment-linked plans.
          </div>
        </div>
      )}

      {/* Personalized combined feed */}
      <div className="flex items-center justify-between gap-4 mt-2 flex-wrap">
        <h2 className="text-lg font-bold text-white">Recommended for you</h2>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Landmark size={12} className="text-purple-400" /> Govt Schemes
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-sky-400" /> Private Insurance
          </span>
          <Link
            to="/insurance/schemes"
            className="text-accent-start hover:text-accent-end transition-colors flex items-center gap-1"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : feed.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Sparkles size={36} className="mx-auto mb-4 text-gray-600" />
          <h3 className="text-white font-medium text-lg mb-1">Nothing to recommend yet</h3>
          <p className="text-sm text-gray-500">
            Add your income and region in your profile, then check back — this feed personalizes itself.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {feed.map((item, idx) => {
            const isScheme = item.kind === 'scheme';
            const isSaved = savedIds.has(item._id);
            const isSaving = savingIds.has(item._id);
            const detailPath = isScheme
              ? `/insurance/schemes/${item._id}`
              : `/insurance/products/${item._id}`;

            return (
              <div
                key={`${item.kind}-${item._id}-${idx}`}
                onClick={() => navigate(detailPath)}
                className="glass-card p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-300 group cursor-pointer relative overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 items-center mb-3">
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-extrabold ${
                      isScheme
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/20'
                        : 'bg-sky-500/20 text-sky-300 border-sky-500/20'
                    }`}
                  >
                    {isScheme ? 'Government Scheme' : 'Private Insurance'}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full border capitalize font-medium ${categoryColor(
                      item.category
                    )}`}
                  >
                    {item.category === 'crop' ? 'agriculture' : item.category.replace('_', ' ')}
                  </span>
                  {!isScheme ? (
                    <span className="ml-auto text-xs font-bold text-accent-end">
                      {item.claimSettlementRatio}% claim ratio
                    </span>
                  ) : (
                    typeof item.matchScore === 'number' && (
                      <span
                        className={`ml-auto text-xs font-bold ${
                          item.matchScore >= 70 ? 'text-emerald-400' : 'text-gray-400'
                        }`}
                      >
                        {item.matchScore}% match
                      </span>
                    )
                  )}
                </div>

                <div className="text-[10px] font-bold text-accent-start uppercase tracking-wider mb-1">
                  {isScheme ? item.issuer : item.insurer}
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-accent-start transition-colors leading-snug line-clamp-1">
                  {item.name}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 mb-3">
                  {isScheme ? item.shortDescription : item.reason || item.shortDescription}
                </p>

                <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] font-semibold text-accent-start uppercase tracking-wider mb-1">
                    Why this fits you
                  </div>
                  <p className="text-xs text-gray-300 flex items-start gap-2">
                    <CheckCircle size={13} className="text-accent-end shrink-0 mt-0.5" />
                    <span className="line-clamp-1">
                      {isScheme ? item.matchedReasons?.[0] || item.shortDescription : item.reason}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-white/5 mt-4">
                  <button className="btn-secondary flex-1 py-2 text-xs text-center font-semibold">
                    View Details
                  </button>
                  <button
                    onClick={(e) => handleSave(e, isScheme ? 'scheme' : 'insurance', item._id)}
                    disabled={isSaved || isSaving}
                    className={`flex-1 py-2 rounded-full font-semibold text-xs transition-all duration-200 border flex items-center justify-center gap-1.5 ${
                      isSaved
                        ? 'bg-white/5 text-gray-400 border-white/10 cursor-default'
                        : 'bg-gradient-accent text-white border-transparent hover:opacity-90 shadow-glow disabled:opacity-50'
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : isSaved ? (
                      <span>Saved</span>
                    ) : (
                      <>
                        <Bookmark size={11} /> Save
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InsuranceOverview;
