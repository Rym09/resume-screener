import React, { useState } from 'react';
import axios from 'axios';

const UploadJobDescription = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8000/upload-job-description/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage(`Job description uploaded successfully: ${response.data.filename}`);
    } catch (error) {
      setMessage('Error uploading job description');
      console.error(error);
    }
  };

  return (
    <div className="upload-container">
      <h2>Upload Job Description</h2>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload}>Upload</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default UploadJobDescription;