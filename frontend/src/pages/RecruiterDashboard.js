import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { getRecruiterApplications, updateApplicationStatus } from '../api';

const RecruiterDashboard = () => {
    const [userProfile, setUserProfile] = useState({
        picture: '',
        email: '',
        role: ''
    });
    const [activeTab, setActiveTab] = useState('postings');
    const [jobPostings, setJobPostings] = useState([]);
    const [candidates, setCandidates] = useState([]);
    const [applications, setApplications] = useState([]);
    const [stats, setStats] = useState({ total_candidates: 0, active_jobs: 0, total_applications: 0 });
    const [newJobTitle, setNewJobTitle] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const navigate = useNavigate();

    const fetchApplications = async () => {
        try {
            const res = await getRecruiterApplications();
            setApplications(res.data);
        } catch (err) {
            console.error('Failed to fetch applications:', err);
        }
    };

    const handleUpdateStatus = async (applicationId, newStatus) => {
        try {
            await updateApplicationStatus(applicationId, newStatus);
            setApplications(applications.map(app => 
                app.id === applicationId ? { ...app, status: newStatus } : app
            ));
            setSuccessMessage(`Application ${newStatus} successfully!`);
            fetchStats(); // Refresh stats
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError('Failed to update application status');
            setTimeout(() => setError(''), 3000);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await axios.get('http://localhost:8000/stats/recruiter', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setStats(res.data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    const fetchJobPostings = async () => {
        try {
            const res = await axios.get('http://localhost:8000/job-descriptions/', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setJobPostings(res.data);
            setIsLoading(false);
        } catch (err) {
            setError('Failed to fetch job postings');
            setIsLoading(false);
        }
    };

    const fetchCandidates = async (jobId) => {
        try {
            const res = await axios.get(`http://localhost:8000/rank-candidates/?job_description_id=${jobId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setCandidates(res.data.ranked_candidates);
        } catch (err) {
            setError('Failed to fetch candidates');
        }
    };

    const fetchProfile = async () => {
        try {
            const response = await axios.get('http://localhost:8000/users/me', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setUserProfile({
                picture: response.data.profile_picture ? `http://localhost:8000${response.data.profile_picture}` : '',
                email: response.data.email,
                role: response.data.role
            });
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || localStorage.getItem('role') !== 'recruiter') {
            navigate('/login');
            return;
        }

        fetchJobPostings();
        fetchProfile();
        fetchStats();
        fetchApplications();
    }, [navigate]);

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setNewJobTitle(e.target.files[0].name.replace('.pdf', '').replace(/[-_]/g, ' '));
        }
    };

    const handleCreateJob = async (e) => {
        e.preventDefault();
        if (!selectedFile || !newJobTitle) {
            setError('Please select a PDF file and enter a job title');
            return;
        }

        setIsUploading(true);
        setError('');
        setSuccessMessage('');

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('title', newJobTitle);

            await axios.post('http://localhost:8000/upload-job-description/', formData, {
                headers: { 
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    setUploadProgress(percentCompleted);
                }
            });

            setSuccessMessage('Job description uploaded successfully!');
            setNewJobTitle('');
            setSelectedFile(null);
            setUploadProgress(0);
            fetchJobPostings();
            
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to upload job description');
        } finally {
            setIsUploading(false);
        }
    };

    const handleJobSelect = (job) => {
        setSelectedJob(job);
        fetchCandidates(job.id);
        setActiveTab('candidates');
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/login');
    };

    const handleDeleteJob = async (jobId, e) => {
        e.stopPropagation();
        
        if (!window.confirm('Are you sure you want to delete this job posting? This action cannot be undone.')) {
            return;
        }
        
        try {
            console.log('Deleting job:', jobId);
            const response = await axios.delete(`http://localhost:8000/job-descriptions/${jobId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            console.log('Delete response:', response);
            
            setSuccessMessage('Job posting deleted successfully!');
            
            // If the deleted job was selected, clear the selection
            if (selectedJob?.id === jobId) {
                setSelectedJob(null);
                setCandidates([]);
            }
            
            fetchJobPostings();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Delete error:', err);
            console.error('Error response:', err.response);
            setError(err.response?.data?.detail || 'Failed to delete job posting');
        }
    };

    const [menuOpen, setMenuOpen] = useState(false);
    const toggleMenu = () => setMenuOpen(!menuOpen);
    const closeMenu = () => setMenuOpen(false);

    const getScoreColor = (score) => {
        if (score >= 0.7) return 'bg-green-500';
        if (score >= 0.4) return 'bg-yellow-500';
        return 'bg-red-400';
    };

    const getScoreBgColor = (score) => {
        if (score >= 0.7) return 'bg-green-50 border-green-200 text-green-700';
        if (score >= 0.4) return 'bg-yellow-50 border-yellow-200 text-yellow-700';
        return 'bg-red-50 border-red-200 text-red-700';
    };
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-xl mr-3">
                                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Recruiter Dashboard</h1>
                                <p className="text-xs text-gray-500">Manage jobs & screen candidates</p>
                            </div>
                        </div>

                        {/* Profile Section */}
                        <div className="ml-4 flex items-center space-x-4 relative">
                            <button
                                onClick={toggleMenu}
                                className="flex items-center space-x-3 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {userProfile.picture ? (
                                    <img
                                        className="h-9 w-9 rounded-full object-cover border-2 border-white shadow"
                                        src={userProfile.picture}
                                        alt="Profile"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                                        {userProfile.email?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                )}
                                <div className="text-left hidden md:block">
                                    <p className="text-sm font-medium text-gray-700">{userProfile.email}</p>
                                    <p className="text-xs text-gray-500 capitalize flex items-center">
                                        <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                                        {userProfile.role}
                                    </p>
                                </div>
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown */}
                            {menuOpen && (
                                <div
                                    onMouseLeave={closeMenu}
                                    className="absolute right-0 top-14 w-56 bg-white rounded-xl shadow-xl py-2 z-50 border border-gray-100"
                                >
                                    <Link
                                        to="/profile"
                                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                                        onClick={closeMenu}
                                    >
                                        <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        My Profile
                                    </Link>
                                    <div className="border-t border-gray-100 my-1"></div>
                                    <button
                                        onClick={() => {
                                            closeMenu();
                                            handleLogout();
                                        }}
                                        className="flex items-center w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                                    >
                                        <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center">
                            <div className="p-3 rounded-xl bg-blue-100">
                                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm text-gray-500">Active Jobs</p>
                                <p className="text-2xl font-bold text-gray-900">{jobPostings.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center">
                            <div className="p-3 rounded-xl bg-green-100">
                                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm text-gray-500">Total Candidates</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total_candidates}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center">
                            <div className="p-3 rounded-xl bg-purple-100">
                                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm text-gray-500">Applications</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total_applications}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="flex -mb-px">
                            <button
                                onClick={() => setActiveTab('postings')}
                                className={`flex items-center whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors ${activeTab === 'postings' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Job Postings
                            </button>
                            <button
                                onClick={() => setActiveTab('applications')}
                                className={`flex items-center whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors ${activeTab === 'applications' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                Applications
                                {applications.length > 0 && (
                                    <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                                        {applications.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => selectedJob && setActiveTab('candidates')}
                                disabled={!selectedJob}
                                className={`flex items-center whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors ${activeTab === 'candidates' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} ${!selectedJob ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Candidate Screening
                                {selectedJob && (
                                    <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                                        {candidates.length}
                                    </span>
                                )}
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {/* Messages */}
                        {error && (
                            <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center text-red-700">
                                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                {error}
                                <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        {successMessage && (
                            <div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-200 flex items-center text-green-700">
                                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {successMessage}
                            </div>
                        )}

                        {activeTab === 'postings' ? (
                            <div>
                                {/* Create New Job Form */}
                                <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Upload New Job Description
                                    </h3>
                                    
                                    <form onSubmit={handleCreateJob} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                                            <input
                                                type="text"
                                                value={newJobTitle}
                                                onChange={(e) => setNewJobTitle(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                placeholder="e.g., Senior Software Engineer"
                                                required
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Job Description PDF</label>
                                            <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl bg-white hover:border-blue-400 transition-colors">
                                                <div className="space-y-1 text-center">
                                                    {selectedFile ? (
                                                        <div className="flex flex-col items-center">
                                                            <svg className="w-12 h-12 text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                                                            <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                            </svg>
                                                            <div className="flex text-sm text-gray-600">
                                                                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">
                                                                    <span>Upload a file</span>
                                                                    <input id="file-upload" type="file" accept=".pdf" onChange={handleFileChange} className="sr-only" />
                                                                </label>
                                                                <p className="pl-1">or drag and drop</p>
                                                            </div>
                                                            <p className="text-xs text-gray-500">PDF up to 10MB</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {uploadProgress > 0 && uploadProgress < 100 && (
                                            <div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1">Uploading: {uploadProgress}%</p>
                                            </div>
                                        )}
                                        
                                        <button
                                            type="submit"
                                            disabled={!selectedFile || !newJobTitle || isUploading}
                                            className={`w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all ${(!selectedFile || !newJobTitle || isUploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {isUploading ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Uploading...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
                                                    Upload Job Description
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>

                                {/* Job Listings */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                        Your Job Postings
                                    </h3>
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            <span className="ml-3 text-gray-600">Loading job postings...</span>
                                        </div>
                                    ) : jobPostings.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 rounded-xl">
                                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                            </svg>
                                            <p className="mt-4 text-gray-500">No job postings yet. Upload your first job description above!</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {jobPostings.map((job) => (
                                                <div 
                                                    key={job.id} 
                                                    className={`p-5 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${selectedJob?.id === job.id ? 'bg-blue-50 border-blue-300 shadow-md' : 'bg-white border-gray-200 hover:border-blue-200'}`}
                                                    onClick={() => handleJobSelect(job)}
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900">{job.title}</h4>
                                                            <p className="text-sm text-gray-500 mt-1 flex items-center">
                                                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                                {new Date(job.upload_date).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-800">
                                                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                            </svg>
                                                            PDF
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    window.open(`http://localhost:8000/uploads/${job.filename}`, '_blank');
                                                                }}
                                                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                                            >
                                                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                                View
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteJob(job.id, e)}
                                                                className="text-sm text-red-600 hover:text-red-800 flex items-center"
                                                            >
                                                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                                Delete
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleJobSelect(job);
                                                            }}
                                                            className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 transition-colors"
                                                        >
                                                            Screen Candidates →
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : activeTab === 'applications' ? (
                            <div>
                                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Job Applications</h2>
                                        <p className="text-sm text-gray-500 mt-1">Review and manage applications from candidates</p>
                                    </div>
                                </div>

                                {applications.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <h3 className="mt-4 text-lg font-medium text-gray-900">No applications yet</h3>
                                        <p className="mt-2 text-sm text-gray-500">Applications from candidates will appear here.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {applications.map((app) => (
                                            <div key={app.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900">{app.applicant_email}</h4>
                                                                <p className="text-sm text-gray-500">Applied for: {app.job_title}</p>
                                                            </div>
                                                        </div>
                                                        <div className="ml-13 space-y-1">
                                                            <p className="text-sm text-gray-600">
                                                                <span className="font-medium">Resume:</span> {app.resume_filename}
                                                            </p>
                                                            <p className="text-sm text-gray-600">
                                                                <span className="font-medium">Skills:</span> {app.resume_skills ? (typeof app.resume_skills === 'string' ? app.resume_skills.substring(0, 100) : app.resume_skills.slice(0, 5).join(', ')) : 'N/A'}...
                                                            </p>
                                                            <p className="text-xs text-gray-400">
                                                                Applied: {new Date(app.applied_date).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                            app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                                                            app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                            app.status === 'reviewed' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                                        </span>
                                                        {app.status === 'pending' && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleUpdateStatus(app.id, 'accepted')}
                                                                    className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                                                                >
                                                                    Accept
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUpdateStatus(app.id, 'rejected')}
                                                                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        )}
                                                        {(app.status === 'accepted' || app.status === 'rejected') && (
                                                            <button
                                                                onClick={() => handleUpdateStatus(app.id, 'pending')}
                                                                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                                                            >
                                                                Reset
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Candidate Screening</h2>
                                        {selectedJob && (
                                            <p className="text-sm text-gray-500 mt-1 flex items-center">
                                                Showing candidates for: 
                                                <span className="font-medium text-gray-700 ml-1">{selectedJob.title}</span>
                                                <button
                                                    onClick={() => window.open(`http://localhost:8000/uploads/${selectedJob.filename}`, '_blank')}
                                                    className="ml-2 text-blue-600 hover:text-blue-800"
                                                >
                                                    (View JD)
                                                </button>
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setActiveTab('postings')}
                                        className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                        Back to Jobs
                                    </button>
                                </div>
                                
                                {!selectedJob ? (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                                        <svg className="mx-auto h-12 w-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <p className="mt-4 text-yellow-700 font-medium">Please select a job posting first</p>
                                    </div>
                                ) : candidates.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <p className="mt-4 text-gray-500">No candidates have applied to this job yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {candidates.map((candidate, index) => (
                                            <div key={candidate.resume_id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-200 text-gray-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                #{index + 1}
                                                            </div>
                                                        </div>
                                                        <div className="ml-4">
                                                            <h4 className="font-medium text-gray-900">{candidate.applicant_email || candidate.filename}</h4>
                                                            <p className="text-sm text-gray-500">{candidate.filename}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getScoreBgColor(candidate.match_score)}`}>
                                                                    {(candidate.match_score * 100).toFixed(0)}% Match
                                                                </span>
                                                                {candidate.application_status && (
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                        candidate.application_status === 'accepted' ? 'bg-green-100 text-green-700' :
                                                                        candidate.application_status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                        'bg-gray-100 text-gray-700'
                                                                    }`}>
                                                                        {candidate.application_status.charAt(0).toUpperCase() + candidate.application_status.slice(1)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex-1 max-w-sm">
                                                        <div className="flex items-center">
                                                            <div className="w-full bg-gray-200 rounded-full h-2 mr-3">
                                                                <div 
                                                                    className={`h-2 rounded-full transition-all ${getScoreColor(candidate.match_score)}`}
                                                                    style={{ width: `${candidate.match_score * 100}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{(candidate.match_score * 100).toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => window.open(`http://localhost:8000/uploads/${candidate.filename}`, '_blank')}
                                                            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors flex items-center"
                                                        >
                                                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                            Resume
                                                        </button>
                                                        {candidate.applicant_email && (
                                                            <a 
                                                                href={`mailto:${candidate.applicant_email}`}
                                                                className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors flex items-center"
                                                            >
                                                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                </svg>
                                                                Contact
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {candidate.matching_skills && candidate.matching_skills.length > 0 && (
                                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                                        <p className="text-xs text-gray-500 mb-2">Matching Skills:</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {candidate.matching_skills.map((skill, i) => (
                                                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                                    ✓ {skill}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RecruiterDashboard;