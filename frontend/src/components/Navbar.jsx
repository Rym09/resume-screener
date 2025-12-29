import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logoutCurrentSession } from '../api';

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const handleLogout = async () => {
    try {
      await logoutCurrentSession();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      navigate('/login');
    }
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold text-indigo-600">ResumeMatch</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {token ? (
              <>
                <Link 
                  to={role === 'recruiter' ? '/recruiter-dashboard' : '/applicant-dashboard'} 
                  className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link 
                  to="/profile" 
                  className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;