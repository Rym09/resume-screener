import React from 'react';
import CandidateList from '../components/CandidateList';

const Dashboard = () => {
  return (
    <div className="dashboard">
      <h1>Candidate Dashboard</h1>
      <CandidateList />
    </div>
  );
};

export default Dashboard;