import { useEffect, useRef, useState } from 'react';
import FinnovaLogo from './FinnovaLogo.jsx';

const SHOW_MS = 2800; // how long the intro stays fully visible
const FADE_MS = 600; // exit fade duration (keep in sync with .splash-exit CSS)

/**
 * Full-screen intro shown before the app reveals itself: the FINNOVA mark
 * pops in, the growth line draws itself, crystals pop, the wordmark settles,
 * then the whole overlay fades out. Click / tap to skip.
 */
const SplashScreen = ({ onFinish }) => {
  const [exiting, setExiting] = useState(false);
  const finishedRef = useRef(false);
  const finishRef = useRef(() => {});

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.();
  };
  finishRef.current = finish;

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), SHOW_MS);
    const t2 = setTimeout(() => finishRef.current(), SHOW_MS + FADE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const skip = () => {
    if (finishedRef.current) return;
    setExiting(true);
    setTimeout(() => finishRef.current(), 300);
  };

  return (
    <div
      className={`splash-overlay${exiting ? ' splash-exit' : ''}`}
      onClick={skip}
      role="presentation"
      aria-hidden="true"
    >
      {/* Ambient purple glow orbs + twinkling stars */}
      <div className="splash-orb splash-orb-1" />
      <div className="splash-orb splash-orb-2" />
      <div className="splash-stars" />

      <div className="splash-center">
        <div className="splash-logo-wrap">
          <FinnovaLogo size={216} boxed animated className="logo-glow" />
        </div>

        <h1 className="splash-title">FINNOVA</h1>
        <p className="splash-tagline">Personal Finance Planner</p>

        <div className="splash-bar">
          <span />
        </div>
      </div>

      {/* Signature sparkle */}
      <svg className="splash-sparkle" width="34" height="34" viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="splash-sparkle-grad" x1="0" y1="0" x2="24" y2="24">
            <stop offset="0%" stopColor="#E9D5FF" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <path
          d="M12 2 L14.4 9.6 L22 12 L14.4 14.4 L12 22 L9.6 14.4 L2 12 L9.6 9.6 Z"
          fill="url(#splash-sparkle-grad)"
        />
      </svg>
    </div>
  );
};

export default SplashScreen;
