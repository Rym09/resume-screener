import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const ApplicantDashboard = () => {
  const [userProfile, setUserProfile] = useState({
    picture: '',
    email: '',
    name: ''
  });
  const [resumes, setResumes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('resumes');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadStatus, setUploadStatus] = useState({ show: false, success: false, message: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [applyingToJob, setApplyingToJob] = useState(null); // Job being applied to
  const navigate = useNavigate();

  // Fetch user profile and data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token || localStorage.getItem('role') !== 'applicant') {
          navigate('/login');
          return;
        }

        // Fetch profile
        const profileResponse = await axios.get('http://localhost:8000/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserProfile({
          picture: profileResponse.data.profile_picture || '/default-profile.png',
          email: profileResponse.data.email,
          name: profileResponse.data.name || 'Applicant'
        });

        // Fetch resumes
        const resumesResponse = await axios.get('http://localhost:8000/resumes/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setResumes(resumesResponse.data);

        // Fetch applications
        const applicationsResponse = await axios.get('http://localhost:8000/applications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setApplications(applicationsResponse.data);

        // Fetch available jobs
        const jobsResponse = await axios.get('http://localhost:8000/jobs/available', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAvailableJobs(jobsResponse.data);

      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const handleUploadResume = async (file) => {
    setIsUploading(true);
    setUploadStatus({ show: false, success: false, message: '' });
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post('http://localhost:8000/upload-resume/', formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setResumes(prev => [...prev, response.data]);
      setUploadStatus({ 
        show: true, 
        success: true, 
        message: `Resume "${file.name}" uploaded successfully! Skills detected: ${response.data.skills?.join(', ') || 'None'}` 
      });
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setUploadStatus({ show: false, success: false, message: '' }), 5000);
      
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to upload resume';
      setUploadStatus({ show: true, success: false, message: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteResume = async (resumeId) => {
    if (!window.confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8000/resumes/${resumeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Remove from local state
      setResumes(prev => prev.filter(r => r.id !== resumeId));
      setUploadStatus({ 
        show: true, 
        success: true, 
        message: 'Resume deleted successfully!' 
      });
      
      setTimeout(() => setUploadStatus({ show: false, success: false, message: '' }), 3000);
    } catch (err) {
      setUploadStatus({ 
        show: true, 
        success: false, 
        message: err.response?.data?.detail || 'Failed to delete resume' 
      });
    }
  };

  const handleApplyClick = (job) => {
    if (resumes.length === 0) {
      setUploadStatus({
        show: true,
        success: false,
        message: 'Please upload a resume before applying to jobs'
      });
      setActiveTab('resumes');
      return;
    }
    setApplyingToJob(job);
  };

  const handleApplyWithResume = async (resumeId) => {
    if (!applyingToJob) return;

    try {
      const formData = new FormData();
      formData.append('job_id', applyingToJob.id);
      formData.append('resume_id', resumeId);

      const response = await axios.post('http://localhost:8000/applications', formData, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Add to applications list
      setApplications(prev => [...prev, response.data]);
      
      setUploadStatus({
        show: true,
        success: true,
        message: `Successfully applied to ${applyingToJob.title}!`
      });
      
      setApplyingToJob(null);
      setTimeout(() => setUploadStatus({ show: false, success: false, message: '' }), 3000);
    } catch (err) {
      setUploadStatus({
        show: true,
        success: false,
        message: err.response?.data?.detail || 'Failed to submit application'
      });
    }
  };

  const hasAppliedToJob = (jobId) => {
    return applications.some(app => app.job_id === jobId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Resume Screener</h1>
                <p className="text-xs text-gray-500">Applicant Portal</p>
              </div>
            </div>
            
            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <img 
                  className="h-10 w-10 rounded-full object-cover border-2 border-gray-200" 
                  src={userProfile.picture} 
                  alt="Profile"
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(userProfile.email) + '&background=3b82f6&color=fff';
                  }}
                />
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium text-gray-700">{userProfile.email}</p>
                  <p className="text-xs text-green-600 font-medium">● Online</p>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg py-2 z-50 border border-gray-100 animate-fadeIn">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{userProfile.email}</p>
                    <p className="text-xs text-gray-500 mt-1">Applicant Account</p>
                  </div>
                  <Link 
                    to="/profile" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </Link>
                  <Link 
                    to="/profile" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                  <div className="border-t border-gray-100 mt-2"></div>
                  <button
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">My Resumes</p>
                <p className="text-2xl font-bold text-gray-900">{resumes.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Applications</p>
                <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Available Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{availableJobs.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Status Toast */}
        {uploadStatus.show && (
          <div className={`mb-6 p-4 rounded-xl flex items-center justify-between ${
            uploadStatus.success 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              {uploadStatus.success ? (
                <svg className="h-5 w-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span className="text-sm font-medium">{uploadStatus.message}</span>
            </div>
            <button 
              onClick={() => setUploadStatus({ show: false, success: false, message: '' })}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('resumes')}
                className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'resumes' 
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                My Resumes
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'applications' 
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                My Applications
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'jobs' 
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Browse Jobs
              </button>
            </nav>
          </div>
          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'resumes' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">My Resumes</h2>
                    <p className="text-sm text-gray-500 mt-1">Upload and manage your resumes</p>
                  </div>
                  <label className={`inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors shadow-sm ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {isUploading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Upload Resume
                      </>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      disabled={isUploading}
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          await handleUploadResume(file);
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {resumes.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No resumes yet</h3>
                    <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                      Upload your resume to get started. We support PDF, DOCX, and TXT formats.
                    </p>
                    <label className="mt-6 inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Upload Your First Resume
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            await handleUploadResume(file);
                            e.target.value = '';
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {resumes.map((resume) => (
                      <div key={resume.id} className="p-5 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center">
                            <div className="p-2 bg-red-100 rounded-lg mr-3">
                              <svg className="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{resume.filename}</h4>
                              <p className="text-xs text-gray-500 mt-1">
                                {resume.skills 
                                  ? `Skills: ${Array.isArray(resume.skills) 
                                      ? resume.skills.slice(0, 5).join(', ') + (resume.skills.length > 5 ? '...' : '')
                                      : String(resume.skills).substring(0, 50) + (String(resume.skills).length > 50 ? '...' : '')
                                    }` 
                                  : 'Processing...'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => window.open(`http://localhost:8000/uploads/${resume.filename}`, '_blank')}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </button>
                            <button 
                              onClick={() => handleDeleteResume(resume.id)}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'applications' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">My Applications</h2>
                  <p className="text-sm text-gray-500 mt-1">Track the status of your job applications</p>
                </div>
                
                {applications.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No applications yet</h3>
                    <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                      Browse available jobs and apply to positions that match your skills.
                    </p>
                    <button 
                      onClick={() => setActiveTab('jobs')}
                      className="mt-6 inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Browse Jobs
                    </button>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Job</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Applied</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {applications.map((application) => (
                          <tr key={application.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900">{application.job_title}</div>
                              <div className="text-sm text-gray-500">{application.company}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                application.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                                application.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                                application.status === 'reviewed' ? 'bg-yellow-100 text-yellow-800' :
                                application.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                  application.status === 'pending' ? 'bg-blue-500' :
                                  application.status === 'submitted' ? 'bg-blue-500' :
                                  application.status === 'reviewed' ? 'bg-yellow-500' :
                                  application.status === 'accepted' ? 'bg-green-500' :
                                  application.status === 'rejected' ? 'bg-red-500' :
                                  'bg-gray-500'
                                }`}></span>
                                {application.status?.charAt(0).toUpperCase() + application.status?.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(application.applied_date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <button className="text-blue-600 hover:text-blue-900 text-sm font-medium mr-3">View</button>
                              <button className="text-red-600 hover:text-red-900 text-sm font-medium">Withdraw</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'jobs' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Browse Jobs</h2>
                  <p className="text-sm text-gray-500 mt-1">Find opportunities that match your skills</p>
                </div>
                
                {availableJobs.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No jobs available</h3>
                    <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                      Check back later for new opportunities. New positions are posted regularly.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {availableJobs.map((job) => (
                      <div key={job.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all duration-200 group">
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(job.upload_date).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                            {job.title}
                          </h3>
                          
                          {job.skills_required && job.skills_required.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs font-medium text-gray-500 mb-2">Required Skills:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {job.skills_required.slice(0, 4).map((skill, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                    {skill}
                                  </span>
                                ))}
                                {job.skills_required.length > 4 && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                    +{job.skills_required.length - 4} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                            <button
                              onClick={() => window.open(`http://localhost:8000/uploads/${job.filename}`, '_blank')}
                              className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors flex items-center"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Details
                            </button>
                            {hasAppliedToJob(job.id) ? (
                              <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg">
                                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Applied
                              </span>
                            ) : (
                              <button 
                                onClick={() => handleApplyClick(job)}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                              >
                                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                Apply Now
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Resume Selection Modal */}
      {applyingToJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Select Resume</h3>
              <button
                onClick={() => setApplyingToJob(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Choose which resume to use for applying to <span className="font-medium">{applyingToJob.title}</span>
            </p>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {resumes.map((resume) => (
                <button
                  key={resume.id}
                  onClick={() => handleApplyWithResume(resume.id)}
                  className="w-full p-3 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors text-left flex items-center"
                >
                  <div className="p-2 bg-red-100 rounded-lg mr-3">
                    <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{resume.filename}</p>
                    <p className="text-xs text-gray-500">
                      {Array.isArray(resume.skills) ? resume.skills.slice(0, 3).join(', ') : 'No skills detected'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setApplyingToJob(null)}
                className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicantDashboard;