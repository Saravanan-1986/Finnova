import {
  Utensils,
  Car,
  ShoppingBag,
  Clapperboard,
  HeartPulse,
  GraduationCap,
  Home,
  Zap,
  Plane,
  ShoppingCart,
  MoreHorizontal,
  Wallet,
  PiggyBank,
  CreditCard,
  Shield,
} from 'lucide-react';

const iconMap = {
  utensils: Utensils,
  car: Car,
  'shopping-bag': ShoppingBag,
  clapperboard: Clapperboard,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  home: Home,
  zap: Zap,
  plane: Plane,
  'shopping-cart': ShoppingCart,
  'more-horizontal': MoreHorizontal,
  wallet: Wallet,
  'piggy-bank': PiggyBank,
  'credit-card': CreditCard,
  shield: Shield,
};

// Accepts the icon key from EXPENSE_CATEGORIES (e.g. 'utensils', 'car')
const CategoryIcon = ({ icon, size = 18, className = '' }) => {
  const Icon = iconMap[icon] || Wallet;
  return <Icon size={size} className={className} />;
};

export default CategoryIcon;