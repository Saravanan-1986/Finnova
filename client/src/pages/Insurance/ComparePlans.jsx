import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Scale, Trash2, ArrowLeft, Plus, AlertTriangle, Landmark, ShieldCheck, RefreshCw, HelpCircle, Loader2 } from 'lucide-react';
import api from '../../services/api.js';

const ComparePlans = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [savedPlans, setSavedPlans] = useState([]);
  const [comparedItems, setComparedItems] = useState([]);

  // Fetch all saved plans (both schemes and insurance products)
  const fetchCompareData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/saved-plans');
      const list = res.data.plans || [];
      // Extract the populated item details from the savedPlan
      const extractedItems = list.map((p) => {
        const detail = p.itemId || {};
        return {
          ...detail,
          itemType: p.itemType, // 'scheme' or 'insurance'
          savedPlanId: p._id,
        };
      });
      setSavedPlans(extractedItems);

      // Read selected IDs from URL parameters
      const idsParam = searchParams.get('ids') || '';
      const selectedIds = idsParam.split(',').filter((id) => id.trim() !== '');

      // Filter extracted saved items matching the URL list
      const matched = selectedIds
        .map((id) => extractedItems.find((item) => item._id === id))
        .filter((item) => !!item);
      
      setComparedItems(matched.slice(0, 3)); // Max 3 items
    } catch (error) {
      console.error('Failed to load compare parameters:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompareData();
  }, [searchParams]);

  const updateUrlIds = (items) => {
    const ids = items.map((item) => item._id).join(',');
    setSearchParams({ ids });
  };

  const handleRemoveFromCompare = (itemId) => {
    const nextItems = comparedItems.filter((item) => item._id !== itemId);
    setComparedItems(nextItems);
    updateUrlIds(nextItems);
  };

  const handleSelectSlotItem = (index, newItem) => {
    const nextItems = [...comparedItems];
    nextItems[index] = newItem;
    setComparedItems(nextItems);
    updateUrlIds(nextItems);
  };

  const handleAddSlotItem = (newItem) => {
    const nextItems = [...comparedItems, newItem];
    setComparedItems(nextItems);
    updateUrlIds(nextItems);
  };

  // Get list of saved plans that are NOT currently in the compare matrix
  const getAvailableOptions = () => {
    const comparedIds = new Set(comparedItems.map((item) => item._id));
    return savedPlans.filter((item) => !comparedIds.has(item._id));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-accent-start animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Loading comparison details...</p>
      </div>
    );
  }

  const columnsCount = Math.max(3, comparedItems.length); // Render at least 3 visual slots
  const availableOptions = getAvailableOptions();

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={16} />
          Go Back
        </button>

        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Scale className="text-accent-start" size={24} />
            Policy Compare Matrix
          </h1>
        </div>
      </div>

      {savedPlans.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-500">
          <HelpCircle size={40} className="mx-auto mb-4 text-gray-600" />
          <h3 className="text-white font-medium text-lg mb-1">No saved plans to compare</h3>
          <p className="text-sm mb-6">You need to save schemes or insurance policies to your plans list first before comparing.</p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => navigate('/insurance/schemes')} className="btn-primary">
              Browse Government Schemes
            </button>
            <button onClick={() => navigate('/insurance/products')} className="btn-secondary">
              Browse Private Policies
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Comparison Matrix Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 glass-card">
            <table className="w-full table-fixed min-w-[700px] border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  {/* Row headers column */}
                  <th className="py-4 px-6 text-left font-bold text-xs text-gray-400 uppercase tracking-wider w-1/4">
                    Comparison Criteria
                  </th>

                  {/* Columns for Compared Items */}
                  {[...Array(3)].map((_, idx) => {
                    const item = comparedItems[idx];
                    return (
                      <th key={idx} className="py-4 px-6 text-left font-semibold text-sm text-white w-1/4 border-l border-white/10 relative">
                        {item ? (
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[10px] font-bold text-accent-start uppercase tracking-wider truncate block">
                                {item.itemType === 'scheme' ? item.issuer : item.insurer}
                              </span>
                              <button
                                onClick={() => handleRemoveFromCompare(item._id)}
                                className="p-1 rounded-md text-gray-500 hover:text-red-400 hover:bg-white/5 transition-all"
                                title="Remove item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <h4 className="font-bold text-white line-clamp-1 pr-6" title={item.name}>
                              {item.name}
                            </h4>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <span className="text-xs text-gray-500 font-medium">Empty Slot</span>
                            {availableOptions.length > 0 ? (
                              <select
                                onChange={(e) => {
                                  const selectedVal = e.target.value;
                                  if (selectedVal) {
                                    const opt = availableOptions.find((x) => x._id === selectedVal);
                                    if (opt) handleAddSlotItem(opt);
                                  }
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-gray-300 focus:outline-none"
                              >
                                <option value="">+ Add to Compare</option>
                                {availableOptions.map((opt) => (
                                  <option key={opt._id} value={opt._id}>
                                    [{opt.itemType === 'scheme' ? 'Scheme' : 'Policy'}] {opt.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs text-gray-600 italic">No other saved plans</span>
                            )}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {/* 1. Category Row */}
                <tr className="hover:bg-white/5">
                  <td className="py-4 px-6 font-bold text-gray-400 text-xs uppercase tracking-wider">
                    Category
                  </td>
                  {[...Array(3)].map((_, idx) => {
                    const item = comparedItems[idx];
                    return (
                      <td key={idx} className="py-4 px-6 border-l border-white/10 text-gray-300 capitalize font-medium">
                        {item ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.itemType === 'scheme'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/20'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/20'
                          }`}>
                            {item.itemType === 'scheme' ? `Govt ${item.category}` : `Private ${item.category.replace('_', ' ')}`}
                          </span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* 2. Provider / Issuer */}
                <tr className="hover:bg-white/5">
                  <td className="py-4 px-6 font-bold text-gray-400 text-xs uppercase tracking-wider">
                    Provider / Issuer
                  </td>
                  {[...Array(3)].map((_, idx) => {
                    const item = comparedItems[idx];
                    return (
                      <td key={idx} className="py-4 px-6 border-l border-white/10 text-white font-semibold">
                        {item ? (item.itemType === 'scheme' ? `${item.issuer} Govt` : item.insurer) : <span className="text-gray-600">-</span>}
                      </td>
                    );
                  })}
                </tr>

                {/* 3. Short Description */}
                <tr className="hover:bg-white/5">
                  <td className="py-4 px-6 font-bold text-gray-400 text-xs uppercase tracking-wider">
                    Overview
                  </td>
                  {[...Array(3)].map((_, idx) => {
                    const item = comparedItems[idx];
                    return (
                      <td key={idx} className="py-4 px-6 border-l border-white/10 text-gray-400 text-xs leading-relaxed">
                        {item ? item.shortDescription : <span className="text-gray-600">-</span>}
                      </td>
                    );
                  })}
                </tr>

                {/* 4. Cost / Premiums / Tiers */}
                <tr className="hover:bg-white/5">
                  <td className="py-4 px-6 font-bold text-gray-400 text-xs uppercase tracking-wider">
                    Cost / Premiums
                  </td>
                  {[...Array(3)].map((_, idx) => {
                    const item = comparedItems[idx];
                    return (
                      <td key={idx} className="py-4 px-6 border-l border-white/10 text-gray-300">
                        {item ? (
                          item.itemType === 'scheme' ? (
                            <span className="text-emerald-400 font-semibold">Free / Fully Subsidized Welfare</span>
                          ) : (
                            <div className="space-y-1 text-xs">
                              {item.coverTiers.map((tier, tIdx) => (
                                <div key={tIdx} className="flex justify-between gap-2 border-b border-white/5 py-0.5">
                                  <span>Cover: ₹{(tier.coverAmount/100000).toFixed(0)}L</span>
                                  <strong className="text-white">₹{tier.indicativeAnnualPremium.toLocaleString('en-IN')}/yr</strong>
                                </div>
                              ))}
                            </div>
                          )
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* 5. Claim settlement or benefits count */}
                <tr className="hover:bg-white/5">
                  <td className="py-4 px-6 font-bold text-gray-400 text-xs uppercase tracking-wider">
                    Settlement / Perks
                  </td>
                  {[...Array(3)].map((_, idx) => {
                    const item = comparedItems[idx];
                    return (
                      <td key={idx} className="py-4 px-6 border-l border-white/10 text-gray-300">
                        {item ? (
                          item.itemType === 'scheme' ? (
                            <div className="space-y-1">
                              <span className="text-xs text-gray-500 font-semibold block">Benefits List count:</span>
                              <strong className="text-white">{item.benefits.length} core benefits</strong>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-xs text-gray-500 font-semibold block">Claim Settlement Ratio:</span>
                              <strong className="text-accent-end text-base">{item.claimSettlementRatio}%</strong>
                            </div>
                          )
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* 6. Inclusions & Features */}
                <tr className="hover:bg-white/5">
                  <td className="py-4 px-6 font-bold text-gray-400 text-xs uppercase tracking-wider">
                    Inclusions & Features
                  </td>
                  {[...Array(3)].map((_, idx) => {
                    const item = comparedItems[idx];
                    return (
                      <td key={idx} className="py-4 px-6 border-l border-white/10 text-xs text-gray-400 leading-relaxed">
                        {item ? (
                          item.itemType === 'scheme' ? (
                            <ul className="list-disc pl-4 space-y-1 text-gray-300">
                              {item.benefits.slice(0, 3).map((b, bIdx) => (
                                <li key={bIdx}>{b}</li>
                              ))}
                            </ul>
                          ) : (
                            <ul className="list-disc pl-4 space-y-1 text-gray-300">
                              {item.inclusions.slice(0, 3).map((inc, incIdx) => (
                                <li key={incIdx}>{inc}</li>
                              ))}
                            </ul>
                          )
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* 7. Exclusions / Eligibility checks */}
                <tr className="hover:bg-white/5">
                  <td className="py-4 px-6 font-bold text-gray-400 text-xs uppercase tracking-wider">
                    Eligibility / Exclusions
                  </td>
                  {[...Array(3)].map((_, idx) => {
                    const item = comparedItems[idx];
                    return (
                      <td key={idx} className="py-4 px-6 border-l border-white/10 text-xs text-gray-400 leading-relaxed">
                        {item ? (
                          item.itemType === 'scheme' ? (
                            <div className="space-y-1 text-gray-300">
                              <div>Ages: {item.eligibility.minAge}-{item.eligibility.maxAge} years</div>
                              <div>Gender: <span className="capitalize">{item.eligibility.gender}</span></div>
                              <div>Income Limit: {item.eligibility.maxIncome >= 999999999 ? 'None' : `₹${(item.eligibility.maxIncome/100000).toFixed(0)}L/yr`}</div>
                            </div>
                          ) : (
                            <ul className="list-disc pl-4 space-y-1 text-red-400/90">
                              {item.exclusions.slice(0, 3).map((ex, exIdx) => (
                                <li key={exIdx}>{ex}</li>
                              ))}
                            </ul>
                          )
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Indicative Premium Disclaimer Banner */}
          <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs flex items-start gap-2">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Indicative Premium Disclaimer: </span>
              The coverage amounts and annual premiums displayed in this comparison matrix are estimates for informational purposes. Actual terms, limits, and pricing are defined strictly by the insurers under medical underwriting policies. Please verify terms directly with the insurer prior to registration.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparePlans;
