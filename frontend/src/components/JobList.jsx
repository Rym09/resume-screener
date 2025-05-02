import React, { useState, useEffect } from 'react';
import axios from 'axios';

const JobList = ({ onSelectJob }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await axios.get('http://localhost:8000/job-descriptions/');
        setJobs(response.data);
      } catch (err) {
        setError('Failed to load job listings');
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  if (loading) return <div>Loading jobs...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="job-list">
      <h3>Available Job Positions</h3>
      <ul>
        {jobs.map(job => (
          <li key={job.id} onClick={() => onSelectJob(job.id)}>
            <div className="job-title">{job.title}</div>
            <div className="job-meta">Posted: {new Date(job.upload_date).toLocaleDateString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default JobList;