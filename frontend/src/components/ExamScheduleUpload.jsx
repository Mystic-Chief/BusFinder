import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ExamScheduleUpload.css'; // Make sure to create this CSS file

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ExamScheduleUpload = () => {
    const [examTitle, setExamTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [incomingFile, setIncomingFile] = useState(null);
    const [outgoingFile, setOutgoingFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    // Refs for file input elements
    const incomingFileRef = useRef(null);
    const outgoingFileRef = useRef(null);

    // File name display state
    const [incomingFileName, setIncomingFileName] = useState('No file chosen');
    const [outgoingFileName, setOutgoingFileName] = useState('No file chosen');

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            if (type === 'incoming') {
                setIncomingFile(file);
                setIncomingFileName(file.name);
            } else if (type === 'outgoing') {
                setOutgoingFile(file);
                setOutgoingFileName(file.name);
            }
        }
    };

    const triggerFileInput = (ref) => {
        ref.current.click();
    };

    // Function to truncate long filenames
    const truncateFilename = (name, maxLength = 20) => {
        if (!name || name === 'No file chosen') return name;
        if (name.length <= maxLength) return name;
        
        const extension = name.split('.').pop();
        const baseName = name.substring(0, name.length - extension.length - 1);
        
        // Keep the extension and add ellipsis in the middle
        return `${baseName.substring(0, maxLength - extension.length - 3)}...${extension}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (!examTitle || !startDate || !endDate) {
            setError('Please fill in all required fields.');
            setLoading(false);
            return;
        }

        if (!incomingFile || !outgoingFile) {
            setError('Please upload both incoming and outgoing schedule files.');
            setLoading(false);
            return;
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start > end) {
            setError('End date must be after start date.');
            setLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append('examTitle', examTitle);
        formData.append('startDate', startDate);
        formData.append('endDate', endDate);
        formData.append('examScheduleIncoming', incomingFile);
        formData.append('examScheduleOutgoing', outgoingFile);

        try {
            const response = await axios.post(`${API_BASE_URL}/api/file/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                withCredentials: true,
            });

            if (response.data.success) {
                setSuccess('Exam schedules uploaded successfully!');
                // Reset form after successful upload
                setTimeout(() => {
                    setExamTitle('');
                    setStartDate('');
                    setEndDate('');
                    setIncomingFile(null);
                    setOutgoingFile(null);
                    setIncomingFileName('No file chosen');
                    setOutgoingFileName('No file chosen');
                    setSuccess('');
                    
                    // Reset file input values
                    if (incomingFileRef.current) incomingFileRef.current.value = '';
                    if (outgoingFileRef.current) outgoingFileRef.current.value = '';
                }, 3000);
            } else {
                setError('Failed to upload exam schedules.');
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.response?.data?.message || 'An error occurred while uploading the files.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="exam-schedule-upload">
            <div className="form-header">
                <h2>Upload Exam Schedules</h2>
                <p className="form-subtitle">Add new exam bus schedules to the system</p>
            </div>
            
            {error && (
                <div className="message error-message">
                    <i className="icon error-icon">❌</i>
                    {error}
                </div>
            )}
            
            {success && (
                <div className="message success-message">
                    <i className="icon success-icon">✅</i>
                    {success}
                </div>
            )}
            
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="examTitle">Exam Title <span className="required">*</span></label>
                    <input
                        id="examTitle"
                        type="text"
                        value={examTitle}
                        onChange={(e) => setExamTitle(e.target.value)}
                        placeholder="Enter exam title"
                        required
                    />
                </div>
                
                <div className="date-fields">
                    <div className="form-group">
                        <label htmlFor="startDate">Start Date <span className="required">*</span></label>
                        <input
                            id="startDate"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="endDate">End Date <span className="required">*</span></label>
                        <input
                            id="endDate"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                        />
                    </div>
                </div>
                
                <div className="form-group file-input-group">
                    <label>Incoming Schedule File <span className="required">*</span></label>
                    <input
                        ref={incomingFileRef}
                        type="file"
                        accept=".xlsx"
                        onChange={(e) => handleFileChange(e, 'incoming')}
                        required
                        className="hidden-input"
                    />
                    <div className="file-input-container">
                        <div className="file-name" title={incomingFileName}>
                            {truncateFilename(incomingFileName, 16)}
                        </div>
                        <button 
                            type="button" 
                            className={incomingFile ? "file-button file-selected" : "file-button"}
                            onClick={() => triggerFileInput(incomingFileRef)}
                        >
                            {incomingFile ? "Change File" : "Choose File"}
                        </button>
                    </div>
                </div>
                
                <div className="form-group file-input-group">
                    <label>Outgoing Schedule File <span className="required">*</span></label>
                    <input
                        ref={outgoingFileRef}
                        type="file"
                        accept=".xlsx"
                        onChange={(e) => handleFileChange(e, 'outgoing')}
                        required
                        className="hidden-input"
                    />
                    <div className="file-input-container">
                        <div className="file-name" title={outgoingFileName}>
                            {truncateFilename(outgoingFileName, 16)}
                        </div>
                        <button 
                            type="button" 
                            className={outgoingFile ? "file-button file-selected" : "file-button"}
                            onClick={() => triggerFileInput(outgoingFileRef)}
                        >
                            {outgoingFile ? "Change File" : "Choose File"}
                        </button>
                    </div>
                </div>
                
                <button 
                    type="submit" 
                    className="submit-button" 
                    disabled={loading}
                >
                    {loading ? (
                        <span className="loading-spinner">
                            <span className="spinner"></span>
                            Uploading...
                        </span>
                    ) : 'Upload Exam Schedules'}
                </button>
            </form>
        </div>
    );
};

export default ExamScheduleUpload;