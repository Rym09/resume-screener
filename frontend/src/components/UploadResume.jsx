import React, { useState } from 'react';
import axios from 'axios';

const UploadResume = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8000/upload-resume/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage(`Resume uploaded successfully: ${response.data.filename}`);
    } catch (error) {
      setMessage('Error uploading resume');
      console.error(error);
    }
  };

  return (
    <div className="upload-container">
      <h2>Upload Resume</h2>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload}>Upload</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default UploadResume;