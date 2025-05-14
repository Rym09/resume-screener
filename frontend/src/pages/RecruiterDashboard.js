import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const RecruiterDashboard = () => {
    const [userProfile, setUserProfile] = useState({
        picture: '',
        email: '',
        role: ''
    });
    const [activeTab, setActiveTab] = useState('postings');
    const [jobPostings, setJobPostings] = useState([]);
    const [candidates, setCandidates] = useState([]);
    const [newJobTitle, setNewJobTitle] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const navigate = useNavigate();

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
                picture: response.data.profile_picture || '/default-profile.png',
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
    }, [navigate]);

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setNewJobTitle(e.target.files[0].name.replace('.pdf', ''));
        }
    };

    const handleCreateJob = async (e) => {
        e.preventDefault();
        if (!selectedFile || !newJobTitle) {
            setError('Please select a PDF file and enter a job title');
            return;
        }

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

            setNewJobTitle('');
            setSelectedFile(null);
            setUploadProgress(0);
            fetchJobPostings();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to upload job description');
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
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => setMenuOpen(!menuOpen);
    const closeMenu = () => setMenuOpen(false);
    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                    <h1 className="text-2xl font-bold text-gray-800">Recruiter Dashboard</h1>

                    {/* Profile Section */}
                    <div className="ml-4 flex items-center space-x-4 relative">
                        <button
                            onClick={toggleMenu}
                            className="flex items-center space-x-2 focus:outline-none"
                        >
                            <img
                                className="h-8 w-8 rounded-full object-cover border border-gray-300"
                                src={userProfile.picture}
                                alt="Profile"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "/default-profile.png";
                                }}
                            />
                            <div className="text-left hidden md:block">
                                <p className="text-sm font-medium text-gray-700">{userProfile.email}</p>
                                <p className="text-xs text-gray-500 capitalize">{userProfile.role}</p>
                            </div>
                            <svg
                                className="w-4 h-4 text-gray-500 ml-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Dropdown */}
                        {menuOpen && (
                            <div
                                onMouseLeave={closeMenu}
                                className="absolute right-0 top-12 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-100"
                            >
                                <Link
                                    to="/profile"
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={closeMenu}
                                >
                                    My Profile
                                </Link>
                                <div className="border-t border-gray-100"></div>
                                <button
                                    onClick={() => {
                                        closeMenu();
                                        handleLogout();
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex">
                        <button
                            onClick={() => setActiveTab('postings')}
                            className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${activeTab === 'postings' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            Job Postings
                        </button>
                        <button
                            onClick={() => activeTab === 'candidates' || setActiveTab('candidates')}
                            disabled={!selectedJob}
                            className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${activeTab === 'candidates' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} ${!selectedJob ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Candidate Screening
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="bg-white shadow rounded-lg p-6 mt-6">
                    {activeTab === 'postings' ? (
                        <div>
                            <h2 className="text-lg font-medium mb-4">Manage Job Postings</h2>
                            
                            {/* Create New Job Form */}
                            <form onSubmit={handleCreateJob} className="mb-8 p-4 border rounded-lg">
                                <h3 className="font-medium mb-3">Upload Job Description (PDF)</h3>
                                
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                                    <input
                                        type="text"
                                        value={newJobTitle}
                                        onChange={(e) => setNewJobTitle(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        required
                                    />
                                </div>
                                
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        PDF File
                                    </label>
                                    <div className="mt-1 flex items-center">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="file-upload"
                                            required
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
                                        >
                                            Choose File
                                        </label>
                                        <span className="ml-2 text-sm text-gray-500">
                                            {selectedFile ? selectedFile.name : 'No file selected'}
                                        </span>
                                    </div>
                                </div>
                                
                                {uploadProgress > 0 && uploadProgress < 100 && (
                                    <div className="mb-4">
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div 
                                                className="bg-blue-600 h-2.5 rounded-full" 
                                                style={{ width: `${uploadProgress}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">Uploading: {uploadProgress}%</p>
                                    </div>
                                )}
                                
                                <button
                                    type="submit"
                                    disabled={!selectedFile || !newJobTitle}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Upload Job Description
                                </button>
                            </form>

                            {/* Job Listings */}
                            <div>
                                <h3 className="font-medium mb-3">Your Job Postings</h3>
                                {isLoading ? (
                                    <p>Loading job postings...</p>
                                ) : error ? (
                                    <p className="text-red-500">{error}</p>
                                ) : jobPostings.length === 0 ? (
                                    <p className="text-gray-500">No job postings yet</p>
                                ) : (
                                    <div className="space-y-4">
                                        {jobPostings.map((job) => (
                                            <div 
                                                key={job.id} 
                                                className={`p-4 border rounded-lg hover:bg-gray-50 cursor-pointer ${selectedJob?.id === job.id ? 'bg-blue-50 border-blue-200' : ''}`}
                                                onClick={() => handleJobSelect(job)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-medium">{job.title}</h4>
                                                        <p className="text-sm text-gray-500 mt-1">
                                                            Posted on: {new Date(job.upload_date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        PDF
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(`http://localhost:8000/uploads/${job.filename}`, '_blank');
                                                    }}
                                                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                                                >
                                                    View PDF
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-medium">Candidate Screening</h2>
                                {selectedJob && (
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-600 mr-2">For:</span>
                                        <span className="font-medium">{selectedJob.title}</span>
                                        <button
                                            onClick={() => window.open(`http://localhost:8000/uploads/${selectedJob.filename}`, '_blank')}
                                            className="ml-3 text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            (View JD)
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            {!selectedJob ? (
                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                    <p className="text-yellow-700">Please select a job posting first</p>
                                </div>
                            ) : candidates.length === 0 ? (
                                <p className="text-gray-500">No candidates found for this job</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match Score</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skills Match</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {candidates.map((candidate) => (
                                                <tr key={candidate.resume_id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{candidate.filename}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                                                <div 
                                                                    className="bg-green-600 h-2.5 rounded-full" 
                                                                    style={{ width: `${candidate.match_score * 100}%` }}
                                                                ></div>
                                                            </div>
                                                            <span>{(candidate.match_score * 100).toFixed(1)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1 max-w-xs">
                                                            {candidate.matching_skills.map((skill, i) => (
                                                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button 
                                                            onClick={() => window.open(`http://localhost:8000/uploads/${candidate.filename}`, '_blank')}
                                                            className="text-blue-600 hover:text-blue-900 mr-3"
                                                        >
                                                            View Resume
                                                        </button>
                                                        <button className="text-green-600 hover:text-green-900">
                                                            Contact
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default RecruiterDashboard;