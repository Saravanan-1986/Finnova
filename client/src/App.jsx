import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import RouteGuard from './components/RouteGuard.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SpendingHistory from './pages/SpendingHistory.jsx';
import BillsEmi from './pages/BillsEmi.jsx';
import GoalPlanner from './pages/GoalPlanner.jsx';
import EmergencyFund from './pages/EmergencyFund.jsx';
import ComingSoon from './pages/ComingSoon.jsx';

const App = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected routes */}
      <Route
        element={
          <RouteGuard>
            <AppLayout />
          </RouteGuard>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/spending" element={<SpendingHistory />} />
        <Route path="/bills-emi" element={<BillsEmi />} />
        <Route path="/goals" element={<GoalPlanner />} />
        <Route path="/emergency-fund" element={<EmergencyFund />} />
        <Route
          path="/subscriptions"
          element={
            <ComingSoon
              title="Subscription Tracker"
              description="Track all your recurring subscriptions in one place. Coming soon!"
            />
          }
        />
        <Route
          path="/ai-assistant"
          element={
            <ComingSoon
              title="AI Assistant"
              description="Get smart financial insights and personalized advice. Coming soon!"
            />
          }
        />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;