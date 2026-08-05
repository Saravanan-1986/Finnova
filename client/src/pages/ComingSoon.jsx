import { Construction } from 'lucide-react';

const ComingSoon = ({ title, description }) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="glass-card p-10 max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-accent flex items-center justify-center mx-auto mb-6 shadow-glow">
          <Construction size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          {description || 'This module is under construction and will be available soon.'}
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-start/20 text-accent-start text-sm font-medium border border-accent-start/30">
          🚧 Coming Soon
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;