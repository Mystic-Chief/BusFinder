import React, { useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "../components/AdminUpload.css"

const AdminUpload = () => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.name.endsWith('.xlsx')) {
            setFile(selectedFile);
        } else {
            toast.error('Please select a valid Excel file (.xlsx)');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.error('Please select a file first!');
            return;
        }

        const formData = new FormData();
        formData.append('excelFile', file);

        try {
            setUploading(true);
            const response = await axios.post('http://localhost:5000/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
                },
            });

            if (response.data.success) {
                toast.success('File processed successfully!');
                setFile(null);
            }
        } catch (error) {
            toast.error('Error processing file. Check console for details.');
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    return (
        <div className="admin-upload-container">
      <h2>Admin Excel Upload</h2>
      
      <div className="file-upload-container">
       
        <input
          type="file"
          id="fileInput"
          className="hidden-file-input"
          accept=".xlsx"
          onChange={handleFileChange}
          disabled={uploading}
        />

        <label htmlFor="fileInput" className="custom-file-label">
          Choose File
        </label>
  
        {file && <div className="file-name">{file.name}</div>}
      </div>

      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? `Processing... ${progress}%` : "Upload & Process"}
      </button>

      <ToastContainer />
    </div>
    );
};

export default AdminUpload;
