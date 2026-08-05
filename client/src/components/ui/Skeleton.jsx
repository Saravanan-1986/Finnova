const Skeleton = ({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-white/10 rounded-xl ${className}`} />
  );
};

export default Skeleton;