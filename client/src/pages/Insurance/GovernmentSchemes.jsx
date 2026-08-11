import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Landmark, CheckCircle, HelpCircle, Loader2, Sparkles, Users } from 'lucide-react';
import api from '../../services/api.js';
import Skeleton from '../../components/ui/Skeleton.jsx';

const GovernmentSchemes = () => {
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedOccupation, setSelectedOccupation] = useState('');

  // Saved plan feedback
  const [savingIds, setSavingIds] = useState(new Set());
  const [savedIds, setSavedIds] = useState(new Set());

  // Family inclusion toggle (D9): when ON, scoring runs per-dependent too and
  // family-matched reasons bubble up alongside the user's own matches.
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

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      // Fetch user's matching/recommended schemes
      const res = await api.get(`/schemes/recommended?includeFamily=${includeFamily}`);
      setSchemes(res.data.schemes);

      // Fetch user's saved plans to highlight already saved ones
      const plansRes = await api.get('/saved-plans');
      const saved = new Set(
        plansRes.data.plans
          .filter((p) => p.itemType === 'scheme')
          .map((p) => p.itemId?._id || p.itemId)
      );
      setSavedIds(saved);
    } catch (error) {
      console.error('Failed to fetch schemes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, [includeFamily]);

  const handleSaveToPlans = async (schemeId) => {
    setSavingIds((prev) => new Set([...prev, schemeId]));
    try {
      await api.post('/saved-plans', {
        itemType: 'scheme',
        itemId: schemeId,
        status: 'interested',
      });
      setSavedIds((prev) => new Set([...prev, schemeId]));
    } catch (error) {
      console.error('Failed to save scheme:', error);
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(schemeId);
        return next;
      });
    }
  };

  // Perform client-side filtering on top of calculated match scores for a dynamic experience
  const filteredSchemes = schemes.filter((scheme) => {
    const matchesSearch =
      scheme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scheme.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || scheme.category === selectedCategory;
    const matchesState =
      !selectedState ||
      scheme.eligibility.applicableStates.some(
        (s) => s.toLowerCase() === 'any' || s.toLowerCase() === selectedState.toLowerCase()
      );
    const matchesOccupation =
      !selectedOccupation ||
      scheme.eligibility.occupation.some(
        (o) => o.toLowerCase() === 'any' || o.toLowerCase() === selectedOccupation.toLowerCase()
      );

    return matchesSearch && matchesCategory && matchesState && matchesOccupation;
  });

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'health':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'life':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'pension':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'crop':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'accident':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'education':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'housing':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Landmark className="text-accent-start" size={24} />
            Government Welfare Schemes
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Explore Indian central and state welfare initiatives matching your demographics and family setup.
          </p>
        </div>

        {/* Include family toggle */}
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

      {/* Filters bar */}
      <div className="glass-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search schemes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="input-field cursor-pointer"
        >
          <option value="">All Categories</option>
          <option value="health">Health & Medical</option>
          <option value="life">Life Insurance</option>
          <option value="pension">Pension & Retirement</option>
          <option value="crop">Crop & Agriculture</option>
          <option value="accident">Accident Cover</option>
          <option value="education">Education & Scholarship</option>
          <option value="housing">Housing & Infrastructure</option>
          <option value="other">Other Benefits</option>
        </select>

        {/* Geography / State Filter */}
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="input-field cursor-pointer"
        >
          <option value="">All States</option>
          <option value="Tamil Nadu">Tamil Nadu</option>
          <option value="Karnataka">Karnataka</option>
          <option value="Telangana">Telangana</option>
          <option value="Madhya Pradesh">Madhya Pradesh</option>
          <option value="West Bengal">West Bengal</option>
          <option value="Maharashtra">Maharashtra</option>
          <option value="Gujarat">Gujarat</option>
          <option value="Odisha">Odisha</option>
        </select>

        {/* Occupation Filter */}
        <select
          value={selectedOccupation}
          onChange={(e) => setSelectedOccupation(e.target.value)}
          className="input-field cursor-pointer"
        >
          <option value="">All Occupations</option>
          <option value="student">Student</option>
          <option value="farmer">Farmer</option>
          <option value="professional">Professional</option>
        </select>
      </div>

      {/* Main Catalog Rendering */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-60" />
          ))}
        </div>
      ) : filteredSchemes.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-500">
          <HelpCircle size={40} className="mx-auto mb-4 text-gray-600" />
          <h3 className="text-white font-medium text-lg mb-1">No schemes found</h3>
          <p className="text-sm">Try broadening your search keywords or adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSchemes.map((scheme) => {
            const isHighMatch = scheme.matchScore >= 70;
            const isSaved = savedIds.has(scheme._id);
            const isSaving = savingIds.has(scheme._id);

            return (
              <div
                key={scheme._id}
                className={`glass-card p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-300 relative group overflow-hidden ${
                  isHighMatch ? 'border-accent-start/30 bg-gradient-to-br from-accent-start/5 to-white/5' : ''
                }`}
              >
                {/* Glowing border effect for high matches */}
                {isHighMatch && (
                  <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-xl bg-gradient-accent text-white text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 shadow-glow z-10">
                    <Sparkles size={10} /> Highly Eligible ({scheme.matchScore}%)
                  </div>
                )}

                <div>
                  <div className="flex flex-wrap gap-2 items-center mb-3">
                    <span className="text-xs px-2.5 py-0.5 rounded-full border bg-white/5 text-gray-300 font-medium">
                      {scheme.issuer}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full border capitalize font-medium ${getCategoryColor(
                        scheme.category
                      )}`}
                    >
                      {scheme.category === 'crop' ? 'agriculture' : scheme.category}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-accent-start transition-colors pr-12 line-clamp-1">
                    {scheme.name}
                  </h3>

                  <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
                    {scheme.shortDescription}
                  </p>

                  {/* Recommendation Reasons */}
                  {scheme.matchedReasons && scheme.matchedReasons.length > 0 && (
                    <div className="mb-6 space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="text-[10px] font-semibold text-accent-start uppercase tracking-wider mb-1">
                        Recommendation logic:
                      </div>
                      {scheme.matchedReasons.slice(0, 2).map((reason, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                          <CheckCircle size={14} className="text-accent-end shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{reason}</span>
                        </div>
                      ))}
                      {scheme.matchedReasons.length > 2 && (
                        <div className="text-[10px] text-gray-500 pl-5">
                          + {scheme.matchedReasons.length - 2} more criteria met
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <button
                    onClick={() => navigate(`/insurance/schemes/${scheme._id}`)}
                    className="btn-secondary flex-1 py-2 text-xs text-center font-semibold"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleSaveToPlans(scheme._id)}
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
                      <span>Save to Plans</span>
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

export default GovernmentSchemes;
