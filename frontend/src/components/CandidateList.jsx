import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CandidateList = () => {
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all job descriptions
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await axios.get('http://localhost:8000/job-descriptions/');
        setJobs(response.data);
      } catch (err) {
        setError('Failed to load job listings');
      }
    };
    fetchJobs();
  }, []);

  // Fetch candidates with robust error handling
  const fetchCandidates = async (jobId) => {
    setLoading(true);
    setSelectedJobId(jobId);
    setError('');
    
    try {
      const response = await axios.get(
        `http://localhost:8000/rank-candidates/?job_description_id=${jobId}`
      );
      
      // Ensure scores are numbers and format them
      const processedCandidates = response.data.ranked_candidates?.map(candidate => ({
        ...candidate,
        match_score: typeof candidate.match_score === 'number' 
          ? Number(candidate.match_score.toFixed(2))
          : null
      })) || [];
      
      setCandidates(processedCandidates);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch candidates');
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  // Score display component
  const renderScore = (score) => {
    if (score === null || score === undefined) return 'N/A';
    if (typeof score !== 'number') return 'Invalid';
    return score.toFixed(2);
  };

  return (
    <div className="candidate-screen">
      {/* Job List (left sidebar) */}
      <div className="job-list-container">
        <h3>Available Positions</h3>
        {jobs.length > 0 ? (
          <ul className="job-list">
            {jobs.map(job => (
              <li 
                key={job.id}
                className={selectedJobId === job.id ? 'selected' : ''}
                onClick={() => fetchCandidates(job.id)}
              >
                <div className="job-title">{job.title || `Job #${job.id}`}</div>
                {job.upload_date && (
                  <div className="job-date">
                    {new Date(job.upload_date).toLocaleDateString()}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No job positions found</p>
        )}
      </div>

      {/* Candidate Results (main content) */}
      <div className="candidate-results">
        <h2>
          {selectedJobId 
            ? `Candidates for Selected Position` 
            : 'Select a job to view candidates'}
        </h2>

        {loading && <div className="loading">Loading candidates...</div>}
        {error && <div className="error">{error}</div>}

        {!loading && !error && (
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Candidate</th>
                <th>Match Score</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length > 0 ? (
                candidates.map((candidate, index) => (
                  <tr key={candidate.resume_id || index}>
                    <td>{index + 1}</td>
                    <td>{candidate.filename || 'Untitled Resume'}</td>
                    <td className="score-cell">
                      {renderScore(candidate.match_score)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="no-results">
                    {selectedJobId 
                      ? 'No qualified candidates found' 
                      : 'Select a job position to begin'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CandidateList;