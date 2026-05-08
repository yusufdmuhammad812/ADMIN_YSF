import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ScanPage from './pages/ScanPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import TeachersPage from './pages/TeachersPage';
import ReportsPage from './pages/ReportsPage';
import PrintQRPage from './pages/PrintQRPage';
import { IdentityPage, SettingsPage, AdminScanPage } from './pages/PlaceholderPages';
import LoginPage from './pages/LoginPage';
import ParentPortalPage from './pages/ParentPortalPage';

const ProtectedRoute = ({ children }) => {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  return isAdmin ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ScanPage />} />
        <Route path="/cek" element={<ParentPortalPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/admin/students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
        <Route path="/admin/teachers" element={<ProtectedRoute><TeachersPage /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="/admin/scan" element={<ProtectedRoute><AdminScanPage /></ProtectedRoute>} />
        <Route path="/admin/print-qr" element={<ProtectedRoute><PrintQRPage /></ProtectedRoute>} />
        <Route path="/admin/identity" element={<ProtectedRoute><IdentityPage /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        
        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
