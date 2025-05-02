import React, { useState } from "react";
import { uploadResume } from "./api";

const UploadResume = () => {
    const [file, setFile] = useState(null);
    const [response, setResponse] = useState(null);

    const handleUpload = async () => {
        if (!file) {
            alert("Please select a file first!");
            return;
        }

        try {
            const result = await uploadResume(file);
            setResponse(result);
        } catch (error) {
            console.error("Error uploading resume:", error);
            alert("Failed to upload resume. Please try again.");
        }
    };

    return (
        <div>
            <h2>Upload Resume</h2>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} />
            <button onClick={handleUpload}>Upload</button>

            {response && (
                <div>
                    <h3>Upload Result</h3>
                    <pre>{JSON.stringify(response, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

export default UploadResume;