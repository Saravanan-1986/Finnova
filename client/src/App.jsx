import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './components/SplashScreen.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import RouteGuard from './components/RouteGuard.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SpendingHistory from './pages/SpendingHistory.jsx';
import BillsEmi from './pages/BillsEmi.jsx';
import GoalPlanner from './pages/GoalPlanner.jsx';
import EmergencyFund from './pages/EmergencyFund.jsx';
import ReceiptScanner from './pages/ReceiptScanner.jsx';
import ComingSoon from './pages/ComingSoon.jsx';
import AIAssistant from './pages/AIAssistant.jsx';
// Insurance & Schemes section
import InsuranceOverview from './pages/Insurance/InsuranceOverview.jsx';
import GovernmentSchemes from './pages/Insurance/GovernmentSchemes.jsx';
import SchemeDetail from './pages/Insurance/SchemeDetail.jsx';
import PrivateInsurance from './pages/Insurance/PrivateInsurance.jsx';
import InsuranceDetail from './pages/Insurance/InsuranceDetail.jsx';
import CoverageCalculator from './pages/Insurance/CoverageCalculator.jsx';
import ComparePlans from './pages/Insurance/ComparePlans.jsx';
import MyPlans from './pages/Insurance/MyPlans.jsx';
import FamilyDependents from './pages/Insurance/FamilyDependents.jsx';

const App = () => {
  // Intro splash: shown on every fresh page load, before any route reveals
  const [splashDone, setSplashDone] = useState(false);

  return (
    <>
      {!splashDone && <SplashScreen onFinish={() => setSplashDone(true)} />}
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
        <Route path="/receipt-scanner" element={<ReceiptScanner />} />
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
        <Route path="/ai-assistant" element={<AIAssistant />} />

        {/* Insurance & Schemes Section */}
        <Route path="/insurance" element={<InsuranceOverview />} />
        <Route path="/insurance/schemes" element={<GovernmentSchemes />} />
        <Route path="/insurance/schemes/:id" element={<SchemeDetail />} />
        <Route path="/insurance/products" element={<PrivateInsurance />} />
        <Route path="/insurance/products/:id" element={<InsuranceDetail />} />
        <Route path="/insurance/calculator" element={<CoverageCalculator />} />
        <Route path="/insurance/compare" element={<ComparePlans />} />
        <Route path="/insurance/my-plans" element={<MyPlans />} />
        <Route path="/insurance/family" element={<FamilyDependents />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
};

export default App;