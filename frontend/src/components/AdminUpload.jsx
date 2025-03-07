import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "../components/AdminUpload.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AdminUpload = () => {
    // Add refs for all file inputs
    const fileInputRefs = useRef({
        firstShiftIncoming: null,
        firstShiftOutgoing: null,
        adminIncoming: null,
        adminOutgoing: null,
        generalIncoming: null,
        adminOutgoing1: null,
        adminOutgoing2: null,
    });

    // Add canvasRef at component level
    const canvasRef = useRef(null);

    const [files, setFiles] = useState({
        firstShiftIncoming: null,
        firstShiftOutgoing: null,
        adminIncoming: null,
        adminOutgoing: null,
        generalIncoming: null,
        adminOutgoing1: null,
        adminOutgoing2: null,
    });
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [selectedDay, setSelectedDay] = useState('Monday-Friday');


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

        // Reset file input values
        Object.values(fileInputRefs.current).forEach(ref => {
            if (ref) ref.value = '';
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

            // Reset file input values
            Object.values(fileInputRefs.current).forEach(ref => {
                if (ref) ref.value = '';
            });

        } catch (error) {
            console.error('File Upload Error:', error);
            toast.error(error.response?.data?.message || 'Error processing files. Check console for details.');
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    // Move the useEffect to the component level
    useEffect(() => {
        if (!canvasRef.current || !uploading) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw progress bar
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(0, 0, canvas.width * (progress / 100), canvas.height);

        // Add text
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${progress}%`, canvas.width / 2, canvas.height / 2 + 4);
    }, [progress, uploading]);


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
                            inputRef={el => fileInputRefs.current.firstShiftIncoming = el}
                        />
                        <FileUpload
                            id="firstShiftOutgoing"
                            label="Outgoing"
                            onChange={handleFileChange('firstShiftOutgoing')}
                            file={files.firstShiftOutgoing}
                            disabled={uploading}
                            inputRef={el => fileInputRefs.current.firstShiftOutgoing = el}
                        />
                    </div>
                </div>

                {/* ADM/Medical Shift Section */}
                <div className="upload-section">
                    <h3>ADM/Medical Shift</h3>
                    <div className={`sub-sections ${isSaturday ? 'saturday-adm' : ''}`}>
                        <FileUpload
                            id="adminIncoming"
                            label="Incoming"
                            onChange={handleFileChange('adminIncoming')}
                            file={files.adminIncoming}
                            disabled={uploading}
                            inputRef={el => fileInputRefs.current.adminIncoming = el}
                        />
                        {!isSaturday ? (
                            <FileUpload
                                id="adminOutgoing"
                                label="Outgoing"
                                onChange={handleFileChange('adminOutgoing')}
                                file={files.adminOutgoing}
                                disabled={uploading}
                                inputRef={el => fileInputRefs.current.adminOutgoing = el}
                            />
                        ) : (
                            <>
                                <FileUpload
                                    id="adminOutgoing1"
                                    label="Outgoing (1:15 PM)"
                                    onChange={handleFileChange('adminOutgoing1')}
                                    file={files.adminOutgoing1}
                                    disabled={uploading}
                                    inputRef={el => fileInputRefs.current.adminOutgoing1 = el}
                                />
                                <FileUpload
                                    id="adminOutgoing2"
                                    label="Outgoing (4:45 PM)"
                                    onChange={handleFileChange('adminOutgoing2')}
                                    file={files.adminOutgoing2}
                                    disabled={uploading}
                                    inputRef={el => fileInputRefs.current.adminOutgoing2 = el}
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* General Shift Section */}
                {!isSaturday && (
                    <div className="upload-section general-shift">
                        <h3>General Shift</h3>
                        <div className="sub-sections">
                            <FileUpload
                                id="generalIncoming"
                                label="Incoming"
                                onChange={handleFileChange('generalIncoming')}
                                file={files.generalIncoming}
                                disabled={uploading}
                                inputRef={el => fileInputRefs.current.generalIncoming = el}
                            />
                        </div>
                    </div>
                )}
            </div>

            {uploading && (
                <canvas
                    ref={canvasRef}
                    width="400"
                    height="20"
                    style={{ marginTop: '1.5rem', borderRadius: '4px' }}
                />
            )}

            <button
                onClick={handleUpload}
                disabled={uploading || !Object.values(files).some(Boolean)}
                className="process-button"
            >
                {uploading ? `Processing...` : "Process All Files"}
            </button>

            <ToastContainer position="top-right" autoClose={3000} />
        </div>
    );
};

const FileUpload = ({ id, label, file, onChange, disabled, inputRef }) => {
    // Function to truncate long filenames
    const truncateFilename = (name, maxLength = 20) => {
        if (!name) return "";
        if (name.length <= maxLength) return name;

        const extension = name.split('.').pop();
        const baseName = name.substring(0, name.length - extension.length - 1);

        // Keep the extension and add ellipsis in the middle
        return `${baseName.substring(0, maxLength - extension.length - 3)}...${extension}`;
    };

    return (
        <div className="file-upload-group">
            {label && <label className="file-label">{label}</label>}
            <input
                type="file"
                id={id}
                className="hidden-file-input"
                accept=".xlsx"
                onChange={onChange}
                disabled={disabled}
                ref={inputRef}
            />
            <label
                htmlFor={id}
                className={file ? "custom-file-label file-selected" : "custom-file-label"}
            >
                {file ? "Change File" : "Choose File"}
            </label>
            {file && (
                <div className="file-name-display" title={file.name}>
                    {truncateFilename(file.name, 16)}
                </div>
            )}
        </div>
    );
};

export default AdminUpload;