import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Loader2, Database } from 'lucide-react';
import api from '../services/api.js';
import Skeleton from '../components/ui/Skeleton.jsx';

const MessageBubble = ({ message }) => {
  const [showFootnote, setShowFootnote] = useState(false);

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-accent text-white px-4 py-3 text-sm whitespace-pre-wrap shadow-glow">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] glass-card px-4 py-3">
        <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {message.contextUsed && message.contextUsed.length > 0 && (
          <div className="mt-3 pt-2 border-t border-white/10">
            <button
              onClick={() => setShowFootnote((v) => !v)}
              className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-accent-start hover:text-accent-end transition-colors"
            >
              <Database size={11} />
              Based on your data
              <span className={`transition-transform duration-200 ${showFootnote ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {showFootnote && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {message.contextUsed.map((label, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const TypingIndicator = () => (
  <div className="flex justify-start">
    <div className="glass-card px-4 py-3 flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-accent-end animate-bounce" />
      <span className="w-2 h-2 rounded-full bg-accent-end animate-bounce" style={{ animationDelay: '0.15s' }} />
      <span className="w-2 h-2 rounded-full bg-accent-end animate-bounce" style={{ animationDelay: '0.3s' }} />
    </div>
  </div>
);

const defaultChips = [
  'How much can I safely spend this week?',
  'How do I start saving toward a goal?',
  'What should I do about my emergency fund?',
  'Which government scheme should I prioritize?',
];

const AIAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [chips, setChips] = useState(defaultChips);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/assistant/history');
        setMessages(res.data.messages || []);
      } catch (e) {
        console.error('Failed to load assistant history:', e);
      } finally {
        setLoadingHistory(false);
      }
    };

    // Suggested prompt chips tailored to the user's real state.
    const buildChips = async () => {
      try {
        const [healthRes, goalsRes, efRes] = await Promise.all([
          api.get('/financial-health-score'),
          api.get('/goals'),
          api.get('/emergency-fund'),
        ]);
        const next = ['How much can I safely spend this week?'];
        const goals = goalsRes.data.goals || [];
        next.push(
          goals.length
            ? `Am I on track for my "${goals[0].title}" goal?`
            : 'How do I start saving toward a goal?'
        );
        const ef = efRes.data?.fund;
        next.push(
          ef && ef.progress < 50
            ? 'What should I do about my emergency fund?'
            : 'Is my emergency fund healthy?'
        );
        next.push('Which government scheme should I prioritize?');
        setChips(next);
      } catch (e) {
        // Keep defaults if the profile endpoints are not ready.
      }
    };

    fetchHistory();
    buildChips();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const sendMessage = async (text) => {
    const content = (text ?? input).trim();
    if (!content || isSending) return;
    // Client-side copy of recent history ONLY — the context object itself is
    // always rebuilt server-side from the DB.
    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [
      ...prev,
      { _id: `local-user-${Date.now()}`, role: 'user', content, createdAt: new Date().toISOString() },
    ]);
    setInput('');
    setIsSending(true);
    setError('');
    try {
      const res = await api.post('/assistant/query', { message: content, conversationHistory: history });
      setMessages((prev) => [
        ...prev,
        {
          _id: res.data.messageId || `local-bot-${Date.now()}`,
          role: 'assistant',
          content: res.data.reply,
          contextUsed: res.data.contextUsed || [],
        },
      ]);
    } catch (err) {
      const emsg =
        err.response?.status === 429
          ? err.response.data?.message || 'Rate limit reached.'
          : err.response?.data?.message || 'Something went wrong. Please try again.';
      setError(emsg);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const showChips = !loadingHistory && messages.length === 0 && !isSending;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="text-accent-start" size={24} />
          AI Assistant
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Every answer is grounded in your real FINNOVA data — spending, goals, emergency fund,
          dues & matching schemes — with a transparency note on what it used.
        </p>
      </div>

      {/* Chat window */}
      <div className="glass-card flex flex-col h-[calc(100vh-230px)] min-h-[460px] overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {loadingHistory ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-10 w-2/3 ml-auto" />
            </div>
          ) : messages.length === 0 && !isSending ? (
            <div className="text-center pt-8 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-accent flex items-center justify-center mx-auto mb-4 shadow-glow">
                <Sparkles size={24} className="text-white" />
              </div>
              <p className="text-gray-300 font-medium mb-1">Ask anything about your money</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                Try one of the suggestions below. The assistant reads your live FINNOVA data
                every time — no stale answers.
              </p>
            </div>
          ) : null}

          {messages.map((m) => (
            <MessageBubble key={m._id} message={m} />
          ))}
          {isSending && <TypingIndicator />}
        </div>

        <div className="border-t border-white/10 px-4 py-4 space-y-3">
          {showChips && (
            <div className="flex flex-wrap gap-2 pb-1">
              {chips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(chip)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your budget, goals, EMIs, schemes..."
              className="input-field"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="btn-primary shrink-0 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
          <p className="text-[10px] text-gray-600 text-center">
            Demo rate limit: 20 messages per hour. Insurance figures are indicative — always verify
            with the insurer.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
