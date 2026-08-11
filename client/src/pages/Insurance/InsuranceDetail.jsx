import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Bookmark, CheckCircle, Award, ShieldCheck, XCircle, AlertTriangle, Scale, Loader2 } from 'lucide-react';
import api from '../../services/api.js';
import Skeleton from '../../components/ui/Skeleton.jsx';

const InsuranceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [calculator, setCalculator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isCompared, setIsCompared] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch product details
      const res = await api.get(`/insurance-products/${id}`);
      setProduct(res.data.product);

      // 2. Fetch calculator recommendations
      const calcRes = await api.get('/insurance/coverage-calculator');
      setCalculator(calcRes.data);

      // 3. Check if saved to Plans
      const plansRes = await api.get('/saved-plans');
      const saved = plansRes.data.plans.some(
        (p) => p.itemType === 'insurance' && (p.itemId?._id === id || p.itemId === id)
      );
      setIsSaved(saved);
    } catch (error) {
      console.error('Failed to fetch product details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleSaveToPlans = async () => {
    setSaving(true);
    try {
      await api.post('/saved-plans', {
        itemType: 'insurance',
        itemId: id,
        status: 'interested',
      });
      setIsSaved(true);
    } catch (error) {
      console.error('Failed to save insurance product:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="w-1/3 h-8" />
        </div>
        <Skeleton className="h-60" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12 glass-card">
        <p className="text-gray-400 text-lg">Product not found.</p>
        <button onClick={() => navigate('/insurance/products')} className="btn-primary mt-4">
          Back to Policies
        </button>
      </div>
    );
  }

  // Determine user's target recommendation cover
  let targetCover = 0;
  if (calculator) {
    if (product.category === 'health') {
      targetCover = calculator.health.amount;
    } else if (product.category === 'term_life') {
      targetCover = calculator.life.amount;
    }
  }

  // Check which tier matches or is closest to target cover
  const getTierHighlightStatus = (coverAmount) => {
    if (targetCover <= 0) return false;
    // Highlight the closest tier that is >= targetCover, or the largest tier if all are smaller
    const sortedTiers = [...product.coverTiers].sort((a, b) => a.coverAmount - b.coverAmount);
    const matchingTier = sortedTiers.find((t) => t.coverAmount >= targetCover);
    if (matchingTier) {
      return matchingTier.coverAmount === coverAmount;
    }
    return sortedTiers[sortedTiers.length - 1]?.coverAmount === coverAmount;
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'health':
        return 'Health Floater';
      case 'term_life':
        return 'Term Life';
      case 'vehicle':
        return 'Comprehensive Vehicle';
      case 'accident':
        return 'Personal Accident';
      default:
        return 'Insurance Policy';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button & Action buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/insurance/products')}
          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={16} />
          Back to Policies
        </button>

        <div className="flex items-center gap-3">
          {/* Add to Compare Toggle */}
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 cursor-pointer hover:bg-white/10 transition-all select-none">
            <input
              type="checkbox"
              checked={isCompared}
              onChange={() => setIsCompared(!isCompared)}
              className="rounded border-white/20 bg-transparent text-accent-start focus:ring-0"
            />
            <Scale size={12} className="text-accent-end" />
            Add to Compare
          </label>

          <button
            onClick={handleSaveToPlans}
            disabled={isSaved || saving}
            className={`px-4 py-2 rounded-full font-semibold text-xs border flex items-center gap-1.5 transition-all ${
              isSaved
                ? 'bg-white/5 text-gray-400 border-white/10 cursor-default'
                : 'bg-gradient-accent text-white border-transparent hover:opacity-90 shadow-glow disabled:opacity-50'
            }`}
          >
            {saving ? (
              <Loader2 size={12} className="animate-spin" />
            ) : isSaved ? (
              <>
                <CheckCircle size={12} />
                Saved
              </>
            ) : (
              <>
                <Bookmark size={12} />
                Save to My Plans
              </>
            )}
          </button>

          <a
            href={product.officialLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary py-2 px-4 text-xs font-semibold flex items-center gap-1.5 hover:bg-white/15"
          >
            <ExternalLink size={12} />
            Insurer Site
          </a>
        </div>
      </div>

      {/* Product Summary Header */}
      <div className="glass-card p-6 md:p-8 space-y-4 relative overflow-hidden">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs px-2.5 py-0.5 rounded-full border bg-white/5 text-gray-300 font-semibold tracking-wide">
            {product.insurer}
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full border bg-accent-start/20 text-accent-start border-accent-start/30 font-medium capitalize">
            {getCategoryLabel(product.category)}
          </span>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
            {product.name}
          </h1>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
            <div className="text-right">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">
                Claim Ratio (CSR)
              </span>
              <span className="text-lg font-black text-accent-end">
                {product.claimSettlementRatio}%
              </span>
            </div>
          </div>
        </div>

        <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-3xl">
          {product.shortDescription}
        </p>
      </div>

      {/* Cover Tiers Table */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2 pb-2 border-b border-white/5">
          <Award size={18} className="text-accent-start" />
          Coverage Tiers & indicative Premiums
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs font-bold text-gray-400">
                <th className="py-3 px-4">Coverage Amount (Sum Insured)</th>
                <th className="py-3 px-4">Indicative Annual Premium</th>
                <th className="py-3 px-4 text-right">Recommendation Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {product.coverTiers.map((tier, idx) => {
                const isRecommended = getTierHighlightStatus(tier.coverAmount);

                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isRecommended
                        ? 'bg-accent-start/10 text-white font-semibold'
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <td className="py-4 px-4 font-bold">
                      ₹{tier.coverAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-4">
                      ₹{tier.indicativeAnnualPremium.toLocaleString('en-IN')} / year
                    </td>
                    <td className="py-4 px-4 text-right">
                      {isRecommended ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-accent-start text-white shadow-glow uppercase tracking-wider">
                          Best Match Target
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inclusions vs Exclusions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inclusions */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold text-emerald-400 text-base flex items-center gap-2 pb-2 border-b border-emerald-500/10">
            <ShieldCheck size={18} className="text-emerald-400" />
            What is Covered (Inclusions)
          </h3>
          <ul className="space-y-3">
            {product.inclusions.map((inc, idx) => (
              <li key={idx} className="text-sm text-gray-300 leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-2" />
                <span>{inc}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Exclusions */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold text-red-400 text-base flex items-center gap-2 pb-2 border-b border-red-500/10">
            <XCircle size={18} className="text-red-400" />
            What is NOT Covered (Exclusions)
          </h3>
          <ul className="space-y-3">
            {product.exclusions.map((exc, idx) => (
              <li key={idx} className="text-sm text-gray-300 leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-2" />
                <span>{exc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Key features & claim process steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Key Features */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2 pb-2 border-b border-white/5">
            <ShieldCheck size={18} className="text-accent-start" />
            Key Benefits & Riders
          </h3>
          <ul className="space-y-3">
            {product.keyFeatures.map((feat, idx) => (
              <li key={idx} className="text-sm text-gray-300 leading-relaxed flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-start shrink-0 mt-2" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Claim Process */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2 pb-2 border-b border-white/5">
            <Award size={18} className="text-accent-end" />
            Claim Settlements Guide
          </h3>
          <ol className="space-y-3">
            {product.claimProcess.map((step, idx) => (
              <li key={idx} className="text-sm text-gray-300 leading-relaxed flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-accent-end/20 border border-accent-end/30 text-accent-end text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Indicative Disclaimer */}
      <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs flex items-start gap-2">
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Indicative Premium Disclaimer: </span>
          The cover amounts and annual premium premiums displayed on this portal are indicative estimates for guidance purposes only. Actual policy covers, terms, and premiums are set by the respective insurance companies and depend on underwriting considerations like age, health, and medical history. Please verify terms directly with the insurer before buying.
        </div>
      </div>
    </div>
  );
};

export default InsuranceDetail;
