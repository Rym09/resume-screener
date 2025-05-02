import React from 'react';
import UploadResume from '../components/UploadResume';
import UploadJobDescription from '../components/UploadJobDescription';

const Home = () => {
  return (
    <div className="home">
      <h1>Resume Screener</h1>
      <div className="upload-forms">
        <UploadResume />
        <UploadJobDescription />
      </div>
    </div>
  );
};

export default Home;