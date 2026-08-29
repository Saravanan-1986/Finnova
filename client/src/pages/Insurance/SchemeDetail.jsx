import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Bookmark, CheckCircle, FileText, ListOrdered, Award, Sparkles, Loader2, Send } from 'lucide-react';
import api from '../../services/api.js';
import Skeleton from '../../components/ui/Skeleton.jsx';

const SchemeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scheme, setScheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const fetchSchemeDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/schemes/${id}`);
      setScheme(res.data.scheme);

      const plansRes = await api.get('/saved-plans');
      const saved = plansRes.data.plans.some(
        (p) => p.itemType === 'scheme' && (p.itemId?._id === id || p.itemId === id)
      );
      setIsSaved(saved);
    } catch (error) {
      console.error('Failed to fetch scheme details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemeDetails();
  }, [id]);

  const handleSaveToPlans = async () => {
    setSaving(true);
    try {
      await api.post('/saved-plans', {
        itemType: 'scheme',
        itemId: id,
        status: 'interested',
      });
      setIsSaved(true);
    } catch (error) {
      console.error('Failed to save scheme:', error);
    } finally {
      setSaving(false);
    }
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'health':
        return 'Health Cover';
      case 'life':
        return 'Life Insurance';
      case 'pension':
        return 'Pension & Retirement';
      case 'crop':
        return 'Crop Insurance';
      case 'accident':
        return 'Accidental Cover';
      case 'education':
        return 'Education & Merit';
      case 'housing':
        return 'Housing & Subsidy';
      default:
        return 'Welfare Program';
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

  if (!scheme) {
    return (
      <div className="text-center py-12 glass-card">
        <p className="text-gray-400 text-lg">Scheme not found.</p>
        <button onClick={() => navigate('/insurance/schemes')} className="btn-primary mt-4">
          Back to Schemes
        </button>
      </div>
    );
  }

  const isHighMatch = scheme.matchScore >= 70;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button & Action buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/insurance/schemes')}
          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={16} />
          Back to Schemes
        </button>

        <div className="flex gap-3">
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
                Saved to Plans
              </>
            ) : (
              <>
                <Bookmark size={12} />
                Save to My Plans
              </>
            )}
          </button>

          {scheme.applyOnline && scheme.applyLink && (
            <a
              href={scheme.applyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary py-2 px-4 text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 shadow-glow"
            >
              <Send size={12} />
              Apply Online
            </a>
          )}

          <a
            href={scheme.officialLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary py-2 px-4 text-xs font-semibold flex items-center gap-1.5 hover:bg-white/15"
          >
            <ExternalLink size={12} />
            Official Portal
          </a>
        </div>
      </div>

      {/* Scheme Header card */}
      <div className="glass-card p-6 md:p-8 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs px-2.5 py-0.5 rounded-full border bg-white/5 text-gray-300 font-medium">
            {scheme.issuer} Government
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full border bg-accent-start/20 text-accent-start border-accent-start/30 font-medium capitalize">
            {getCategoryLabel(scheme.category)}
          </span>
        </div>

        {/* Online application status */}
        <div className="flex flex-wrap gap-2 items-center">
          {scheme.applyOnline && scheme.applyLink ? (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
              <CheckCircle size={13} /> Online application available — use the "Apply Online" button above
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 font-medium">
              Applied offline — follow the "How to Apply" steps below
            </span>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
          {scheme.name}
        </h1>

        <p className="text-gray-300 text-sm md:text-base leading-relaxed">
          {scheme.fullDescription}
        </p>
      </div>

      {/* Why Recommended Logic box */}
      {scheme.matchedReasons && scheme.matchedReasons.length > 0 && (
        <div
          className={`glass-card p-6 relative overflow-hidden border-l-4 ${
            isHighMatch ? 'border-l-accent-start bg-gradient-to-r from-accent-start/5 to-white/5' : 'border-l-gray-600'
          }`}
        >
          <div className="flex items-center gap-2 text-white font-bold text-base mb-4">
            <Sparkles className="text-accent-start" size={18} />
            <h3>Why Recommended for You</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-accent-start/20 text-accent-start border border-accent-start/30 ml-auto">
              Match score: {scheme.matchScore}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {scheme.matchedReasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-sm text-gray-300">
                <CheckCircle size={16} className="text-accent-end shrink-0 mt-0.5" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Core details tabbed/grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Benefits & Perks */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2 pb-2 border-b border-white/5">
            <Award size={18} className="text-accent-start" />
            Key Benefits & Incentives
          </h3>
          <ul className="space-y-3">
            {scheme.benefits.map((benefit, idx) => (
              <li key={idx} className="text-sm text-gray-300 leading-relaxed flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-start shrink-0 mt-2" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Eligibility Checkbox Criteria */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2 pb-2 border-b border-white/5">
            <CheckCircle size={18} className="text-accent-end" />
            Eligibility Requirements
          </h3>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-center justify-between py-1 border-b border-white/5">
              <span>Age Band Allowed:</span>
              <strong className="text-white">
                {scheme.eligibility.minAge} to {scheme.eligibility.maxAge} years
              </strong>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-white/5">
              <span>Gender Requirement:</span>
              <strong className="text-white capitalize">
                {scheme.eligibility.gender === 'any' ? 'open to all' : scheme.eligibility.gender}
              </strong>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-white/5">
              <span>Household Annual Income Limit:</span>
              <strong className="text-white">
                {scheme.eligibility.maxIncome >= 999999999
                  ? 'No maximum limit'
                  : `Below ₹${(scheme.eligibility.maxIncome / 100000).toFixed(1)} Lakhs/yr`}
              </strong>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-white/5">
              <span>Suitable Occupations:</span>
              <strong className="text-white capitalize truncate max-w-[200px]">
                {scheme.eligibility.occupation.join(', ')}
              </strong>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>Applicable Regions:</span>
              <strong className="text-white truncate max-w-[200px]">
                {scheme.eligibility.applicableStates.join(', ')}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Required Documents */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2 pb-2 border-b border-white/5">
            <FileText size={18} className="text-accent-end" />
            Documents Needed
          </h3>
          <ul className="space-y-3">
            {scheme.documentsRequired.map((doc, idx) => (
              <li key={idx} className="text-sm text-gray-300 leading-relaxed flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-end shrink-0 mt-2" />
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Application Steps */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2 pb-2 border-b border-white/5">
            <ListOrdered size={18} className="text-accent-start" />
            How to Apply
          </h3>
          <ol className="space-y-3">
            {scheme.applicationSteps.map((step, idx) => (
              <li key={idx} className="text-sm text-gray-300 leading-relaxed flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-accent-start/20 border border-accent-start/30 text-accent-start text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SchemeDetail;
