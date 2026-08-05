const EmptyState = ({ icon: Icon, title, subtitle }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <Icon size={24} className="text-gray-500" />
        </div>
      )}
      <h3 className="text-white font-medium mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
};

export default EmptyState;