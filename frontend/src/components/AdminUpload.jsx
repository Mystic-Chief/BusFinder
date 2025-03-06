import React, { useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "../components/AdminUpload.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AdminUpload = () => {
    const [files, setFiles] = useState({
        firstShiftIncoming: null,
        firstShiftOutgoing: null,
        adminIncoming: null,
        adminOutgoing: null,
        generalIncoming: null,
        adminOutgoing1: null, // For Saturday's 1:15 PM Outgoing
        adminOutgoing2: null, // For Saturday's 4:45 PM Outgoing
    });
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [selectedDay, setSelectedDay] = useState('Monday-Friday'); // Default to Monday-Friday

    const handleFileChange = (category) => (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.name.endsWith('.xlsx')) {
            setFiles(prev => ({ ...prev, [category]: selectedFile }));
        } else {
            toast.error('Please select a valid Excel file (.xlsx)');
        }
    };

    const handleDayChange = (e) => {
        setSelectedDay(e.target.value);
        // Reset files when day changes
        setFiles({
            firstShiftIncoming: null,
            firstShiftOutgoing: null,
            adminIncoming: null,
            adminOutgoing: null,
            generalIncoming: null,
            adminOutgoing1: null,
            adminOutgoing2: null,
        });
    };

    const handleUpload = async () => {
        const selectedFiles = Object.entries(files).filter(([_, file]) => file);

        if (selectedFiles.length === 0) {
            toast.error('Please select at least one file to upload!');
            return;
        }

        const formData = new FormData();

        // Append only selected files
        selectedFiles.forEach(([key, file]) => {
            formData.append(key, file);
        });

        // Add the selected day to the form data
        formData.append('day', selectedDay);

        try {
            setUploading(true);
            setProgress(0);

            const response = await axios.post(`${API_BASE_URL}/api/file/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setProgress(percentCompleted);
                },
            });

            toast.success('All files uploaded successfully!');

            // Reset file state after upload
            setFiles({
                firstShiftIncoming: null,
                firstShiftOutgoing: null,
                adminIncoming: null,
                adminOutgoing: null,
                generalIncoming: null,
                adminOutgoing1: null,
                adminOutgoing2: null,
            });
        } catch (error) {
            console.error('File Upload Error:', error);
            toast.error(error.response?.data?.message || 'Error processing files. Check console for details.');
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    const isSaturday = selectedDay === 'Saturday';

    return (
        <div className="admin-upload-container">
            <h2>Admin Shift Data Upload</h2>

            <div className="day-selector">
                <label htmlFor="day">Select Day:</label>
                <select id="day" value={selectedDay} onChange={handleDayChange}>
                    <option value="Monday-Friday">Monday-Friday</option>
                    <option value="Saturday">Saturday</option>
                </select>
            </div>

            <div className="upload-sections">
                {/* First Shift Section */}
                <div className="upload-section">
                    <h3>First Shift</h3>
                    <div className="sub-sections">
                        <FileUpload
                            id="firstShiftIncoming"
                            label="Incoming"
                            onChange={handleFileChange('firstShiftIncoming')}
                            file={files.firstShiftIncoming}
                            disabled={uploading}
                        />
                        <FileUpload
                            id="firstShiftOutgoing"
                            label="Outgoing"
                            onChange={handleFileChange('firstShiftOutgoing')}
                            file={files.firstShiftOutgoing}
                            disabled={uploading}
                        />
                    </div>
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
                        {!isSaturday ? (
                            <FileUpload
                                id="adminOutgoing"
                                label="Outgoing"
                                onChange={handleFileChange('adminOutgoing')}
                                file={files.adminOutgoing}
                                disabled={uploading}
                            />
                        ) : (
                            <>
                                <FileUpload
                                    id="adminOutgoing1"
                                    label="Outgoing (1:15 PM)"
                                    onChange={handleFileChange('adminOutgoing1')}
                                    file={files.adminOutgoing1}
                                    disabled={uploading}
                                />
                                <FileUpload
                                    id="adminOutgoing2"
                                    label="Outgoing (4:45 PM)"
                                    onChange={handleFileChange('adminOutgoing2')}
                                    file={files.adminOutgoing2}
                                    disabled={uploading}
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* General Shift Section */}
                {!isSaturday && (
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
                )}
            </div>

            {uploading && (
                <div className="loading-progress">
                    <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
            )}

            <button
                onClick={handleUpload}
                disabled={uploading || !Object.values(files).some(Boolean)}
                className="process-button"
            >
                {uploading ? `Processing... ${progress}%` : "Process All Files"}
            </button>

            <ToastContainer position="top-right" autoClose={3000} />
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
            {file ? "Change File" : "Choose File"}
        </label>
        {file && (
            <div className="file-name-display" title={file.name}>
                {file.name}
            </div>
        )}
    </div>
);

export default AdminUpload;