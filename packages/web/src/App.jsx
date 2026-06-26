import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Join from './pages/Join';
import Dashboard from './pages/Dashboard';
import Fixtures from './pages/Fixtures';
import MatchDetail from './pages/MatchDetail';
import Leaderboard from './pages/Leaderboard';
import AdminPanel from './pages/AdminPanel';
import PreTournament from './pages/PreTournament';
import AuthVerify from './pages/AuthVerify';
import Layout from './components/Layout';
import WCGroups from './pages/WCGroups';
import Bracket from './pages/Bracket';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>;
  if (!user) return <Navigate to="/join" replace />;
  return children;
}

function Spinner() {
  return (
    <div className="w-8 h-8 border-2 border-pitch-light border-t-transparent rounded-full animate-spin" />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/join" element={<Join />} />
          <Route path="/auth/verify" element={<AuthVerify />} />
          <Route
            path="/g/:groupId"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="fixtures" element={<Fixtures />} />
            <Route path="fixtures/:matchId" element={<MatchDetail />} />
            <Route path="bracket" element={<Bracket />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="admin" element={<AdminPanel />} />
            <Route path="pre-torneio" element={<PreTournament />} />
            <Route path="grupos" element={<WCGroups />} />
          </Route>
          <Route path="/wc-grupos" element={<WCGroups />} />
          <Route path="/" element={<Navigate to="/join" replace />} />
          <Route path="*" element={<Navigate to="/join" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
