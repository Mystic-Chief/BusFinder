import React, { useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "../components/AdminUpload.css";

const AdminUpload = () => {
    const [files, setFiles] = useState({
        firstShift: null,
        adminIncoming: null,
        adminOutgoing: null,
        generalIncoming: null
    });
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileChange = (category) => (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.name.endsWith('.xlsx')) {
            setFiles(prev => ({ ...prev, [category]: selectedFile }));
        } else {
            toast.error('Please select a valid Excel file (.xlsx)');
        }
    };

    const handleUpload = async () => {
        const selectedFiles = Object.values(files).filter(Boolean);
        if (selectedFiles.length === 0) {
            toast.error('Please select at least one file to upload!');
            return;
        }

        const formData = new FormData();
        if (files.firstShift) {
            formData.append('firstShiftIncoming', files.firstShift);
            formData.append('firstShiftOutgoing', files.firstShift);
        }
        if (files.adminIncoming) formData.append('adminIncoming', files.adminIncoming);
        if (files.adminOutgoing) formData.append('adminOutgoing', files.adminOutgoing);
        if (files.generalIncoming) formData.append('generalIncoming', files.generalIncoming);

        try {
            setUploading(true);
            await axios.post('http://localhost:5000/api/file/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
                },
            });
            toast.success('All files processed successfully!');
            setFiles({
                firstShift: null,
                adminIncoming: null,
                adminOutgoing: null,
                generalIncoming: null
            });
        } catch (error) {
            toast.error('Error processing files. Check console for details.');
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    return (
        <div className="admin-upload-container">
            <h2>Admin Shift Data Upload</h2>
            
            <div className="upload-sections">
                {/* First Shift Section */}
                <div className="upload-section">
                    <h3>First Shift</h3>
                    <FileUpload 
                        id="firstShift"
                        onChange={handleFileChange('firstShift')}
                        file={files.firstShift}
                        disabled={uploading}
                    />
                </div>

                {/* ADM/Medical Shift Section */}
                <div className="upload-section">
                    <h3>ADM/Medical Shift</h3>
                    <div className="sub-sections">
                        <FileUpload 
                            id="adminIncoming"
                            label="Incoming"
                            onChange={handleFileChange('adminIncoming')}
                            file={files.adminIncoming}
                            disabled={uploading}
                        />
                        <FileUpload 
                            id="adminOutgoing"
                            label="Outgoing"
                            onChange={handleFileChange('adminOutgoing')}
                            file={files.adminOutgoing}
                            disabled={uploading}
                        />
                    </div>
                </div>

                {/* General Shift Section */}
                <div className="upload-section">
                    <h3>General Shift</h3>
                    <FileUpload 
                        id="generalIncoming"
                        label="Incoming"
                        onChange={handleFileChange('generalIncoming')}
                        file={files.generalIncoming}
                        disabled={uploading}
                    />
                </div>
            </div>

            <button 
                onClick={handleUpload} 
                disabled={uploading || !Object.values(files).some(Boolean)}
                className="process-button"
            >
                {uploading ? `Processing... ${progress}%` : "Process All Files"}
            </button>

            <ToastContainer />
        </div>
    );
};

const FileUpload = ({ id, label, file, onChange, disabled }) => (
    <div className="file-upload-group">
        {label && <label className="file-label">{label}</label>}
        <input
            type="file"
            id={id}
            className="hidden-file-input"
            accept=".xlsx"
            onChange={onChange}
            disabled={disabled}
        />
        <label htmlFor={id} className="custom-file-label">
            {file ? file.name : "Choose File"}
        </label>
    </div>
);

export default AdminUpload;