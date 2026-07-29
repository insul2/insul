import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/layout/AppLayout';

import LoginPage from '../pages/Login/LoginPage';
import RegisterPage from '../pages/Register/RegisterPage';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import BolusCalculatorPage from '../pages/Bolus/BolusCalculatorPage';
import FoodSearchPage from '../pages/Foods/FoodSearchPage';
import GlucoseLogPage from '../pages/Glucose/GlucoseLogPage';
import ReportsPage from '../pages/Reports/ReportsPage';
import ProfilePage from '../pages/Profile/ProfilePage';
import SettingsPage from '../pages/Settings/SettingsPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="bolus" element={<BolusCalculatorPage />} />
        <Route path="meals" element={<FoodSearchPage />} />
        <Route path="foods" element={<FoodSearchPage />} />
        <Route path="glucose" element={<GlucoseLogPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="ai" element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="alerts" element={<DashboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
