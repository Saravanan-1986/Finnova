import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt,
  Upload,
  Camera,
  ScanLine,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Sparkles,
  History,
} from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getCurrencySymbol } from '../constants/categories.js';
import { processReceiptImage } from '../utils/receiptClarity.js';
import Skeleton from '../components/ui/Skeleton.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

// Derive the API origin (http://localhost:5000) from the axios baseURL.
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const ReceiptScanner = () => {
  const { user } = useAuth();
  const currency = getCurrencySymbol(user?.currency);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadBlob, setUploadBlob] = useState(null);
  const [fileName, setFileName] = useState('');
  const [clarity, setClarity] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [scanError, setScanError] = useState(null);

  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const fileInputRef = useRef(null);

  const fetchRecent = async () => {
    setRecentLoading(true);
    try {
      const res = await api.get('/receipts/recent');
      setRecent(res.data.expenses || []);
    } catch (error) {
      console.error('Failed to fetch recent receipt scans:', error);
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    fetchRecent();
  }, []);

  const resetScan = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadBlob(null);
    setFileName('');
    setClarity(null);
    setResult(null);
    setScanError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setScanError({ cannotExtract: false, message: 'Please choose an image file (JPG, PNG or WebP).' });
      return;
    }
    setResult(null);
    setScanError(null);
    try {
      const processed = await processReceiptImage(file);
      setPreviewUrl(processed.previewUrl);
      setUploadBlob(processed.blob);
      setFileName(processed.fileName);
      setClarity(processed.clarity);
    } catch (error) {
      console.error('Failed to process receipt image:', error);
      setScanError({ cannotExtract: false, message: error.message || 'Could not read that image. Please try a JPG or PNG.' });
    }
  };

  const analyze = async () => {
    if (!uploadBlob) return;
    setAnalyzing(true);
    setResult(null);
    setScanError(null);
    try {
      const formData = new FormData();
      formData.append('image', uploadBlob, fileName || 'receipt.jpg');
      const res = await api.post('/receipts/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      fetchRecent();
    } catch (error) {
      const data = error.response?.data;
      setScanError({
        cannotExtract: data?.cannotExtract === true,
        message: data?.message || 'Receipt scan failed. Please check your connection and try again.',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Receipt className="text-accent-start" size={24} />
          Receipt Scanner
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Upload or take a picture of a store receipt — we extract the total, vendor, and
          category and add it straight to your Spending History.
        </p>
      </div>

      {/* Upload + result grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: upload & analyze */}
        <div className="space-y-4">
          {!previewUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className="glass-card p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-accent-start/40 transition-colors border-dashed min-h-[260px]"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-glow mb-4">
                <Upload size={24} className="text-white" />
              </div>
              <p className="text-white font-medium mb-1">Click to upload or drag &amp; drop a receipt</p>
              <p className="text-xs text-gray-500 mb-4">JPG, PNG or WebP · up to 12 MB</p>
              <div className="flex items-center gap-2">
                <button className="btn-primary flex items-center gap-2 text-sm">
                  <Upload size={16} /> Choose Receipt
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const cam = document.createElement('input');
                    cam.type = 'file';
                    cam.accept = 'image/*';
                    cam.capture = 'environment';
                    cam.onchange = (ev) => handleFile(ev.target.files?.[0]);
                    cam.click();
                  }}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Camera size={16} /> Take Photo
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          ) : (
            <div className="glass-card p-5 space-y-4">
              <div className="overflow-hidden rounded-xl bg-white/5 border border-white/10">
                <img src={previewUrl} alt="Receipt preview" className="w-full max-h-72 object-contain" />
              </div>

              {clarity?.warnings?.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Heads up — this receipt may not be clear: </span>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      {clarity.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                    You can retake it, or try scanning it anyway.
                  </div>
                </div>
              )}
              {clarity && clarity.warnings.length === 0 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2">
                  <CheckCircle size={16} className="shrink-0 mt-0.5" />
                  <span>Image looks clear — good lighting and focus. Ready to scan.</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={analyze}
                  disabled={analyzing}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                >
                  {analyzing ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}
                  {analyzing ? 'Analyzing receipt…' : 'Analyze & Add to Spending'}
                </button>
                <button onClick={resetScan} className="btn-secondary flex items-center gap-2 text-sm px-4">
                  <RefreshCw size={15} /> Retake
                </button>
              </div>
            </div>
          )}

          {analyzing && (
            <div className="glass-card p-4 text-sm text-gray-300 flex items-center gap-3">
              <Loader2 size={18} className="animate-spin text-accent-start shrink-0" />
              Reading the receipt with OCR… extracting total, vendor &amp; category.
            </div>
          )}

          {!analyzing && scanError && (
            <div
              className={`p-4 rounded-2xl border ${
                scanError.cannotExtract
                  ? 'bg-red-500/10 border-red-500/25 text-red-300'
                  : 'bg-yellow-500/10 border-yellow-500/25 text-yellow-300'
              } text-xs flex items-start gap-2`}
            >
              {scanError.cannotExtract ? (
                <XCircle size={18} className="shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold">
                  {scanError.cannotExtract ? 'Cannot proceed: ' : 'Could not scan: '}
                </span>
                {scanError.message}
                {scanError.cannotExtract && (
                  <div className="mt-2">
                    <Link to="/spending" className="underline font-semibold hover:text-white">
                      Add the expense manually in Spending History →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: result OR how-it-works */}
        {result ? (
          <div className="glass-card p-6 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-white/5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-4">
              <CheckCircle size={18} />
              Receipt scanned &amp; added to Spending History
            </div>

            {result.warnings?.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <ul className="list-disc list-inside space-y-0.5">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Vendor</span>
                <strong className="text-white">{result.extracted.vendor || '—'}</strong>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Total</span>
                <strong className="text-white">
                  {currency}
                  {result.extracted.total.toLocaleString('en-IN')}
                </strong>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Category</span>
                <strong className="text-white">{result.extracted.category}</strong>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Date</span>
                <strong className="text-white">{formatDate(result.extracted.date)}</strong>
              </div>
              {result.extracted.confidence > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">OCR confidence</span>
                  <strong className="text-white">{result.extracted.confidence}%</strong>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <Link
                to="/spending"
                className="btn-primary flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                View in Spending History
              </Link>
              <button onClick={resetScan} className="btn-secondary flex-1 py-2 text-xs font-semibold">
                Scan Another
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-card p-6">
            <h3 className="font-bold text-white text-sm flex items-center gap-2 pb-2 border-b border-white/5 mb-3">
              <Sparkles size={16} className="text-accent-start" /> How it works
            </h3>
            <ol className="space-y-3 text-sm text-gray-300">
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-accent-start/20 border border-accent-start/30 text-accent-start text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Upload or photograph your store receipt (a clear, well-lit shot works best).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-accent-start/20 border border-accent-start/30 text-accent-start text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>We run OCR to read the text, then extract the <strong className="text-white">total</strong>, <strong className="text-white">vendor</strong>, and an auto-matched <strong className="text-white">category</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-accent-start/20 border border-accent-start/30 text-accent-start text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>The expense lands in <strong className="text-white">Spending History</strong> and is deducted from your monthly income.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-accent-start/20 border border-accent-start/30 text-accent-start text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                <span>Blurry or dark receipts warn you first; if nothing can be read we show <strong className="text-white">"Cannot proceed"</strong>.</span>
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Recent scans */}
      <div className="glass-card p-6">
        <h2 className="font-bold text-white text-sm flex items-center gap-2 pb-2 border-b border-white/5 mb-3">
          <History size={16} className="text-accent-start" /> Recently scanned receipts
        </h2>
        {recentLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No scanned receipts yet"
            subtitle="Scanned receipts will appear here for quick reference"
          />
        ) : (
          <div className="divide-y divide-white/5">
            {recent.map((expense) => (
              <div key={expense._id} className="flex items-center gap-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0">
                  {expense.receiptImageUrl ? (
                    <img
                      src={`${API_ORIGIN}${expense.receiptImageUrl}`}
                      alt="Receipt thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Receipt size={16} className="mx-auto mt-2.5 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{expense.description || expense.category}</p>
                  <p className="text-xs text-gray-500">
                    {expense.category} · {formatDate(expense.date)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-white">
                  {currency}
                  {expense.amount.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptScanner;