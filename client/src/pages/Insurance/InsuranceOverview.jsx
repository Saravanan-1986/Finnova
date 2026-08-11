import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, ShieldCheck, Heart, Shield, Users, Sparkles, AlertTriangle, Loader2, Bookmark, CheckCircle } from 'lucide-react';
import api from '../../services/api.js';
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

const inrLakhs = (amount) => `₹${(Number(amount || 0) / 100000).toFixed(0)}L`;

const InsuranceOverview = () => {
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState([]);
  const [products, setProducts] = useState([]);
  const [calculator, setCalculator] = useState(null);
  const [health, setHealth] = useState(null);
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
    try {
      const [schemesRes, productsRes, calcRes, healthRes, plansRes] = await Promise.all([
        api.get(`/schemes/recommended?includeFamily=${includeFamily}`),
        api.get('/insurance-products'),
        api.get('/insurance/coverage-calculator'),
        api.get('/financial-health-score'),
        api.get('/saved-plans'),
      ]);
      setSchemes(schemesRes.data.schemes || []);
      setProducts(productsRes.data.products || []);
      setCalculator(calcRes.data);
      setHealth(healthRes.data);
      const saved = new Set((plansRes.data.plans || []).map((p) => p.itemId?._id || p.itemId));
      setSavedIds(saved);
    } catch (error) {
      console.error('Failed to load insurance overview:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [includeFamily]);

  // Rank insurance products against the user's recommended cover amounts,
  // mirroring the "Recommended: ₹10L — this plan offers up to ₹15L" story.
  const rankedProducts = useMemo(() => {
    if (!calculator || products.length === 0) return [];
    return products
      .map((p) => {
        const tiers = [...p.coverTiers].sort((a, b) => a.coverAmount - b.coverAmount);
        const maxTier = tiers[tiers.length - 1]?.coverAmount || 0;
        const target =
          p.category === 'health'
            ? calculator.health?.amount
            : p.category === 'term_life'
            ? calculator.life?.amount
            : 0;
        const nearest = target > 0 ? tiers.find((t) => t.coverAmount >= target) : null;
        const csr = p.claimSettlementRatio || 0;

        let score = 35;
        let reason = '';
        if (p.category === 'health') {
          reason = nearest
            ? `Recommended ${inrLakhs(target)} cover — this plan offers up to ${inrLakhs(nearest.coverAmount)}`
            : `Offers up to ${inrLakhs(maxTier)} health cover`;
          score += nearest ? 25 : 10;
        } else if (p.category === 'term_life') {
          reason = nearest
            ? `Your recommended life cover is ${inrLakhs(target)} — this plan provides up to ${inrLakhs(nearest.coverAmount)}`
            : `Family income protection up to ${inrLakhs(maxTier)}`;
          score += nearest ? 25 : 10;
        } else if (p.category === 'accident') {
          reason = `High claim settlement (${csr}%) for accidental death & disability`;
          score += 12;
        } else {
          reason = `Vehicle cover with a ${csr}% claim settlement ratio`;
          score += 8;
        }
        if (p.category === 'health' || p.category === 'term_life') score += csr / 10;
        return { ...p, rank: Math.min(100, Math.round(score)), reason };
      })
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 4);
  }, [products, calculator]);

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
      <div className="flex items-center justify-between mt-2">
        <h2 className="text-lg font-bold text-white">Recommended for you</h2>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Landmark size={12} className="text-purple-400" /> Govt Schemes
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-sky-400" /> Private Insurance
          </span>
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
                    item.matchScore >= 70 && (
                      <span className="ml-auto text-xs font-bold text-emerald-400">
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
