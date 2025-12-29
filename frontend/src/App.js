// src/App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RecruiterDashboard from './pages/RecruiterDashboard';
import ProfilePage from './pages/ProfilePage';
import ApplicantDashboard from './pages/ApplicantDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
        <Route path="/applicant-dashboard" element={<ApplicantDashboard />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/" element={<LoginPage />} /> {/* Default to login */}
      </Routes>
    </Router>
  );
}

export default App;