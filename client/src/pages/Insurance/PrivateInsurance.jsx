import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, Heart, Home, Car, AlertTriangle, ArrowRight, Loader2, Bookmark, CheckCircle, Sparkles } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { rankInsuranceProducts } from '../../utils/insuranceRanking.js';
import Skeleton from '../../components/ui/Skeleton.jsx';

const VALID_PRODUCT_CATEGORIES = ['health', 'term_life', 'vehicle', 'accident'];

const PrivateInsurance = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [calculator, setCalculator] = useState(null);
  const [loading, setLoading] = useState(true);
  // Default to "All Plans" so every insurance that suits the user is visible;
  // deep-links like /insurance/products?category=health (from the Coverage
  // Calculator) open on the matching tab instead.
  const [activeTab, setActiveTab] = useState(() => {
    const fromQuery = searchParams.get('category');
    return VALID_PRODUCT_CATEGORIES.includes(fromQuery) ? fromQuery : 'all';
  });

  // Feedback states
  const [savingIds, setSavingIds] = useState(new Set());
  const [savedIds, setSavedIds] = useState(new Set());

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch products
      const productsRes = await api.get('/insurance-products');
      setProducts(productsRes.data.products);

      // 2. Fetch coverage calculator recommendations
      const calcRes = await api.get('/insurance/coverage-calculator');
      setCalculator(calcRes.data);

      // 3. Fetch saved plans
      const plansRes = await api.get('/saved-plans');
      const saved = new Set(
        plansRes.data.plans
          .filter((p) => p.itemType === 'insurance')
          .map((p) => p.itemId?._id || p.itemId)
      );
      setSavedIds(saved);
    } catch (error) {
      console.error('Failed to fetch insurance products data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveToPlans = async (e, productId) => {
    e.stopPropagation(); // Avoid triggering card details click
    setSavingIds((prev) => new Set([...prev, productId]));
    try {
      await api.post('/saved-plans', {
        itemType: 'insurance',
        itemId: productId,
        status: 'interested',
      });
      setSavedIds((prev) => new Set([...prev, productId]));
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  // Rank every product against the user's real profile (age, occupation, income,
  // family size) plus the cover amounts the calculator recommends for them, so
  // the catalogue always leads with the policies that suit this user best.
  const rankedProducts = useMemo(() => {
    return rankInsuranceProducts(products, calculator, user, calculator?.dependents);
  }, [products, calculator, user]);

  // Filter products by tab (including an "All" tab)
  const filteredProducts =
    activeTab === 'all' ? rankedProducts : rankedProducts.filter((prod) => prod.category === activeTab);

  const getActiveRecommendation = () => {
    if (!calculator) return null;
    if (activeTab === 'health' || activeTab === 'all') {
      return {
        title: 'Health Coverage recommendation',
        amount: calculator.health.amount,
        breakdown: calculator.health.breakdown,
        icon: Heart,
        color: 'text-emerald-400 border-emerald-500/30',
      };
    } else if (activeTab === 'term_life') {
      return {
        title: 'Term Life Coverage recommendation',
        amount: calculator.life.amount,
        breakdown: calculator.life.breakdown,
        icon: Home,
        color: 'text-sky-400 border-sky-500/30',
      };
    }
    return null;
  };

  const activeRec = getActiveRecommendation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="text-accent-start" size={24} />
          Private Insurance Policies
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Ranked by how well each policy suits your profile — age, income, family, and your recommended cover amounts. Explore health, term life, vehicle, and accident covers from top insurers.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Plans', icon: Sparkles },
          { id: 'health', label: 'Health Insurance', icon: Heart },
          { id: 'term_life', label: 'Term Life Cover', icon: Home },
          { id: 'vehicle', label: 'Vehicle Insurance', icon: Car },
          { id: 'accident', label: 'Personal Accident', icon: ShieldAlert },
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
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dynamic Recommendation Banner */}
      {!loading && activeRec && (
        <div className="glass-card p-6 bg-gradient-to-r from-accent-start/5 to-white/5 border border-accent-start/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-accent-start">
              {activeRec.title}
            </h3>
            <div className="text-3xl font-extrabold text-white">
              ₹{activeRec.amount.toLocaleString('en-IN')}
            </div>
            <div className="space-y-1 pl-1">
              {activeRec.breakdown.map((line, idx) => (
                <p key={idx} className="text-xs text-gray-400 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-accent-end shrink-0" />
                  {line}
                </p>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hidden md:block">
            <activeRec.icon size={36} className="text-accent-end" />
          </div>
        </div>
      )}

      {/* Catalog Listings */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-500">
          <ShieldAlert size={40} className="mx-auto mb-4 text-gray-600" />
          <h3 className="text-white font-medium text-lg mb-1">No products listed</h3>
          <p className="text-sm">Check back soon, products in this category are being added.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((prod) => {
            const isSaved = savedIds.has(prod._id);
            const isSaving = savingIds.has(prod._id);

            return (
              <div
                key={prod._id}
                onClick={() => navigate(`/insurance/products/${prod._id}`)}
                className="glass-card p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-300 group cursor-pointer"
              >
                <div>
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-accent-start uppercase tracking-wider">
                        {prod.insurer}
                      </span>
                      <h3 className="text-lg font-bold text-white group-hover:text-accent-start transition-colors leading-snug line-clamp-1">
                        {prod.name}
                      </h3>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-gray-500 block">Claim Ratio</span>
                      <span className="text-sm font-extrabold text-accent-end">
                        {prod.claimSettlementRatio}%
                      </span>
                      {prod.rank !== undefined && (
                        <span className="mt-1 inline-block text-[10px] font-bold text-white bg-gradient-accent rounded-full px-2 py-0.5">
                          Match {prod.rank}%
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
                    {prod.shortDescription}
                  </p>

                  {prod.reason && (
                    <p className="text-xs text-accent-start bg-accent-start/10 border border-accent-start/20 rounded-lg px-3 py-2 mb-4 leading-relaxed">
                      {prod.reason}
                    </p>
                  )}

                  {/* Highlights of key features */}
                  <ul className="space-y-2 mb-6">
                    {(prod.keyFeatures || []).slice(0, 2).map((feat, idx) => (
                      <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-start shrink-0 mt-1.5" />
                        <span className="line-clamp-1">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Footer buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <span className="text-xs text-gray-400 flex items-center gap-1 group-hover:text-white transition-colors">
                    View Details
                    <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </span>

                  <button
                    onClick={(e) => handleSaveToPlans(e, prod._id)}
                    disabled={isSaved || isSaving}
                    className={`ml-auto py-1.5 px-3 rounded-full font-semibold text-[10px] transition-all duration-200 border flex items-center justify-center gap-1 ${
                      isSaved
                        ? 'bg-white/5 text-gray-400 border-white/10 cursor-default'
                        : 'bg-gradient-accent text-white border-transparent hover:opacity-90 shadow-glow disabled:opacity-50'
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : isSaved ? (
                      <>
                        <CheckCircle size={10} />
                        Saved
                      </>
                    ) : (
                      <>
                        <Bookmark size={10} />
                        Save
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mandatory Disclaimer Banner */}
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

export default PrivateInsurance;
