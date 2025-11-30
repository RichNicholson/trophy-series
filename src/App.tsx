import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import RaceResults from './pages/RaceResults';
import ChampionshipStandings from './pages/ChampionshipStandings';
import ChampionshipStandingsAgeGraded from './pages/ChampionshipStandingsAgeGraded';
import AdminDashboard from './pages/AdminDashboard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  return isAdmin ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RaceResults />} />
          <Route path="/standings" element={<ChampionshipStandings />} />
          <Route path="/standings-age-graded" element={<ChampionshipStandingsAgeGraded />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
