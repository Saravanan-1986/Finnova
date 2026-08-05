import {
  LayoutDashboard,
  List,
  CalendarClock,
  Target,
  Shield,
  Repeat,
  Sparkles,
} from 'lucide-react';

// Single source of truth for sidebar navigation.
// Adding a new module later = one line here.
export const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/spending', label: 'Spending History', icon: List },
  { path: '/bills-emi', label: 'Bills & EMI', icon: CalendarClock },
  { path: '/goals', label: 'Goal Planner', icon: Target },
  { path: '/emergency-fund', label: 'Emergency Fund', icon: Shield },
  { path: '/subscriptions', label: 'Subscription Tracker', icon: Repeat, comingSoon: true },
  { path: '/ai-assistant', label: 'AI Assistant', icon: Sparkles, comingSoon: true },
];