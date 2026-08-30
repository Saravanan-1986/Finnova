import {
  LayoutDashboard,
  List,
  CalendarClock,
  Target,
  Shield,
  Repeat,
  Sparkles,
  Receipt,
  Home,
  Landmark,
  ShieldCheck,
  Calculator,
  Scale,
  Bookmark,
  Users,
} from 'lucide-react';

// Single source of truth for sidebar navigation.
// Adding a new module later = one line here.
export const personalNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/spending', label: 'Spending History', icon: List },
  { path: '/receipt-scanner', label: 'Receipt Scanner', icon: Receipt },
  { path: '/bills-emi', label: 'Bills & EMI', icon: CalendarClock },
  { path: '/goals', label: 'Goal Planner', icon: Target },
  { path: '/emergency-fund', label: 'Emergency Fund', icon: Shield },
  { path: '/subscriptions', label: 'Subscription Tracker', icon: Repeat },
  { path: '/ai-assistant', label: 'AI Assistant', icon: Sparkles },
];

export const insuranceNavItems = [
  { path: '/insurance', label: 'Overview', icon: Home },
  { path: '/insurance/schemes', label: 'Government Schemes', icon: Landmark },
  { path: '/insurance/products', label: 'Private Insurance', icon: ShieldCheck },
  { path: '/insurance/calculator', label: 'Coverage Calculator', icon: Calculator },
  { path: '/insurance/compare', label: 'Compare Plans', icon: Scale },
  { path: '/insurance/my-plans', label: 'My Plans', icon: Bookmark },
  { path: '/insurance/family', label: 'Family & Dependents', icon: Users },
];

export const navItems = personalNavItems;