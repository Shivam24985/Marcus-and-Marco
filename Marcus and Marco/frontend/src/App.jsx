import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import Layout from './components/layout/Layout';
import { PageLoader } from './components/ui/LoadingSpinner';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DailyNotebook from './pages/DailyNotebook';
import Goals from './pages/Goals';
import GoalDetail from './pages/GoalDetail';
import Tasks from './pages/Tasks';
import StudyTimer from './pages/StudyTimer';
import CalendarView from './pages/CalendarView';
import ProgressAnalytics from './pages/ProgressAnalytics';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/register" 
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                } 
              />

              {/* Protected App Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/notebook" element={<DailyNotebook />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/goals/:id" element={<GoalDetail />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/timer" element={<StudyTimer />} />
                <Route path="/calendar" element={<CalendarView />} />
                <Route path="/progress" element={<ProgressAnalytics />} />
                <Route path="/settings" element={<Settings />} />
              </Route>

              {/* 404 Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
