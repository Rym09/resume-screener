import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getActiveSessions, revokeSession, logout } from '../api';

const ProfilePage = () => {
  const [userData, setUserData] = useState({
    email: "",
    role: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [previewImage, setPreviewImage] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [message, setMessage] = useState({ text: "", isError: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get('http://localhost:8000/users/me', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        setUserData(prev => ({
          ...prev,
          email: response.data.email,
          role: response.data.role || 'applicant',
        }));
        if (response.data.profile_picture) {
          setPreviewImage(`http://localhost:8000${response.data.profile_picture}`);
        }
      } catch (error) {
        setMessage({ text: 'Failed to fetch user data', isError: true });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await getActiveSessions();
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      await revokeSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
      setMessage({ text: 'Session revoked successfully', isError: false });
    } catch (error) {
      setMessage({ text: 'Failed to revoke session', isError: true });
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      await logout();
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      navigate('/login');
    } catch (error) {
      setMessage({ text: 'Failed to logout from all devices', isError: true });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ text: 'Image must be less than 5MB', isError: true });
        return;
      }
      setProfilePicture(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData({
      ...userData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (userData.newPassword && userData.newPassword !== userData.confirmPassword) {
      setMessage({ text: 'New passwords do not match', isError: true });
      return;
    }

    if (userData.newPassword && userData.newPassword.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters', isError: true });
      return;
    }

    setIsSaving(true);
    setMessage({ text: '', isError: false });

    try {
      const formData = new FormData();
      formData.append('email', userData.email);
      if (userData.currentPassword) {
        formData.append('current_password', userData.currentPassword);
      }
      if (userData.newPassword) {
        formData.append('new_password', userData.newPassword);
      }
      if (profilePicture) {
        formData.append('profile_picture', profilePicture);
      }

      const response = await axios.put('http://localhost:8000/users/me', formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (profilePicture && response.data.profile_picture) {
        setPreviewImage(`http://localhost:8000${response.data.profile_picture}`);
      }

      setMessage({ text: 'Profile updated successfully!', isError: false });
      setProfilePicture(null);
      setShowPasswordSection(false);
      
      setUserData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }));
      
    } catch (error) {
      setMessage({
        text: error.response?.data?.detail || 'Failed to update profile',
        isError: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="mt-1 text-gray-600">Manage your account information and preferences</p>
        </div>

        {/* Success/Error Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl flex items-center ${
            message.isError 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message.isError ? (
              <svg className="h-5 w-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-24"></div>
            <div className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end -mt-12">
                <div className="relative">
                  <div className="h-28 w-28 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100">
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt="Profile"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '';
                          setPreviewImage('');
                        }}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl font-bold">
                        {userData.email?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <label
                    htmlFor="profile-picture"
                    className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2.5 cursor-pointer hover:bg-blue-700 shadow-lg transition-all"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input
                      id="profile-picture"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-6 sm:pb-1">
                  <h2 className="text-xl font-bold text-gray-900">{userData.email}</h2>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    userData.role === 'recruiter' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {userData.role === 'recruiter' ? '👔 Recruiter' : '👤 Job Seeker'}
                  </span>
                </div>
              </div>
              {profilePicture && (
                <p className="mt-4 text-sm text-green-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  New photo selected. Save to apply changes.
                </p>
              )}
            </div>
          </div>

          {/* Account Info Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Account Information
            </h3>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={userData.email}
                  onChange={handleInputChange}
                  className="pl-10 block w-full border border-gray-300 rounded-xl shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* Password Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <button
              type="button"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Change Password
              </h3>
              <svg 
                className={`w-5 h-5 text-gray-400 transform transition-transform ${showPasswordSection ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showPasswordSection && (
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={userData.currentPassword}
                      onChange={handleInputChange}
                      className="pl-10 block w-full border border-gray-300 rounded-xl shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter current password"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={userData.newPassword}
                      onChange={handleInputChange}
                      className="pl-10 block w-full border border-gray-300 rounded-xl shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter new password (min 6 characters)"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={userData.confirmPassword}
                      onChange={handleInputChange}
                      className="pl-10 block w-full border border-gray-300 rounded-xl shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sessions Section */}
          <div className="mt-8 border-t pt-6">
            <button
              type="button"
              onClick={() => {
                setShowSessions(!showSessions);
                if (!showSessions) fetchSessions();
              }}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {showSessions ? 'Hide Active Sessions' : 'Manage Active Sessions'}
            </button>

            {showSessions && (
              <div className="mt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Active Sessions</h3>
                  <button
                    type="button"
                    onClick={handleLogoutAllDevices}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Logout from all devices
                  </button>
                </div>

                {sessions.length === 0 ? (
                  <p className="text-gray-500 text-sm">No active sessions found</p>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="bg-gray-50 rounded-lg p-4 flex justify-between items-center"
                      >
                        <div>
                          <div className="flex items-center text-sm font-medium text-gray-900">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {session.device_info?.substring(0, 50) || 'Unknown Device'}...
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {session.ip_address && <span className="mr-3">IP: {session.ip_address}</span>}
                            <span>Login: {new Date(session.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(session.id)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className={`flex items-center justify-center px-8 py-3 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;