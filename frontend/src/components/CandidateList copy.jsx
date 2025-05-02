import React, { useState } from 'react';
import axios from 'axios';

const CandidateList = () => {
  const [candidates, setCandidates] = useState([]);
  const [jobId, setJobId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCandidates = async () => {
    if (!jobId) {
      setError('Please enter a Job Description ID');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(
        `http://localhost:8000/rank-candidates/?job_description_id=${jobId}`
      );
      setCandidates(response.data.ranked_candidates || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch candidates');
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="candidate-list">
      <h2>Ranked Candidates</h2>
      
      <div className="search-box">
        <input
          type="text"
          placeholder="Enter Job Description ID"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          disabled={loading}
        />
        <button onClick={fetchCandidates} disabled={loading}>
          {loading ? 'Loading...' : 'Search'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Filename</th>
            <th>Match Score</th>
          </tr>
        </thead>
        <tbody>
          {candidates.length > 0 ? (
            candidates.map((candidate, index) => (
              <tr key={candidate.resume_id || index}>
                <td>{index + 1}</td>
                <td>{candidate.filename || 'Untitled Resume'}</td>
                <td>
                  {candidate.similarity_score?.toFixed?.(2) || 'N/A'}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3">
                {!error && 'No candidates found. Enter a valid Job ID and click Search.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CandidateList;